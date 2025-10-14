/**
 * Government API Tests
 * 
 * Tests vaccination schedule and outbreak alerts with feature flags,
 * API failures, and curated fallback data.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.178.0/testing/mock.ts";
import { getVaccinesByAge, getOutbreaksByDistrict, validateAgeMonths, getAvailableDistricts } from "@/backend/integrations/gov-api.ts";

// Mock fetch for API tests
const mockFetch = stub(globalThis, "fetch");

Deno.test("getVaccinesByAge - feature flag disabled returns curated data", async () => {
  // Disable feature flag
  Deno.env.set('FEATURE_VACCINATION_API', 'false');
  
  const schedule = await getVaccinesByAge(6);
  
  assertEquals(schedule.age_months, 6);
  assertExists(schedule.vaccines);
  assertEquals(schedule.vaccines.length > 0, true);
  assertEquals(schedule.vaccines.includes('OPV'), true);
  
  // Reset
  Deno.env.set('FEATURE_VACCINATION_API', 'true');
});

Deno.test("getVaccinesByAge - API failure returns curated data", async () => {
  // Enable feature flag but mock API failure
  Deno.env.set('FEATURE_VACCINATION_API', 'true');
  Deno.env.set('ODISHA_HEALTH_API_BASE', 'https://api.test.com');
  Deno.env.set('ODISHA_HEALTH_API_KEY', 'test-key');
  
  // Mock fetch to return error
  mockFetch.mockImplementation(() => 
    Promise.reject(new Error('Network error'))
  );
  
  const schedule = await getVaccinesByAge(12);
  
  assertEquals(schedule.age_months, 12);
  assertExists(schedule.vaccines);
  assertEquals(schedule.vaccines.length > 0, true);
  
  mockFetch.restore();
});

Deno.test("getVaccinesByAge - API success returns API data", async () => {
  // Enable feature flag and mock successful API response
  Deno.env.set('FEATURE_VACCINATION_API', 'true');
  Deno.env.set('ODISHA_HEALTH_API_BASE', 'https://api.test.com');
  Deno.env.set('ODISHA_HEALTH_API_KEY', 'test-key');
  
  const mockApiResponse = {
    age_months: 6,
    vaccines: ['BCG', 'Hepatitis B', 'OPV']
  };
  
  mockFetch.mockImplementation(() => 
    Promise.resolve(new Response(JSON.stringify(mockApiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
  );
  
  const schedule = await getVaccinesByAge(6);
  
  assertEquals(schedule.age_months, 6);
  assertEquals(schedule.vaccines, ['BCG', 'Hepatitis B', 'OPV']);
  
  mockFetch.restore();
});

Deno.test("getOutbreaksByDistrict - feature flag disabled returns curated data", async () => {
  // Disable feature flag
  Deno.env.set('FEATURE_OUTBREAK_API', 'false');
  
  const outbreaks = await getOutbreaksByDistrict('Cuttack');
  
  assertEquals(Array.isArray(outbreaks), true);
  if (outbreaks.length > 0) {
    assertEquals(outbreaks[0].district, 'Cuttack');
    assertExists(outbreaks[0].disease);
    assertExists(outbreaks[0].cases);
    assertExists(outbreaks[0].last_updated);
  }
  
  // Reset
  Deno.env.set('FEATURE_OUTBREAK_API', 'true');
});

Deno.test("getOutbreaksByDistrict - API failure returns curated data", async () => {
  // Enable feature flag but mock API failure
  Deno.env.set('FEATURE_OUTBREAK_API', 'true');
  Deno.env.set('ODISHA_HEALTH_API_BASE', 'https://api.test.com');
  Deno.env.set('ODISHA_HEALTH_API_KEY', 'test-key');
  
  // Mock fetch to return error
  mockFetch.mockImplementation(() => 
    Promise.reject(new Error('Network error'))
  );
  
  const outbreaks = await getOutbreaksByDistrict('Bhubaneswar');
  
  assertEquals(Array.isArray(outbreaks), true);
  
  mockFetch.restore();
});

Deno.test("getOutbreaksByDistrict - API success returns API data", async () => {
  // Enable feature flag and mock successful API response
  Deno.env.set('FEATURE_OUTBREAK_API', 'true');
  Deno.env.set('ODISHA_HEALTH_API_BASE', 'https://api.test.com');
  Deno.env.set('ODISHA_HEALTH_API_KEY', 'test-key');
  
  const mockApiResponse = {
    outbreaks: [
      { district: 'Cuttack', disease: 'Malaria', cases: 15, last_updated: '2025-01-10' }
    ]
  };
  
  mockFetch.mockImplementation(() => 
    Promise.resolve(new Response(JSON.stringify(mockApiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
  );
  
  const outbreaks = await getOutbreaksByDistrict('Cuttack');
  
  assertEquals(outbreaks.length, 1);
  assertEquals(outbreaks[0].district, 'Cuttack');
  assertEquals(outbreaks[0].disease, 'Malaria');
  assertEquals(outbreaks[0].cases, 15);
  
  mockFetch.restore();
});

Deno.test("validateAgeMonths - validates age correctly", () => {
  assertEquals(validateAgeMonths(0), true);
  assertEquals(validateAgeMonths(6), true);
  assertEquals(validateAgeMonths(216), true); // 18 years
  assertEquals(validateAgeMonths(-1), false);
  assertEquals(validateAgeMonths(217), false); // Over 18 years
  assertEquals(validateAgeMonths(12.5), true); // Decimal months
});

Deno.test("getAvailableDistricts - returns district list", () => {
  const districts = getAvailableDistricts();
  
  assertEquals(Array.isArray(districts), true);
  assertEquals(districts.length > 0, true);
  assertEquals(districts.includes('Cuttack'), true);
  assertEquals(districts.includes('Bhubaneswar'), true);
});

Deno.test("getVaccinesByAge - handles edge cases", async () => {
  // Test very young age
  const newborn = await getVaccinesByAge(0);
  assertEquals(newborn.age_months, 0);
  assertExists(newborn.vaccines);
  
  // Test older age
  const teenager = await getVaccinesByAge(180);
  assertEquals(teenager.age_months, 180);
  assertExists(teenager.vaccines);
  
  // Test age not in curated data
  const randomAge = await getVaccinesByAge(25);
  assertEquals(randomAge.age_months, 25);
  assertExists(randomAge.vaccines);
});

Deno.test("getOutbreaksByDistrict - handles unknown district", async () => {
  const outbreaks = await getOutbreaksByDistrict('UnknownDistrict');
  
  assertEquals(Array.isArray(outbreaks), true);
  assertEquals(outbreaks.length, 0); // Should return empty array for unknown district
});

// Cleanup after tests
Deno.test("cleanup environment", () => {
  Deno.env.delete('FEATURE_VACCINATION_API');
  Deno.env.delete('FEATURE_OUTBREAK_API');
  Deno.env.delete('ODISHA_HEALTH_API_BASE');
  Deno.env.delete('ODISHA_HEALTH_API_KEY');
});

