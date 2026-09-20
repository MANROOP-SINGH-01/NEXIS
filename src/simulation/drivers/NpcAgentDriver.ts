import * as THREE from 'three/webgpu';
import { AgentNode, USER_ID, MAX_AGENTS } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { IAgentDriver } from '../../types';
import { CharacterController } from '../CharacterController';
import { ObstacleSystem } from '../physics/ObstacleSystem';
import { AgentBehaviorEngine } from '../behavior/AgentBehaviorEngine';
import {
  DIRECTOR_SEQUENCES,
  VISION_SEQUENCES,
  STRATEGIST_SEQUENCES,
  WRITER_SEQUENCES,
  HUNTER_SEQUENCES,
  MIRROR_SEQUENCES,
  AMBIENT_SEQUENCES,
} from '../behavior/AgentSequences';


/**
 * NpcAgentDriver — drives a single NPC autonomously.
 *
 * Enforces the strict NEXIS Bauhaus Office Behavior Rules:
 * 1. Default state: STATIONARY IDLE at assigned workstation desk.
 * 2. NO perpetual running, random pathfinding, or roaming to lounge areas.
 * 3. Locomotion requires semantic meaning (task handoffs or returning to workstation).
 * 4. Ambient life via low-frequency, stationary, interruptible micro-actions.
 */
export class NpcAgentDriver implements IAgentDriver {
  public readonly agentIndex: number;
  private behaviorTimer: number = Math.random() * 20 + 25; // 25-45s calm initial wait
  private wasBusy: boolean = false;
  private movementReason: string = 'NONE (AT WORKSTATION)';

  /**
   * External state injected by the pilar 'Integration' or 'Simulation' loop.
   */
  private isChattingWithMe: boolean = false;

  constructor(
    agentIndex: number,
    protected readonly controller: CharacterController,
    protected readonly data: AgentNode,
    protected readonly behaviorEngine?: AgentBehaviorEngine,
  ) {
    this.agentIndex = agentIndex;
  }

  /** Exposes movement reason for developer telemetry & debug overlay */
  public getMovementReason(): string {
    return this.movementReason;
  }

  /** Sets whether the agent is currently engaged in a chat, suspending autonomy. */
  public setChatting(isChatting: boolean): void {
    this.isChattingWithMe = isChatting;
    if (isChatting) {
      this.movementReason = 'USER CONSULTATION';
    } else {
      this.movementReason = 'NONE (AT WORKSTATION)';
    }
  }

  // ── IAgentDriver ─────────────────────────────────────────────

  public update(positions: Float32Array, delta: number): void {
    const currentState = this.controller.getState(this.agentIndex);
    const systemState = useCoreStore.getState();

    // If we are currently chatting with this NPC, suspend autonomous behavior
    if (this.isChattingWithMe) {
      return;
    }

    // If the behavior engine is currently running an active sequence for this agent, yield!
    if (this.behaviorEngine?.hasActiveSequence(this.agentIndex)) {
      const rt = this.behaviorEngine.getRuntimeState(this.agentIndex);
      this.movementReason = rt ? `ACTIVE SEQUENCE: ${rt.activeSequenceName || rt.semanticState}` : 'ACTIVE WORKFLOW';
      return;
    }

    // Special behavior for Lead Agent when project is ready
    const isLeadCandidate = this.agentIndex === 1;
    if (isLeadCandidate && systemState.phase === 'done') {
      this._updateProjectReadyBehavior(positions, delta, currentState);
      return;
    }

    // Capture current active task (if any)
    const activeTask = systemState.tasks.find(
      t => t.assignedAgentId === this.agentIndex && (t.status === 'in_progress' || t.status === 'on_hold' || t.status === 'scheduled')
    );
    const isBusyWithSystem = !!activeTask;

    // Detect busy→idle transition
    if (this.wasBusy && !isBusyWithSystem) {
      this.behaviorTimer = Math.random() * 5 + 5;
    }
    this.wasBusy = isBusyWithSystem;

    // 1. SYSTEM TASK ACTIVE: Agent focuses at computer monitor
    if (activeTask) {
      this.movementReason = `TASK IN PROGRESS: ${activeTask.title}`;
      if (currentState !== 'sit_work' && currentState !== 'walk') {
        const isSeated = currentState === 'sit_idle' || currentState === 'sit_down';
        if (isSeated) {
          this.controller.play(this.agentIndex, 'sit_work');
        } else {
          this._returnToWorkstation(positions);
        }
      }
      return;
    }

    // 2. LOCOMOTION CHECK: If agent is currently walking, update movement reason and let path complete
    if (currentState === 'walk') {
      return;
    }

    // 3. STANDING / AWAY FROM DESK: Enforce Return-to-Workstation rule
    const isSeated = currentState === 'sit_idle' || currentState === 'sit_work' || currentState === 'sit_down';
    if (!isSeated) {
      this.movementReason = 'RETURNING TO WORKSTATION';
      this.behaviorTimer -= delta;
      if (this.behaviorTimer <= 0) {
        this._returnToWorkstation(positions);
        this.behaviorTimer = Math.random() * 10 + 15;
      }
      return;
    }

    // 4. STATIONARY AT WORKSTATION: Calm ambient micro-actions with long intervals
    this.movementReason = 'NONE (AT WORKSTATION)';
    this.behaviorTimer -= delta;
    if (this.behaviorTimer <= 0) {
      this._performSeatedAmbientAction(currentState);
    }
  }

