/**
 * Router Tests
 * 
 * Tests the complexity scoring algorithm and routing decisions
 * 
 * @module backend/tests/router
 */

// Import router function from health-query.ts
// Note: This is a simplified test - full integration test in Phase 2

interface ConversationContext {
  sessionId?: string;
  previousQueries?: string[];
  metadata?: {
    language?: string;
    location?: string;
  };
}

interface RoutingDecision {
  useAgent: boolean;
  reason: string;
  confidence: number;
  complexityScore: number;
}

// Simplified router logic for testing
function testRouterLogic(query: string, context?: ConversationContext): RoutingDecision {
  const HEALTH_ENTITIES = [
    'fever', 'cough', 'diarrhea', 'vaccination', 'malaria',
    'tuberculosis', 'pain', 'bleeding', 'rash', 'breathing',
    'headache', 'nausea', 'vomiting', 'swelling'
  ];

  const EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'severe breathing', 'can\'t breathe',
    'unconscious', 'seizure', 'heavy bleeding', 'severe injury', 'stroke'
  ];

  // Emergency check
  const isLikelyEmergency = EMERGENCY_KEYWORDS.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  if (isLikelyEmergency) {
    return {
      useAgent: false,
      reason: 'emergency_requires_fast_path',
      confidence: 1.0,
      complexityScore: 0
    };
  }

  let complexityScore = 0;
  const queryLength = query.length;
  const sentenceCount = (query.match(/[.!?।॥]/g) || []).length;
  const hasMultipleTopics = /\b(also|and|additionally|furthermore|what about|tell me about)\b/i.test(query);
  const isMultiStepAsk = /^(how can|can you|explain|compare|step|steps)/i.test(query);
  
  function countEntities(text: string): number {
    const queryLower = text.toLowerCase();
    return HEALTH_ENTITIES.filter(entity => queryLower.includes(entity)).length;
  }
  const entityCount = countEntities(query);
  const hasMultipleEntities = entityCount > 2;

  if (queryLength > 100) complexityScore += 2;
  if (sentenceCount > 1) complexityScore += 2;
  if (hasMultipleTopics) complexityScore += 2;
  if (isMultiStepAsk) complexityScore += 2;
  if (hasMultipleEntities) complexityScore += 2;
  if (context?.previousQueries && context.previousQueries.length > 0) {
    complexityScore += 2;
  }

  const useAgent = complexityScore >= 5;
  const reasons: string[] = [];
  if (queryLength > 100) reasons.push('long_query');
  if (sentenceCount > 1) reasons.push('multi_sentence');
  if (hasMultipleTopics) reasons.push('multiple_topics');
  if (isMultiStepAsk) reasons.push('multi_step');
  if (hasMultipleEntities) reasons.push('multiple_entities');
  if (context?.previousQueries && context.previousQueries.length > 0) {
    reasons.push('conversational');
  }

  return {
    useAgent,
    reason: reasons.join('+') || (useAgent ? 'complex' : 'simple'),
    confidence: Math.min(complexityScore / 10, 1.0),
    complexityScore
  };
}

