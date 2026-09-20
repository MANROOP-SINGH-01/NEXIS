import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LLMMessage, LLMTokenUsage, LLMToolCall, LLMToolDefinition } from '../../core/llm/types';
import { DEFAULT_MODELS, AVAILABLE_MODELS } from '../../core/llm/constants';
import { calculateCost } from '../../core/llm/pricing';
import { useTeamStore } from './teamStore';
import { useUiStore } from './uiStore';
import { ConsentStateMap, OutcomeCheckInRecord, TraineeProfileData, CareerPreferences, WorkHistoryProfile, NetworkContact, ApplicationProposal, FitEvaluation, DiscoveredJob } from '../../types';
import { evaluateJobFit } from '../../services/fitScoringService';
import { findNetworkMatches } from '../../services/networkMatchingService';
import { createApplicationProposal } from '../../services/atsWorkflowService';

export type TaskStatus = 'scheduled' | 'on_hold' | 'in_progress' | 'done'

export interface TaskRevision {
  output: string
  feedback?: string
  timestamp: number
}

export interface Task {
  id: string
  title: string
  description: string
  assignedAgentId: number
  status: TaskStatus
  parentTaskId?: string
  requiresUserApproval: boolean,
  draftOutput?: string,
  reviewComments?: string,
  output?: string,
  revisions: TaskRevision[]
  createdAt: number
  updatedAt: number
}

export interface ActionLogEntry {
  id: string
  timestamp: number
  agentIndex: number
  action: string
  taskId?: string
}

export interface DebugLogEntryBase {
  id: string
  timestamp: number
  agentIndex: number
  agentName: string
  status: 'pending' | 'completed' | 'error'
  taskId?: string
}

export interface RequestDebugLogEntry extends DebugLogEntryBase {
  phase: 'request'
  systemInstruction?: string
  contents: any[]
  systemTools?: any[]
}

export interface ResponseDebugLogEntry extends DebugLogEntryBase {
  phase: 'response'
  content: string | null
  tool_calls?: LLMToolCall[]
  usage?: LLMTokenUsage
  raw?: any
}

export type DebugLogEntry = RequestDebugLogEntry | ResponseDebugLogEntry;

export type ProjectPhase = 'idle' | 'working' | 'done'
export type ForgeMode = 'resume-builder' | 'job-hunter' | 'interview-sim'

export interface ForgeActivityEntry {
  id: string
  timestamp: number
  agentType: 'vision' | 'strategist' | 'writer' | 'hunter' | 'mirror' | 'director'
  action: string
  result: any
  impact: 'positive' | 'warning' | 'critical'
}

export interface ResumeForgeItem {
  id: string
  repository: string
  repositoryUrl: string
  codeSnapshot: string
  suggestedBullet: string
  accepted: boolean
  addedToLedger: boolean
}

export interface AnalysisDimensions {
  keywordAlignment: number
  quantifiedImpact: number
  evidenceDepth: number
  structuralQuality: number
  seniorityFit: number
}

export interface ResumeAnalysis {
  atsCompatibility: number
  dimensions?: AnalysisDimensions
  overallScore?: number
  skillGaps: Array<{ skill: string; status: 'verified' | 'needs-proof' | 'gap' }>
  interviewReadiness: {
    technicalDeepDive: number
    behavioralQuestions: number
    systemDesign: number
  }
  activityFeed: Array<{
    id: string
    timestamp: number
    agent: string
    action: string
    details: string
    status: 'completed' | 'warning' | 'success'
  }>
  pipeline: Array<{
    id: string
    title: string
    cards: Array<Record<string, any>>
  }>
}

export interface InterviewQAItem {
  id: string
  question: string
  answer: string
  category: 'technical' | 'behavioral' | 'system-design'
}

interface CoreState {
  // ── Project ──────────────────────────────────────────────────
  userBrief: string
  referenceImages: string[]
  phase: ProjectPhase
  finalOutput: string | null
  availableModels: string[]
  totalTokenUsage: LLMTokenUsage
  agentTokenUsage: Record<number, LLMTokenUsage>
  totalEstimatedCost: number
  agentEstimatedCost: Record<number, number>
  finalAssetType: 'text' | 'image' | 'audio' | 'video'
  finalAssetContent: string | null
  isGeneratingAsset: boolean
  
  // ── Output Review ────────────────────────────────────────────
  isReviewingOutput: boolean
  pendingOutputPrompt: string
  pendingOutputParams: any

  // ── Tasks ────────────────────────────────────────────────────
  tasks: Task[]

