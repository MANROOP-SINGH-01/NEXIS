/**
 * FILE: server/middleware/rateLimit.js
 * PURPOSE: In-memory rate limiting middleware for sensitive endpoints:
 *          - OTP requests (per phone number)
 *          - AI execution calls (per user session or IP)
 * DEPENDENCIES: None (native in-memory Map with periodic GC)
 */

class InMemoryRateLimiter {
  constructor(windowMs, maxRequests, keyPrefix = 'rl') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
    this.store = new Map();

    // Periodic cleanup of expired entries every 5 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
    if (interval.unref) interval.unref();
  }

  middleware(resolveKey, options = {}) {
    const { message = 'Too many requests. Please try again later.' } = options;

    return (req, res, next) => {
      // Allow bypassing rate limits in dev/test if explicit header provided
      if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-ratelimit']) {
        return next();
      }

      const rawKey = resolveKey(req);
      if (!rawKey) {
        return next();
      }

      const key = `${this.keyPrefix}:${rawKey}`;
      const now = Date.now();
      let record = this.store.get(key);

      if (!record || now > record.resetAt) {
        record = {
          count: 1,
          resetAt: now + this.windowMs,
        };
        this.store.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', resetSeconds);
        return res.status(429).json({
          error: message,
          retryAfterSeconds: resetSeconds,
        });
      }

      next();
    };
  }
}

// 1. OTP Rate Limiter: max 5 OTP requests per phone number per 15 minutes
export const otpLimiter = new InMemoryRateLimiter(
  15 * 60 * 1000,
  5,
  'otp'
).middleware(
  (req) => {
    const phone = req.body?.phoneNumber || req.body?.phone || '';
    if (!phone) return null;
    return String(phone).replace(/[^0-9+]/g, '');
  },
  {
    message: 'Too many OTP requests for this phone number. Please wait 15 minutes.',
  }
);

// 2. AI Rate Limiter: max 30 AI endpoint calls per user per hour (or per IP if unauthenticated)
export const aiLimiter = new InMemoryRateLimiter(
  60 * 60 * 1000,
  30,
  'ai'
).middleware(
  (req) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  {
    message: 'AI usage quota exceeded. Please wait before running more analyses.',
  }
);
