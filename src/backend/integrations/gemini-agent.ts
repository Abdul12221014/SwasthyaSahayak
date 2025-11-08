/**
 * Gemini Agent Adapter
 * 
 * Orchestrates health queries using Gemini's function calling API.
 * Maps Gemini tools to existing backend functions (NO new HTTP endpoints).
 * 
 * @module backend/integrations/gemini-agent
 */

import { getGeminiAgentConfig, getSupabaseConfig } from "../../shared/config.ts";
import { getSingleEmbedding, classifyEmergency, translateToEnglish } from "./ml-service.ts";
import { RAGRetriever, RetrievedDocument } from "../rag/retriever.ts";
import { Reranker } from "../rag/reranker.ts";
import { validateHealthResponse } from "../utils/citation-validate.ts";
import { findNearestFacilities } from "./phc-directory.ts";
import { logger } from "../utils/logger.ts";
import { getGeminiCircuitBreaker, CircuitBreakerError } from "../utils/circuit-breaker.ts";
import { retryWithBackoff, retryWithTimeout } from "../utils/retry.ts";

export interface ConversationContext {
  sessionId?: string;
  previousQueries?: string[];
  metadata?: {
    language?: string;
    location?: string;
  };
}

export interface AgentResponse {
  response: string;
  citations: string[];
  toolCalls: Array<{
    name: string;
    params: any;
    result?: any;
    duration: number;
  }>;
  latency: number;
  costEstimate: number;
}

// Initialize retriever and reranker (lazy initialization)
let retriever: RAGRetriever | null = null;
let reranker: Reranker | null = null;

function getRetriever(): RAGRetriever {
  if (!retriever) {
    const supabaseConfig = getSupabaseConfig();
    if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
      throw new Error('Supabase configuration is missing. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }
    retriever = new RAGRetriever(supabaseConfig.url, supabaseConfig.serviceRoleKey);
  }
  return retriever;
}

function getReranker(): Reranker {
  if (!reranker) {
    reranker = new Reranker();
  }
  return reranker;
}

/**
 * Gemini Function Tool Definitions
 * These map to existing backend functions (NO new HTTP endpoints)
 */
const GEMINI_TOOLS = [
  {
    name: "generate_embedding",
    description: "Generate vector embedding for text to enable semantic search in health knowledge base",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to convert to embedding vector"
        }
      },
      required: ["text"]
    }
  },
  {
    name: "search_health_knowledge",
    description: "Search health knowledge base using vector similarity to find relevant medical documents",
    parameters: {
      type: "object",
      properties: {
        embedding: {
          type: "array",
          items: { type: "number" },
          description: "Query embedding vector"
        },
        topK: {
          type: "number",
          description: "Number of results to retrieve",
          default: 5
        },
        language: {
          type: "string",
          enum: ["en", "hi", "or", "as"],
          description: "Filter by language"
        },
        minSimilarity: {
          type: "number",
          description: "Minimum similarity threshold",
          default: 0.7
        }
      },
      required: ["embedding"]
    }
  },
  {
    name: "rerank",
    description: "Rerank retrieved documents by source credibility and language match",
    parameters: {
      type: "object",
      properties: {
        documents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "string" },
              metadata: { type: "object" },
              similarity: { type: "number" }
            }
          },
          description: "Documents to rerank"
        },
        queryLanguage: {
          type: "string",
          description: "Query language for language matching boost"
        }
      },
      required: ["documents"]
    }
  },
  {
    name: "translate_text",
    description: "Translate text from one language to another (supports: en, hi, or, as)",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to translate"
        },
        sourceLang: {
          type: "string",
          enum: ["en", "hi", "or", "as", "auto"],
          description: "Source language code (auto for detection)"
        },
        targetLang: {
          type: "string",
          enum: ["en", "hi", "or", "as"],
          description: "Target language code",
          default: "en"
        }
      },
      required: ["text", "targetLang"]
    }
  },
  {
    name: "detect_emergency",
    description: "Check if health query indicates a medical emergency requiring immediate care",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Health query text to analyze for emergency indicators"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "validate_citations",
    description: "Validate citations and check medical safety of response",
    parameters: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description: "Generated health response text"
        },
        citations: {
          type: "array",
          items: { type: "string" },
          description: "Citation URLs to validate"
        }
      },
      required: ["response", "citations"]
    }
  },
  {
    name: "nearest_phc",
    description: "Find nearest Primary Health Centre (PHC) based on district or coordinates",
    parameters: {
      type: "object",
      properties: {
        district: {
          type: "string",
          description: "District name"
        },
        latitude: {
          type: "number",
          description: "Latitude coordinate"
        },
        longitude: {
          type: "number",
          description: "Longitude coordinate"
        },
        limit: {
          type: "number",
          description: "Maximum number of facilities to return",
          default: 3
        }
      }
    }
  }
];

