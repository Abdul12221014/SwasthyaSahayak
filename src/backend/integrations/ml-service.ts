/**
 * ML Service Integration Client
 * 
 * TypeScript client for interfacing with the Python ML inference service.
 * Provides type-safe methods for embeddings, classification, and translation.
 * 
 * @module backend/integrations/ml-service
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 3000; // 3 seconds max

/**
 * Model version information
 */
export interface ModelVersions {
  embedding_model: string;
  emergency_classifier: string;
  translation_model: string;
}

/**
 * Embedding response from ML service
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  dimension: number;
  model: string;
}

/**
 * Emergency classification response
 */
export interface EmergencyClassification {
  is_emergency: boolean;
  confidence: number;
}

/**
 * Translation response
 */
export interface TranslationResponse {
  translations: string[];
  detected_languages: string[];
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`ML Service timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Generate embeddings for text(s)
 * 
 * @param texts - Single text or array of texts to embed
 * @param normalize - Whether to L2 normalize embeddings (default: true)
 * @returns Embedding vectors
 */
export async function getEmbeddings(
  texts: string | string[],
  normalize: boolean = true
): Promise<number[][]> {
  const textsArray = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: textsArray,
        normalize,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.embeddings;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Get single embedding for text
 */
export async function getSingleEmbedding(text: string): Promise<number[]> {
  const embeddings = await getEmbeddings(text);
  return embeddings[0];
}

/**
 * Classify emergency status of health query
 * 
 * @param texts - Health queries to classify
 * @param useKeywordFallback - Whether to use keyword matching as fallback
 * @returns Emergency classification results
 */
export async function classifyEmergency(
  texts: string | string[],
  useKeywordFallback: boolean = true
): Promise<EmergencyClassification[]> {
  const textsArray = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/classify-emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: textsArray,
        use_keyword_fallback: useKeywordFallback,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.predictions;
  } catch (error) {
    console.error('Emergency classification failed:', error);
    
    // Fallback: keyword-based emergency detection
    console.log('Using fallback emergency detection');
    return textsArray.map(text => ({
      is_emergency: containsEmergencyKeywords(text),
      confidence: 0.5,
    }));
  }
}

/**
 * Fallback keyword-based emergency detection
 */
function containsEmergencyKeywords(text: string): boolean {
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'severe breathing', "can't breathe",
    'unconscious', 'seizure', 'heavy bleeding', 'severe injury',
    'सीने में दर्द', 'हार्ट अटैक', 'बेहोश',
  ];
  
  const textLower = text.toLowerCase();
  return emergencyKeywords.some(keyword => textLower.includes(keyword));
}

/**
 * Translate text to English
 * 
 * @param texts - Text(s) to translate
 * @param sourceLang - Source language (auto-detected if not provided)
 * @returns Translated text(s) in English
 */
export async function translateToEnglish(
  texts: string | string[],
  sourceLang?: string
): Promise<string[]> {
  const textsArray = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: textsArray,
        source_lang: sourceLang,
        target_lang: 'en',
      }),
    });

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    const data: TranslationResponse = await response.json();
    return data.translations;
  } catch (error) {
    console.error('Translation to English failed:', error);
    // Return original text as fallback
    return textsArray;
  }
}

/**
 * Translate text from English to target language
 * 
 * @param texts - English text(s) to translate
 * @param targetLang - Target language code (hi, or, as)
 * @returns Translated text(s)
 */
export async function translateFromEnglish(
  texts: string | string[],
  targetLang: string
): Promise<string[]> {
  const textsArray = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: textsArray,
        source_lang: 'en',
        target_lang: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    const data: TranslationResponse = await response.json();
    return data.translations;
  } catch (error) {
    console.error(`Translation from English to ${targetLang} failed:`, error);
    // Return English text as fallback
    return textsArray;
  }
}

/**
 * Get model versions from ML service
 * 
 * @returns Model version information
 */
export async function getModelVersions(): Promise<ModelVersions | null> {
  try {
    const response = await fetchWithTimeout(
      `${ML_SERVICE_URL}/versions`,
      { method: 'GET' },
      1000 // Shorter timeout for health check
    );

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get model versions:', error);
    return null;
  }
}

/**
 * Check if ML service is healthy
 * 
 * @returns True if service is reachable
 */
export async function isMLServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${ML_SERVICE_URL}/health`,
      { method: 'GET' },
      1000
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Batch process health queries with ML pipeline
 * 
 * @param queries - Array of health queries
 * @returns Processed results with embeddings, translations, emergency flags
 */
export async function batchProcessQueries(queries: Array<{
  text: string;
  language: string;
}>) {
  // Extract texts
  const texts = queries.map(q => q.text);
  
  // Parallel processing
  const [translations, emergencies] = await Promise.all([
    translateToEnglish(texts),
    classifyEmergency(texts),
  ]);

  // Generate embeddings for translated texts
  const embeddings = await getEmbeddings(translations);

  // Combine results
  return queries.map((query, i) => ({
    originalText: query.text,
    language: query.language,
    translatedText: translations[i],
    embedding: embeddings[i],
    isEmergency: emergencies[i].is_emergency,
    emergencyConfidence: emergencies[i].confidence,
  }));
}

