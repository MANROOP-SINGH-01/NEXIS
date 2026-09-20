/**
 * FILE: server/services/interviewEngine.js
 * PURPOSE: Interview cross-questioning heuristics, answer classification, low-latency caching and streaming.
 * DEPENDENCIES: server/utils/helpers.js, crypto
 * USED BY: routes/interview.js
 */

import crypto from 'crypto'
import { clamp } from '../utils/helpers.js'

/**
 * Defined latency budgets in milliseconds per Master Spec Section 10 & 25.1
 */
export const LATENCY_BUDGETS = {
  CACHED_MS: 50,
  HEURISTIC_MS: 100,
  STREAMING_FIRST_TOKEN_MS: 300,
  FRESH_AI_TARGET_MS: 4000,
}

/**
 * High-performance in-memory LRU Cache with TTL and statistics
 */
export class InterviewPerformanceCache {
  constructor(maxSize = 300, defaultTtlMs = 1000 * 60 * 60 * 2) {
    this.maxSize = maxSize
    this.defaultTtlMs = defaultTtlMs
    this.cache = new Map()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    // Refresh LRU position
    this.cache.delete(key)
    this.cache.set(key, entry)
    this.stats.hits++
    return entry.value
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
        this.stats.evictions++
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    })
  }

  clear() {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ...this.stats,
      hitRate: total > 0 ? Number(((this.stats.hits / total) * 100).toFixed(1)) : 0,
    }
  }
}

export const interviewCache = new InterviewPerformanceCache()

/**
 * Generate deterministic SHA-256 hash key
 */
export function hashKey(prefix, payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const hash = crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 24)
  return `${prefix}:${hash}`
}

/**
 * Pre-warmed questions for high-frequency vocational and technical roles
 */
export const PREWARMED_QUESTIONS_BY_ROLE = {
  'software-engineer': [
    {
      id: 'pre_se_0',
      question: 'How do you design database queries and schema indexes to prevent N+1 query bottlenecks under production load?',
      answer: 'I inspect query execution plans with EXPLAIN ANALYZE, apply targeted composite indices on filtering and foreign key columns, and utilize eager loading or batching.',
      category: 'technical',
    },
    {
      id: 'pre_se_1',
      question: 'Describe an instance where a production release introduced a regression. How did you identify and remediate it?',
      answer: 'I checked real-time telemetry and error spikes, quickly rolled back to the prior green deployment, reproduced the failure with an automated test case, and safely redeployed.',
      category: 'behavioral',
    },
    {
      id: 'pre_se_2',
      question: 'How do you ensure state idempotency across distributed message queues or asynchronous job workers?',
      answer: 'I use unique deterministic deduplication keys in Redis or PostgreSQL, wrap mutations in atomic transactions, and enforce strictly monotonic status transitions.',
      category: 'system-design',
    },
  ],
  'devops-engineer': [
    {
      id: 'pre_devops_0',
      question: 'How do you architect multi-stage CI/CD pipelines to guarantee zero-downtime rolling deployments?',
      answer: 'I implement health-check probes, canary traffic routing, automated container rollback triggers, and blue-green or rolling replica updates in Kubernetes.',
      category: 'technical',
    },
    {
      id: 'pre_devops_1',
      question: 'How do you manage secret rotation and least-privilege RBAC in cloud infrastructure?',
      answer: 'I use centralized key management (KMS/Vault) with ephemeral short-lived IAM credentials, strict namespace RBAC, and automated secret scanning in pre-commit hooks.',
      category: 'system-design',
    },
  ],
  'cnc-operator': [
    {
      id: 'pre_cnc_0',
      question: 'How do you verify G-code parameters and workpiece offsets prior to executing a high-precision machining run?',
      answer: 'I verify tool wear offsets, run dry-cycle simulations, check safety clearances, and inspect the first machined piece against engineering drawings using Vernier calipers and micrometers.',
      category: 'technical',
    },
  ],
}

/**
 * Cached pre-interview briefing generator
 */
export async function getInterviewBriefCached({
  roleTitle,
  seniority,
  requiredGaps = [],
  niceGaps = [],
  matchedSkills = [],
  fetcher,
}) {
  const startTime = Date.now()
  const key = hashKey('brief', {
    roleTitle: String(roleTitle || '').trim().toLowerCase(),
    seniority: String(seniority || '').trim().toLowerCase(),
    requiredGaps: [...requiredGaps].sort(),
    niceGaps: [...niceGaps].sort(),
    matchedSkills: [...matchedSkills].sort(),
  })

  const cached = interviewCache.get(key)
  if (cached) {
    return {
      ...cached,
      cached: true,
      timing_ms: Date.now() - startTime,
    }
  }

  const result = await fetcher()
  const duration = Date.now() - startTime
  interviewCache.set(key, result)

  return {
    ...result,
    cached: false,
    timing_ms: duration,
  }
}

