// Removed serve import - using default export handler instead
// Supabase client is imported dynamically to avoid IDE type resolution issues
import { findNearestFacilities } from "../integrations/phc-directory.ts";
import { logger } from "../utils/logger.ts";
import { metrics } from "../utils/metrics.ts";
import { getGeminiAgentConfig } from "../../shared/config.ts";
import { runAgentOrchestration } from "../integrations/gemini-agent.ts";
import { getSessionHistoryAsync, saveSessionQueryAsync } from "../utils/session-store.ts";
import { RAGRetriever, KeywordRetriever, type RetrievedDocument } from "../rag/retriever.ts";
import { getSingleEmbedding, isMLServiceHealthy } from "../integrations/ml-service.ts";

// Router types
export interface ConversationContext {
  sessionId?: string;
  previousQueries?: string[];
  metadata?: {
    language?: string;
    location?: string;
  };
}

export interface RoutingDecision {
  useAgent: boolean;
  reason: string;
  confidence: number;
  complexityScore: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Emergency keywords for detection
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'severe breathing', 'can\'t breathe', 'difficulty breathing',
  'unconscious', 'seizure', 'heavy bleeding', 'severe injury', 'stroke',
  'high fever child', 'baby not breathing', 'severe allergic reaction', 'anaphylaxis'
];

// Health entities for entity counting
const HEALTH_ENTITIES = [
  'fever', 'cough', 'diarrhea', 'vaccination', 'malaria',
  'tuberculosis', 'pain', 'bleeding', 'rash', 'breathing',
  'headache', 'nausea', 'vomiting', 'rash', 'swelling'
];

/**
 * Router: Decide between Backend Fast Path or Gemini Agent Path
 * Implements exact complexity scoring algorithm from prompt
 */
function shouldUseAgentMode(
  query: string,
  context?: ConversationContext
): RoutingDecision {
  // Check feature flag first
  const agentConfig = getGeminiAgentConfig();
  if (!agentConfig.enabled) {
    return {
      useAgent: false,
      reason: 'feature_disabled',
      confidence: 1.0,
      complexityScore: 0
    };
  }

  // Emergency queries ALWAYS use backend (faster, more reliable)
  const isLikelyEmergency = detectEmergency(query);
  if (isLikelyEmergency) {
    return {
      useAgent: false,
      reason: 'emergency_requires_fast_path',
      confidence: 1.0,
      complexityScore: 0
    };
  }

  // Compute complexity score (0-10)
  let complexityScore = 0;

  // Quantitative metrics
  const queryLength = query.length;
  const sentenceCount = (query.match(/[.!?।॥]/g) || []).length;
  // const questionCount = (query.match(/\?/g) || []).length; // not used currently

  // Qualitative markers
  const hasMultipleTopics = /\b(also|and|additionally|furthermore|what about|tell me about)\b/i.test(query);
  const isMultiStepAsk = /^(how can|can you|explain|compare|step|steps)/i.test(query);
  
  // Entity counting (fallback for intent detection)
  function countEntities(text: string): number {
    const queryLower = text.toLowerCase();
    return HEALTH_ENTITIES.filter(entity => queryLower.includes(entity)).length;
  }
  const entityCount = countEntities(query);
  const hasMultipleEntities = entityCount > 2;

  // Scoring algorithm (exact from prompt)
  // +2 if query.length > 100
  if (queryLength > 100) complexityScore += 2;

  // +2 if sentenceCount > 1
  if (sentenceCount > 1) complexityScore += 2;

  // +2 if regex matches conversational markers
  if (hasMultipleTopics) complexityScore += 2;

  // +2 if starts with multi-step ask
  if (isMultiStepAsk) complexityScore += 2;

  // +2 if intent is ambiguous or contains multiple entities
  if (hasMultipleEntities) complexityScore += 2;

  // Context from conversation history
  if (context?.previousQueries && context.previousQueries.length > 0) {
    complexityScore += 2; // Multi-turn conversation
  }

  // Decision: Agent mode if score >= 5
  const useAgent = complexityScore >= 5;

  // Build reason string
  const reasons: string[] = [];
  if (queryLength > 100) reasons.push('long_query');
  if (sentenceCount > 1) reasons.push('multi_sentence');
  if (hasMultipleTopics) reasons.push('multiple_topics');
  if (isMultiStepAsk) reasons.push('multi_step');
  if (hasMultipleEntities) reasons.push('multiple_entities');
  if (context?.previousQueries && context.previousQueries.length > 0) {
    reasons.push('conversational');
  }

  return {
    useAgent,
    reason: reasons.join('+') || (useAgent ? 'complex' : 'simple'),
    confidence: Math.min(complexityScore / 10, 1.0),
    complexityScore
  };
}

