/**
 * Embedder Service
 * 
 * Generates embeddings for text using either:
 * 1. Custom ML model inference service
 * 2. OpenAI API
 * 3. Lovable AI Gateway
 * 
 * @module backend/rag/embedder
 */

export interface EmbeddingOptions {
  model?: string;
  normalize?: boolean;
  batchSize?: number;
}

export class Embedder {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(
    apiKey: string,
    apiUrl: string = 'https://api.openai.com/v1/embeddings',
    model: string = 'text-embedding-3-small'
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
  }

  /**
   * Generate embeddings for text(s)
   * 
   * @param texts - Single text or array of texts
   * @param options - Embedding configuration
   * @returns Array of embedding vectors
   */
  async embed(
    texts: string | string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    const { model = this.model, batchSize = 100 } = options;

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < textsArray.length; i += batchSize) {
      const batch = textsArray.slice(i, i + batchSize);
      
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: batch,
            model: model,
          }),
        });

        if (!response.ok) {
          throw new Error(`Embedding API error: ${response.statusText}`);
        }

        const data = await response.json();
        const embeddings = data.data.map((item: any) => item.embedding);
        allEmbeddings.push(...embeddings);

      } catch (error) {
        console.error(`Error generating embeddings for batch ${i}:`, error);
        throw error;
      }
    }

    return allEmbeddings;
  }

  /**
   * Generate single embedding
   */
  async embedSingle(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const embeddings = await this.embed(text, options);
    return embeddings[0];
  }
}

/**
 * ML Model Inference Service Embedder
 * Connects to local Python ML inference service
 */
export class MLModelEmbedder extends Embedder {
  constructor(
    mlServiceUrl: string = 'http://localhost:8000',
    model: string = 'embedding_model_v1'
  ) {
    super('', `${mlServiceUrl}/embed`, model);
  }

  async embed(texts: string | string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    const { model = this.model, normalize = true } = options;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: textsArray,
          model: model,
          normalize: normalize
        }),
      });

      if (!response.ok) {
        throw new Error(`ML Service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings;

    } catch (error) {
      console.error('Error calling ML embedding service:', error);
      throw error;
    }
  }
}

