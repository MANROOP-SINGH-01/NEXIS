import { CharacterController } from '../CharacterController';
import { AgentInteractionManager } from './AgentInteractionManager';
import { AgentWorkspaceMemory } from './AgentWorkspaceMemory';
import {
  BehaviorSequence,
  SemanticAgentState,
  DIRECTOR_SEQUENCES,
  VISION_SEQUENCES,
  STRATEGIST_SEQUENCES,
  WRITER_SEQUENCES,
  HUNTER_SEQUENCES,
  MIRROR_SEQUENCES,
  AMBIENT_SEQUENCES,
} from './AgentSequences';
import { ActiveSidebarTab } from '../../types';

export interface AgentRuntimeState {
  agentIndex: number;
  role: string;
  semanticState: SemanticAgentState;
  taskDescription: string;
  emotion: string;
  activeSequenceName: string | null;
  stepIndex: number;
  totalSteps: number;
  priority: number;
}

export class AgentBehaviorEngine {
  private activeSequences: Map<number, { sequence: BehaviorSequence; stepIndex: number; stepTimer: number }> = new Map();
  private runtimeStates: Map<number, AgentRuntimeState> = new Map();
  private lastKnownAtsScore: number | null = null;
  private lastKnownJobCount: number = 0;
  private lastKnownResumeHash: string = '';

  constructor(
    private controller: CharacterController,
    private interactionManager: AgentInteractionManager,
    private workspaceMemory: AgentWorkspaceMemory
  ) {
    this.initDefaultStates();
  }

  private initDefaultStates() {
    const defaultRoles: Record<number, { role: string; task: string }> = {
      1: { role: 'Nexus-Director', task: 'Orchestrating autonomous career pipeline' },
      2: { role: 'Nexus-Vision', task: 'Simulating recruiter visual layout and ATS compliance' },
      3: { role: 'Nexus-Strategist', task: 'Mining job description intent and core competencies' },
      4: { role: 'Nexus-Writer', task: 'Engineering quantified STAR-metric impact bullets' },
      5: { role: 'Nexus-Hunter', task: 'Indexing unlisted high-affinity direct company listings' },
      6: { role: 'Nexus-Mirror', task: 'Conducting recursive technical interview pressure drills' },
    };

    for (let i = 1; i <= 6; i++) {
      const info = defaultRoles[i] || { role: `Node 0${i}`, task: 'Monitoring cluster telemetry' };
      this.runtimeStates.set(i, {
        agentIndex: i,
        role: info.role,
        semanticState: 'IDLE',
        taskDescription: info.task,
        emotion: 'idle',
        activeSequenceName: null,
        stepIndex: 0,
        totalSteps: 0,
        priority: 5,
      });
    }
  }

  /**
   * Request execution of a behavior sequence.
   * Higher priority strictly interrupts lower priority (Section 33 & 34).
   */
  public triggerSequence(sequence: BehaviorSequence): boolean {
    const existing = this.activeSequences.get(sequence.agentIndex);
    if (existing) {
      // Priority scale: 1 = Critical, 2 = Active Workflow, 3 = Handoff, 4 = User Interaction, 5 = Ambient
      // Lower number = higher priority.
      // 1. Lower-priority sequence (higher number) can never interrupt higher-priority active work.
      if (sequence.priority > existing.sequence.priority) {
        return false;
      }
      // 2. Equal priority sequence cannot interrupt if current work is non-interruptible.
      if (sequence.priority === existing.sequence.priority && !existing.sequence.interruptible) {
        return false;
      }
      // 3. Non-interruptible work cannot be interrupted unless the new sequence is Critical (priority 1).
      if (!existing.sequence.interruptible && sequence.priority > 1) {
        return false;
      }
    }

    this.activeSequences.set(sequence.agentIndex, {
      sequence,
      stepIndex: 0,
      stepTimer: 0,
    });

    this.applyStep(sequence.agentIndex, sequence, 0);
    return true;
  }

  private applyStep(agentIndex: number, sequence: BehaviorSequence, stepIndex: number): void {
    if (stepIndex >= sequence.steps.length) {
      this.finishSequence(agentIndex);
      return;
    }

    const step = sequence.steps[stepIndex];
    const runtime = this.runtimeStates.get(agentIndex);
    if (runtime) {
      runtime.semanticState = step.semanticState;
      runtime.taskDescription = step.taskDescription;
      runtime.emotion = step.expression || 'idle';
      runtime.activeSequenceName = sequence.name;
      runtime.stepIndex = stepIndex + 1;
      runtime.totalSteps = sequence.steps.length;
      runtime.priority = sequence.priority;
    }

    // Play physical animation and expression
    if (step.expression) {
      this.controller.setExpression(agentIndex, step.expression);
    }
    this.controller.play(agentIndex, step.animation as any);

    // Optional physical actions
    if (step.action === 'walk_to_desk') {
      let poi = this.controller.poiManager?.getPoi?.(`sit_work-${agentIndex}`);
      if (!poi) {
        const freeWork = this.controller.poiManager?.getFreePois?.('sit_work', agentIndex) || [];
        if (freeWork.length > 0) poi = freeWork[0];
      }
      const currentPos = this.controller.getCPUPosition(agentIndex);
      if (poi && currentPos) {
        this.controller.prepareSitDown(agentIndex, 'sit_work');
        this.controller.walkToPoi(agentIndex, poi.id, undefined, currentPos);
      }
    } else if (step.action === 'handoff' && step.targetAgentIndex) {
      this.interactionManager.queueHandoff(
        agentIndex,
        step.targetAgentIndex,
        step.itemType || 'paper',
        step.name,
        step.taskDescription
      );
    }
  }

