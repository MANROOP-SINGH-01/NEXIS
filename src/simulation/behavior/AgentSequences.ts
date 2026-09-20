import { AnimationName, ExpressionKey } from '../../types';

export type SemanticAgentState =
  | 'IDLE'
  | 'WORKING'
  | 'THINKING'
  | 'SEARCHING'
  | 'READING'
  | 'WRITING'
  | 'WALKING'
  | 'CARRYING'
  | 'HANDOFF'
  | 'CONFUSED'
  | 'ERROR'
  | 'SUCCESS'
  | 'CELEBRATING'
  | 'WAITING';

export type WorkspaceItemType = 'paper' | 'folder' | 'card' | 'book';

export interface SequenceStep {
  name: string;
  animation: AnimationName;
  expression?: ExpressionKey;
  duration: number; // in seconds
  loop?: boolean;
  semanticState: SemanticAgentState;
  taskDescription: string;
  action?: 'none' | 'walk_to_desk' | 'walk_to_poi' | 'walk_to_agent' | 'pickup_item' | 'drop_item' | 'handoff' | 'glance_camera' | 'micro_failure';
  targetPoiPrefix?: string;
  targetAgentIndex?: number;
  itemType?: WorkspaceItemType | null;
}

export interface BehaviorSequence {
  id: string;
  agentIndex: number;
  name: string;
  priority: number; // 1 = Critical, 2 = Active Workflow, 3 = Handoff, 4 = User Interaction, 5 = Ambient
  interruptible: boolean;
  steps: SequenceStep[];
}

/**
 * ── 01 NEXIS-DIRECTOR (Lead Orchestrator & Developer) ──
 * Personality: Strategic, focused, slightly messy developer, typing sprints, keyboard micro-adjustments.
 */
export const DIRECTOR_SEQUENCES = {
  activeCodingSprint: (agentIndex: number): BehaviorSequence => ({
    id: `director-sprint-${Date.now()}`,
    agentIndex,
    name: 'Strategic Pipeline Synthesis',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Desk Settle',
        animation: AnimationName.SIT_WORK,
        expression: 'neutral',
        duration: 4.0,
        loop: true,
        semanticState: 'WRITING',
        taskDescription: 'Synthesizing pipeline roadmap into AST execution graph',
        action: 'walk_to_desk',
      },
      {
        name: 'Rapid Typing',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 5.0,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Dispatching telemetry directives across autonomous mesh',
      },
      {
        name: 'Keyboard Micro-Adjustment',
        animation: AnimationName.PICK,
        expression: 'doubtful',
        duration: 1.5,
        loop: false,
        semanticState: 'THINKING',
        taskDescription: 'Re-aligning mechanical keyboard and inspecting terminal logs',
        action: 'micro_failure',
      },
      {
        name: 'Review Execution State',
        animation: AnimationName.SIT_IDLE,
        expression: 'happy',
        duration: 3.5,
        loop: true,
        semanticState: 'READING',
        taskDescription: 'Evaluating domain agent telemetry throughput',
      },
    ],
  }),

  errorFreezeAndRecover: (agentIndex: number): BehaviorSequence => ({
    id: `director-error-recover-${Date.now()}`,
    agentIndex,
    name: 'Syntax Block & Recovery',
    priority: 1,
    interruptible: false,
    steps: [
      {
        name: 'Stare At Screen',
        animation: AnimationName.LOOK_AROUND,
        expression: 'surprised',
        duration: 2.2,
        loop: false,
        semanticState: 'CONFUSED',
        taskDescription: 'Encountered unexpected schema conflict in agent telemetry',
      },
      {
        name: 'Pondering Fix',
        animation: AnimationName.SAD,
        expression: 'doubtful',
        duration: 2.5,
        loop: false,
        semanticState: 'THINKING',
        taskDescription: 'Tracing root cause and determining rollback boundary',
      },
      {
        name: 'Resolved Fix',
        animation: AnimationName.HAPPY,
        expression: 'happy',
        duration: 2.0,
        loop: false,
        semanticState: 'SUCCESS',
        taskDescription: 'Applied patch and synchronized cluster states',
      },
      {
        name: 'Resume Work',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 4.0,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Monitoring active multi-agent pipeline',
      },
    ],
  }),
};

/**
 * ── 02 NEXIS-VISION (ATS Scanner & Visual UX Auditor) ──
 * Personality: Precise, robotic, scanning creature/machine, eyes wide on problem, relief on pass.
 */
