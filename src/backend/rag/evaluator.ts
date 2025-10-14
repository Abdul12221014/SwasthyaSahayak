/**
 * RAG Evaluation Metrics
 * 
 * Evaluates RAG system performance:
 * - Retrieval quality (precision, recall, MRR)
 * - Answer quality (BLEU, ROUGE, semantic similarity)
 * - Latency metrics
 * 
 * @module backend/rag/evaluator
 */

export interface EvaluationResult {
  precision: number;
  recall: number;
  f1Score: number;
  meanReciprocalRank: number;
  avgLatency: number;
  retrievalAccuracy: number;
}

export interface EvaluationSample {
  query: string;
  groundTruthDocs: string[];  // IDs of relevant documents
  retrievedDocs: string[];    // IDs of retrieved documents
  latency: number;
}

export class RAGEvaluator {
  /**
   * Calculate precision: relevant retrieved / total retrieved
   */
  calculatePrecision(relevant: Set<string>, retrieved: Set<string>): number {
    if (retrieved.size === 0) return 0;
    
    const intersection = new Set([...relevant].filter(x => retrieved.has(x)));
    return intersection.size / retrieved.size;
  }

  /**
   * Calculate recall: relevant retrieved / total relevant
   */
  calculateRecall(relevant: Set<string>, retrieved: Set<string>): number {
    if (relevant.size === 0) return 0;
    
    const intersection = new Set([...relevant].filter(x => retrieved.has(x)));
    return intersection.size / relevant.size;
  }

  /**
   * Calculate F1 score: harmonic mean of precision and recall
   */
  calculateF1(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  /**
   * Calculate Mean Reciprocal Rank (MRR)
   */
  calculateMRR(samples: EvaluationSample[]): number {
    let sumReciprocalRank = 0;
    
    for (const sample of samples) {
      const retrieved = sample.retrievedDocs;
      const relevant = new Set(sample.groundTruthDocs);
      
      // Find rank of first relevant document
      let rank = 0;
      for (let i = 0; i < retrieved.length; i++) {
        if (relevant.has(retrieved[i])) {
          rank = i + 1;
          break;
        }
      }
      
      if (rank > 0) {
        sumReciprocalRank += 1 / rank;
      }
    }
    
    return sumReciprocalRank / samples.length;
  }

  /**
   * Comprehensive evaluation across multiple samples
   */
  evaluate(samples: EvaluationSample[]): EvaluationResult {
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalLatency = 0;
    let totalCorrect = 0;

    for (const sample of samples) {
      const relevant = new Set(sample.groundTruthDocs);
      const retrieved = new Set(sample.retrievedDocs);
      
      const precision = this.calculatePrecision(relevant, retrieved);
      const recall = this.calculateRecall(relevant, retrieved);
      
      totalPrecision += precision;
      totalRecall += recall;
      totalLatency += sample.latency;
      
      // Count as correct if at least one relevant doc was retrieved
      if (precision > 0) totalCorrect++;
    }

    const avgPrecision = totalPrecision / samples.length;
    const avgRecall = totalRecall / samples.length;
    const f1Score = this.calculateF1(avgPrecision, avgRecall);
    const mrr = this.calculateMRR(samples);
    const avgLatency = totalLatency / samples.length;
    const retrievalAccuracy = totalCorrect / samples.length;

    return {
      precision: avgPrecision,
      recall: avgRecall,
      f1Score,
      meanReciprocalRank: mrr,
      avgLatency,
      retrievalAccuracy
    };
  }

  /**
   * Log evaluation results
   */
  logResults(results: EvaluationResult): void {
    console.log('\n=== RAG Evaluation Results ===');
    console.log(`Precision: ${(results.precision * 100).toFixed(2)}%`);
    console.log(`Recall: ${(results.recall * 100).toFixed(2)}%`);
    console.log(`F1 Score: ${(results.f1Score * 100).toFixed(2)}%`);
    console.log(`Mean Reciprocal Rank: ${results.meanReciprocalRank.toFixed(3)}`);
    console.log(`Retrieval Accuracy: ${(results.retrievalAccuracy * 100).toFixed(2)}%`);
    console.log(`Average Latency: ${results.avgLatency.toFixed(0)}ms`);
    console.log('============================\n');
  }
}

