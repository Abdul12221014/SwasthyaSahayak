/**
 * Shared Constants for SwasthyaSahayak
 * 
 * Application-wide constants and configuration values
 */

// Supported languages
export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'english',
  HINDI: 'hindi',
  ODIA: 'odia',
  ASSAMESE: 'assamese',
} as const;

export const LANGUAGE_CODES = {
  english: 'en',
  hindi: 'hi',
  odia: 'or',
  assamese: 'as',
} as const;

export const LANGUAGE_DISPLAY_NAMES = {
  english: 'English',
  hindi: 'हिंदी (Hindi)',
  odia: 'ଓଡ଼ିଆ (Odia)',
  assamese: 'অসমীয়া (Assamese)',
} as const;

// Communication channels
export const CHANNELS = {
  WEB: 'web',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
} as const;

// Emergency keywords (multi-language)
export const EMERGENCY_KEYWORDS = {
  english: [
    'chest pain', 'heart attack', 'severe breathing', "can't breathe",
    'difficulty breathing', 'unconscious', 'seizure', 'heavy bleeding',
    'severe injury', 'stroke', 'anaphylaxis', 'baby not breathing',
  ],
  hindi: [
    'सीने में दर्द', 'हार्ट अटैक', 'सांस लेने में तकलीफ', 'बेहोश',
    'दौरा', 'भारी रक्तस्राव', 'गंभीर चोट',
  ],
  odia: [
    'ଛାତି ବଥା', 'ହାର୍ଟ ଆଟାକ୍', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ', 'ଚେତାଶୂନ୍ୟ',
  ],
  assamese: [
    'বুকুৰ বিষ', 'হাৰ্ট এটেক', 'উশাহ লোৱাত কষ্ট', 'অজ্ঞান',
  ],
} as const;

// Health categories
export const HEALTH_CATEGORIES = {
  VACCINATION: 'vaccination',
  FEVER: 'fever',
  MALARIA: 'malaria',
  TUBERCULOSIS: 'tuberculosis',
  DIARRHEA: 'diarrhea',
  MATERNAL_HEALTH: 'maternal_health',
  CHILD_HEALTH: 'child_health',
  EMERGENCY: 'emergency',
} as const;

// Trusted sources
export const TRUSTED_SOURCES = {
  WHO: 'WHO',
  MOHFW: 'MoHFW',
  UNICEF: 'UNICEF',
  ICMR: 'ICMR',
  NIH: 'NIH',
  CDC: 'CDC',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  HEALTH_QUERY: '/health-query',
  ADMIN_QUERIES: '/admin-queries',
  WHATSAPP_WEBHOOK: '/whatsapp-webhook',
  SMS_WEBHOOK: '/sms-webhook',
  ML_EMBED: '/embed',
  ML_CLASSIFY: '/classify-emergency',
  ML_TRANSLATE: '/translate',
} as const;

// Configuration defaults
export const CONFIG = {
  MAX_QUERY_LENGTH: 500,
  MAX_RESPONSE_LENGTH: 2000,
  SMS_MAX_LENGTH: 300,
  EMBEDDING_DIMENSION: 768,
  TOP_K_DOCUMENTS: 5,
  MIN_SIMILARITY_THRESHOLD: 0.7,
  EMERGENCY_CONFIDENCE_THRESHOLD: 0.75,
} as const;

// Emergency contact numbers (India)
export const EMERGENCY_CONTACTS = {
  AMBULANCE: '108',
  HEALTH_HELPLINE: '104',
  POLICE: '100',
  WOMEN_HELPLINE: '1091',
  CHILD_HELPLINE: '1098',
} as const;