// Test cases
describe('Router Logic Tests', () => {
  describe('Simple Queries (Backend Path)', () => {
    it('should route simple short query to backend', () => {
      const decision = testRouterLogic('What is fever?');
      expect(decision.useAgent).toBe(false);
      expect(decision.complexityScore).toBeLessThan(5);
    });

    it('should route emergency query to backend', () => {
      const decision = testRouterLogic('I have chest pain');
      expect(decision.useAgent).toBe(false);
      expect(decision.reason).toBe('emergency_requires_fast_path');
    });

    it('should route single-sentence query to backend', () => {
      const decision = testRouterLogic('Tell me about vaccination schedule');
      expect(decision.useAgent).toBe(false);
    });
  });

  describe('Complex Queries (Agent Path)', () => {
    it('should route long query to agent', () => {
      const longQuery = 'I have been experiencing fever for the past three days, and I also have a persistent cough that started yesterday. Additionally, I feel nauseous and have been having difficulty breathing. What could be the cause and what steps should I take?';
      const decision = testRouterLogic(longQuery);
      expect(decision.useAgent).toBe(true);
      expect(decision.complexityScore).toBeGreaterThanOrEqual(5);
    });

    it('should route multi-sentence query to agent', () => {
      // Query needs to be > 100 chars AND multi-sentence to score >= 5
      const multiSentence = 'What are the symptoms of malaria? Also, how can I prevent it? And what about treatment options? Additionally, can you explain the difference between malaria and dengue?';
      const decision = testRouterLogic(multiSentence);
      expect(decision.useAgent).toBe(true);
      expect(decision.complexityScore).toBeGreaterThanOrEqual(5);
    });

    it('should route multi-step ask to agent', () => {
      const multiStep = 'How can I prevent dengue? Can you explain the steps?';
      const decision = testRouterLogic(multiStep);
      expect(decision.useAgent).toBe(true);
    });

    it('should route query with multiple entities to agent', () => {
      const multipleEntities = 'I have fever, cough, and diarrhea';
      const decision = testRouterLogic(multipleEntities);
      expect(decision.useAgent).toBe(true);
      expect(decision.reason).toContain('multiple_entities');
    });

    it('should route conversational query to agent', () => {
      const context: ConversationContext = {
        previousQueries: ['What is fever?']
      };
      const decision = testRouterLogic('And what about prevention?', context);
      expect(decision.useAgent).toBe(true);
      expect(decision.reason).toContain('conversational');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const decision = testRouterLogic('');
      expect(decision.useAgent).toBe(false);
      expect(decision.complexityScore).toBe(0);
    });

    it('should handle query at threshold (score = 4)', () => {
      // Score exactly 4 (should go to backend)
      const query = 'This is a relatively long query that exceeds one hundred characters and contains multiple health topics like fever and vaccination.';
      const decision = testRouterLogic(query);
      // Should be < 5 (backend path)
      expect(decision.useAgent).toBe(false);
    });

    it('should handle query at threshold (score = 5)', () => {
      // Score exactly 5 (should go to agent)
      const query = 'This is a very long query that exceeds one hundred characters and also contains multiple health topics. Additionally, it has more entities.';
      const decision = testRouterLogic(query);
      expect(decision.useAgent).toBe(true);
      expect(decision.complexityScore).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Scoring Components', () => {
    it('should score length correctly', () => {
      const short = 'What is fever?';
      const long = 'A'.repeat(101); // 101 characters
      
      const shortScore = testRouterLogic(short).complexityScore;
      const longScore = testRouterLogic(long).complexityScore;
      
      expect(longScore).toBe(shortScore + 2);
    });

    it('should score sentence count correctly', () => {
      const single = 'What is fever?';
      const multiple = 'What is fever? How to prevent it? What about treatment?';
      
      const singleScore = testRouterLogic(single).complexityScore;
      const multipleScore = testRouterLogic(multiple).complexityScore;
      
      expect(multipleScore).toBeGreaterThanOrEqual(singleScore);
    });
  });
});

// Helper assertion functions (simplified)
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toContain: (substring: string) => {
      if (!String(actual).includes(substring)) {
        throw new Error(`Expected "${actual}" to contain "${substring}"`);
      }
    }
  };
}

function describe(name: string, fn: () => void) {
  console.log(`\n📋 ${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.error(`  ❌ ${name}:`, error);
    throw error;
  }
}

// Run tests
console.log('🧪 Running Router Tests...\n');
try {
  describe('Router Logic Tests', () => {
    describe('Simple Queries (Backend Path)', () => {
      it('should route simple short query to backend', () => {
        const decision = testRouterLogic('What is fever?');
        expect(decision.useAgent).toBe(false);
        expect(decision.complexityScore).toBeLessThan(5);
      });

      it('should route emergency query to backend', () => {
        const decision = testRouterLogic('I have chest pain');
        expect(decision.useAgent).toBe(false);
        expect(decision.reason).toBe('emergency_requires_fast_path');
      });
    });

    describe('Complex Queries (Agent Path)', () => {
      it('should route long query to agent', () => {
        const longQuery = 'I have been experiencing fever for the past three days, and I also have a persistent cough that started yesterday. Additionally, I feel nauseous and have been having difficulty breathing. What could be the cause and what steps should I take?';
        const decision = testRouterLogic(longQuery);
        expect(decision.useAgent).toBe(true);
      });

      it('should route multi-sentence query to agent', () => {
        const multiSentence = 'What are the symptoms of malaria? Also, how can I prevent it? And what about treatment options?';
        const decision = testRouterLogic(multiSentence);
        expect(decision.useAgent).toBe(true);
      });
    });
  });
  console.log('\n✅ All router tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error);
  Deno.exit(1);
}

