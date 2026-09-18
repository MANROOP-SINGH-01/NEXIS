import { ApplicationFormField, ApplicationProposal, AtsType, DiscoveredJob, WorkHistoryProfile } from '../types';

/**
 * Detects the ATS platform from URL or page context
 * Greenhouse, Lever, Workday, or Direct
 */
export function detectAtsType(url: string = '', textContent: string = ''): AtsType {
  const combined = `${url} ${textContent}`.toLowerCase();

  if (combined.includes('greenhouse.io') || combined.includes('grnhse_iframe') || combined.includes('boards.greenhouse')) {
    return 'greenhouse';
  }
  if (combined.includes('lever.co') || combined.includes('jobs.lever.co')) {
    return 'lever';
  }
  if (combined.includes('myworkdayjobs.com') || combined.includes('workday.com')) {
    return 'workday';
  }
  if (url.startsWith('http')) {
    return 'direct';
  }
  return 'other';
}

/**
 * Resolves direct application URLs (e.g. bypassing Greenhouse iframe cross-origin locks)
 */
export function resolveDirectApplicationUrl(url: string): {
  directUrl: string;
  atsType: AtsType;
  requiresAuth: boolean;
  notes: string;
} {
  const atsType = detectAtsType(url);

  if (atsType === 'greenhouse') {
    // Check if it is an iframe embed or standard board
    const boardMatch = url.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    if (boardMatch) {
      const [, board, jobId] = boardMatch;
      return {
        directUrl: `https://job-boards.greenhouse.io/embed/job_app?for=${board}&token=${jobId}`,
        atsType: 'greenhouse',
        requiresAuth: false,
        notes: 'Greenhouse iframe direct URL resolved to bypass cross-origin restrictions.',
      };
    }
  }

  if (atsType === 'lever') {
    // Lever allows clean direct application endpoints
    const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)\/([^/?]+)/);
    if (leverMatch && !url.includes('/apply')) {
      return {
        directUrl: `${url.split('?')[0]}/apply`,
        atsType: 'lever',
        requiresAuth: false,
        notes: 'Lever direct application form resolved.',
      };
    }
  }

  if (atsType === 'workday') {
    return {
      directUrl: url,
      atsType: 'workday',
      requiresAuth: true,
      notes: 'Workday multi-stage application requires logging into the employer portal before submission.',
    };
  }

  return {
    directUrl: url,
    atsType,
    requiresAuth: false,
    notes: 'Standard career application portal.',
  };
}

/**
 * Builds an ApplicationProposal for Two-Phase Confirmation
 * Phase 1: Review proposed fields, auto-filled data, and questions needing user input
 * Phase 2: Final approval before submission
 */
export function createApplicationProposal(
  job: DiscoveredJob,
  profile: WorkHistoryProfile,
  candidateEmail: string = 'candidate@nexis.ai',
  candidatePhone: string = '+91 98765 43210',
  tailoredResumeText?: string,
  coverLetterText?: string
): ApplicationProposal {
  const { directUrl, atsType } = resolveDirectApplicationUrl(job.url);

  const nameParts = profile.candidateName.split(' ');
  const firstName = nameParts[0] || 'Candidate';
  const lastName = nameParts.slice(1).join(' ') || 'Professional';

  // Common ATS Form Fields pre-filled from factual candidate profile
  const autoFillFields: Record<string, string> = {
    'First Name': firstName,
    'Last Name': lastName,
    'Full Name': profile.candidateName,
    'Email Address': candidateEmail,
    'Phone Number': candidatePhone,
    'Current Role': profile.roles[0]?.title || 'Senior Software Engineer',
    'Current Company': profile.roles[0]?.company || 'Tech Systems',
    'Target Role': job.title,
    'Location': 'Remote / Hybrid',
    'LinkedIn Profile': 'https://linkedin.com/in/candidate',
    'GitHub Profile': 'https://github.com/candidate',
  };

  const proposedAnswers: Record<string, string> = {
    'Why do you want to join this company?':
      `I am impressed by ${job.company}'s work and see a strong alignment with my experience delivering ${profile.roles[0]?.accomplishments[0]?.headline || 'scalable software systems'}.`,
    'Are you legally authorized to work in this location?': 'Yes',
    'Will you now or in the future require sponsorship?': 'No',
    'Notice Period': 'Immediate / 2 Weeks',
  };

  // Fields flagged for human review/input
  const needsUserInput: ApplicationFormField[] = [
    {
      name: 'desired_salary',
      label: 'Desired Annual Compensation',
      type: 'text',
      required: false,
      proposedValue: job.salary ? job.salary.split(' - ')[0] || '' : 'Market Competitive',
      source: 'user_input',
      needsReview: true,
    },
    {
      name: 'earliest_start_date',
      label: 'Earliest Available Start Date',
      type: 'text',
      required: true,
      proposedValue: 'Within 2-3 weeks',
      source: 'user_input',
      needsReview: true,
    },
    {
      name: 'custom_question',
      label: 'Specific questions regarding team architecture or tech stack',
      type: 'textarea',
      required: false,
      proposedValue: `What are the primary technical challenges the engineering team is tackling for ${job.title} over the next 6 months?`,
      source: 'user_input',
      needsReview: false,
    },
  ];

  return {
    jobId: job.id,
    company: job.company,
    role: job.title,
    atsType,
    directFormUrl: directUrl,
    autoFillFields,
    proposedAnswers,
    needsUserInput,
    tailoredResumeText: tailoredResumeText || 'Tailored STAR-format resume ready for upload.',
    coverLetterText: coverLetterText || 'Targeted 300-word cover letter ready for submission.',
    stage: 'field-approval',
  };
}
