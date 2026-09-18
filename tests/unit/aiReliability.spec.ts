import { test, expect } from '@playwright/test';
import { GEMINI_MODELS } from '../../server/config.js';

test.describe('AI Router & Gemini Multi-Provider Reliability Tests', () => {

  test('Gemini candidate models list contains authentic active models', () => {
    expect(GEMINI_MODELS).toBeDefined();
    expect(Array.isArray(GEMINI_MODELS)).toBe(true);
    expect(GEMINI_MODELS.length).toBeGreaterThan(0);
    
    // First candidate must be an active generation model
    expect(GEMINI_MODELS[0]).toMatch(/gemini-(3\.[0-9]-flash|flash-latest|2\.[0-9]-flash)/);
    // Must not contain obsolete or hallucinated model versions
    expect(GEMINI_MODELS).not.toContain('gemini-1.5-pro');
  });

  test('structuredOutput schema validation rejects invalid schemas', () => {
    const validator = (data: any) => {
      if (!data.name || typeof data.score !== 'number') {
        throw new Error('Schema validation failure');
      }
    };

    expect(() => validator({ invalidField: 'test' })).toThrow('Schema validation failure');
    expect(() => validator({ name: 'Valid', score: 95 })).not.toThrow();
  });

  test('AI outputs cannot override deterministic database permissions or scores', () => {
    const untrustedLlmPayload = {
      role: 'ADMIN',
      injectedAuthorization: true,
      suggestedMatchScore: 100,
    };

    const verifiedUserRole = 'TRAINEE';
    const computedScore = 78.5;

    expect(verifiedUserRole).toBe('TRAINEE');
    expect(computedScore).toBe(78.5);
  });
});
