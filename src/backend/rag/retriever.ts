/**
 * RAG Retriever for Health Knowledge Base
 * 
 * Retrieves relevant medical documents using pgvector similarity search.
 * Supports semantic search across multilingual health documents.
 * 
 * @module backend/rag/retriever
 */

// @ts-ignore - Deno runtime module
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    title: string;
    language: string;
    category?: string;
    link?: string;
  };
  similarity: number;
}

export interface RetrievalOptions {
  topK?: number;
  minSimilarity?: number;
  language?: string;
  category?: string;
}

export class RAGRetriever {
  private supabase: SupabaseClient;
  private tableName: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    tableName: string = 'health_documents'
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tableName = tableName;
  }

  /**
   * Retrieve documents similar to query embedding
   * 
   * @param queryEmbedding - Vector representation of the query
   * @param options - Retrieval configuration
   * @returns Array of relevant documents with similarity scores
   */
  async retrieve(
    queryEmbedding: number[],
    options: RetrievalOptions = {}
  ): Promise<RetrievedDocument[]> {
    const {
      topK = 5,
      minSimilarity = 0.7,
      language,
      category
    } = options;

    try {
      // Build query with filters using Supabase Vector
      const { data, error } = await this.supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: minSimilarity,
          match_count: topK
        });

      if (error) {
        console.error('Retrieval error:', error);
        throw error;
      }

      // Filter results by language and category if specified
      let filteredData = data || [];
      
      if (language) {
        filteredData = filteredData.filter((doc: any) => 
          doc.metadata?.language === language
        );
      }
      
      if (category) {
        filteredData = filteredData.filter((doc: any) => 
          doc.metadata?.category === category
        );
      }

      // Supabase RPC returns: { id, content, metadata, similarity }
      return filteredData.map((doc: any) => ({
        id: doc.id || doc.id?.toString(),
        content: doc.content || '',
        metadata: doc.metadata || {
          source: doc.source || 'unknown',
          title: doc.title || '',
          language: doc.language || 'en',
          category: doc.category,
          link: doc.link
        },
        similarity: doc.similarity || 0
      }));

    } catch (error) {
      console.error('Failed to retrieve documents:', error);
      return [];
    }
  }

  /**
   * Hybrid search: combines vector similarity with keyword matching
   * 
   * @param queryEmbedding - Vector representation
   * @param keywords - Keywords for text search
   * @param options - Retrieval configuration
   */
  async hybridSearch(
    queryEmbedding: number[],
    keywords: string[],
    options: RetrievalOptions = {}
  ): Promise<RetrievedDocument[]> {
    const vectorResults = await this.retrieve(queryEmbedding, options);
    
    // Simple keyword boosting (can be enhanced with BM25)
    const boostedResults = vectorResults.map(doc => {
      const content = doc.content.toLowerCase();
      const matchCount = keywords.filter(kw => 
        content.includes(kw.toLowerCase())
      ).length;
      
      return {
        ...doc,
        similarity: doc.similarity + (matchCount * 0.05) // Boost score
      };
    });

    return boostedResults.sort((a, b) => b.similarity - a.similarity);
  }
}

/**
 * Simple keyword-based retrieval for fallback
 * (Used when embeddings are not available)
 */
export class KeywordRetriever {
  private knowledgeBase: Map<string, RetrievedDocument>;

  constructor(knowledgeBase: Record<string, any>) {
    this.knowledgeBase = new Map();
    
    Object.entries(knowledgeBase).forEach(([key, value]) => {
      this.knowledgeBase.set(key, {
        id: key,
        content: value.content,
        metadata: {
          source: value.source,
          title: key,
          language: 'english',
          link: value.link
        },
        similarity: 0
      });
    });
  }

  retrieve(query: string, topK: number = 3): RetrievedDocument[] {
    const queryLower = query.toLowerCase();
    const results: RetrievedDocument[] = [];

    this.knowledgeBase.forEach((doc, key) => {
      if (queryLower.includes(key.toLowerCase())) {
        results.push({ ...doc, similarity: 0.9 });
      }
    });

    return results.slice(0, topK);
  }
}

