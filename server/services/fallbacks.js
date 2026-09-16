/**
 * FILE: server/services/fallbacks.js
 * PURPOSE: Honest degraded-state responses when external APIs are unavailable.
 * DEPENDENCIES: None
 * USED BY: routes/jobs.js
 */

/**
 * Returns an empty array with a degraded flag instead of fabricated job postings.
 * Callers should check the `degraded` property to display appropriate UI messaging.
 */
export function fallbackPrimeTargets() {
  return {
    items: [],
    degraded: true,
    message: 'Live job data is temporarily unavailable. Results will appear when the job provider is reachable.',
  }
}
