import { test, expect } from '@playwright/test'
import {
  interviewCache,
  LATENCY_BUDGETS,
  hashKey,
  getInterviewBriefCached,
  getInterviewQuestionsCached,
  crossQuestionWithFastPath,
  classifyInterviewAnswerHeuristic,
  buildMirrorFallbackCrossQuestion,
} from '../../server/services/interviewEngine.js'

test.describe('Phase 13: Nexus-Mirror Interview Performance & Latency Remediation Unit Suite', () => {
  test.beforeEach(() => {
    interviewCache.clear()
  })

  test('1. Latency Budgets conform to Master Spec Section 10 & 25.1', () => {
    expect(LATENCY_BUDGETS.CACHED_MS).toBeLessThanOrEqual(50)
    expect(LATENCY_BUDGETS.HEURISTIC_MS).toBeLessThanOrEqual(100)
    expect(LATENCY_BUDGETS.STREAMING_FIRST_TOKEN_MS).toBeLessThanOrEqual(300)
    expect(LATENCY_BUDGETS.FRESH_AI_TARGET_MS).toBeLessThanOrEqual(5000)
  })

  test('2. Deterministic SHA-256 hashKey produces stable, unique keys', () => {
    const key1 = hashKey('brief', { role: 'Full Stack Engineer', seniority: 'Senior' })
    const key2 = hashKey('brief', { role: 'Full Stack Engineer', seniority: 'Senior' })
    const key3 = hashKey('brief', { role: 'DevOps Engineer', seniority: 'Senior' })

    expect(key1).toBe(key2)
    expect(key1).not.toBe(key3)
    expect(key1.startsWith('brief:')).toBe(true)
  })

  test('3. InterviewPerformanceCache manages LRU caching, TTL, and telemetry statistics', () => {
    interviewCache.set('test:key1', { value: 'data1' })
    interviewCache.set('test:key2', { value: 'data2' })

    expect(interviewCache.get('test:key1')).toEqual({ value: 'data1' })
    expect(interviewCache.get('test:key2')).toEqual({ value: 'data2' })
    expect(interviewCache.get('test:missing')).toBeNull()

    const stats = interviewCache.getStats()
    expect(stats.size).toBe(2)
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBeGreaterThan(0)
  })

  test('4. getInterviewBriefCached achieves sub-50ms latency on repeated requests', async () => {
    let callCount = 0
    const mockFetcher = async () => {
      callCount++
      // Simulate 150ms upstream processing
      await new Promise((r) => setTimeout(r, 150))
      return {
        focus_areas: [
          { category: 'technical', topic: 'React Fiber & Reconciliation', why: 'Core UI skill', tip: 'Mention keys and diffing' },
          { category: 'system-design', topic: 'State Normalization', why: 'Scalability', tip: 'Avoid redundant stores' },
          { category: 'behavioral', topic: 'Code Reviews', why: 'Teamwork', tip: 'Constructive feedback' },
          { category: 'technical', topic: 'Web Vitals & Performance', why: 'UX metric', tip: 'Measure INP and LCP' },
        ],
        gap_topics: [{ skill: 'Redis', likely_question_angle: 'Cache invalidation', prep_suggestion: 'Build a toy cache' }],
        key_strength_to_lead_with: 'Deep React expertise',
        overall_readiness_note: 'Strong candidate',
      }
    }

    // First request: Cache Miss
    const res1 = await getInterviewBriefCached({
      roleTitle: 'Frontend Engineer',
      seniority: 'Senior',
      requiredGaps: ['Redis'],
      matchedSkills: ['React', 'TypeScript'],
      fetcher: mockFetcher,
    })

    expect(res1.cached).toBe(false)
    expect(res1.timing_ms).toBeGreaterThanOrEqual(140)
    expect(callCount).toBe(1)
    expect(res1.focus_areas.length).toBe(4)

    // Second request: Cache Hit (Budget: < 50ms)
    const res2 = await getInterviewBriefCached({
      roleTitle: 'Frontend Engineer',
      seniority: 'Senior',
      requiredGaps: ['Redis'],
      matchedSkills: ['React', 'TypeScript'],
      fetcher: mockFetcher,
    })

    expect(res2.cached).toBe(true)
    expect(res2.timing_ms).toBeLessThanOrEqual(LATENCY_BUDGETS.CACHED_MS)
    expect(callCount).toBe(1) // No second fetcher execution
    expect(res2.focus_areas).toEqual(res1.focus_areas)
  })

  test('5. getInterviewQuestionsCached caches question sets and gracefully falls back on error', async () => {
    let attempts = 0
    const failingFetcher = async () => {
      attempts++
      throw new Error('AI Provider Timeout: 504')
    }

    const res = await getInterviewQuestionsCached({
      resume: 'Experienced developer with fullstack skills.',
      jd: 'Need a senior developer.',
      fetcher: failingFetcher,
    })

    expect(res.fallback).toBe(true)
    expect(Array.isArray(res.items)).toBe(true)
    expect(res.items.length).toBe(3)
    expect(res.items[0]).toHaveProperty('question')
    expect(res.items[0]).toHaveProperty('answer')
    expect(res.items[0]).toHaveProperty('category')

    // Second request is served from fallback cache in sub-50ms
    const cachedRes = await getInterviewQuestionsCached({
      resume: 'Experienced developer with fullstack skills.',
      jd: 'Need a senior developer.',
      fetcher: failingFetcher,
    })

    expect(cachedRes.cached).toBe(true)
    expect(cachedRes.timing_ms).toBeLessThanOrEqual(LATENCY_BUDGETS.CACHED_MS)
    expect(attempts).toBe(1) // Did not retry failing fetcher
  })

  test('6. crossQuestionWithFastPath produces instant heuristic scan and supports SSE streaming', async () => {
    const streamEvents: Array<{ event: string; data: any; timing_ms: number }> = []

    const result = await crossQuestionWithFastPath({
      question: 'How do you prevent race conditions in distributed systems?',
      userAnswer: 'I implemented distributed locks in Redis with Redlock algorithm and atomic Lua scripts for idempotency.',
      category: 'technical',
      streamCallback: (msg) => streamEvents.push(msg),
      fetcher: null, // Fast-path heuristic mode
    })

    expect(result.phaseA).toBeDefined()
    expect(result.phaseA.detectedType).toBe('technical-claim')
    expect(result.phaseA.technicalClaim).toContain('implemented distributed locks')
    expect(result.phaseB.followUpQuestion).toBeDefined()
    expect(result.pressureDelta).toBeGreaterThanOrEqual(5)

    // Verify stream events emitted
    expect(streamEvents.length).toBeGreaterThanOrEqual(2)
    expect(streamEvents[0].event).toBe('phaseA')
    expect(streamEvents[0].timing_ms).toBeLessThanOrEqual(LATENCY_BUDGETS.HEURISTIC_MS)
    expect(streamEvents[1].event).toBe('complete')
  })

  test('7. classifyInterviewAnswerHeuristic accurately separates technical claims from logic gaps', () => {
    // Technical answer with concrete terms and >= 18 words
    const technical = classifyInterviewAnswerHeuristic(
      'I built and deployed an automated CI/CD pipeline using Docker, Kubernetes, and Redis cache, optimizing query latency by 45% in production.'
    )
    expect(technical.classification).toBe('claim')
    expect(technical.target).toBeDefined()
    expect(technical.thin).toBe(false)
    expect(technical.detectedTerms).toContain('redis')
    expect(technical.detectedTerms).toContain('docker')

    // High-level / thin answer
    const vague = classifyInterviewAnswerHeuristic('I just did the tasks assigned to me quickly.')
    expect(vague.classification).toBe('logic-gap')
    expect(vague.thin).toBe(true)
    expect(vague.detectedTerms.length).toBe(0)
  })

  test('8. buildMirrorFallbackCrossQuestion applies higher pressure delta to thin answers', () => {
    const strong = buildMirrorFallbackCrossQuestion({
      question: 'Describe your microservices architecture.',
      userAnswer: 'In my previous engineering role, we designed an event-driven microservices architecture using Apache Kafka and PostgreSQL sharding with 99.99% uptime SLOs.',
      category: 'technical',
    })

    const thin = buildMirrorFallbackCrossQuestion({
      question: 'Describe your microservices architecture.',
      userAnswer: 'I just helped out on daily tasks.',
      category: 'technical',
    })

    expect(strong.pressureDelta).toBe(7)
    expect(strong.phaseA.thinOrNonTechnical).toBe(false)

    expect(thin.pressureDelta).toBe(18)
    expect(thin.phaseA.thinOrNonTechnical).toBe(true)
    expect(thin.phaseA.detectedType).toBe('logic-gap')
  })
})
