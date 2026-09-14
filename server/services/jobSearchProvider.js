/**
 * FILE: server/services/jobSearchProvider.js
 * PURPOSE: Job aggregator client (Adzuna) to fetch real, verified job listings.
 */

import { ADZUNA_APP_ID, ADZUNA_APP_KEY } from '../config.js'

export async function activeProviderSearch({ query, location = 'us' }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.log('[jobSearchProvider] Missing Adzuna keys, returning empty results');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.adzuna.com/v1/api/jobs/${location}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=10&what=${encodedQuery}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || `Adzuna search failed (${response.status})`);
    }

    if (!json.results || !Array.isArray(json.results)) {
      return [];
    }

    return json.results.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Unknown Company',
      link: job.redirect_url,
      description: job.description,
      location: job.location?.display_name,
      source: 'adzuna'
    }));

  } catch (error) {
    console.error('[jobSearchProvider] Error:', error.message);
    return [];
  }
}
