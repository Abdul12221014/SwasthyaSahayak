/**
 * Reranker for Retrieved Documents
 * 
 * Re-scores and reranks retrieved documents based on:
 * - Cross-encoder similarity
 * - Recency (for outbreak/epidemic data)
 * - Source credibility (WHO > MoHFW > others)
 * - Language match with query
 * 
 * @module backend/rag/reranker
 */

import { RetrievedDocument } from './retriever.ts';

export interface RerankingOptions {
  method?: 'simple' | 'cross-encoder' | 'hybrid';
  sourceWeights?: Record<string, number>;
  recencyWeight?: number;
  languageMatchBoost?: number;
}

export class Reranker {
  private sourceWeights: Record<string, number>;

  constructor() {
    // Default source credibility weights
    this.sourceWeights = {
      'WHO': 1.0,
      'MoHFW': 0.95,
      'UNICEF': 0.9,
      'ICMR': 0.85,
      'NIH': 0.85,
      'CDC': 0.8,
      'default': 0.7
    };
  }

  /**
   * Simple reranking based on metadata
   */
  simpleRerank(
    documents: RetrievedDocument[],
    queryLanguage?: string,
    options: RerankingOptions = {}
  ): RetrievedDocument[] {
    const {
      sourceWeights = this.sourceWeights,
      languageMatchBoost = 0.1
    } = options;

    const reranked = documents.map(doc => {
      let score = doc.similarity;

      // Apply source weight
      const source = doc.metadata.source;
      const sourceWeight = sourceWeights[source] || sourceWeights['default'];
      score *= sourceWeight;

      // Boost if language matches
      if (queryLanguage && doc.metadata.language === queryLanguage) {
        score += languageMatchBoost;
      }

      return {
        ...doc,
        similarity: Math.min(score, 1.0) // Cap at 1.0
      };
    });

    return reranked.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Diversify results to avoid redundancy
   */
  diversify(
    documents: RetrievedDocument[],
    maxPerCategory: number = 2
  ): RetrievedDocument[] {
    const categoryCount = new Map<string, number>();
    const diversified: RetrievedDocument[] = [];

    for (const doc of documents) {
      const category = doc.metadata.category || 'general';
      const count = categoryCount.get(category) || 0;

      if (count < maxPerCategory) {
        diversified.push(doc);
        categoryCount.set(category, count + 1);
      }
    }

    return diversified;
  }

  /**
   * Filter documents by relevance threshold
   */
  filterByThreshold(
    documents: RetrievedDocument[],
    threshold: number = 0.7
  ): RetrievedDocument[] {
    return documents.filter(doc => doc.similarity >= threshold);
  }
}

