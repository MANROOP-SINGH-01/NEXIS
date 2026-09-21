/**
 * FILE: tests/unit/orchestratorFlow.spec.ts
 * PURPOSE: Unit test suite for Phase 12 Section 15.5 Agent Orchestration Engine & Queue Dispatcher.
 * SPECIFICATION: Master Spec Section 15.2, 15.3, 15.5 (Steps 1–12), Phase 12.
 */

import { test, expect } from '@playwright/test';
import dispatcher from '../../server/orchestrator/dispatcher.js';
import vectorStore from '../../server/services/vectorStore.js';
import specialistAgentsService from '../../server/services/specialistAgents.js';

test.describe('Section 15.5: Agent Orchestration Engine & Queue Dispatcher Unit Tests', () => {
  test('1. Dispatcher executes jobs across net-new and baseline agents attaching telemetry', async () => {
    // Test 1: Net-new agent (outcome-tracking)
    const outcomeResult = await dispatcher.executeAgentJob('outcome-tracking', {
      traineeId: 'MH-2026-PUN-0199',
      certificationDate: new Date(Date.now() - 50 * 86400000).toISOString(),
      events: [],
    });

    expect(outcomeResult.success).toBe(true);
    expect(outcomeResult.jobType).toBe('outcome-tracking');
    expect(outcomeResult.queueJobId).toBeTruthy();
    expect(typeof outcomeResult.durationMs).toBe('number');
    expect(outcomeResult.durationMs).toBeGreaterThanOrEqual(0);

    // Verify finding schema with Section 15.5 Step 9 telemetry
    const finding = outcomeResult.finding;
    expect(finding.agent).toBe('outcome-tracking');
    expect(finding.queueJobId).toBe(outcomeResult.queueJobId);
    expect(typeof finding.durationMs).toBe('number');

    // Test 2: Baseline wrapped agent (nexus-strategist) with NSQF grounding
    const stratResult = await dispatcher.executeAgentJob('nexus-strategist', {
      traineeId: 'MH-2026-PUN-0199',
      query: 'Junior Software Developer Node Express',
    });

    expect(stratResult.success).toBe(true);
    expect(stratResult.jobType).toBe('nexus-strategist');
    expect(stratResult.finding.agent).toBe('nexus-strategist');
    expect(stratResult.finding.details.nsqfQualificationPack).toBeTruthy();
    expect(stratResult.finding.queueJobId).toBe(stratResult.queueJobId);

    // Test 3: Baseline wrapped agent (nexus-hunter) with Adzuna matching
    const hunterResult = await dispatcher.executeAgentJob('nexus-hunter', {
      traineeId: 'MH-2026-PUN-0199',
      role: 'CNC Machinist',
      location: 'Pune',
    });

    expect(hunterResult.success).toBe(true);
    expect(hunterResult.finding.agent).toBe('nexus-hunter');
    expect(hunterResult.finding.details.matchingFormula).toContain('M = 0.40S + 0.20E');
  });

  test('2. Asynchronous enqueueJob returns QUEUED job descriptor and processes in worker', async () => {
    const enqueued = await dispatcher.enqueueJob('data-quality', {
      traineeId: 'MH-2026-THN-9988',
      enrollmentDate: '2025-01-01',
      certificationDate: '2025-03-15',
      employmentStartDate: '2025-04-01',
    });

    expect(enqueued.jobId).toBeTruthy();
    expect(enqueued.jobType).toBe('data-quality');
    expect(enqueued.status).toBe('QUEUED');
    expect(enqueued.queueMode).toBeTruthy();

    // Allow worker execution cycle
    await new Promise((resolve) => setTimeout(resolve, 60));

    const status = await dispatcher.getJobStatus(enqueued.jobId);
    expect(status).toBeTruthy();
    expect(status.status).toBe('COMPLETED');
    expect(status.result.success).toBe(true);
    expect(status.result.finding.agent).toBe('data-quality');
    expect(status.result.finding.details.isClean).toBe(true);
  });

  test('3. getQueueStatus accurately reports queue depth, completed, and roster count (Section 15.5 Step 11)', async () => {
    const queueStatus = await dispatcher.getQueueStatus();

    expect(queueStatus.queueName).toBe('agent-jobs');
    expect(typeof queueStatus.depth).toBe('number');
    expect(typeof queueStatus.waiting).toBe('number');
    expect(typeof queueStatus.active).toBe('number');
    expect(typeof queueStatus.completed).toBe('number');
    expect(typeof queueStatus.failed).toBe('number');
    expect(typeof queueStatus.totalEnqueued).toBe('number');
    expect(typeof queueStatus.oldestPendingJobAgeMs).toBe('number');
    expect(queueStatus.rosterCount).toBe(11); // 11 agents in roster
  });

  test('4. VectorStore grounding retrieves NSQF Qualification Packs for Nexus-Strategist', async () => {
    const itResults = await vectorStore.queryNSQFTaxonomy('Backend Node.js Developer Express REST API', 2);
    expect(itResults.length).toBeGreaterThan(0);
    expect(itResults[0].qualificationPack).toBe('SSC/Q0508');
    expect(itResults[0].nsqfLevel).toBe(5);
    expect(itResults[0].similarityScore).toBeGreaterThan(0.5);

    const autoResults = await vectorStore.queryNSQFTaxonomy('CNC Operator Turning Lathe Blueprint G-code', 2);
    expect(autoResults.length).toBeGreaterThan(0);
    expect(autoResults[0].qualificationPack).toBe('CSC/Q0115');
    expect(autoResults[0].nsqfLevel).toBe(4);
  });

  test('5. VectorStore grounding retrieves Maharashtra District Economic Reports for Policy Intelligence', async () => {
    const puneReport = await vectorStore.queryDistrictEconomicReport('Pune', 1);
    expect(puneReport.length).toBe(1);
    expect(puneReport[0].district).toBe('Pune');
    expect(puneReport[0].dominantSectors).toContain('Automotive & Auto-components');
    expect(puneReport[0].division).toBe('Pune Division');

    const nashikReport = await vectorStore.queryDistrictEconomicReport('Nashik', 1);
    expect(nashikReport.length).toBe(1);
    expect(nashikReport[0].district).toBe('Nashik');
    expect(nashikReport[0].dominantSectors).toContain('Agri-processing');
  });

  test('6. Dispatcher rejects invalid jobType and handles worker failure cleanly', async () => {
    await expect(
      dispatcher.enqueueJob('invalid-nonexistent-agent', {})
    ).rejects.toThrow(/Unknown jobType/);

    await expect(
      dispatcher.executeAgentJob('invalid-nonexistent-agent', {})
    ).rejects.toThrow(/Unsupported agent jobType/);
  });
});
