import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000/api'; // API is exposed here, or 8787? Let's use 8787 to bypass proxy issues
const API_URL = 'http://localhost:8787/api';

async function run() {
  console.log('--- STARTING LIVE PROVIDER AUDIT ---');

  // 1. Register a test user
  const email = `test_live_${Date.now()}@example.com`;
  const phone = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  console.log(`\n=> Registering ${email}...`);
  let res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      phone,
      password: 'password123',
      name: 'Live Audit User',
      role: 'TRAINEE'
    })
  });
  let data = await res.json();
  const token = data.token;
  if (!token) {
    console.error('Failed to get token:', data);
    return;
  }
  console.log('Got token:', token.substring(0, 20) + '...');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Skipped AI testing

  // 3. Test Adzuna Job Search
  console.log('\n=> Testing Adzuna Live Job Search (/jobs/discover)');
  res = await fetch(`${API_URL}/jobs/discover`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      targetRole: 'React Developer',
      mode: 'current',
      skillProfile: {
        candidate_skills: [
          { skill: 'React', demonstrated: true },
          { skill: 'Node.js', demonstrated: true }
        ]
      }
    })
  });
  console.log('Status:', res.status);
  let jobData = await res.text();
  try {
    jobData = JSON.parse(jobData);
    console.log('Jobs returned:', jobData.items?.length || 0);
    if(jobData.items && jobData.items.length > 0) {
      console.log('First job:', jobData.items[0].job_title, 'at', jobData.items[0].company_name);
    }
  } catch (e) {
    console.error('Response was not JSON:', jobData);
  }

  // 4. Test LinkedIn Structure
  console.log('\n=> Testing LinkedIn Configuration');
  res = await fetch(`${API_URL}/linkedin/oauth/start`);
  console.log('LinkedIn Redirect Status:', res.status);
  // It should return 302 redirecting to LinkedIn OAuth
  
  console.log('\n--- LIVE AUDIT COMPLETE ---');
}

run().catch(console.error);