// Simulated health knowledge base (in production, this would be vector DB retrieval)
const HEALTH_KNOWLEDGE = {
  vaccination: {
    content: "Vaccination schedules for children include BCG at birth, OPV and Hepatitis B at 6 weeks, 10 weeks, and 14 weeks. Measles vaccine is given at 9-12 months.",
    source: "MoHFW India - Universal Immunization Programme",
    link: "https://www.mohfw.gov.in/index1.php?lang=1&level=2&sublinkid=824&lid=1067"
  },
  fever: {
    content: "For fever in children, keep them hydrated, use paracetamol as prescribed, sponge with lukewarm water. Seek medical help if fever persists beyond 3 days or is very high (>103°F).",
    source: "WHO - Fever Management Guidelines",
    link: "https://www.who.int/news-room/fact-sheets"
  },
  malaria: {
    content: "Malaria prevention includes sleeping under insecticide-treated nets, wearing protective clothing, and using mosquito repellents. Symptoms include fever, chills, and headache.",
    source: "National Vector Borne Disease Control Programme",
    link: "https://nvbdcp.gov.in/index1.php?lang=1&level=1&sublinkid=5784&lid=3689"
  },
  tuberculosis: {
    content: "TB symptoms include persistent cough for more than 2 weeks, chest pain, coughing up blood, weight loss, and night sweats. Free treatment is available at government health centers.",
    source: "National TB Elimination Programme",
    link: "https://tbcindia.gov.in/"
  },
  diarrhea: {
    content: "For diarrhea, give ORS (Oral Rehydration Solution), continue breastfeeding for infants, maintain hygiene. Seek help if there's blood in stool, signs of dehydration, or it persists beyond 2 days.",
    source: "UNICEF India - Child Health Guidelines",
    link: "https://www.unicef.org/india/what-we-do/health"
  }
};

// Language detection and translation simulation
function detectLanguage(text: string): string {
  const odiaPattern = /[\u0B00-\u0B7F]/;
  const hindiPattern = /[\u0900-\u097F]/;
  const assamesePattern = /[\u0980-\u09FF]/;
  
  if (odiaPattern.test(text)) return 'odia';
  if (hindiPattern.test(text)) return 'hindi';
  if (assamesePattern.test(text)) return 'assamese';
  return 'english';
}

function getEnvVar(name: string): string {
  try {
    // Deno environment (runtime)
    // @ts-ignore - Deno types may not be available in IDE
    return (globalThis as any).Deno?.env.get(name) || '';
  } catch {
    return '';
  }
}

async function getSupabaseClient(url: string, key: string) {
  // @ts-ignore: Deno resolves this at runtime; IDE may not have types
  const mod = await import("https://esm.sh/@supabase/supabase-js@2.39.7");
  return mod.createClient(url, key);
}