/**
 * Tool Handlers - Map Gemini function calls to existing backend functions
 */
const toolHandlers: Record<string, (params: any) => Promise<any>> = {
  async generate_embedding(params: { text: string }) {
    const embedding = await getSingleEmbedding(params.text);
    return { embedding };
  },

  async search_health_knowledge(params: {
    embedding: number[];
    topK?: number;
    language?: string;
    minSimilarity?: number;
  }) {
    const results = await getRetriever().retrieve(params.embedding, {
      topK: params.topK || 5,
      language: params.language,
      minSimilarity: params.minSimilarity || 0.7
    });
    return {
      documents: results.map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        similarity: doc.similarity
      }))
    };
  },

  async rerank(params: {
    documents: RetrievedDocument[];
    queryLanguage?: string;
  }) {
    const reranked = getReranker().simpleRerank(
      params.documents,
      params.queryLanguage
    );
    return {
      documents: reranked
    };
  },

  async translate_text(params: {
    text: string;
    sourceLang?: string;
    targetLang: string;
  }) {
    if (params.targetLang === 'en') {
      const translations = await translateToEnglish(params.text, params.sourceLang);
      return { translation: translations[0] };
    }
    // For other languages, would use translateFromEnglish
    // For now, return original text
    return { translation: params.text };
  },

  async detect_emergency(params: { query: string }) {
    const results = await classifyEmergency(params.query);
    return {
      isEmergency: results[0]?.is_emergency || false,
      confidence: results[0]?.confidence || 0
    };
  },

  async validate_citations(params: {
    response: string;
    citations: string[];
  }) {
    const validated = validateHealthResponse(params.response, params.citations);
    return {
      response: validated.response,
      citations: validated.citations,
      warnings: validated.warnings,
      isValid: validated.citations.length > 0
    };
  },

  async nearest_phc(params: {
    district?: string;
    latitude?: number;
    longitude?: number;
    limit?: number;
  }) {
    const facilities = await findNearestFacilities({
      district: params.district || 'Cuttack',
      lat: params.latitude,
      lon: params.longitude,
      limit: params.limit || 3
    });
    return {
      facilities: facilities.map(f => ({
        name: f.name,
        type: f.type,
        address: f.address,
        phone: f.phone,
        distance_km: f.distance_km
      }))
    };
  }
};

/**
 * Run Gemini Agent Orchestration
 * 
 * @param query - User health query
 * @param language - User language
 * @param sessionId - Session ID for context
 * @param context - Conversation context
 * @returns Agent response with citations
 */