  private finishSequence(agentIndex: number): void {
    this.activeSequences.delete(agentIndex);
    const runtime = this.runtimeStates.get(agentIndex);
    if (runtime) {
      runtime.semanticState = 'IDLE';
      runtime.activeSequenceName = null;
      runtime.stepIndex = 0;
      runtime.totalSteps = 0;
      runtime.priority = 5;
    }
  }

  /**
   * Main simulation tick. Steps active sequences deterministically.
   */
  public update(delta: number): void {
    this.activeSequences.forEach((active, agentIndex) => {
      active.stepTimer += delta;
      const currentStep = active.sequence.steps[active.stepIndex];

      if (currentStep && active.stepTimer >= currentStep.duration) {
        active.stepIndex += 1;
        active.stepTimer = 0;
        this.applyStep(agentIndex, active.sequence, active.stepIndex);
      }
    });
  }

  /**
   * Reaction to real CoreStore pipeline events (Section 07 & 36).
   */
  public handleCoreStoreEvent(
    eventType: 'RESUME_UPLOAD' | 'ATS_SCORE' | 'JOBS_FOUND' | 'TASK_PROGRESS' | 'TASK_DONE',
    payload: any
  ): void {
    if (eventType === 'RESUME_UPLOAD') {
      // Vision scans resume layout, Writer begins margin verification
      this.triggerSequence(VISION_SEQUENCES.atsScanRoutine(2, 75));
      this.triggerSequence(WRITER_SEQUENCES.resumeForgeOptimizing(4, 75));
      this.workspaceMemory.recordProgress(4, 'Ingested Candidate Resume', 'Draft V1 Loaded');
    } else if (eventType === 'ATS_SCORE') {
      const score = Number(payload.score || 0);
      if (score !== this.lastKnownAtsScore) {
        this.lastKnownAtsScore = score;
        this.triggerSequence(VISION_SEQUENCES.atsScanRoutine(2, score));
        this.triggerSequence(WRITER_SEQUENCES.resumeForgeOptimizing(4, score));
        this.workspaceMemory.recordProgress(
          2,
          `ATS Audit Score: ${score}%`,
          score >= 80 ? 'Master Ready' : 'Optimization Required'
        );

        // If score is high, trigger physical handoff from Writer to Hunter!
        if (score >= 80) {
          this.interactionManager.queueHandoff(
            4,
            5,
            'card',
            'Final ATS Tailored Resume',
            'ATS 80%+ Approved: Ready for prime application targeting'
          );
        }
      }
    } else if (eventType === 'JOBS_FOUND') {
      const count = Number(payload.count || 0);
      if (count > this.lastKnownJobCount) {
        this.lastKnownJobCount = count;
        this.triggerSequence(HUNTER_SEQUENCES.jobDiscoverySprint(5, count));
        this.workspaceMemory.recordProgress(5, `Indexed ${count} Direct Listings`, 'Target Radar Active');
      }
    } else if (eventType === 'TASK_PROGRESS') {
      const agentId = Number(payload.agentId || 1);
      if (agentId === 1) {
        this.triggerSequence(DIRECTOR_SEQUENCES.activeCodingSprint(1));
      } else if (agentId === 3) {
        this.triggerSequence(STRATEGIST_SEQUENCES.skillGapAnalysis(3, payload.gaps || ['System Architecture']));
      } else if (agentId === 6) {
        this.triggerSequence(MIRROR_SEQUENCES.interviewSimulationPrep(6));
      }
    } else if (eventType === 'TASK_DONE') {
      const agentId = Number(payload.agentId || 1);
      this.workspaceMemory.recordProgress(agentId, `Completed Task: ${payload.title || 'Pipeline Stage'}`);
    }
  }

  /**
   * Reaction when user changes active tab (Section 19).
   * Relevant agent gives a brief, subtle acknowledgment wave toward camera.
   */
  public handleUserTabChange(tab: ActiveSidebarTab): void {
    const tabToAgentMap: Partial<Record<ActiveSidebarTab, { agentIndex: number; domain: string }>> = {
      'new-cv': { agentIndex: 4, domain: 'Resume Forge' },
      'job-matches': { agentIndex: 5, domain: 'Job Hunter' },
      'skill-gaps': { agentIndex: 3, domain: 'Skill Gaps' },
      'interview-prep': { agentIndex: 6, domain: 'Interview Simulator' },
      'career-health': { agentIndex: 2, domain: 'Visual ATS Audit' },
      'dashboard': { agentIndex: 1, domain: 'Executive Director' },
    };

    const target = tabToAgentMap[tab];
    if (target) {
      // Only trigger glance if agent is currently in ambient/idle state
      const current = this.activeSequences.get(target.agentIndex);
      if (!current || current.sequence.priority >= 4) {
        this.triggerSequence(AMBIENT_SEQUENCES.userAwareGlance(target.agentIndex, target.domain));
      }
    }
  }

  public hasActiveSequence(agentIndex: number): boolean {
    return this.activeSequences.has(agentIndex);
  }

  public getRuntimeState(agentIndex: number): AgentRuntimeState | undefined {
    return this.runtimeStates.get(agentIndex);
  }

  public getAllRuntimeStates(): AgentRuntimeState[] {
    return Array.from(this.runtimeStates.values());
  }
}
