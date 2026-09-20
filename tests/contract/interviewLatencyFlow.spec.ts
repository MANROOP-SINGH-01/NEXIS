import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:8787'

async function getAuthToken(request: any): Promise<string> {
  const uniquePhone = `9199${Math.floor(10000000 + Math.random() * 90000000)}`
  const regRes = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      phone: uniquePhone,
      password: 'StrongPassword123!',
      name: 'Performance Test Candidate',
    },
  })
  if (regRes.ok()) {
    const regData = await regRes.json()
    return regData.token
  }
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: {
      phone: uniquePhone,
      password: 'StrongPassword123!',
    },
  })
  const loginData = await loginRes.json()
  return loginData.token
}

test.describe('Phase 13: Nexus-Mirror Interview Performance & Latency Remediation Contract Flow', () => {
  let token: string

  test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request)
    expect(token).toBeDefined()
  })

  test('1. GET /api/interview/performance exposes telemetry, active fast-tier models and latency budgets', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/interview/performance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.agent).toBe('nexus-mirror')
    expect(body.cache).toBeDefined()
    expect(body.cache.maxSize).toBeGreaterThan(0)
    expect(body.budgets).toBeDefined()
    expect(body.budgets.CACHED_MS).toBeLessThanOrEqual(50)
    expect(Array.isArray(body.fastModels)).toBe(true)
    expect(body.fastModels).toContain('gemini-2.0-flash')
  })

  test('2. POST /api/interview/brief includes latency headers and caches subsequent requests', async ({ request }) => {
    const payload = {
      roleTitle: 'Full Stack Engineer',
      seniority: 'Mid-Level',
      matchedSkills: ['Node.js', 'React', 'TypeScript'],
      requiredGaps: ['Docker', 'Kafka'],
    }

    // Call 1: Fresh calculation / fallback
    const res1 = await request.post(`${API_BASE}/api/interview/brief`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    })
    expect(res1.status()).toBe(200)
    expect(res1.headers()['x-response-time-ms']).toBeDefined()

    const body1 = await res1.json()
    expect(Array.isArray(body1.focus_areas)).toBe(true)
    expect(body1.focus_areas.length).toBe(4)
    expect(body1.timing_ms).toBeDefined()

    // Call 2: In-memory cache hit (must be sub-50ms)
    const start = Date.now()
    const res2 = await request.post(`${API_BASE}/api/interview/brief`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    })
    const callDuration = Date.now() - start
    expect(res2.status()).toBe(200)

    const body2 = await res2.json()
    expect(body2.cached).toBe(true)
    expect(callDuration).toBeLessThanOrEqual(100) // Network roundtrip + sub-50ms processing
  })

  test('3. POST /api/interview/generate serves question pairs with timing telemetry and caching', async ({ request }) => {
    const payload = {
      resume: 'Full stack developer with 3 years building web APIs, React frontends, and PostgreSQL databases.',
      jd: 'Looking for a software engineer proficient in scalable backend architecture and modern TypeScript.',
    }

    const res1 = await request.post(`${API_BASE}/api/interview/generate`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    })
    expect(res1.status()).toBe(200)
    expect(res1.headers()['x-response-time-ms']).toBeDefined()

    const body1 = await res1.json()
    expect(Array.isArray(body1.items)).toBe(true)
    expect(body1.items.length).toBeGreaterThanOrEqual(3)
    expect(body1.timing_ms).toBeDefined()

    // Second call cached
    const res2 = await request.post(`${API_BASE}/api/interview/generate`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    })
    expect(res2.status()).toBe(200)
    const body2 = await res2.json()
    expect(body2.cached).toBe(true)
  })

  test('4. POST /api/interview/cross-question executes fast-path evaluation and enforces Section 15 schema', async ({ request }) => {
    const payload = {
      question: 'How do you optimize slow database queries in PostgreSQL?',
      answer: 'I used composite indexes and analyzed query plans with EXPLAIN ANALYZE, reducing latency by 40%.',
      category: 'technical',
    }

    const res = await request.post(`${API_BASE}/api/interview/cross-question`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['x-response-time-ms']).toBeDefined()

    const body = await res.json()
    expect(body.phaseA).toBeDefined()
    expect(body.phaseB).toBeDefined()
    expect(body.phaseB.followUpQuestion).toBeDefined()
    expect(typeof body.pressureDelta).toBe('number')
    expect(body.timing_ms).toBeDefined()
  })

  test('5. GET /api/interview/stream serves real-time Server-Sent Events (SSE)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/interview/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      params: {
        question: 'How do you handle API rate limiting?',
        answer: 'I implemented Redis token bucket rate limiting with sliding window counters.',
        category: 'technical',
      },
    })

    expect(res.status()).toBe(200)
    const contentType = res.headers()['content-type']
    expect(contentType).toContain('text/event-stream')

    const body = await res.text()
    expect(body).toContain('event: start')
    expect(body).toContain('event: phaseA')
    expect(body).toContain('event: complete')
  })
})