async function translateText(text: string, fromLang: string): Promise<string> {
  // In production, use IndicTrans2 or Google Translate API
  // For now, use Gemini API directly for translation
  const normalizedLang = fromLang?.toLowerCase() || 'english';
  if (normalizedLang === 'english' || normalizedLang === 'en') return text;
  
  const geminiConfig = getGeminiAgentConfig();
  const apiKey = geminiConfig.apiKey || getEnvVar('GEMINI_API_KEY');
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, skipping translation');
    return text;
  }
  
  const model = geminiConfig.model || 'gemini-2.0-flash-exp';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Translate the following ${fromLang} text to English. Only return the translation, nothing else.\n\n${text}`
        }]
      }]
    })
  });

  const data = await response.json();
  
  if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
    console.warn('Gemini API returned unexpected format, returning original text');
    return text;
  }
  
  const translatedText = data.candidates[0].content.parts[0]?.text?.trim();
  return translatedText || text;
}

/**
 * Retrieve relevant documents using RAG (vector search)
 * Falls back to keyword matching if ML service or RAG is unavailable
 */
async function retrieveRelevantDocs(
  query: string,
  language?: string
): Promise<Array<{content: string, source: string, link: string, title?: string}>> {
  const supabaseUrl = getEnvVar('SUPABASE_URL');
  const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  // Check if we have Supabase credentials
  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Supabase credentials not configured, using keyword fallback');
    return retrieveRelevantDocsKeywordFallback(query);
  }
  
  // Check if ML service is available for embeddings
  const mlServiceAvailable = await isMLServiceHealthy().catch(() => false);
  
  if (!mlServiceAvailable) {
    logger.warn('ML service not available, using keyword fallback');
    return retrieveRelevantDocsKeywordFallback(query);
  }
  
  try {
    // Step 1: Generate embedding for the query
    logger.info('Generating query embedding for RAG retrieval');
    const queryEmbedding = await getSingleEmbedding(query);
    
    if (!queryEmbedding || queryEmbedding.length === 0) {
      logger.warn('Failed to generate embedding, using keyword fallback');
      return retrieveRelevantDocsKeywordFallback(query);
    }
    
    // Step 2: Initialize RAG Retriever
    const retriever = new RAGRetriever(supabaseUrl, supabaseKey);
    
    // Step 3: Retrieve documents using vector search
    const retrievedDocs = await retriever.retrieve(queryEmbedding, {
      topK: 5,
      minSimilarity: 0.6, // Lower threshold for better recall
      language: language === 'en' ? 'en' : undefined, // Filter by language if English
    });
    
    if (retrievedDocs.length === 0) {
      logger.warn('No documents found via RAG, using keyword fallback');
      return retrieveRelevantDocsKeywordFallback(query);
    }
    
    logger.info(`Retrieved ${retrievedDocs.length} documents via RAG`, {
      similarities: retrievedDocs.map(d => d.similarity)
    });
    
    // Step 4: Convert RetrievedDocument format to expected format
    return retrievedDocs.map(doc => ({
      content: doc.content,
      source: doc.metadata.source,
      link: doc.metadata.link || doc.metadata.source,
      title: doc.metadata.title,
    }));
    
  } catch (error) {
    if (error instanceof Error) {
      logger.logError(error, {
        operation: 'rag_retrieval',
        query: query.substring(0, 100)
      });
    } else {
      logger.error('RAG retrieval failed', {
        operation: 'rag_retrieval',
        query: query.substring(0, 100),
        error: String(error)
      });
    }
    logger.warn('RAG retrieval failed, using keyword fallback');
    return retrieveRelevantDocsKeywordFallback(query);
  }
}

/**
 * Fallback keyword-based retrieval (used when RAG is unavailable)
 */
function retrieveRelevantDocsKeywordFallback(query: string): Array<{content: string, source: string, link: string}> {
  const results = [];
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('vaccin') || queryLower.includes('immuniz')) {
    results.push(HEALTH_KNOWLEDGE.vaccination);
  }
  if (queryLower.includes('fever') || queryLower.includes('temperature')) {
    results.push(HEALTH_KNOWLEDGE.fever);
  }
  if (queryLower.includes('malaria') || queryLower.includes('mosquito')) {
    results.push(HEALTH_KNOWLEDGE.malaria);
  }
  if (queryLower.includes('tb') || queryLower.includes('tuberculosis') || queryLower.includes('cough')) {
    results.push(HEALTH_KNOWLEDGE.tuberculosis);
  }
  if (queryLower.includes('diarr') || queryLower.includes('loose motion') || queryLower.includes('dehydrat')) {
    results.push(HEALTH_KNOWLEDGE.diarrhea);
  }
  
  // Return top 3 most relevant
  return results.slice(0, 3);
}

function detectEmergency(query: string): boolean {
  const queryLower = query.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => queryLower.includes(keyword));
}

async function generateResponse(query: string, retrievedDocs: any[]): Promise<{response: string, citations: string[]}> {
  // Use Gemini API directly for response generation
  const geminiConfig = getGeminiAgentConfig();
  const apiKey = geminiConfig.apiKey || getEnvVar('GEMINI_API_KEY');
  
  // Fallback response if no API key
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback response');
    const fallbackResponse = `Based on available health information regarding "${query}", please consult with a healthcare professional for accurate medical advice.`;
    const citations = retrievedDocs.length > 0 
      ? retrievedDocs.map(doc => `${doc.source}: ${doc.link}`)
      : ['General Health Guidelines - WHO'];
    return { response: fallbackResponse, citations };
  }
  
  // Build context from retrieved documents
  const context = retrievedDocs.map((doc, idx) => 
    `[Document ${idx + 1}]\nSource: ${doc.source}${doc.title ? `\nTitle: ${doc.title}` : ''}\nContent: ${doc.content}\nLink: ${doc.link || doc.source}`
  ).join('\n\n');
  
  const systemPrompt = `You are a public health assistant for rural India. Answer health questions accurately and compassionately.

