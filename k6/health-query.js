/**
 * k6 Load Test Script
 * 
 * Load testing for health query endpoint with spike and steady load patterns.
 * Tests performance under 50 RPS spike and 10 RPS steady load.
 * 
 * @module k6/health-query
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const healthQueryDuration = new Trend('health_query_duration');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '30s', target: 5 },
    // Steady load
    { duration: '2m', target: 10 },
    // Spike load
    { duration: '1m', target: 50 },
    // Cool down
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 95% of requests should complete within 3 seconds
    'health_query_duration': ['p(95)<3000'],
    // Error rate should be less than 1%
    'errors': ['rate<0.01'],
    // HTTP errors should be less than 1%
    'http_req_failed': ['rate<0.01'],
  },
};

// Base URL - can be overridden with environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Test data
const testQueries = [
  'I have fever and headache. What should I do?',
  'What are the symptoms of malaria?',
  'How to prevent dengue fever?',
  'My child has high temperature. Is it serious?',
  'What vaccines does my 6-month-old need?',
  'I have chest pain. Should I be worried?',
  'How to manage diabetes?',
  'What are the side effects of paracetamol?',
  'My baby is not eating properly. What to do?',
  'How to treat common cold?'
];

export default function() {
  // Select random query
  const query = testQueries[Math.floor(Math.random() * testQueries.length)];
  
  // Prepare request payload
  const payload = JSON.stringify({
    query: query,
    user_language: 'en',
    channel: 'web'
  });

  // Set headers
  const headers = {
    'Content-Type': 'application/json',
  };

  // Make request
  const startTime = new Date();
  const response = http.post(`${BASE_URL}/api/health-query`, payload, { headers });
  const endTime = new Date();
  
  // Record duration
  const duration = endTime - startTime;
  healthQueryDuration.add(duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'response has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'response has health advice': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.response && body.response.length > 10;
      } catch (e) {
        return false;
      }
    },
    'response has citations': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.citations) && body.citations.length > 0;
      } catch (e) {
        return false;
      }
    }
  });

  // Record error rate
  errorRate.add(!success);

  // Log errors for debugging
  if (!success) {
    console.log(`Request failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }

  // Sleep between requests (simulate user behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function handleSummary(data) {
  return {
    'k6-load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
Load Test Summary:
==================
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

Thresholds:
- 95th percentile < 3000ms: ${data.thresholds['health_query_duration'] ? '✅ PASSED' : '❌ FAILED'}
- Error rate < 1%: ${data.thresholds['errors'] ? '✅ PASSED' : '❌ FAILED'}
- HTTP error rate < 1%: ${data.thresholds['http_req_failed'] ? '✅ PASSED' : '❌ FAILED'}

Performance Grade: ${getPerformanceGrade(data)}
    `,
  };
}

function getPerformanceGrade(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate;
  
  if (p95 < 1000 && errorRate < 0.005) return 'A+ (Excellent)';
  if (p95 < 2000 && errorRate < 0.01) return 'A (Very Good)';
  if (p95 < 3000 && errorRate < 0.02) return 'B (Good)';
  if (p95 < 5000 && errorRate < 0.05) return 'C (Acceptable)';
  return 'D (Needs Improvement)';
}

// Setup function - runs once at the beginning
export function setup() {
  console.log('Starting k6 load test for health query endpoint...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test scenarios:');
  console.log('- 30s warmup at 5 RPS');
  console.log('- 2m steady load at 10 RPS');
  console.log('- 1m spike load at 50 RPS');
  console.log('- 30s cooldown');
  console.log('');
  
  // Health check before starting load test
  const healthResponse = http.get(`${BASE_URL}/api/healthz`);
  if (healthResponse.status !== 200) {
    console.error('Health check failed! Aborting load test.');
    return false;
  }
  
  console.log('✅ Health check passed. Starting load test...');
  return true;
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Load test completed!');
  if (data) {
    console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
    console.log(`Average response time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  }
}