  // ── Log ──────────────────────────────────────────────────────
  actionLog: ActionLogEntry[]
  debugLog: DebugLogEntry[]

  // ── Conversation histories (Agnostic standard) ───────────────
  agentHistories: Record<number, LLMMessage[]>
  agentSummaries: Record<number, string>
  boardroomHistories: Record<string, LLMMessage[]>
  
  // ── Agent 3D Status (SSE Driven) ─────────────────────────────
  agentStatuses: Record<number, 'idle' | 'working' | 'talking'>

  // ── UI ───────────────────────────────────────────────────────
  isKanbanOpen: boolean
  viewMode: 'simulation' | 'design';
  isLogOpen: boolean
  isFinalOutputOpen: boolean;
  logFilterAgentIndex: number | null;
  isResizing: boolean;
  forgeMode: ForgeMode;

  // ── Forge: Career Orchestration ───────────────────────────────
  userCareerProfile: {
    name: string
    targetRole: string
    experience: string[]
    skills: string[]
    projects: string[]
    linkedGitHub?: string
    linkedPortfolio?: string
  }
  currentResume: {
    content: string
    atsScore: number
    lastOptimized: number
    targetJD: string
  }
  structuredResume: Record<string, any> | null
  discoveredJobs: Array<{
    id: string
    title: string
    company: string
    url: string
    alignmentScore: number
    blueOceanScore: number
    nexusMatchReason: string
    competitionLevel: 'Low' | 'Medium' | 'High'
    discoveredAt: number
    source: 'linkedin' | 'company-careers' | 'hidden'
  }>
  applications: Array<{
    id: string
    jobId: string
    status: 'tailoring' | 'proof-check' | 'ready' | 'submitted' | 'interview' | 'rejected'
    submittedAt?: number
    lastContact?: number
    nextAction?: string
  }>
  skillVerifications: Record<string, {
    skill: string
    claimed: boolean
    verified: boolean
    evidence?: {
      type: 'github' | 'portfolio' | 'certification'
      url: string
      summary: string
    }
  }>
  interviewSessions: Array<{
    id: string
    jobId: string
    duration: number
    weaknesses: string[]
    strengths: string[]
    transcript?: string
    postGamePDF?: string
  }>
  nexusActivityLog: ForgeActivityEntry[]
  isResumeForgeOpen: boolean
  resumeForgeItems: ResumeForgeItem[]
  hasResumeAnalysis: boolean
  resumeAnalysis: ResumeAnalysis | null
  runtimeKeys: {
    gemini: string
    sarvam: string
  }
  isNexusMirrorOpen: boolean
  nexusMirrorItems: InterviewQAItem[]
  isNexusHunterOpen: boolean

  // ── Trainee Identity & Outcomes ──────────────────────────────
  traineeProfile: TraineeProfileData | null
  consentState: ConsentStateMap | null
  outcomeHistory: OutcomeCheckInRecord[]

  // ── Proficiently Career Model & ATS Engine ────────────────────
  preferences: CareerPreferences
  workHistoryProfile: WorkHistoryProfile
  networkContacts: NetworkContact[]
  applicationProposals: ApplicationProposal[]
  activeProposal: ApplicationProposal | null
  isApplicationModalOpen: boolean

  // ── Actions — Proficiently Integration ────────────────────────
  setPreferences: (preferences: Partial<CareerPreferences>) => void;
  setWorkHistoryProfile: (profile: Partial<WorkHistoryProfile>) => void;
  addNetworkContact: (contact: Omit<NetworkContact, 'id'>) => void;
  setNetworkContacts: (contacts: NetworkContact[]) => void;
  evaluateAllJobsFit: () => void;
  createApplicationProposal: (job: DiscoveredJob) => ApplicationProposal;
  updateApplicationProposalStage: (stage: ApplicationProposal['stage'], answers?: Record<string, string>) => void;
  setApplicationModalOpen: (open: boolean, proposal?: ApplicationProposal | null) => void;

  // ── Actions — Project —————————————————————————————————────────
  setUserBrief: (brief: string) => void;
  addReferenceImage: (base64: string) => void;
  removeReferenceImage: (index: number) => void;
  clearReferenceImages: () => void;
  setPhase: (phase: ProjectPhase) => void;
  startProject: (brief: string) => void;
  setFinalOutput: (output: string) => void;
  setFinalAsset: (type: 'image' | 'audio' | 'video', content: string) => void;
  setIsGeneratingAsset: (isGenerating: boolean) => void;
  setReviewingOutput: (val: boolean) => void;
  setPendingOutputPrompt: (prompt: string) => void;
  setPendingOutputParams: (params: any) => void;

