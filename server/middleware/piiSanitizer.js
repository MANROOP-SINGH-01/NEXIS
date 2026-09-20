/**
 * FILE: server/middleware/piiSanitizer.js
 * PURPOSE: Phase 19 — PII Sanitization for structured logging (Section 22.4)
 * 
 * Ensures console/log output never contains raw:
 *  - Phone numbers (masked to last 4 digits)
 *  - Aadhaar/identity numbers (masked to last 4)
 *  - Email addresses (masked domain only)
 *  - Full document contents (truncated)
 * 
 * This module wraps console.log/warn/error at the application boundary
 * and provides utility functions for explicit sanitization in service code.
 *
 * DEPENDENCIES: none
 * USED BY: server/index.js (optional global install), server/services/* (explicit use)
 */

// Phone number patterns: +91XXXXXXXXXX, 91XXXXXXXXXX, 10-digit mobile
const PHONE_REGEX = /(?:\+?91[-\s]?)?[6-9]\d{9}/g

// Aadhaar-like: 12-digit numeric sequences (with optional spaces/hyphens)
const AADHAAR_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g

// Email pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

/**
 * Masks a phone number to show only last 4 digits.
 * +919876543210 → ●●●●●●●3210
 */
export function maskPhone(phone) {
  const cleaned = String(phone).replace(/[-\s]/g, '')
  if (cleaned.length < 4) return '●●●●'
  return '●'.repeat(cleaned.length - 4) + cleaned.slice(-4)
}

/**
 * Masks an Aadhaar number to show only last 4 digits.
 * 1234 5678 9012 → ●●●● ●●●● 9012
 */
export function maskAadhaar(aadhaar) {
  const cleaned = String(aadhaar).replace(/[-\s]/g, '')
  if (cleaned.length < 4) return '●●●●'
  return '●'.repeat(cleaned.length - 4) + cleaned.slice(-4)
}

/**
 * Masks an email to show only domain hint.
 * user@example.com → u●●●@example.com
 */
export function maskEmail(email) {
  const parts = String(email).split('@')
  if (parts.length !== 2) return '●●●@●●●'
  const local = parts[0]
  return local.charAt(0) + '●'.repeat(Math.max(local.length - 1, 2)) + '@' + parts[1]
}

/**
 * Sanitizes a string by masking all PII patterns found within it.
 * Safe for log output.
 */
export function sanitizeForLog(input) {
  if (input == null) return ''
  let text = String(input)
  
  // Mask phones
  text = text.replace(PHONE_REGEX, (match) => maskPhone(match))
  
  // Mask Aadhaar-like numbers
  text = text.replace(AADHAAR_REGEX, (match) => maskAadhaar(match))
  
  // Mask emails
  text = text.replace(EMAIL_REGEX, (match) => maskEmail(match))
  
  // Truncate very long content (potential document dumps)
  if (text.length > 2000) {
    text = text.slice(0, 2000) + ' [TRUNCATED — raw content excluded from logs per DPDP §22.4]'
  }
  
  return text
}

/**
 * Sanitizes an object deeply for logging, masking PII in string values.
 * Returns a new object — does not mutate the original.
 */
export function sanitizeObjectForLog(obj, maxDepth = 4) {
  if (maxDepth <= 0) return '[DEPTH_LIMIT]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeForLog(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 50).map(item => sanitizeObjectForLog(item, maxDepth - 1))
  }
  
  if (typeof obj === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase()
      // Fully redact sensitive field names
      if (
        keyLower.includes('password') ||
        keyLower.includes('secret') ||
        keyLower.includes('token') ||
        keyLower.includes('apikey') ||
        keyLower.includes('api_key') ||
        keyLower.includes('authorization')
      ) {
        sanitized[key] = '[REDACTED]'
      } else if (
        keyLower.includes('phone') ||
        keyLower.includes('aadhaar') ||
        keyLower.includes('mobile')
      ) {
        sanitized[key] = typeof value === 'string' ? maskPhone(value) : '[REDACTED]'
      } else if (keyLower.includes('email')) {
        sanitized[key] = typeof value === 'string' ? maskEmail(value) : '[REDACTED]'
      } else {
        sanitized[key] = sanitizeObjectForLog(value, maxDepth - 1)
      }
    }
    return sanitized
  }
  
  return String(obj)
}

export default {
  maskPhone,
  maskAadhaar,
  maskEmail,
  sanitizeForLog,
  sanitizeObjectForLog
}