export const VISION_SEQUENCES = {
  atsScanRoutine: (agentIndex: number, score: number): BehaviorSequence => ({
    id: `vision-ats-scan-${Date.now()}`,
    agentIndex,
    name: 'Precision ATS Scan',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Initiate Eye-Tracking Scan',
        animation: AnimationName.LOOK_AROUND,
        expression: 'surprised',
        duration: 3.0,
        loop: false,
        semanticState: 'SEARCHING',
        taskDescription: 'Simulating recruiter visual eye-path across top 1/3 of resume',
      },
      {
        name: 'Parsing Visual Tokens',
        animation: AnimationName.SIT_WORK,
        expression: score < 60 ? 'doubtful' : 'listening',
        duration: 4.0,
        loop: true,
        semanticState: 'READING',
        taskDescription: `Auditing typography hierarchy and machine-readability (Score: ${score}%)`,
      },
      ...(score < 60
        ? [
            {
              name: 'Flag Layout Anomaly',
              animation: AnimationName.SAD,
              expression: 'sad' as ExpressionKey,
              duration: 2.5,
              loop: false,
              semanticState: 'ERROR' as SemanticAgentState,
              taskDescription: 'Detected ATS parsing vulnerability in document columns',
            },
            {
              name: 'Signal Writer for Revision',
              animation: AnimationName.WAVE,
              expression: 'neutral' as ExpressionKey,
              duration: 2.0,
              loop: false,
              semanticState: 'HANDOFF' as SemanticAgentState,
              taskDescription: 'Signaling Resume-Writer with layout repair specifications',
            },
          ]
        : [
            {
              name: 'ATS Score Verified',
              animation: AnimationName.HAPPY,
              expression: 'happy' as ExpressionKey,
              duration: 2.5,
              loop: false,
              semanticState: 'SUCCESS' as SemanticAgentState,
              taskDescription: `ATS format approved with ${score}% machine compatibility`,
            },
          ]),
    ],
  }),
};

/**
 * ── 03 NEXIS-STRATEGIST (Research & Skill Analyzer) ──
 * Personality: Curious, nerdy, methodical, paper inspector, maps user skills to JD requirements.
 */
export const STRATEGIST_SEQUENCES = {
  skillGapAnalysis: (agentIndex: number, missingSkills: string[]): BehaviorSequence => ({
    id: `strategist-analysis-${Date.now()}`,
    agentIndex,
    name: 'Competency Mapping',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Inspect JD Intent',
        animation: AnimationName.LOOK_AROUND,
        expression: 'listening',
        duration: 3.5,
        loop: false,
        semanticState: 'READING',
        taskDescription: 'Extracting hiring manager intent and role core competencies',
        action: 'walk_to_poi',
        targetPoiPrefix: 'area-board',
      },
      {
        name: 'Compare User Profile',
        animation: AnimationName.PICK,
        expression: 'neutral',
        duration: 2.0,
        loop: false,
        semanticState: 'THINKING',
        taskDescription: 'Comparing evidence depth against JD must-haves',
        itemType: 'paper',
      },
      {
        name: 'Map Identified Gaps',
        animation: AnimationName.SIT_WORK,
        expression: missingSkills.length > 0 ? 'doubtful' : 'happy',
        duration: 4.5,
        loop: true,
        semanticState: 'WRITING',
        taskDescription: missingSkills.length > 0
          ? `Identified gaps: ${missingSkills.slice(0, 3).join(', ')}`
          : 'Zero critical gaps detected against target seniority',
      },
      {
        name: 'Deliver Gap Notes',
        animation: AnimationName.WAVE,
        expression: 'happy',
        duration: 2.0,
        loop: false,
        semanticState: 'HANDOFF',
        taskDescription: 'Passing verified competency delta to learning & tailoring agents',
        action: 'handoff',
      },
    ],
  }),
};

/**
 * ── 04 NEXIS-WRITER (Resume Forge Perfectionist) ──
 * Personality: Detail-obsessed, slightly stressed, paper drop micro-failure, frantic typing, fist pump on high ATS score.
 */
