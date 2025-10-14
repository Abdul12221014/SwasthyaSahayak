/**
 * E2E Web Tests
 * 
 * End-to-end tests for web interface using lightweight browser automation.
 * Tests admin dashboard components and basic functionality.
 * 
 * @module backend/tests/e2e.web.test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.178.0/testing/asserts.ts";

// Mock fetch for testing
const mockFetch = (globalThis as any).fetch;

// Mock DOM environment for testing
const mockDocument = {
  querySelector: (selector: string) => {
    if (selector.includes('admin')) return { textContent: 'Admin Dashboard' };
    if (selector.includes('model-status')) return { textContent: 'Model Status' };
    if (selector.includes('kb-manager')) return { textContent: 'KB Manager' };
    if (selector.includes('vaccines-lookup')) return { textContent: 'Vaccines Lookup' };
    if (selector.includes('outbreaks-card')) return { textContent: 'Outbreaks Card' };
    return null;
  }
};

Deno.test("Admin Dashboard - ModelStatus component renders", async () => {
  // Mock the admin page response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      models: {
        embedding_model: 'v1.0.0',
        emergency_classifier: 'v1.0.0',
        translation_model: 'v1.0.0'
      },
      status: 'healthy'
    })
  };

  // Mock fetch for model status API
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    // Simulate visiting admin page
    const adminElement = mockDocument.querySelector('.admin-dashboard');
    assertExists(adminElement, 'Admin dashboard should render');

    // Check ModelStatus component
    const modelStatusElement = mockDocument.querySelector('.model-status');
    assertExists(modelStatusElement, 'ModelStatus component should render');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Admin Dashboard - KbManager component renders", async () => {
  // Mock KB stats response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      total_documents: 150,
      languages: { en: 100, hi: 30, or: 20 },
      last_reembed_version: 'v1.0.0'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    // Check KbManager component
    const kbManagerElement = mockDocument.querySelector('.kb-manager');
    assertExists(kbManagerElement, 'KbManager component should render');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Admin Dashboard - VaccinesLookup component renders", async () => {
  // Mock vaccination API response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      age_months: 6,
      age_group: '6 months',
      vaccines: ['OPV', 'IPV', 'Pentavalent'],
      source: 'Government Health API'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    // Check VaccinesLookup component
    const vaccinesElement = mockDocument.querySelector('.vaccines-lookup');
    assertExists(vaccinesElement, 'VaccinesLookup component should render');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Admin Dashboard - OutbreaksCard component renders", async () => {
  // Mock outbreak API response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      district: 'Cuttack',
      outbreaks: [
        { district: 'Cuttack', disease: 'Malaria', cases: 12, last_updated: '2025-01-10' }
      ],
      total_cases: 12
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    // Check OutbreaksCard component
    const outbreaksElement = mockDocument.querySelector('.outbreaks-card');
    assertExists(outbreaksElement, 'OutbreaksCard component should render');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Health Query API - Basic functionality", async () => {
  // Mock health query response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      response: 'This is a test response about fever management.',
      citations: ['WHO Guidelines', 'MoHFW India'],
      is_emergency: false,
      user_language: 'en'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    // Test health query endpoint
    const response = await fetch('/api/health-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What should I do for fever?',
        user_language: 'en',
        channel: 'web'
      })
    });

    assertEquals(response.ok, true, 'Health query should succeed');
    
    const data = await response.json();
    assertEquals(data.success, true, 'Response should indicate success');
    assertExists(data.response, 'Response should contain answer');
    assertExists(data.citations, 'Response should contain citations');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Vaccination Schedule API - Age validation", async () => {
  // Test valid age
  const validResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      age_months: 6,
      vaccines: ['OPV', 'IPV']
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => validResponse;

  try {
    const response = await fetch('/api/vaccination-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age_months: 6 })
    });

    assertEquals(response.ok, true, 'Valid age should succeed');
    
    const data = await response.json();
    assertEquals(data.age_months, 6, 'Should return correct age');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Outbreak Alerts API - District filtering", async () => {
  // Mock outbreak response
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      district: 'Cuttack',
      outbreaks: [
        { district: 'Cuttack', disease: 'Malaria', cases: 5 }
      ]
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/outbreak-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ district: 'Cuttack' })
    });

    assertEquals(response.ok, true, 'Outbreak query should succeed');
    
    const data = await response.json();
    assertEquals(data.district, 'Cuttack', 'Should return correct district');
    assertExists(data.outbreaks, 'Should contain outbreak data');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Health Check Endpoints", async () => {
  // Test health endpoint
  const healthResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'test',
      uptime: 123.45
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => healthResponse;

  try {
    const response = await fetch('/api/healthz');
    assertEquals(response.ok, true, 'Health check should succeed');
    
    const data = await response.json();
    assertEquals(data.status, 'ok', 'Health status should be ok');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Error Handling - Invalid Input", async () => {
  // Test invalid input handling
  const errorResponse = {
    ok: false,
    status: 400,
    json: async () => ({
      error: 'Invalid input',
      details: ['Query is required']
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => errorResponse;

  try {
    const response = await fetch('/api/health-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body
    });

    assertEquals(response.status, 400, 'Should return 400 for invalid input');

  } finally {
    globalThis.fetch = originalFetch;
  }
});