  private _returnToWorkstation(positions: Float32Array): void {
    const currentPos = new THREE.Vector3(
      positions[this.agentIndex * 4],
      positions[this.agentIndex * 4 + 1],
      positions[this.agentIndex * 4 + 2]
    );

    // Look for dedicated workstation desk: sit_work-${agentIndex}
    const deskId = `sit_work-${this.agentIndex}`;
    let poi = this.controller.poiManager.getPoi(deskId);

    // Fallback: sit_idle-${agentIndex} or any free work POI
    if (!poi) {
      const idleId = `sit_idle-${((this.agentIndex - 1) % 4) + 1}`;
      poi = this.controller.poiManager.getPoi(idleId);
    }
    if (!poi) {
      const freeWork = this.controller.poiManager.getFreePois('sit_work', this.agentIndex);
      if (freeWork.length > 0) poi = freeWork[0];
    }

    if (poi) {
      const finalState = poi.id.includes('work') ? 'sit_work' : 'sit_idle';
      this.controller.prepareSitDown(this.agentIndex, finalState);
      this.controller.walkToPoi(this.agentIndex, poi.id, undefined, currentPos);
    }
  }

  private _performSeatedAmbientAction(currentState: string): void {
    // Subtle low-frequency stationary micro-actions (35 to 70s intervals)
    const rand = Math.random();

    if (this.behaviorEngine) {
      if (rand < 0.15) {
        // Subtle keyboard correction / posture reset
        this.behaviorEngine.triggerSequence(AMBIENT_SEQUENCES.keyboardCorrection(this.agentIndex));
        this.behaviorTimer = Math.random() * 30 + 40;
        return;
      } else if (rand < 0.30) {
        // Brief coffee sip / stretch
        this.behaviorEngine.triggerSequence(AMBIENT_SEQUENCES.ambientCoffeeBreak(this.agentIndex));
        this.behaviorTimer = Math.random() * 30 + 40;
        return;
      }
    }

    // Alternate calmly between reading screen (sit_idle) and light desk interaction (sit_work)
    if (currentState === 'sit_work') {
      this.controller.play(this.agentIndex, 'sit_idle');
      this.behaviorTimer = Math.random() * 30 + 35; // 35-65s resting/reading screen
    } else {
      this.controller.play(this.agentIndex, 'sit_work');
      this.behaviorTimer = Math.random() * 25 + 30; // 30-55s light desk work
    }
  }

  private _updateProjectReadyBehavior(positions: Float32Array, delta: number, currentState: string): void {
    const spawnId = `idle-spawn-${this.agentIndex}`;
    const targetPoi = this.controller.poiManager.getPoi(spawnId);
    if (!targetPoi) return;

    const currentPos = new THREE.Vector3(
      positions[this.agentIndex * 4],
      positions[this.agentIndex * 4 + 1],
      positions[this.agentIndex * 4 + 2]
    );

    const dist = currentPos.distanceTo(targetPoi.position);
    if (dist > 1.5) {
      if (currentState !== 'walk') {
        this.movementReason = 'PROJECT COMPLETE CELEBRATION';
        this.controller.moveTo(this.agentIndex, targetPoi.position, 'happy_loop', undefined, currentPos, targetPoi.quaternion);
      }
      return;
    }

    const isHappy = currentState === 'happy_loop';
    if (!isHappy && currentState !== 'walk') {
      this.controller.characterManager.setOrientation(this.agentIndex, targetPoi.quaternion);
      if (currentState !== 'idle') {
        this.controller.cancelMovement(this.agentIndex);
      }
      this.controller.play(this.agentIndex, 'happy_loop');
    }
  }

  public dispose(): void { }
}