export async function runAgentOrchestration(params: {
  query: string;
  language?: string;
  sessionId?: string;
  context?: ConversationContext;
  requestId?: string;
}): Promise<AgentResponse> {
  const { query, language = 'en', sessionId, context, requestId } = params;
  const startTime = Date.now();
  const toolCalls: AgentResponse['toolCalls'] = [];
  
  const agentConfig = getGeminiAgentConfig();
  
  if (!agentConfig.enabled) {
    throw new Error('Gemini agent is disabled');
  }

  if (!agentConfig.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Build conversation context
  const messages = [];
  if (context?.previousQueries && context.previousQueries.length > 0) {
    // Add last 3 turns for context (system + user + assistant pattern)
    const recentQueries = context.previousQueries.slice(-3);
    for (const prevQuery of recentQueries) {
      messages.push({ role: 'user', content: prevQuery });
      // Note: In real implementation, would load assistant responses from session
      messages.push({ role: 'assistant', content: '[Previous response]' });
    }
  }

  // System prompt
  const systemPrompt = `You are SwasthyaSahayak, an AI health assistant for rural India.

Your role:
- Answer health questions accurately using the provided health knowledge base
- Use tools to search, translate, and validate information
- Always cite sources from trusted health organizations (WHO, MoHFW, ICMR, UNICEF)
- Be culturally sensitive and use simple language
- For emergencies, immediately use nearest_phc tool and provide urgent guidance

Rules:
- Always use search_health_knowledge to find relevant documents before answering
- Validate citations using validate_citations before finalizing response
- If query is not in English, use translate_text first
- For emergency queries, use detect_emergency and nearest_phc tools`;

  messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: query });

  // Convert tools to Gemini function calling format
  const geminiFunctions = GEMINI_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));

  let toolCallCount = 0;
  let currentMessages = messages;
  let finalResponse = '';
  let citations: string[] = [];

  // Get circuit breaker instance
  const circuitBreaker = getGeminiCircuitBreaker();

  // Agent loop: Handle function calling iterations
  while (toolCallCount < agentConfig.maxToolCalls) {
    // Check timeout before making API call
    if (Date.now() - startTime > agentConfig.requestTimeoutMs) {
      throw new Error(`Agent timeout exceeded (${agentConfig.requestTimeoutMs}ms)`);
    }

    // Make Gemini API call with circuit breaker and retry logic
    let data: any;
    let candidate: any;

    try {
      // Wrap API call with circuit breaker and retry
      const response = await circuitBreaker.execute(async () => {
        return await retryWithTimeout(
          async () => {
            const fetchResponse = await fetch(
              `${agentConfig.apiUrl}/models/${agentConfig.model}:generateContent?key=${agentConfig.apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: currentMessages.map(m => {
                    // Handle different message types
                    if (m.role === 'system') {
                      // Convert system messages to user messages
                      return {
                        role: 'user',
                        parts: [{ text: m.content }]
                      };
                    } else if (m.parts) {
                      // Already formatted with parts (function calls/responses)
                      return {
                        role: m.role,
                        parts: m.parts
                      };
                    } else {
                      // Regular text message
                      return {
                        role: m.role,
                        parts: [{ text: m.content }]
                      };
                    }
                  }),
                  tools: [{ functionDeclarations: geminiFunctions }],
                  generationConfig: {
                    temperature: agentConfig.temperature,
                    maxOutputTokens: agentConfig.maxTokens
                  }
                }),
                signal: AbortSignal.timeout(agentConfig.requestTimeoutMs - (Date.now() - startTime) - 1000) // Leave 1s buffer
              }
            );

            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              const error = new Error(`Gemini API error: ${fetchResponse.status} ${errorText}`);
              (error as any).statusCode = fetchResponse.status;
              throw error;
            }

            return await fetchResponse.json();
          },
          Math.min(agentConfig.requestTimeoutMs - (Date.now() - startTime), 5000), // Max 5s timeout for this call
          {
            maxAttempts: 2, // Retry once on transient errors
            initialDelayMs: 500,
            retryableErrors: ['timeout', 'network', '503', '429', '500', 'ECONNRESET']
          }
        );
      });

      data = response;
      candidate = data.candidates?.[0];
      
      if (!candidate) {
        throw new Error('No response from Gemini');
      }
    } catch (error) {
      // Handle circuit breaker errors
      if (error instanceof CircuitBreakerError) {
        logger.logError(error, {
          operation: 'gemini_api_call',
          circuitBreakerState: error.stats.state,
          requestId: requestId || sessionId,
          sessionId
        });
        throw new Error(`Circuit breaker is ${error.stats.state}. Service temporarily unavailable.`);
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.logError(error, {
          operation: 'gemini_api_call',
          timeout: agentConfig.requestTimeoutMs,
          requestId: requestId || sessionId,
          sessionId
        });
        throw new Error(`Gemini API request timed out after ${agentConfig.requestTimeoutMs}ms`);
      }
      
      // Re-throw other errors
      logger.logError(error instanceof Error ? error : new Error(String(error)), {
        operation: 'gemini_api_call',
        requestId: requestId || sessionId,
        sessionId
      });
      throw error;
    }

    // Check if Gemini wants to call a function
    const functionCalls = candidate.content?.parts?.filter((p: any) => p.functionCall);
    
    if (functionCalls && functionCalls.length > 0) {
      // Execute tool calls
      for (const funcCall of functionCalls) {
        const toolName = funcCall.functionCall.name;
        
        // Gemini API returns args as object, not JSON string
        let toolParams: any = {};
        const args = funcCall.functionCall.args;
        if (args) {
          if (typeof args === 'string') {
            try {
              toolParams = JSON.parse(args);
            } catch (e) {
              console.warn(`Failed to parse tool args as JSON: ${args}`);
              toolParams = {};
            }
          } else if (typeof args === 'object') {
            toolParams = args;
          }
        }
        
        toolCallCount++;
        
        const toolStartTime = Date.now();
        const handler = toolHandlers[toolName];
        
        if (!handler) {
          throw new Error(`Unknown tool: ${toolName}`);
        }

        let toolResult;
        try {
          toolResult = await handler(toolParams);
        } catch (error) {
          toolResult = { error: error instanceof Error ? error.message : 'Tool execution failed' };
        }

        const toolDuration = Date.now() - toolStartTime;
        
        toolCalls.push({
          name: toolName,
          params: toolParams,
          result: toolResult,
          duration: toolDuration
        });

        // Add function call and result to conversation
        currentMessages.push({
          role: 'model',
          parts: [{ functionCall: funcCall.functionCall }]
        });
        
        currentMessages.push({
          role: 'user',
          parts: [{ functionResponse: { name: toolName, response: toolResult } }]
        });
      }
    } else {
      // Final response (no more function calls)
      const responseText = candidate.content?.parts
        ?.filter((p: any) => p.text)
        ?.map((p: any) => p.text)
        ?.join('') || '';

      finalResponse = responseText;
      break;
    }

    // Check timeout at end of loop iteration
    if (Date.now() - startTime > agentConfig.requestTimeoutMs) {
      throw new Error(`Agent timeout exceeded (${agentConfig.requestTimeoutMs}ms)`);
    }
  }

  if (toolCallCount >= agentConfig.maxToolCalls) {
    throw new Error('Maximum tool calls exceeded');
  }

  // Extract citations from tool call results
  const searchResults = toolCalls.find(tc => tc.name === 'search_health_knowledge');
  if (searchResults?.result?.documents) {
    citations = searchResults.result.documents.map((doc: any) => 
      doc.metadata?.link || doc.metadata?.source || ''
    ).filter(Boolean);
  }

  // Validate response if validate_citations was called
  const validationResult = toolCalls.find(tc => tc.name === 'validate_citations');
  if (validationResult?.result) {
    finalResponse = validationResult.result.response;
    citations = validationResult.result.citations;
  }

  const latency = Date.now() - startTime;
  
  // Estimate cost (rough calculation: $0.000125 per 1K input tokens, $0.000375 per 1K output)
  // Using character approximation: ~4 chars per token
  const inputChars = JSON.stringify(currentMessages).length;
  const outputChars = finalResponse.length;
  const inputTokens = inputChars / 4;
  const outputTokens = outputChars / 4;
  const costEstimate = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375;

  // Log agent request (using existing logger structure)
  logger.logRequestEnd?.(
    sessionId || 'agent',
    'POST',
    '/agent-orchestration',
    200,
    latency,
    {
      query: query.substring(0, 100),
      toolCalls: toolCalls.length,
      costEstimate
    }
  );

  return {
    response: finalResponse,
    citations,
    toolCalls,
    latency,
    costEstimate
  };
}