/**
 * Cached question generation with fallback
 */
export async function getInterviewQuestionsCached({
  resume,
  jd,
  fetcher,
}) {
  const startTime = Date.now()
  const key = hashKey('questions', {
    resume: String(resume || '').trim().slice(0, 600),
    jd: String(jd || '').trim().slice(0, 600),
  })

  const cached = interviewCache.get(key)
  if (cached) {
    return {
      items: cached.items,
      cached: true,
      timing_ms: Date.now() - startTime,
      fallback: cached.fallback || false,
    }
  }

  try {
    const result = await fetcher()
    const duration = Date.now() - startTime
    interviewCache.set(key, result)
    return {
      items: result.items,
      cached: false,
      timing_ms: duration,
      fallback: false,
    }
  } catch (err) {
    const duration = Date.now() - startTime
    // Grounded fallback
    const fallbackItems = [
      {
        id: `nmx_${Date.now()}_0`,
        question: 'How have you architected and scaled production applications in your technical projects?',
        answer: 'I focused on modular code separation, strict interface typing, automated testing, and optimizing query and network performance with proper indexing.',
        category: 'technical',
      },
      {
        id: `nmx_${Date.now()}_1`,
        question: 'Can you walk through a complex production debugging incident you diagnosed and resolved?',
        answer: 'I systematically traced logs, isolated the failure with a minimal reproducible test case, implemented the fix safely, and verified zero regressions.',
        category: 'behavioral',
      },
      {
        id: `nmx_${Date.now()}_2`,
        question: 'How do you design backend services and data models for high fault-tolerance and clean error recovery?',
        answer: 'I enforce schema validation, graceful degradation fallbacks, idempotent mutations, and granular transactional boundaries.',
        category: 'system-design',
      },
    ]

    const fallbackResult = { items: fallbackItems, fallback: true }
    interviewCache.set(key, fallbackResult, 1000 * 60 * 30) // 30 min TTL for fallback
    return {
      ...fallbackResult,
      cached: false,
      timing_ms: duration,
    }
  }
}

/**
 * Fast-path and streaming recursive cross-questioning
 */
export async function crossQuestionWithFastPath({
  question,
  userAnswer,
  category = 'technical',
  streamCallback = null,
  fetcher = null,
  bypassCache = false,
}) {
  const startTime = Date.now()
  const key = hashKey('cross', {
    question: String(question || '').trim(),
    userAnswer: String(userAnswer || '').trim(),
    category: String(category || 'technical').trim().toLowerCase(),
  })

  if (!bypassCache) {
    const cached = interviewCache.get(key)
    if (cached) {
      if (streamCallback) {
        streamCallback({ event: 'phaseA', data: cached.phaseA, timing_ms: 1 })
        streamCallback({ event: 'phaseB', data: cached.phaseB, timing_ms: 2 })
        streamCallback({ event: 'complete', data: cached, timing_ms: Date.now() - startTime })
      }
      return {
        ...cached,
        cached: true,
        timing_ms: Date.now() - startTime,
      }
    }
  }

  // Instant Phase A heuristic scan (sub-1ms execution)
  const heuristic = buildMirrorFallbackCrossQuestion({ question, userAnswer, category })
  if (streamCallback) {
    streamCallback({
      event: 'phaseA',
      data: heuristic.phaseA,
      timing_ms: Date.now() - startTime,
    })
  }

  // If no AI fetcher or answer is extremely thin, we can use heuristic directly with high precision
  if (!fetcher) {
    const duration = Date.now() - startTime
    interviewCache.set(key, heuristic)
    if (streamCallback) {
      streamCallback({ event: 'complete', data: heuristic, timing_ms: duration })
    }
    return {
      ...heuristic,
      cached: false,
      timing_ms: duration,
    }
  }

  try {
    const aiResult = await fetcher()
    const duration = Date.now() - startTime
    const result = {
      ...aiResult,
      timing_ms: duration,
      cached: false,
    }
    interviewCache.set(key, result)
    if (streamCallback) {
      streamCallback({ event: 'complete', data: result, timing_ms: duration })
    }
    return result
  } catch (err) {
    // Graceful immediate fallback
    const duration = Date.now() - startTime
    const fallback = {
      ...heuristic,
      timing_ms: duration,
      cached: false,
      fallback: true,
    }
    interviewCache.set(key, fallback, 1000 * 60 * 30)
    if (streamCallback) {
      streamCallback({ event: 'complete', data: fallback, timing_ms: duration })
    }
    return fallback
  }
}

/**
 * Server-Sent Events (SSE) stream response helper
 */
export function createSSEStreamHandler(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()

  return {
    send(event, data) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    },
    end(finalData = null) {
      if (finalData) {
        res.write(`event: complete\ndata: ${JSON.stringify(finalData)}\n\n`)
      }
      res.end()
    },
  }
}

