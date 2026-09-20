/**
 * FILE: server/middleware/securityHeaders.js
 * PURPOSE: Phase 19 — Security headers middleware (Section 22.4)
 * 
 * Sets browser-hardening headers equivalent to helmet defaults,
 * without adding a new dependency. Controls:
 *  - X-Content-Type-Options (prevent MIME sniffing)
 *  - X-Frame-Options (prevent clickjacking)
 *  - X-XSS-Protection (legacy XSS filter)
 *  - Referrer-Policy (control leakage)
 *  - Content-Security-Policy (baseline self-only)
 *  - Strict-Transport-Security (HSTS in production)
 *  - Permissions-Policy (disable unnecessary browser APIs)
 *  - X-Download-Options (IE download protection)
 *  - Cache-Control for API responses
 *
 * DEPENDENCIES: none
 * USED BY: server/index.js
 */

export function securityHeaders() {
  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Prevent clickjacking — allow same origin only
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    // Legacy XSS filter (modern browsers ignore, but older ones benefit)
    res.setHeader('X-XSS-Protection', '1; mode=block')

    // Control referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Baseline CSP — allow self resources, inline scripts (Vite dev), and data URIs for images
    // Production should tighten this with specific domains
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.adzuna.com https://generativelanguage.googleapis.com"
      )
      // HSTS — 1 year, include subdomains
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    // Disable browser features we don't need
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()'
    )

    // IE download protection
    res.setHeader('X-Download-Options', 'noopen')

    // API responses should not be cached by default
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      res.setHeader('Pragma', 'no-cache')
    }

    next()
  }
}

export default securityHeaders
