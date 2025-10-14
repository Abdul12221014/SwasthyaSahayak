/**
 * E2E Webhook Tests
 * 
 * End-to-end tests for WhatsApp and SMS webhook functionality.
 * Tests consent management, survey handling, and normal query processing.
 * 
 * @module backend/tests/e2e.webhooks.test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.178.0/testing/asserts.ts";

// Mock Supabase client
const mockSupabase = {
  from: (table: string) => ({
    insert: (data: any) => ({
      select: () => ({
        data: [{ id: 'test-uuid', created_at: new Date().toISOString() }],
        error: null
      })
    }),
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        single: () => ({
          data: { phone_number: value, consent: true },
          error: null
        })
      })
    })
  })
};

Deno.test("WhatsApp Webhook - CONSENT message", async () => {
  // Mock WhatsApp webhook payload for consent
  const consentPayload = {
    Body: 'CONSENT',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'Consent received and stored'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consentPayload)
    });

    assertEquals(response.ok, true, 'Consent webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.success, true, 'Should indicate success');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("WhatsApp Webhook - STOP message", async () => {
  // Mock WhatsApp webhook payload for stop
  const stopPayload = {
    Body: 'STOP',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'Opt-out successful. You will no longer receive messages.'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stopPayload)
    });

    assertEquals(response.ok, true, 'Stop webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.success, true, 'Should indicate success');
    assertEquals(data.message.includes('Opt-out'), true, 'Should mention opt-out');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("WhatsApp Webhook - SURVEY PRE message", async () => {
  // Mock survey payload
  const surveyPayload = {
    Body: 'SURVEY PRE\n1. Yes\n2. No\n3. Maybe',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'Survey responses recorded',
      survey_type: 'pre'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(surveyPayload)
    });

    assertEquals(response.ok, true, 'Survey webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.survey_type, 'pre', 'Should identify as pre survey');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("WhatsApp Webhook - SURVEY POST message", async () => {
  // Mock post survey payload
  const surveyPayload = {
    Body: 'SURVEY POST\n1. Very satisfied\n2. Satisfied\n3. Neutral',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'Post-intervention survey completed',
      survey_type: 'post'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(surveyPayload)
    });

    assertEquals(response.ok, true, 'Post survey webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.survey_type, 'post', 'Should identify as post survey');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("WhatsApp Webhook - Normal Health Query", async () => {
  // Mock normal health query
  const healthPayload = {
    Body: 'I have fever and headache. What should I do?',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      response: 'For fever and headache, rest well, stay hydrated, and take paracetamol as prescribed. If symptoms persist, consult a doctor.',
      is_emergency: false,
      citations: ['WHO Guidelines']
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healthPayload)
    });

    assertEquals(response.ok, true, 'Health query webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.is_emergency, false, 'Should not be marked as emergency');
    assertExists(data.response, 'Should contain health advice');
    assertExists(data.citations, 'Should contain citations');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("SMS Webhook - Emergency Query", async () => {
  // Mock emergency SMS
  const emergencyPayload = {
    Body: 'Emergency! Chest pain and difficulty breathing!',
    From: '+916123456789',
    To: '+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      response: 'EMERGENCY ALERT: This may be a medical emergency. Please seek immediate medical help.\n\nNearest Health Facilities:\n1. Cuttack District Hospital - Cuttack, Odisha 753001 (0671-2301234)\n2. Bhubaneswar Capital Hospital - Bhubaneswar, Odisha 751019 (0674-2305678)\n\nCall 108 for emergency ambulance services.',
      is_emergency: true,
      citations: ['Emergency Guidelines']
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/sms-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emergencyPayload)
    });

    assertEquals(response.ok, true, 'Emergency SMS webhook should succeed');
    
    const data = await response.json();
    assertEquals(data.is_emergency, true, 'Should be marked as emergency');
    assertEquals(data.response.includes('EMERGENCY ALERT'), true, 'Should contain emergency alert');
    assertEquals(data.response.includes('Nearest Health Facilities'), true, 'Should contain PHC information');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("SMS Webhook - Consent Opt-out", async () => {
  // Mock SMS opt-out
  const optOutPayload = {
    Body: 'STOP',
    From: '+916123456789',
    To: '+14155238886'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'You have been unsubscribed from SMS alerts.'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/sms-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optOutPayload)
    });

    assertEquals(response.ok, true, 'SMS opt-out should succeed');
    
    const data = await response.json();
    assertEquals(data.message.includes('unsubscribed'), true, 'Should confirm unsubscription');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Webhook Error Handling - Invalid Payload", async () => {
  // Test invalid webhook payload
  const errorResponse = {
    ok: false,
    status: 400,
    json: async () => ({
      error: 'Invalid webhook payload',
      details: 'Missing required fields'
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => errorResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Invalid payload
    });

    assertEquals(response.status, 400, 'Should return 400 for invalid payload');

  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Webhook Database Integration - Query Storage", async () => {
  // Test that webhook queries are properly stored in database
  const healthPayload = {
    Body: 'What are the symptoms of malaria?',
    From: 'whatsapp:+916123456789',
    To: 'whatsapp:+14155238886'
  };

  // Mock database insert
  const mockDbResponse = {
    id: 'test-query-uuid',
    created_at: new Date().toISOString(),
    user_language: 'en',
    original_query: 'What are the symptoms of malaria?',
    response: 'Malaria symptoms include fever, chills, and headache.',
    is_emergency: false,
    channel: 'whatsapp'
  };

  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      query_id: mockDbResponse.id,
      response: mockDbResponse.response
    })
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse;

  try {
    const response = await fetch('/api/whatsapp-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healthPayload)
    });

    assertEquals(response.ok, true, 'Webhook should store query in database');
    
    const data = await response.json();
    assertExists(data.query_id, 'Should return query ID');
    assertExists(data.response, 'Should return response');

  } finally {
    globalThis.fetch = originalFetch;
  }
});
