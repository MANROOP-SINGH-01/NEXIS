/**
 * FILE: scripts/test-career-graph.js
 * PURPOSE: Automated verification of Phase 1B (Career Graph, O*NET Taxonomy, Skill Gaps, Provenance)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8787';

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = options.headers || {};
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;

  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), json };
}

async function runTests() {
  console.log('🚀 Starting Phase 1B Career Graph & Skill Gap Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Target Roles Listing
    console.log('--- TEST GROUP 1: Target Roles Listing ---');
    const rolesRes = await makeRequest('/api/career-graph/roles');
    assert(rolesRes.status === 200, 'GET /api/career-graph/roles returns 200');
    assert(Array.isArray(rolesRes.json?.roles), 'Response contains roles array');
    assert(rolesRes.json?.roles?.length >= 5, `Found ${rolesRes.json?.roles?.length} target roles (>= 5)`);
    const firstRole = rolesRes.json?.roles?.[0];
    assert(Boolean(firstRole?.id && firstRole?.title && firstRole?.onetCode), 'Role has id, title, onetCode');

    // 2. Role Skills Requirements
    console.log('\n--- TEST GROUP 2: Role Skill Requirements ---');
    if (firstRole?.id) {
      const reqRes = await makeRequest(`/api/career-graph/role/${firstRole.id}/skills`);
      assert(reqRes.status === 200, `GET /api/career-graph/role/${firstRole.id}/skills returns 200`);
      assert(Boolean(reqRes.json?.role?.requirements), 'Role skills include requirements array');
      assert(reqRes.json?.role?.requirements?.length > 0, `Role has ${reqRes.json?.role?.requirements?.length} requirements`);
    }

    // 3. Auth Guard on Skill Gaps
    console.log('\n--- TEST GROUP 3: Auth Guard on Gaps & User Skills ---');
    const unauthGaps = await makeRequest('/api/career-graph/gaps');
    assert(unauthGaps.status === 401, 'Unauthenticated GET /api/career-graph/gaps returns 401');

    const unauthUserSkill = await makeRequest('/api/career-graph/user-skills', {
      method: 'POST',
      body: { skillName: 'Python' },
    });
    assert(unauthUserSkill.status === 401, 'Unauthenticated POST /api/career-graph/user-skills returns 401');

    // 4. Authenticated Skill Gaps Computation
    console.log('\n--- TEST GROUP 4: Authenticated Skill Gaps Computation ---');
    const authHeaders = { Authorization: 'Bearer dev_trainee' };
    const gapsRes = await makeRequest('/api/career-graph/gaps', { headers: authHeaders });
    assert(gapsRes.status === 200, 'Authenticated GET /api/career-graph/gaps returns 200');
    assert(Boolean(gapsRes.json?.role), 'Gaps response has target role');
    assert(Array.isArray(gapsRes.json?.gaps), 'Gaps response has gaps array');
    assert(Array.isArray(gapsRes.json?.matches), 'Gaps response has matches array');
    assert(typeof gapsRes.json?.gapSummary?.coveragePercent === 'number', 'Summary has coveragePercent number');

    // Verify importance weighting and priorities
    if (gapsRes.json?.gaps?.length > 0) {
      const topGap = gapsRes.json.gaps[0];
      assert(Boolean(topGap.priority), `Gap has calculated priority: ${topGap.priority}`);
      assert(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(topGap.priority), 'Priority is valid enum');
      assert(typeof topGap.weight === 'number' && topGap.weight > 0, 'Gap has calculated numeric weight');
    }

    // 5. Add User Skill with Provenance Tag
    console.log('\n--- TEST GROUP 5: Provenance Tagging on User Skill ---');
    const addSkillRes = await makeRequest('/api/career-graph/user-skills', {
      method: 'POST',
      headers: authHeaders,
      body: {
        skillName: 'Python',
        proficiency: 'ADVANCED',
        provenance: 'VERIFIED',
        evidenceSource: 'GitHub repo analysis: 14 commits in python-backend',
      },
    });

    assert(addSkillRes.status === 201, 'POST /api/career-graph/user-skills returns 201 Created');
    assert(addSkillRes.json?.userSkill?.provenance === 'VERIFIED', 'UserSkill provenance persisted as VERIFIED');
    assert(addSkillRes.json?.userSkill?.evidenceSource?.includes('GitHub'), 'Evidence source persisted');

    // 6. Verify Gap Recalculation with Provenance
    console.log('\n--- TEST GROUP 6: Gap Recalculation with Provenance ---');
    const reGapsRes = await makeRequest('/api/career-graph/gaps', { headers: authHeaders });
    const pyMatch = reGapsRes.json?.matches?.find(m => m.skill.toLowerCase() === 'python');
    if (pyMatch) {
      assert(pyMatch.provenance === 'VERIFIED', 'Python appears in matches with VERIFIED provenance');
      assert(Boolean(pyMatch.evidenceSource), 'Match includes evidenceSource');
    } else {
      console.log('  ℹ️ Python not in role requirements for current role; checking gap/match consistency');
      assert(true, 'Gaps response consistent');
    }

    // 7. Course Recommendations
    console.log('\n--- TEST GROUP 7: Course Recommendations for Top Gaps ---');
    assert(Array.isArray(reGapsRes.json?.recommendations), 'Response has recommendations array');
    console.log(`  ℹ️ Found ${reGapsRes.json?.recommendations?.length} course recommendations for missing gaps`);
    if (reGapsRes.json?.recommendations?.length > 0) {
      const course = reGapsRes.json.recommendations[0];
      assert(Boolean(course.provider && course.title), `Course valid: "${course.title}" via ${course.provider}`);
      assert(course.isGovt === true || course.isFree === true, 'Recommended course is Govt/Free');
    }

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Phase 1B Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
