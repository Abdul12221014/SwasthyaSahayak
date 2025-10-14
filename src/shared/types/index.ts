/**
 * Shared TypeScript Types for SwasthyaSahayak
 * 
 * Common types used across frontend and backend
 */

// Language types
export type SupportedLanguage = 'english' | 'hindi' | 'odia' | 'assamese';
export type LanguageCode = 'en' | 'hi' | 'or' | 'as';

// Communication channels
export type Channel = 'web' | 'whatsapp' | 'sms';

// Health query interfaces
export interface HealthQuery {
  id: string;
  userLanguage: SupportedLanguage;
  originalQuery: string;
  translatedQuery?: string;
  response?: string;
  citations?: string[];
  isEmergency: boolean;
  accuracyRating?: 'correct' | 'incorrect' | 'pending';
  channel: Channel;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Message types for chat interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  isEmergency?: boolean;
  language?: SupportedLanguage;
  timestamp?: Date;
}

// RAG document type
export interface HealthDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    title: string;
    language: SupportedLanguage;
    category?: string;
    link?: string;
  };
  embedding?: number[];
  similarity?: number;
}

// API response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthQueryResponse {
  id: string;
  translatedQuery: string;
  response: string;
  citations: string[];
  isEmergency: boolean;
  userLanguage: SupportedLanguage;
}

// Analytics types
export interface Analytics {
  totalQueries: number;
  emergencyCount: number;
  accuracyPercentage: number;
  languageDistribution: Record<SupportedLanguage, number>;
  channelDistribution: Record<Channel, number>;
  topQueries: Array<{ word: string; count: number }>;
  weeklyEmergencies: number;
  ratedQueriesCount: number;
}

// ML Model types
export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  normalize?: boolean;
}

export interface EmergencyClassificationRequest {
  texts: string[];
  useKeywordFallback?: boolean;
}

export interface TranslationRequest {
  texts: string[];
  sourceLang?: LanguageCode;
  targetLang: LanguageCode;
}