  // ── Actions — Tasks ───────────────────────────────────────────
  addTask: (task: Omit<Task, 'id' | 'revisions' | 'createdAt' | 'updatedAt'>) => Task;
  removeTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  submitTaskForReview: (taskId: string, draftOutput?: string) => void;
  setTaskOutput: (taskId: string, output: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, comments: string) => void;

  // ── Actions — Log ─────────────────────────────────────────────
  addLogEntry: (entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => void;
  addRequestLog: (entry: Omit<RequestDebugLogEntry, 'id' | 'timestamp' | 'phase' | 'status'>) => void;
  addResponseLog: (entry: Omit<ResponseDebugLogEntry, 'id' | 'timestamp' | 'phase' | 'status'>) => void;

  // ── Actions — History ───────────────────────────────────────
  appendAgentHistory: (agentIndex: number, role: 'user' | 'assistant', parts: any[]) => void;
  setAgentSummary: (agentIndex: number, summary: string) => void;
  appendBoardroomHistory: (taskId: string, role: 'user' | 'assistant', parts: any[]) => void;
  clearAllHistories: () => void;
  
  // ── Actions — Agent Statuses ──────────────────────────────────
  setAgentStatus: (agentIndex: number, status: 'idle' | 'working' | 'talking') => void;

  // ── Actions — UI ──────────────────────────────────────────────
  setKanbanOpen: (open: boolean) => void;
  setLogOpen: (open: boolean, filterAgent?: number | null) => void;
  setFinalOutputOpen: (open: boolean) => void;
  setIsResizing: (isResizing: boolean) => void;
  setForgeMode: (mode: ForgeMode) => void;
  setSkillVerifications: (verifications: CoreState['skillVerifications']) => void;
  addNexusActivityEntry: (entry: Omit<ForgeActivityEntry, 'id' | 'timestamp'>) => void;
  setResumeForgeOpen: (open: boolean) => void;
  setResumeForgeItems: (items: ResumeForgeItem[]) => void;
  updateResumeForgeItemBullet: (id: string, bullet: string) => void;
  acceptResumeForgeBullet: (id: string) => void;
  addResumeForgeToLedger: (id: string) => void;
  setCurrentResumeContent: (content: string) => void;
  setStructuredResume: (structured: Record<string, any> | null) => void;
  setTargetJD: (jd: string) => void;
  setResumeAnalysis: (analysis: ResumeAnalysis) => void;
  clearResumeAnalysis: () => void;
  setRuntimeKeys: (keys: { gemini?: string; sarvam?: string }) => void;
  clearRuntimeKeys: () => void;
  setNexusMirrorOpen: (open: boolean) => void;
  setNexusMirrorItems: (items: InterviewQAItem[]) => void;
  setNexusHunterOpen: (open: boolean) => void;
  setDiscoveredJobs: (jobs: CoreState['discoveredJobs']) => void;
  resetProject: () => void;
  setViewMode: (mode: 'simulation' | 'design') => void;

  // ── Simulation Sync ──────────────────────────────────────────
  setAgentHistory: (agentIndex: number, history: LLMMessage[]) => void;

  // ── Actions — Trainee Identity & Outcomes ───────────────────
  setTraineeProfile: (profile: TraineeProfileData | null) => void;
  setConsentState: (consent: ConsentStateMap | null) => void;
  setOutcomeHistory: (history: OutcomeCheckInRecord[]) => void;
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export const useCoreStore = create<CoreState>()(
  persist(
    (set) => ({
      userBrief: '',
      referenceImages: [],
      phase: 'idle',
      finalOutput: null,
      availableModels: [...AVAILABLE_MODELS.text],
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      agentTokenUsage: {},
      totalEstimatedCost: 0,
      agentEstimatedCost: {},
      finalAssetType: 'text',
      finalAssetContent: null,
      isGeneratingAsset: false,
      isReviewingOutput: false,
      pendingOutputPrompt: '',
      pendingOutputParams: {},
      tasks: [],
      actionLog: [],
      debugLog: [],
      agentHistories: {},
      agentSummaries: {},
      boardroomHistories: {},
      agentStatuses: {},
      isKanbanOpen: true,
      isLogOpen: false,
      isFinalOutputOpen: false,
      logFilterAgentIndex: null,
      isResizing: false,
      viewMode: 'simulation',
      forgeMode: 'resume-builder',
      userCareerProfile: {
        name: 'Candidate',
        targetRole: 'Senior AI Engineer',
        experience: ['Built and shipped AI products across full lifecycle'],
        skills: ['Python', 'LLMs', 'LangChain', 'RAG'],
        projects: ['Career Orchestration Platform'],
      },
      currentResume: {
        content: '',
        atsScore: 87,
        lastOptimized: Date.now(),
        targetJD: '',
      },
      structuredResume: null,
      discoveredJobs: [],
      applications: [],
      skillVerifications: {},
      interviewSessions: [],
      nexusActivityLog: [],
      isResumeForgeOpen: false,
      resumeForgeItems: [],
      hasResumeAnalysis: false,
      resumeAnalysis: null,
      traineeProfile: null,
      consentState: null,
      outcomeHistory: [],
      runtimeKeys: {
        gemini: '',
        sarvam: '',
      },
      isNexusMirrorOpen: false,
      nexusMirrorItems: [],
      isNexusHunterOpen: false,

      // ── Proficiently Career Model State ───────────────────────────
      preferences: {
        targetRoles: ['Senior AI Engineer', 'Full Stack Tech Lead', 'Distributed Systems Architect'],
        locations: ['Remote', 'Bangalore', 'Pune', 'Hybrid'],
        workModes: ['REMOTE', 'HYBRID'],
        minimumSalary: '25 LPA / $120,000',
        mustHaves: ['TypeScript', 'Node.js', 'PostgreSQL', 'System Architecture'],
        dealbreakers: ['No legacy maintenance only', 'No on-site outside preferred locations'],
        niceToHaves: ['LLM Orchestration', 'Three.js / WebGL', 'Docker / Kubernetes', 'GraphQL'],
      },
      workHistoryProfile: {
        candidateName: 'Manroop Singh',
        overview: 'Senior Software Engineer with 6+ years building real-time systems, multi-agent AI platforms, and high-throughput backends.',
        careerThroughline: 'Specializes in distributed state management, low-latency API architecture, and production LLM orchestration.',
        roles: [
          {
            title: 'Senior AI Systems Engineer',
            company: 'Nexis Technologies',
            startDate: '2023',
            endDate: 'Present',
            companyContext: 'High-growth career intelligence and agent orchestration startup',
            accomplishments: [
              {
                headline: 'Architected 8-agent real-time simulation and workflow pipeline',
                situation: 'uncoordinated career guidance tools causing fragmented user workflows',
                action: 'built distributed multi-agent state manager with SSE telemetry and Three.js visualization',
                result: 'reduced user time-to-application by 65%',
                metrics: ['65% faster application time', '100% state persistence'],
              },
              {
                headline: 'Optimized PostgreSQL and vector embeddings for semantic job matching',
                situation: 'slow query times on 100k+ job listings database',
                action: 'implemented pgvector indexing and tiered dealbreaker fit filtering',
                result: 'slashed P99 match evaluation latency from 1.4s to 85ms',
                metrics: ['94% latency reduction', '85ms P99 latency'],
              },
            ],
            tools: ['TypeScript', 'Node.js', 'PostgreSQL', 'Three.js', 'Zustand', 'pgvector'],
            teamLeadership: 'Led pod of 4 engineers delivering core workflow and matching engines.',
          },
          {
            title: 'Full Stack Systems Engineer',
            company: 'Apex Cloud Solutions',
            startDate: '2021',
            endDate: '2023',
            companyContext: 'Enterprise cloud infrastructure and developer observability provider',
            accomplishments: [
              {
                headline: 'Engineered high-concurrency event ingestion service',
                situation: 'spiking enterprise audit telemetry overflowing message queues',
                action: 'designed partitioned worker queues with backpressure and circuit breakers',
                result: 'sustained 50k events/sec with zero data loss across 18 months',
                metrics: ['50k events/sec throughput', '0 message loss'],
              },
            ],
            tools: ['Python', 'Docker', 'Redis', 'PostgreSQL', 'Kubernetes'],
          },
        ],
        superpowers: ['Distributed Systems', 'Agentic Workflows', 'Performance Optimization', 'Clean Architecture'],
        crossRolePatterns: ['Consistently cuts P99 latency by >50%', 'Builds verifiable, testable systems without hype or fake data'],
        lastUpdated: new Date().toISOString(),
      },
      networkContacts: [
        {
          id: 'net_1',
          name: 'Priya Sharma',
          company: 'Stripe',
          position: 'Staff Infrastructure Engineer',
          linkedinUrl: 'https://linkedin.com/in/priya-sharma',
          email: 'priya.s@stripe.com',
          relevance: 'Former colleague at Apex Cloud Solutions; can provide warm intro to Payments Infrastructure team.',
        },
        {
          id: 'net_2',
          name: 'Rahul Varma',
          company: 'Google',
          position: 'Engineering Manager, Cloud AI',
          linkedinUrl: 'https://linkedin.com/in/rahul-varma',
          email: 'rahulv@google.com',
          relevance: 'Collaborated on open-source vector search libraries; actively hiring for Gemini Platform.',
        },
        {
          id: 'net_3',
          name: 'Ananya Deshmukh',
          company: 'Atlassian',
          position: 'Senior Engineering Director',
          linkedinUrl: 'https://linkedin.com/in/ananya-d',
          email: 'ananya@atlassian.com',
          relevance: 'College alumni network; strong advocate for remote engineers in APAC.',
        },
      ],
      applicationProposals: [],
      activeProposal: null,
      isApplicationModalOpen: false,

      // ── Actions — Proficiently Integration ────────────────────────
      setPreferences: (preferences) =>
        set((s) => ({
          preferences: { ...s.preferences, ...preferences },
        })),

      setWorkHistoryProfile: (profile) =>
        set((s) => ({
          workHistoryProfile: { ...s.workHistoryProfile, ...profile, lastUpdated: new Date().toISOString() },
        })),

      addNetworkContact: (contact) =>
        set((s) => ({
          networkContacts: [
            ...s.networkContacts,
            { ...contact, id: `net_${uid()}` },
          ],
        })),

      setNetworkContacts: (networkContacts) => set({ networkContacts }),

      evaluateAllJobsFit: () =>
        set((s) => ({
          discoveredJobs: s.discoveredJobs.map((job) => ({
            ...job,
            fitEvaluation: evaluateJobFit(job, s.preferences, s.workHistoryProfile),
            networkMatches: findNetworkMatches(job.company, s.networkContacts),
          })),
        })),

      createApplicationProposal: (job) => {
        const s = useCoreStore.getState();
        const proposal = createApplicationProposal(
          job,
          s.workHistoryProfile,
          'candidate@nexis.ai',
          '+91 98765 43210',
          s.currentResume.content || undefined
        );
        set((state) => ({
          applicationProposals: [
            ...state.applicationProposals.filter((p) => p.jobId !== job.id),
            proposal,
          ],
          activeProposal: proposal,
          isApplicationModalOpen: true,
        }));
        return proposal;
      },

      updateApplicationProposalStage: (stage, answers) =>
        set((s) => {
          if (!s.activeProposal) return {};
          const updated: ApplicationProposal = {
            ...s.activeProposal,
            stage,
            proposedAnswers: answers ? { ...s.activeProposal.proposedAnswers, ...answers } : s.activeProposal.proposedAnswers,
            submittedAt: stage === 'submitted' ? new Date().toISOString() : s.activeProposal.submittedAt,
          };
          return {
            activeProposal: updated,
            applicationProposals: s.applicationProposals.map((p) =>
              p.jobId === updated.jobId ? updated : p
            ),
          };
        }),

      setApplicationModalOpen: (open, proposal = null) =>
        set((s) => ({
          isApplicationModalOpen: open,
          activeProposal: proposal !== undefined ? proposal : s.activeProposal,
        })),

      setViewMode: (viewMode) => set({ viewMode }),
      setForgeMode: (forgeMode) => set({ forgeMode }),
      setSkillVerifications: (skillVerifications) => set({ skillVerifications }),
      addNexusActivityEntry: (entry) =>
        set((s) => ({
          nexusActivityLog: [
            ...s.nexusActivityLog,
            { ...entry, id: `nexus_${uid()}`, timestamp: Date.now() },
          ],
        })),
      setResumeForgeOpen: (isResumeForgeOpen) => set({ isResumeForgeOpen }),
      setResumeForgeItems: (resumeForgeItems) => set({ resumeForgeItems }),
      updateResumeForgeItemBullet: (id, bullet) =>
        set((s) => ({
          resumeForgeItems: s.resumeForgeItems.map((item) =>
            item.id === id ? { ...item, suggestedBullet: bullet } : item
          ),
        })),
      acceptResumeForgeBullet: (id) =>
        set((s) => {
          const target = s.resumeForgeItems.find((item) => item.id === id)
          if (!target) return {}

          const bulletLine = target.suggestedBullet.trim()
          if (!bulletLine) return {}

          const normalized = bulletLine.startsWith('- ') ? bulletLine : `- ${bulletLine}`
          const nextContent = s.currentResume.content
            ? `${s.currentResume.content}\n${normalized}`
            : normalized

          return {
            currentResume: {
              ...s.currentResume,
              content: nextContent,
              lastOptimized: Date.now(),
            },
            resumeForgeItems: s.resumeForgeItems.map((item) =>
              item.id === id ? { ...item, accepted: true } : item
            ),
          }
        }),
      addResumeForgeToLedger: (id) =>
        set((s) => {
          const target = s.resumeForgeItems.find((item) => item.id === id)
          if (!target) return {}
          const key = target.repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')

          return {
            skillVerifications: {
              ...s.skillVerifications,
              [key]: {
                skill: target.repository,
                claimed: true,
                verified: true,
                evidence: {
                  type: 'github',
                  url: target.repositoryUrl,
                  summary: target.suggestedBullet,
                },
              },
            },
            resumeForgeItems: s.resumeForgeItems.map((item) =>
              item.id === id ? { ...item, addedToLedger: true } : item
            ),
          }
        }),
      setCurrentResumeContent: (content) =>
        set((s) => ({
          currentResume: {
            ...s.currentResume,
            content,
            lastOptimized: Date.now(),
          },
        })),
      setStructuredResume: (structuredResume) => set({ structuredResume }),
      setTargetJD: (targetJD) =>
        set((s) => ({
          currentResume: {
            ...s.currentResume,
            targetJD,
          },
        })),
      setTraineeProfile: (traineeProfile) => set({ traineeProfile }),
      setConsentState: (consentState) => set({ consentState }),
      setOutcomeHistory: (outcomeHistory) => set({ outcomeHistory }),
      setResumeAnalysis: (resumeAnalysis) =>
        set({
          resumeAnalysis,
          hasResumeAnalysis: true,
        }),
      clearResumeAnalysis: () =>
        set({
          resumeAnalysis: null,
          hasResumeAnalysis: false,
        }),
      setRuntimeKeys: (keys) =>
        set((s) => ({
          runtimeKeys: {
            gemini: keys.gemini ?? s.runtimeKeys.gemini,
            sarvam: keys.sarvam ?? s.runtimeKeys.sarvam,
          },
        })),
      clearRuntimeKeys: () =>
        set({
          runtimeKeys: {
            gemini: '',
            sarvam: '',
          },
        }),
      setNexusMirrorOpen: (isNexusMirrorOpen) => set({ isNexusMirrorOpen }),
      setNexusMirrorItems: (nexusMirrorItems) => set({ nexusMirrorItems }),
      setNexusHunterOpen: (isNexusHunterOpen) => set({ isNexusHunterOpen }),
      setDiscoveredJobs: (discoveredJobs: any[]) =>
        set((s) => {
          const processed = discoveredJobs.map((job) => ({
            ...job,
            fitEvaluation: job.fitEvaluation || evaluateJobFit(job, s.preferences, s.workHistoryProfile),
            networkMatches: job.networkMatches || findNetworkMatches(job.company, s.networkContacts),
          }));
          return { discoveredJobs: processed };
        }),

      resetProject: () => set({
        userBrief: '',
        phase: 'idle',
        finalOutput: null,
        tasks: [],
        actionLog: [],
        debugLog: [],
        agentHistories: {},
        agentSummaries: {},
        boardroomHistories: {},
        isFinalOutputOpen: false,
        totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        agentTokenUsage: {},
        totalEstimatedCost: 0,
        agentEstimatedCost: {},
        finalAssetType: 'text',
        finalAssetContent: null,
        isGeneratingAsset: false,
        isReviewingOutput: false,
        pendingOutputPrompt: '',
        pendingOutputParams: {},
        referenceImages: [],
        nexusMirrorItems: [],
        isNexusHunterOpen: false,
        discoveredJobs: [],
      }),

      setUserBrief: (brief) => set({ userBrief: brief }),
      addReferenceImage: (base64) => set((s) => ({ 
        referenceImages: [...s.referenceImages, base64].slice(0, 3) 
      })),
      removeReferenceImage: (index) => set((s) => ({ 
        referenceImages: s.referenceImages.filter((_, i) => i !== index) 
      })),
      clearReferenceImages: () => set({ referenceImages: [] }),
      setPhase: (phase) => set({ phase }),
      startProject: (brief) => set({ userBrief: brief, phase: 'working', finalAssetType: 'text', finalAssetContent: null }),
      setFinalOutput: (output) => set({ finalOutput: output }),
      setFinalAsset: (type, content) => set({ finalAssetType: type, finalAssetContent: content, isGeneratingAsset: false }),
      setIsGeneratingAsset: (isGenerating) => set({ isGeneratingAsset: isGenerating }),
      setReviewingOutput: (val) => set({ isReviewingOutput: val }),
      setPendingOutputPrompt: (prompt) => set({ pendingOutputPrompt: prompt }),
      setPendingOutputParams: (params) => set({ pendingOutputParams: params }),

      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: `task_${uid()}`,
          revisions: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ tasks: [...s.tasks, newTask] }))
        return newTask
      },

      removeTask: (taskId) =>
        set((s) => {
          const newTasks = s.tasks.filter((t) => t.id !== taskId);

          // Logic to check if removing this task finishes the project
          const hasRemainingTasks = newTasks.some(t => t.status !== 'done');
          const isWorking = s.phase === 'working';

          let nextPhase = s.phase;
          if (isWorking && !hasRemainingTasks) {
            nextPhase = 'done';
          }

          return {
            tasks: newTasks,
            phase: nextPhase,
          };
        }),

      updateTaskStatus: (taskId, status) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) return {};

