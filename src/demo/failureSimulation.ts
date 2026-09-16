/**
 * ponytail: Demo Failure Simulation (Section 13.4).
 * Hidden admin control to force-simulate degraded states during a live demo.
 * Intercepts fetch() when a simulation is active and returns appropriate failures.
 */

export type FailureScenario =
  | 'api-failure'        // All API calls return 503
  | 'llm-unavailable'    // Gemini/Sarvam endpoints return 429
  | 'slow-network'       // 3-second delay on every request
  | 'empty-jobs'         // /api/jobs/* returns empty arrays
  | 'invalid-resume'     // /api/resume/* returns parse error
  | 'github-unavailable'; // /api/github/* returns 503

let activeScenario: FailureScenario | null = null;
let originalFetch: typeof fetch | null = null;

const SCENARIO_LABELS: Record<FailureScenario, string> = {
  'api-failure': 'API Failure (503)',
  'llm-unavailable': 'LLM Rate Limited (429)',
  'slow-network': 'Slow Network (3s delay)',
  'empty-jobs': 'Empty Job Results',
  'invalid-resume': 'Resume Parse Error',
  'github-unavailable': 'GitHub Unavailable',
};

export function getScenarioLabels() { return SCENARIO_LABELS; }
export function getActiveScenario() { return activeScenario; }

export function activateFailureSimulation(scenario: FailureScenario) {
  if (originalFetch) deactivateFailureSimulation(); // clean up previous
  activeScenario = scenario;
  originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    switch (scenario) {
      case 'api-failure':
        if (url.includes('/api/'))
          return new Response(JSON.stringify({ error: 'Service temporarily unavailable (simulated)' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        break;

      case 'llm-unavailable':
        if (url.includes('/api/resume') || url.includes('/api/interview') || url.includes('/api/jobs'))
          return new Response(JSON.stringify({ error: 'Rate limit exceeded (simulated)', degraded: true }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        break;

      case 'slow-network':
        if (url.includes('/api/'))
          await new Promise(r => setTimeout(r, 3000));
        break;

      case 'empty-jobs':
        if (url.includes('/api/jobs'))
          return new Response(JSON.stringify({ items: [], warning: 'No matching positions found (simulated)' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        break;

      case 'invalid-resume':
        if (url.includes('/api/resume'))
          return new Response(JSON.stringify({ error: 'Failed to parse resume: unsupported format (simulated)' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
        break;

      case 'github-unavailable':
        if (url.includes('/api/github') || url.includes('/api/career/verify'))
          return new Response(JSON.stringify({ error: 'GitHub API unavailable (simulated)' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        break;
    }

    return originalFetch!(input, init);
  };

  console.warn(`[NEXIS Demo] Failure simulation ACTIVE: ${SCENARIO_LABELS[scenario]}`);
}

export function deactivateFailureSimulation() {
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
  activeScenario = null;
  console.warn('[NEXIS Demo] Failure simulation DEACTIVATED');
}