IMPORTANT RULES:
1. Use the provided documents to answer the question
2. Always cite your sources using [Document X] format
3. Keep answers simple and actionable
4. If the question is outside your knowledge, direct users to visit nearest health center
5. Be culturally sensitive and use simple language

Available Context:
${context}`;

  const model = geminiConfig.model || 'gemini-2.0-flash-exp';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `${systemPrompt}\n\nQuestion: ${query}` }
        ]
      }],
      generationConfig: {
        temperature: geminiConfig.temperature,
        maxOutputTokens: geminiConfig.maxTokens,
      }
    })
  });
  
  const data = await response.json();
  
  // Handle API response safely
  if (!data || !data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0 || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
    console.warn('Gemini API returned unexpected format, using fallback');
    const fallbackResponse = `Based on available health information regarding "${query}", please consult with a healthcare professional for accurate medical advice.`;
    const citations = retrievedDocs.length > 0 
      ? retrievedDocs.map(doc => `${doc.source}: ${doc.link}`)
      : ['General Health Guidelines - WHO'];
    return { response: fallbackResponse, citations };
  }
  
  const aiResponse = data.candidates[0].content.parts[0]?.text?.trim() || `Based on available health information regarding "${query}", please consult with a healthcare professional for accurate medical advice.`;
  
  // Extract citations
  const citations = retrievedDocs.length > 0
    ? retrievedDocs.map(doc => `${doc.source}: ${doc.link}`)
    : ['General Health Guidelines - WHO'];
  
  return { response: aiResponse, citations };
}

export default async function healthQueryHandler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = logger.generateRequestId();
  const startTime = Date.now();

  try {
    const { user_language: userLanguage, query, channel, phone_number, sessionId } = await req.json();
    
    logger.logRequestStart(requestId, req.method, '/health-query', {
      query: query?.substring(0, 100),
      language: userLanguage,
      channel,
      phoneNumber: phone_number
    });
    
    console.log('Processing query:', { userLanguage, query, channel, phone_number, sessionId });
    
    // Router: Decide between Backend Fast Path or Gemini Agent Path
    const context: ConversationContext = {
      sessionId,
      previousQueries: await getSessionHistoryAsync(sessionId),
      metadata: {
        language: userLanguage
      }
    };
    
    const routingDecision = shouldUseAgentMode(query, context);
    
    // Log routing decision
    console.log('Routing decision:', {
      useAgent: routingDecision.useAgent,
      reason: routingDecision.reason,
      complexityScore: routingDecision.complexityScore,
      confidence: routingDecision.confidence
    });
    
    metrics.recordHistogram('router_complexity_score', routingDecision.complexityScore);
    metrics.incrementCounter(routingDecision.useAgent ? 'router_agent_path' : 'router_backend_path');
    
    // Detect language early (needed for both paths)
    const detectedLang = userLanguage || detectLanguage(query);
    
    // Route to Agent Path or Backend Fast Path
    if (routingDecision.useAgent) {
      try {
        const agentResponse = await runAgentOrchestration({
          query,
          language: detectedLang,
          sessionId,
          context
        });
        
        // Save agent response to database
        const supabase = await getSupabaseClient(
          getEnvVar('SUPABASE_URL') ?? '',
          getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: savedQuery, error: dbError } = await supabase
          .from('health_queries')
          .insert({
            user_language: detectedLang,
            original_query: query,
            translated_query: query, // Agent handles translation internally
            response: agentResponse.response,
            citations: agentResponse.citations,
            is_emergency: false, // Agent handles emergency detection
            accuracy_rating: 'pending',
            channel: channel || 'web',
            phone_number: phone_number || null
          })
          .select()
          .single();
        
        if (dbError) {
          console.error('Database error:', dbError);
        }
        
        const duration = Date.now() - startTime;
        
        // Record agent metrics
        metrics.incrementCounter('agent_requests_total');
        metrics.recordHistogram('agent_latency_ms', agentResponse.latency);
        metrics.recordHistogram('agent_cost_usd', agentResponse.costEstimate);
        metrics.recordHistogram('agent_tool_calls', agentResponse.toolCalls.length);
        
        logger.logRequestEnd(requestId, req.method, '/health-query', 200, duration, {
          mode: 'agent',
          toolCalls: agentResponse.toolCalls.length,
          complexityScore: routingDecision.complexityScore
        });
        
        return new Response(
          JSON.stringify({
            id: savedQuery?.id || 'unknown',
            translated_query: query,
            response: agentResponse.response,
            citations: agentResponse.citations,
            is_emergency: false,
            user_language: detectedLang,
            pipeline_mode: 'agent',
            tool_calls: agentResponse.toolCalls.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (agentError) {
        console.error('Agent orchestration failed, falling back to backend:', agentError);
        metrics.incrementCounter('agent_fallbacks_total');
        
        // Fallback to backend path (continue with existing backend logic below)
        logger.logError(agentError as Error, {
          requestId,
          operation: 'agent_orchestration',
          fallback: 'backend_rag'
        });
      }
    }
    
    // Backend Fast Path (default for simple queries or agent fallback)
    // Step 1: Translation (language already detected above)
    const translatedQuery = await translateText(query, detectedLang);
    
    console.log('Translation:', { detectedLang, translatedQuery });
    
    // Step 2: Emergency detection
    const isEmergency = detectEmergency(translatedQuery);
    
    // Step 3: Retrieve relevant documents (RAG with vector search)
    logger.info('Retrieving relevant documents via RAG', {
      query: translatedQuery.substring(0, 100),
      language: detectedLang
    });
    
    const retrievedDocs = await retrieveRelevantDocs(translatedQuery, detectedLang);
    
    logger.info('Retrieved documents', {
      count: retrievedDocs.length,
      sources: retrievedDocs.map(d => d.source)
    });
    
    console.log('Retrieved docs:', retrievedDocs.length);
    
    // Step 4: Generate response with AI
    const { response, citations } = await generateResponse(translatedQuery, retrievedDocs);
    
    // Step 5: Add emergency message and PHC lookup if needed
    let finalResponse = response;
    let nearestPHCs: any[] = [];
    
    if (isEmergency) {
      // Get nearest PHCs for emergency cases
      try {
        nearestPHCs = await findNearestFacilities({
          district: 'Cuttack', // Default district, could be inferred from phone
          limit: 3
        });
      } catch (error) {
        console.warn('Failed to fetch nearest PHCs:', error);
      }
      
      // Format PHC information
      let phcInfo = 'Please visit your local Primary Health Centre (PHC) or call 108 for ambulance services.';
      if (nearestPHCs.length > 0) {
        phcInfo = 'Nearest Health Facilities:\n';
        nearestPHCs.forEach((phc, index) => {
          phcInfo += `${index + 1}. ${phc.name} - ${phc.address}`;
          if (phc.phone) phcInfo += ` (${phc.phone})`;
          phcInfo += '\n';
        });
        phcInfo += '\nCall 108 for emergency ambulance services.';
      }
      
      finalResponse = `⚠️ EMERGENCY ALERT: This may be a medical emergency. Please seek immediate medical help.\n\n${phcInfo}\n\n---\n\n${response}`;
    }
    
    // Step 6: Save to database
    const supabaseUrl = getEnvVar('SUPABASE_URL') || '';
    const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    let savedQuery: any = null;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);
        
        const { data: queryData, error: dbError } = await supabase
          .from('health_queries')
          .insert({
            user_language: detectedLang,
            original_query: query,
            translated_query: translatedQuery,
            response: finalResponse,
            citations,
            is_emergency: isEmergency,
            accuracy_rating: 'pending',
            channel: channel || 'web',
            phone_number: phone_number || null
          })
          .select()
          .single();
        
        if (dbError) {
          console.error('Database error:', dbError);
        } else {
          savedQuery = queryData;
          console.log('Query saved to database:', savedQuery?.id);
        }
      } catch (dbErr) {
        console.warn('Failed to save to database:', dbErr);
      }
    } else {
      console.warn('Supabase credentials not configured, skipping database save');
    }
    
    const duration = Date.now() - startTime;
    
    // Record metrics
    metrics.incrementCounter('rag_requests_total');
    metrics.recordHistogram('rag_latency_ms_hist', duration);
    
    if (isEmergency) {
      metrics.incrementCounter('emergency_requests_total');
    }

    logger.logRequestEnd(requestId, req.method, '/health-query', 200, duration, {
      isEmergency,
      language: detectedLang,
      responseLength: finalResponse.length
    });

    // Persist conversation context (in-memory + optional Supabase)
    await saveSessionQueryAsync(sessionId, query);

    return new Response(
      JSON.stringify({
        id: savedQuery?.id || 'unknown',
        translated_query: translatedQuery,
        response: finalResponse,
        citations,
        is_emergency: isEmergency,
        user_language: detectedLang
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.logError(error as Error, { requestId, operation: 'health_query' });
    metrics.incrementCounter('rag_requests_failures_total');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to process health query'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