          // Safety check: Cannot move back to 'in_progress' or 'on_hold' if already 'done'
          if (task.status === 'done' && (status === 'in_progress' || status === 'on_hold')) {
            return {};
          }

          const newTasks = s.tasks.map((t) =>
            t.id === taskId ? { ...t, status, updatedAt: Date.now() } : t
          );

          return {
            tasks: newTasks,
          };
        }),

      submitTaskForReview: (taskId, draftOutput) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { 
              ...t, 
              status: 'on_hold', 
              draftOutput,
              updatedAt: Date.now() 
            } : t
          ),
        })),

      approveTask: (taskId) => {
        set((s) => {
          const task = s.tasks.find(t => t.id === taskId);
          if (task) useUiStore.getState().setAgentStatus(task.assignedAgentId, 'idle');
          
          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { 
                ...t, 
                status: 'done', 
                output: t.draftOutput || t.output,
                revisions: t.draftOutput 
                  ? [...t.revisions, { output: t.draftOutput, timestamp: Date.now() }] 
                  : t.revisions,
                draftOutput: undefined,
                updatedAt: Date.now() 
              } : t
            ),
          };
        });
      },

      rejectTask: (taskId, comments) => {
        set((s) => {
          const task = s.tasks.find(t => t.id === taskId);
          if (!task) return {};

          useUiStore.getState().setAgentStatus(task.assignedAgentId, 'idle');
          
          const history = s.agentHistories[task.assignedAgentId] || [];
          const updatedHistory = [
            ...history,
            {
              role: 'user' as 'user',
              content: `Rejected. Reason: ${comments}`,
            }
          ];

          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { 
                ...t, 
                status: 'scheduled', 
                reviewComments: comments,
                revisions: t.draftOutput 
                  ? [...t.revisions, { output: t.draftOutput, feedback: comments, timestamp: Date.now() }] 
                  : t.revisions,
                draftOutput: undefined,
                updatedAt: Date.now() 
              } : t
            ),
            agentHistories: {
              ...s.agentHistories,
              [task.assignedAgentId]: updatedHistory
            }
          };
        });
      },

      setTaskOutput: (taskId, output) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, output, updatedAt: Date.now() } : t
          ),
        })),

      addLogEntry: (entry) =>
        set((s) => ({
          actionLog: [
            ...s.actionLog,
            { ...entry, id: `log_${uid()}`, timestamp: Date.now() },
          ],
        })),
      
      addRequestLog: (entry) =>
        set((s) => {
          const newEntry: DebugLogEntry = { 
            ...entry, 
            id: `debug_${uid()}`, 
            timestamp: Date.now(),
            phase: 'request',
            status: 'completed'
          };
          const updated = [...s.debugLog, newEntry];
          return { debugLog: updated.length > 30 ? updated.slice(-30) : updated };
        }),

      addResponseLog: (entry) =>
        set((s) => {
          const newEntry: DebugLogEntry = { 
            ...entry, 
            id: `debug_${uid()}`, 
            timestamp: Date.now(),
            phase: 'response',
            status: 'completed'
          };
          const updated = [...s.debugLog, newEntry];
          
          // Update token usage and estimated cost
          let nextTotalUsage = s.totalTokenUsage;
          let nextAgentUsage = { ...s.agentTokenUsage };
          let nextTotalCost = s.totalEstimatedCost;
          let nextAgentCost = { ...s.agentEstimatedCost };

          if (entry.usage) {
            const modelName = entry.raw?.model || useUiStore.getState().llmConfig.model;
            // For multimodal outputs, we might need to pass the duration/count if available in raw
            const durationOrCount = entry.raw?.duration || entry.raw?.count;
            const callCost = calculateCost(entry.usage.promptTokens, entry.usage.completionTokens, modelName, durationOrCount);
            
            nextTotalCost += callCost;
            nextAgentCost[entry.agentIndex] = (s.agentEstimatedCost[entry.agentIndex] || 0) + callCost;

            nextTotalUsage = {
              promptTokens: s.totalTokenUsage.promptTokens + entry.usage.promptTokens,
              completionTokens: s.totalTokenUsage.completionTokens + entry.usage.completionTokens,
              totalTokens: s.totalTokenUsage.totalTokens + entry.usage.totalTokens
            };
            
            const currentAgentUsage = s.agentTokenUsage[entry.agentIndex] || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            nextAgentUsage[entry.agentIndex] = {
              promptTokens: currentAgentUsage.promptTokens + entry.usage.promptTokens,
              completionTokens: currentAgentUsage.completionTokens + entry.usage.completionTokens,
              totalTokens: currentAgentUsage.totalTokens + entry.usage.totalTokens
            };
          }

          return { 
            debugLog: updated.length > 30 ? updated.slice(-30) : updated,
            totalTokenUsage: nextTotalUsage,
            agentTokenUsage: nextAgentUsage,
            totalEstimatedCost: nextTotalCost,
            agentEstimatedCost: nextAgentCost
          };
        }),

      appendAgentHistory: (agentIndex, role, parts) =>
        set((s) => ({
          agentHistories: {
            ...s.agentHistories,
            [agentIndex]: [
              ...(s.agentHistories[agentIndex] ?? []),
              {
                role,
                content: Array.isArray(parts) ? parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(' ') : String(parts),
              },
            ],
          },
        })),

      setAgentSummary: (agentIndex, summary) =>
        set((s) => ({
          agentSummaries: {
            ...s.agentSummaries,
            [agentIndex]: summary
          }
        })),

      appendBoardroomHistory: (taskId, role, parts) =>
        set((s) => ({
          boardroomHistories: {
            ...s.boardroomHistories,
            [taskId]: [
              ...(s.boardroomHistories[taskId] ?? []),
              {
                role,
                content: Array.isArray(parts) ? parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(' ') : String(parts),
              },
            ],
          },
        })),

      clearAllHistories: () => set({ agentHistories: {}, boardroomHistories: {} }),
      
      setAgentStatus: (agentIndex, status) => set((s) => ({
        agentStatuses: {
          ...s.agentStatuses,
          [agentIndex]: status
        }
      })),

      setKanbanOpen: (open) => set({ isKanbanOpen: open }),
      setLogOpen: (open, filterAgent = null) =>
        set({ isLogOpen: open, logFilterAgentIndex: filterAgent ?? null }),
      setFinalOutputOpen: (open) => set({ isFinalOutputOpen: open }),
      setIsResizing: (resizing) => set({ isResizing: resizing }),

      setAgentHistory: (agentIndex, history) => set((s) => ({
        agentHistories: { ...s.agentHistories, [agentIndex]: history }
      })),
    }),
    {
      name: 'core-storage',
      storage: createJSONStorage(() => localStorage),
      // ponytail: persist only what's needed for offline resilience mid-demo
      partialize: (state) => ({
        currentResume: state.currentResume,
        structuredResume: state.structuredResume,
        discoveredJobs: state.discoveredJobs,
        resumeAnalysis: state.resumeAnalysis,
        hasResumeAnalysis: state.hasResumeAnalysis,
        skillVerifications: state.skillVerifications,
        nexusActivityLog: state.nexusActivityLog,
        forgeMode: state.forgeMode,
        preferences: state.preferences,
        workHistoryProfile: state.workHistoryProfile,
        networkContacts: state.networkContacts,
        applicationProposals: state.applicationProposals,
      }),
    }
  )
)

// Sync resetProject whenever the active team changes
useTeamStore.subscribe((state, prevState) => {
  if (state.selectedAgentSetId !== prevState.selectedAgentSetId) {
    useCoreStore.getState().resetProject();
  }
});

