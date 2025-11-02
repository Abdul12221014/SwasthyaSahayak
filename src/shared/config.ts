/**
 * Centralized Environment Configuration
 * 
 * Provides type-safe access to environment variables across the application.
 * Ensures single source of truth for all Supabase credentials.
 * 
 * @module shared/config
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  projectId: string;
}

export interface MLConfig {
  serviceUrl: string;
  geminiApiKey: string;
}

export interface VectorConfig {
  dimension: number;
  similarityThreshold: number;
  maxRetrievalResults: number;
}

export interface AppConfig {
  supabase: SupabaseConfig;
  ml: MLConfig;
  vector: VectorConfig;
  env: string;
}

/**
 * Get Supabase configuration (works in both Node.js and Deno)
 */
export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '',
    anonKey: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || '',
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') || '',
    projectId: getEnv('VITE_SUPABASE_PROJECT_ID') || ''
  };
}

/**
 * Get ML service configuration
 */
export function getMLConfig(): MLConfig {
  return {
    serviceUrl: getEnv('ML_SERVICE_URL') || 'http://localhost:8000',
    geminiApiKey: getEnv('GEMINI_API_KEY') || ''
  };
}

/**
 * Get Vector database configuration
 */
export function getVectorConfig(): VectorConfig {
  return {
    dimension: parseInt(getEnv('VECTOR_DIMENSION') || '768'),
    similarityThreshold: parseFloat(getEnv('SIMILARITY_THRESHOLD') || '0.7'),
    maxRetrievalResults: parseInt(getEnv('MAX_RETRIEVAL_RESULTS') || '10')
  };
}

/**
 * Get complete application configuration
 */
export function getAppConfig(): AppConfig {
  return {
    supabase: getSupabaseConfig(),
    ml: getMLConfig(),
    vector: getVectorConfig(),
    env: getEnv('NODE_ENV') || getEnv('ENV_NAME') || 'development'
  };
}

/**
 * Universal environment variable getter (works in both Deno and Node.js)
 */
function getEnv(key: string): string | undefined {
  // Try Deno first
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(key);
  }
  // Fallback to Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Validate that all required Supabase credentials are present
 */
export function validateSupabaseConfig(): { valid: boolean; missing: string[] } {
  const config = getSupabaseConfig();
  const missing: string[] = [];

  if (!config.url) missing.push('SUPABASE_URL');
  if (!config.anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!config.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.projectId) missing.push('VITE_SUPABASE_PROJECT_ID');

  return {
    valid: missing.length === 0,
    missing
  };
}