export function buildMirrorFallbackCrossQuestion({ question, userAnswer, category }) {
  const answer = String(userAnswer || '').trim()
  const words = answer.split(/\s+/).filter(Boolean)
  const lower = answer.toLowerCase()
  const technicalMarkers = [
    'api', 'latency', 'cache', 'queue', 'pipeline', 'database', 'kafka', 'redis', 'rag',
    'embedding', 'vector', 'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'ci/cd', 'ci', 'cd',
    'microservice', 'observability', 'slo', 'slas', 'throughput', 'retry', 'idempotent',
  ]
  const hasTechnicalSignal = technicalMarkers.some((m) => lower.includes(m))
  const hasNumbers = /\d/.test(answer)
  const thinOrNonTechnical = words.length < 18 || !hasTechnicalSignal

  const claimMatch = answer.match(/\b(i|we)\s+(used|built|designed|implemented|migrated|optimized|deployed)\b[^.?!]*/i)
  const technicalClaim = claimMatch
    ? claimMatch[0].replace(/^\b(i|we)\s+/i, '').trim()
    : hasTechnicalSignal
      ? words.slice(0, Math.min(14, words.length)).join(' ')
      : ''

  const logicGap = technicalClaim
    ? (hasNumbers ? '' : 'No concrete metric, trade-off, or measurable outcome was provided.')
    : 'Answer is vague and does not anchor on a concrete architecture, implementation choice, or incident.'

  const focus = technicalClaim || logicGap
  const defaultByCategory = category === 'behavioral'
    ? 'What specific decision did you own, what alternatives did you reject, and what was the measurable impact?'
    : category === 'system-design'
      ? 'Walk me through the bottleneck, failure mode, and the exact trade-off you made under load.'
      : 'Explain the architecture details, trade-offs, and failure handling for that implementation.'

  const followUpQuestion = technicalClaim
    ? `You said you ${technicalClaim}. What were the key trade-offs, how did you validate performance, and what failed first in production?`
    : `${focus} ${defaultByCategory}`

  const pressureDelta = thinOrNonTechnical ? 18 : 7

  return {
    phaseA: {
      detectedType: technicalClaim ? 'technical-claim' : 'logic-gap',
      technicalClaim,
      logicGap,
      thinOrNonTechnical,
      reason: thinOrNonTechnical
        ? 'Answer is short or missing technical depth; pressure should increase.'
        : 'Answer has technical detail but still needs deeper validation.',
    },
    phaseB: {
      followUpQuestion,
    },
    pressureDelta,
    mode: 'fallback-heuristic',
  }
}

export function classifyInterviewAnswerHeuristic(answer) {
  const text = String(answer || '').trim()
  const words = text.split(/\s+/).filter(Boolean)
  const low = text.toLowerCase()
  const technicalTerms = [
    'api', 'latency', 'cache', 'caching', 'queue', 'kafka', 'redis', 'postgres', 'mysql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'pipeline', 'microservice', 'graphql',
    'rag', 'embedding', 'vector', 'index', 'retrieval', 'llm', 'token', 'throughput', 'observability',
    'slo', 'sla', 'idempotent', 'retry', 'circuit breaker', 'sharding', 'partition',
  ]
  const claimIndicators = ['i built', 'i designed', 'i implemented', 'i used', 'i optimized', 'i migrated', 'i led', 'i created']

  const detectedTerms = technicalTerms.filter((t) => low.includes(t))
  const claimIndicator = claimIndicators.find((c) => low.includes(c))

  const claimMatch = text.match(/\b(?:used|implemented|designed|built|optimized|migrated|created)\s+([^,.]{3,80})/i)
  const claim = claimMatch?.[1]?.trim() || (detectedTerms[0] ? `used ${detectedTerms[0]}` : '')

  const thin = words.length < 18 || detectedTerms.length === 0
  const technicalDepth = clamp(Math.round((detectedTerms.length * 12) + Math.min(words.length, 50) * 1.2), 8, 92)

  if (claimIndicator && claim) {
    return {
      classification: 'claim',
      target: claim,
      rationale: 'Answer includes a direct implementation claim that can be stress-tested.',
      thin,
      technicalDepth,
      detectedTerms,
    }
  }

  return {
    classification: 'logic-gap',
    target: detectedTerms[0] || 'execution details',
    rationale: 'Answer is high-level or vague. Missing concrete architecture, trade-offs, or metrics.',
    thin: true,
    technicalDepth: clamp(technicalDepth - 12, 5, 70),
    detectedTerms,
  }
}

export function buildFallbackFollowUp({ question, scan }) {
  if (scan.classification === 'claim') {
    return `You said you ${scan.target}. Walk me through the exact architecture, the key trade-off you made, and one production metric you improved.`
  }
  return `Your answer was high-level. For "${question}", give a concrete implementation: components used, failure mode handled, and measurable impact.`
}