export const WRITER_SEQUENCES = {
  resumeForgeOptimizing: (agentIndex: number, atsScore: number): BehaviorSequence => ({
    id: `writer-forge-${Date.now()}`,
    agentIndex,
    name: 'STAR-Metric Engineering',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Aligning Resume Pages',
        animation: AnimationName.PICK,
        expression: 'neutral',
        duration: 2.2,
        loop: false,
        semanticState: 'READING',
        taskDescription: 'Aligning draft margins and verifying 1-page density',
        itemType: 'paper',
      },
      {
        name: 'Document Slip & Catch',
        animation: AnimationName.SAD,
        expression: 'surprised',
        duration: 1.8,
        loop: false,
        semanticState: 'CONFUSED',
        taskDescription: 'Recovered dropped draft page from desk edge',
        action: 'micro_failure',
      },
      {
        name: 'Frantic STAR-Metric Drafting',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 6.0,
        loop: true,
        semanticState: 'WRITING',
        taskDescription: 'Engineering quantified STAR-metric impact bullets',
      },
      ...(atsScore >= 80
        ? [
            {
              name: 'Triumphant Celebration',
              animation: AnimationName.HAPPY,
              expression: 'happy' as ExpressionKey,
              duration: 3.0,
              loop: false,
              semanticState: 'CELEBRATING' as SemanticAgentState,
              taskDescription: `Resume optimized to peak ${atsScore}% ATS rating!`,
            },
          ]
        : [
            {
              name: 'Reviewing Draft Delta',
              animation: AnimationName.SIT_IDLE,
              expression: 'listening' as ExpressionKey,
              duration: 3.0,
              loop: true,
              semanticState: 'THINKING' as SemanticAgentState,
              taskDescription: `Draft refined to ${atsScore}%; preparing additional proof`,
            },
          ]),
    ],
  }),

  documentSlipCatch: (agentIndex: number): BehaviorSequence => ({
    id: `writer-slip-${Date.now()}`,
    agentIndex,
    name: 'Draft Document Recovery',
    priority: 5,
    interruptible: true,
    steps: [
      {
        name: 'Loose Draft',
        animation: AnimationName.PICK,
        expression: 'neutral',
        duration: 1.5,
        loop: false,
        semanticState: 'READING',
        taskDescription: 'Examining loose STAR bullet draft page',
        itemType: 'paper',
      },
      {
        name: 'Slip & Quick Catch',
        animation: AnimationName.SAD,
        expression: 'surprised',
        duration: 1.8,
        loop: false,
        semanticState: 'CONFUSED',
        taskDescription: 'Paper slipped! Quick reflex catch before floor impact',
        action: 'micro_failure',
      },
      {
        name: 'Relieved Recovery',
        animation: AnimationName.HAPPY,
        expression: 'happy',
        duration: 2.0,
        loop: false,
        semanticState: 'SUCCESS',
        taskDescription: 'Document safely secured to workspace folder',
      },
    ],
  }),
};

/**
 * ── 05 NEXIS-HUNTER (Job Scout) ──
 * Personality: Energetic, impatient, hyperactive, scans with binoculars, sprints to computer upon job match.
 */
export const HUNTER_SEQUENCES = {
  jobDiscoverySprint: (agentIndex: number, jobCount: number): BehaviorSequence => ({
    id: `hunter-discovery-${Date.now()}`,
    agentIndex,
    name: 'Radar Job Scouting',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Radar Binocular Scan',
        animation: AnimationName.LOOK_AROUND,
        expression: 'surprised',
        duration: 3.5,
        loop: false,
        semanticState: 'SEARCHING',
        taskDescription: 'Scanning direct employer career portals for unlisted openings',
      },
      {
        name: 'Discovery Excitement',
        animation: AnimationName.HAPPY,
        expression: 'happy',
        duration: 2.2,
        loop: false,
        semanticState: 'SUCCESS',
        taskDescription: `Discovered ${jobCount} high-affinity direct job opportunities!`,
        action: 'pickup_item',
        itemType: 'card',
      },
      {
        name: 'Sprint to Terminal',
        animation: AnimationName.WALK,
        expression: 'happy',
        duration: 2.0,
        loop: true,
        semanticState: 'WALKING',
        taskDescription: 'Routing job cards to workstation matching engine',
        action: 'walk_to_desk',
      },
      {
        name: 'Rapid Job Indexing',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 4.5,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Synthesizing salary, tech stack, and referral proximity',
      },
    ],
  }),
};

/**
 * ── 06 NEXIS-MIRROR (Interview Pressure & Learning Teacher) ──
 * Personality: Enthusiastic teacher, book carrying, rigorous technical drill master.
 */
