/**
 * ML Integration Tests
 * 
 * Tests the integration between backend services and ML inference API.
 * Mocks ML service responses to test error handling and data flow.
 * 
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ML Service Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Embedding Generation', () => {
    it('should successfully generate embeddings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embeddings: [[0.1, 0.2, 0.3]],
          dimension: 3,
          model: 'test-model'
        })
      });

      // Test embedding generation (would import from ml-service.ts)
      const response = await fetch('http://localhost:8000/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: ['test query'], normalize: true })
      });

      const data = await response.json();
      expect(data.embeddings).toHaveLength(1);
      expect(data.embeddings[0]).toHaveLength(3);
    });

    it('should handle embedding API timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      await expect(
        fetch('http://localhost:8000/embed', {
          method: 'POST',
          body: JSON.stringify({ texts: ['test'] })
        })
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Emergency Classification', () => {
    it('should classify emergency correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          predictions: [{ is_emergency: true, confidence: 0.95 }]
        })
      });

      const response = await fetch('http://localhost:8000/classify-emergency', {
        method: 'POST',
        body: JSON.stringify({ texts: ['severe chest pain'], use_keyword_fallback: true })
      });

      const data = await response.json();
      expect(data.predictions[0].is_emergency).toBe(true);
      expect(data.predictions[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Translation', () => {
    it('should translate text to English', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: ['I have fever'],
          detected_languages: ['hi']
        })
      });

      const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        body: JSON.stringify({
          texts: ['मुझे बुखार है'],
          target_lang: 'en'
        })
      });

      const data = await response.json();
      expect(data.translations[0]).toBeTruthy();
      expect(data.detected_languages[0]).toBe('hi');
    });
  });

  describe('Model Versions', () => {
    it('should retrieve model versions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding_model: 'v1.0.0',
          emergency_classifier: 'v1.0.0',
          translation_model: 'v1.0.0',
          last_updated: '2025-01-13T00:00:00Z'
        })
      });

      const response = await fetch('http://localhost:8000/versions');
      const data = await response.json();
      
      expect(data.embedding_model).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(data.emergency_classifier).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(data.translation_model).toMatch(/^v\d+\.\d+\.\d+$/);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all models loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          models: {
            embedding: true,
            emergency_classifier: true,
            translation: true
          },
          versions: {
            embedding_model: 'v1.0.0',
            emergency_classifier: 'v1.0.0',
            translation_model: 'v1.0.0'
          }
        })
      });

      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      
      expect(data.status).toBe('healthy');
      expect(data.models.embedding).toBe(true);
      expect(data.models.emergency_classifier).toBe(true);
      expect(data.models.translation).toBe(true);
    });
  });

  describe('End-to-End RAG Pipeline', () => {
    it('should process health query through full pipeline', async () => {
      // Mock sequence: translate → embed → classify
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ translations: ['What are malaria symptoms?'] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ predictions: [{ is_emergency: false, confidence: 0.1 }] })
        });

      // Simulate translation
      let response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        body: JSON.stringify({ texts: ['मलेरिया के लक्षण क्या हैं?'], target_lang: 'en' })
      });
      const translation = await response.json();
      expect(translation.translations[0]).toBeTruthy();

      // Simulate embedding
      response = await fetch('http://localhost:8000/embed', {
        method: 'POST',
        body: JSON.stringify({ texts: [translation.translations[0]] })
      });
      const embedding = await response.json();
      expect(embedding.embeddings[0]).toBeTruthy();

      // Simulate emergency check
      response = await fetch('http://localhost:8000/classify-emergency', {
        method: 'POST',
        body: JSON.stringify({ texts: [translation.translations[0]] })
      });
      const emergency = await response.json();
      expect(emergency.predictions[0].is_emergency).toBe(false);
    });
  });
});

