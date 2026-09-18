import fs from 'fs';
import { buildResumePdfFromStructured } from '../server/services/pdfGenerator.js';

const BASE_URL = 'https://nexis-forge.vercel.app';

async function runAudit() {
  console.log('=== NEXIS PRODUCTION LIVE AUDIT ===');
  console.log(`Target: ${BASE_URL}\n`);

  const results = {
    health: null,
    registration: null,
    login: null,
    authMe: null,
    adzunaJobs: null,
    resumeExtraction: null,
    freeLlmApi: null,
    revocation: null
  };

  // 1. Health & DB connectivity
  console.log('[TEST 1] Probing /api/health...');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    console.log(`Response HTTP ${res.status}:`, data);
    results.health = { status: res.status, data };
  } catch (err) {
    console.error('Health check failed:', err.message);
    results.health = { error: err.message };
  }

  // 2. User Registration
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const testPhone = `+9199${randomSuffix}12`;
  const testEmail = `audit_${randomSuffix}@nexis.internal`;
  const testPassword = `AuditPass_${randomSuffix}!Safe`;
  let authToken = null;
  let createdUserId = null;

  console.log(`\n[TEST 2] Registering test user (${testEmail})...`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        email: testEmail,
        password: testPassword,
        name: `Audit Candidate ${randomSuffix}`
      })
    });
    const data = await res.json();
    console.log(`Registration HTTP ${res.status}:`, {
      success: !!data.user?.id,
      userId: data.user?.id ? '[RECORD CREATED]' : null,
      role: data.user?.role
    });
    if (res.ok && data.token) {
      authToken = data.token;
      createdUserId = data.user.id;
      results.registration = { status: res.status, success: true, userId: createdUserId };
    } else {
      results.registration = { status: res.status, success: false, data };
    }
  } catch (err) {
    console.error('Registration failed:', err.message);
    results.registration = { error: err.message };
  }

  // 3. User Login
  console.log(`\n[TEST 3] Logging in with created credentials...`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    console.log(`Login HTTP ${res.status}:`, {
      success: !!data.token,
      userId: data.user?.id ? '[VERIFIED]' : null
    });
    if (res.ok && data.token) {
      authToken = data.token; // refresh session token
      results.login = { status: res.status, success: true };
    } else {
      results.login = { status: res.status, success: false };
    }
  } catch (err) {
    console.error('Login failed:', err.message);
    results.login = { error: err.message };
  }

  // 4. Authenticated /api/auth/me
  console.log(`\n[TEST 4] Calling /api/auth/me with Bearer token...`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const data = await res.json();
    console.log(`Auth Me HTTP ${res.status}:`, {
      authenticated: !!data.user?.id,
      role: data.user?.role,
      hasProfile: !!data.user?.profile
    });
    results.authMe = { status: res.status, success: !!data.user?.id };
  } catch (err) {
    console.error('Auth Me failed:', err.message);
    results.authMe = { error: err.message };
  }

  // 5. Adzuna Job Discovery (GET /api/jobs/discover)
  console.log(`\n[TEST 5] Discovering live Adzuna jobs (/api/jobs/discover)...`);
  try {
    const res = await fetch(`${BASE_URL}/api/jobs/discover?what=Software%20Engineer&country=in`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const data = await res.json();
    console.log(`Adzuna HTTP ${res.status}:`, {
      provider: data.provider,
      totalCount: data.results?.length,
      sampleJobTitle: data.results?.[0]?.title,
      sampleCompany: data.results?.[0]?.company,
      hasRedirectLink: typeof data.results?.[0]?.link === 'string' && data.results[0].link.startsWith('http')
    });
    results.adzunaJobs = {
      status: res.status,
      count: data.results?.length || 0,
      provider: data.provider,
      sampleCompany: data.results?.[0]?.company,
      sampleTitle: data.results?.[0]?.title
    };
  } catch (err) {
    console.error('Adzuna discovery failed:', err.message);
    results.adzunaJobs = { error: err.message };
  }

  // 6. Resume PDF Serverless Extraction (/api/resume/extract)
  console.log(`\n[TEST 6] Testing serverless PDF extraction (/api/resume/extract)...`);
  try {
    const sampleResume = {
      header: {
        name: 'Verification Candidate',
        title: 'Fullstack Systems Engineer',
        email: testEmail,
        phone: testPhone,
        location: 'Bengaluru, India',
        links: ['github.com/nexis-candidate']
      },
      summary: 'Experienced developer specializing in resilient cloud services and distributed databases.',
      experience: [
        {
          title: 'Senior Engineer',
          company: 'Nexus Cloud Labs',
          location: 'Bengaluru',
          start: '2023',
          end: 'Present',
          bullets: ['Engineered microservices on AWS and serverless edge functions.']
        }
      ],
      skills: {
        core: ['TypeScript', 'Node.js', 'PostgreSQL', 'Prisma'],
        tools: ['Docker', 'Git'],
        cloud: ['AWS', 'Vercel']
      },
      education: [{ degree: 'B.Tech', school: 'Tech University', year: '2022' }],
      projects: [],
      certifications: []
    };

    const pdfBuffer = await buildResumePdfFromStructured(sampleResume);
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('resumePdf', pdfBlob, 'audit_resume.pdf');

    const res = await fetch(`${BASE_URL}/api/resume/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData
    });
    const data = await res.json();
    console.log(`PDF Extract HTTP ${res.status}:`, {
      pages: data.pages,
      hasText: typeof data.text === 'string' && data.text.length > 50,
      textLength: data.text?.length
    });
    results.resumeExtraction = {
      status: res.status,
      extractedPages: data.pages,
      charLength: data.text?.length
    };
  } catch (err) {
    console.error('PDF extraction failed:', err.message);
    results.resumeExtraction = { error: err.message };
  }

  // 7. FreeLLMAPI Diagnostic Endpoint
  console.log(`\n[TEST 7] Checking FreeLLMAPI diagnostic (/api/diagnostic/freellm)...`);
  try {
    const res = await fetch(`${BASE_URL}/api/diagnostic/freellm`);
    const data = await res.json();
    console.log(`FreeLLMAPI Diagnostic HTTP ${res.status}:`, data);
    results.freeLlmApi = { status: res.status, data };
  } catch (err) {
    console.error('FreeLLMAPI check failed:', err.message);
    results.freeLlmApi = { error: err.message };
  }

  // 8. Session Revocation / Logout
  console.log(`\n[TEST 8] Revoking session token (/api/auth/logout)...`);
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const logoutData = await logoutRes.json();
    console.log(`Logout HTTP ${logoutRes.status}:`, logoutData);

    const checkRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`Post-logout Auth Me HTTP ${checkRes.status} (Expected 401)`);
    results.revocation = {
      logoutStatus: logoutRes.status,
      postLogoutAuthMeStatus: checkRes.status,
      revokedSuccessfully: checkRes.status === 401
    };
  } catch (err) {
    console.error('Logout failed:', err.message);
    results.revocation = { error: err.message };
  }

  console.log('\n=== AUDIT RUN COMPLETED ===');
  return { results, createdUserId };
}

runAudit().then(summary => {
  fs.writeFileSync('audit_summary.json', JSON.stringify(summary, null, 2));
  console.log('Saved summary to audit_summary.json');
}).catch(console.error);