export const MIRROR_SEQUENCES = {
  interviewSimulationPrep: (agentIndex: number): BehaviorSequence => ({
    id: `mirror-sim-${Date.now()}`,
    agentIndex,
    name: 'Technical Pressure Round',
    priority: 2,
    interruptible: true,
    steps: [
      {
        name: 'Review Architectural Claims',
        animation: AnimationName.LOOK_AROUND,
        expression: 'listening',
        duration: 3.0,
        loop: false,
        semanticState: 'READING',
        taskDescription: 'Synthesizing candidate production claims and latency trade-offs',
        itemType: 'book',
      },
      {
        name: 'Recursive Grilling Mode',
        animation: AnimationName.TALK,
        expression: 'neutral',
        duration: 4.5,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Generating targeted follow-up questions on system design and failure modes',
      },
      {
        name: 'Evaluation Complete',
        animation: AnimationName.HAPPY,
        expression: 'happy',
        duration: 2.5,
        loop: false,
        semanticState: 'SUCCESS',
        taskDescription: 'Simulated round finished: feedback scorecard ready',
      },
    ],
  }),
};

/**
 * ── SHARED AMBIENT SEQUENCES ──
 * Subtle, low-frequency, fully interruptible.
 */
export const AMBIENT_SEQUENCES = {
  coffeeBreak: (agentIndex: number): BehaviorSequence => ({
    id: `ambient-coffee-${Date.now()}`,
    agentIndex,
    name: 'Coffee & Reflection',
    priority: 5,
    interruptible: true,
    steps: [
      {
        name: 'Stretch',
        animation: AnimationName.LOOK_AROUND,
        expression: 'idle',
        duration: 3.0,
        loop: false,
        semanticState: 'WAITING',
        taskDescription: 'Taking a brief cognitive pause and reviewing office board',
      },
      {
        name: 'Contented Sip',
        animation: AnimationName.SIT_IDLE,
        expression: 'happy',
        duration: 4.0,
        loop: true,
        semanticState: 'IDLE',
        taskDescription: 'Standby: monitoring autonomous telemetry channels',
      },
    ],
  }),

  userAwareGlance: (agentIndex: number, domainName: string): BehaviorSequence => ({
    id: `ambient-glance-${Date.now()}`,
    agentIndex,
    name: `Acknowledge User (${domainName})`,
    priority: 4,
    interruptible: true,
    steps: [
      {
        name: 'Notice User Focus',
        animation: AnimationName.LOOK_AROUND,
        expression: 'surprised',
        duration: 1.5,
        loop: false,
        semanticState: 'WAITING',
        taskDescription: `Noticing user navigation to ${domainName} workspace`,
        action: 'glance_camera',
      },
      {
        name: 'Subtle Wave',
        animation: AnimationName.WAVE,
        expression: 'happy',
        duration: 2.0,
        loop: false,
        semanticState: 'SUCCESS',
        taskDescription: `Acknowledged: standing by for ${domainName} pipeline instructions`,
      },
      {
        name: 'Return to Task',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 3.0,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Continuing scheduled background calculations',
      },
    ],
  }),

  keyboardCorrection: (agentIndex: number): BehaviorSequence => ({
    id: `ambient-keyboard-${Date.now()}`,
    agentIndex,
    name: 'Keyboard Alignment',
    priority: 5,
    interruptible: true,
    steps: [
      {
        name: 'Slip & Notice',
        animation: AnimationName.LOOK_AROUND,
        expression: 'doubtful',
        duration: 1.5,
        loop: false,
        semanticState: 'THINKING',
        taskDescription: 'Noticing keycap offset on mechanical keyboard',
      },
      {
        name: 'Realign Keys',
        animation: AnimationName.PICK,
        expression: 'neutral',
        duration: 2.0,
        loop: false,
        semanticState: 'WORKING',
        taskDescription: 'Re-aligning mechanical keyboard and workstation tools',
      },
      {
        name: 'Satisfied Resume',
        animation: AnimationName.SIT_WORK,
        expression: 'idle',
        duration: 3.5,
        loop: true,
        semanticState: 'WORKING',
        taskDescription: 'Resuming productive workflow at desk',
      },
    ],
  }),

  ambientCoffeeBreak: (agentIndex: number): BehaviorSequence => AMBIENT_SEQUENCES.coffeeBreak(agentIndex),
};
