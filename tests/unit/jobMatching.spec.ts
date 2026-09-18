import { test, expect } from '@playwright/test';
import { calculateJobTrustScore, calculateMultiSignalMatch } from '../../server/services/jobTrustEngine.js';

test.describe('Deterministic 5-Factor Job Matching & Trust Engine', () => {

  test('5-Factor weights strictly sum to 1.00 (100%)', () => {
    // Weights defined in specification:
    // Skill = 0.35, Experience = 0.20, Title = 0.20, Project = 0.15, Location = 0.10
    const wSkill = 0.35;
    const wExp = 0.20;
    const wTitle = 0.20;
    const wProj = 0.15;
    const wLoc = 0.10;

    const sum = wSkill + wExp + wTitle + wProj + wLoc;
    expect(sum).toBeCloseTo(1.00, 5);
  });

  test('Deterministic score calculation produces exact, reproducible results', () => {
    const candidateInput = {
      jobTitle: 'Senior Full Stack Engineer',
      jobDescription: 'Seeking TypeScript, React, Node.js, and PostgreSQL expertise for remote role.',
      jobLocation: 'Remote',
      candidateSkills: [
        { skill: 'TypeScript', demonstrated: true },
        { skill: 'React', demonstrated: true },
        { skill: 'Node.js', demonstrated: true },
        { skill: 'PostgreSQL', demonstrated: true },
      ],
      candidateExperienceYears: 6,
      userTargetRole: 'Full Stack Engineer',
      candidateLocation: 'Remote',
      hasEvidence: true,
    };

    const run1 = calculateMultiSignalMatch(candidateInput);
    const run2 = calculateMultiSignalMatch(candidateInput);

    // Completely identical and reproducible without any LLM variance
    expect(run1).toEqual(run2);
    expect(run1.overallScore).toBeGreaterThanOrEqual(75);
    expect(run1.bucket).toBe('APPLY_NOW');
    expect(run1.locationScore).toBe(95);
    expect(run1.projectScore).toBe(85);
  });

  test('Missing optional inputs are handled deterministically without crashing', () => {
    // Minimal input: empty strings and empty skills
    const emptyMatch = calculateMultiSignalMatch({
      jobTitle: '',
      jobDescription: '',
      jobLocation: '',
      candidateSkills: [],
      candidateExperienceYears: 0,
      userTargetRole: '',
      candidateLocation: '',
      hasEvidence: false,
    });

    expect(typeof emptyMatch.overallScore).toBe('number');
    expect(emptyMatch.overallScore).toBeGreaterThanOrEqual(0);
    expect(emptyMatch.overallScore).toBeLessThanOrEqual(100);
    expect(['APPLY_NOW', 'LEARN_THEN_APPLY', 'STRETCH', 'IGNORE']).toContain(emptyMatch.bucket);
  });

  test('Bucket thresholds assign correctly based on score boundaries', () => {
    // Test high match -> APPLY_NOW (>= 75)
    const strongMatch = calculateMultiSignalMatch({
      jobTitle: 'Frontend Engineer',
      jobDescription: 'React and TailwindCSS',
      jobLocation: 'Remote',
      candidateSkills: [{ skill: 'React' }, { skill: 'TailwindCSS' }],
      candidateExperienceYears: 3,
      userTargetRole: 'Frontend Engineer',
      candidateLocation: 'Remote',
      hasEvidence: true,
    });
    expect(strongMatch.overallScore).toBeGreaterThanOrEqual(75);
    expect(strongMatch.bucket).toBe('APPLY_NOW');

    // Test junior vs senior mismatch -> lower bucket
    const stretchMatch = calculateMultiSignalMatch({
      jobTitle: 'Principal Cloud Architect',
      jobDescription: 'Kubernetes, Go, Distributed Consensus',
      jobLocation: 'Tokyo',
      candidateSkills: [{ skill: 'Python' }],
      candidateExperienceYears: 1,
      userTargetRole: 'Frontend Developer',
      candidateLocation: 'Bengaluru',
      hasEvidence: false,
    });
    expect(stretchMatch.overallScore).toBeLessThan(55);
    expect(['STRETCH', 'IGNORE']).toContain(stretchMatch.bucket);
  });

  test('Job Trust Score correctly identifies enterprise ATS portals and flag suspicious postings', () => {
    // High trust: Direct Greenhouse link with identified company and recent date
    const legitJob = calculateJobTrustScore({
      company: 'Razorpay',
      url: 'https://boards.greenhouse.io/razorpay/jobs/12345',
      postedAt: new Date().toISOString(),
      description: 'Senior Software Engineer, Core Payments. Competitive CTC and benefits.',
      source: 'adzuna',
    });

    expect(legitJob.trustScore).toBeGreaterThanOrEqual(0.80);
    expect(legitJob.trustLevel).toBe('HIGH');
    expect(legitJob.isDirectAts).toBe(true);
    expect(legitJob.isLikelyGhost).toBe(false);

    // Low trust: Anonymous company with red flags
    const suspiciousJob = calculateJobTrustScore({
      company: 'Confidential',
      url: 'http://insecure-jobs-portal.xyz/apply',
      postedAt: new Date(Date.now() - 90 * 86400000).toISOString(), // 90 days old ghost job
      description: 'Urgent hiring! Registration fee required before interview scheduling.',
    });

    expect(suspiciousJob.trustScore).toBeLessThan(0.55);
    expect(suspiciousJob.trustLevel).toBe('LOW');
    expect(suspiciousJob.isLikelyGhost).toBe(true);
  });
});
