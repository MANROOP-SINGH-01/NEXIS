import * as THREE from 'three/webgpu';
import { CharacterController } from '../CharacterController';
import { AgentWorkspaceMemory } from './AgentWorkspaceMemory';
import { WorkspaceItemType } from './AgentSequences';

export interface HandoffTask {
  id: string;
  sourceIndex: number;
  targetIndex: number;
  itemType: WorkspaceItemType;
  title: string;
  summary: string;
  phase: 'idle' | 'walking_to_target' | 'exchanging' | 'returning' | 'completed';
  timer: number;
}

export class AgentInteractionManager {
  private activeHandoff: HandoffTask | null = null;
  private handoffQueue: HandoffTask[] = [];

  constructor(
    private controller: CharacterController,
    private workspaceMemory: AgentWorkspaceMemory
  ) {}

  public queueHandoff(
    sourceIndex: number,
    targetIndex: number,
    itemType: WorkspaceItemType,
    title: string,
    summary: string
  ): void {
    const task: HandoffTask = {
      id: `handoff-${Date.now()}-${sourceIndex}-${targetIndex}`,
      sourceIndex,
      targetIndex,
      itemType,
      title,
      summary,
      phase: 'idle',
      timer: 0,
    };

    if (!this.activeHandoff) {
      this.startHandoff(task);
    } else {
      this.handoffQueue.push(task);
    }
  }

  private startHandoff(task: HandoffTask): void {
    this.activeHandoff = task;
    task.phase = 'walking_to_target';
    task.timer = 0;

    const targetPos = this.controller.getCPUPosition(task.targetIndex);
    const sourcePos = this.controller.getCPUPosition(task.sourceIndex);

    if (targetPos && sourcePos) {
      // Calculate approach position 1.1m in front of target
      const approachTarget = targetPos.clone();
      const offset = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize().multiplyScalar(1.1);
      approachTarget.add(offset);
      approachTarget.y = 0;

      // Look at target
      const lookDirection = new THREE.Vector3().subVectors(targetPos, approachTarget).normalize();
      const rotY = Math.atan2(lookDirection.x, lookDirection.z);
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

      this.controller.moveTo(task.sourceIndex, approachTarget, 'talk', undefined, sourcePos, targetQuat);
    }
  }

  public update(delta: number): void {
    if (!this.activeHandoff) return;

    const task = this.activeHandoff;
    task.timer += delta;

    const sourcePos = this.controller.getCPUPosition(task.sourceIndex);
    const targetPos = this.controller.getCPUPosition(task.targetIndex);

    if (!sourcePos || !targetPos) return;

    const distance = sourcePos.distanceTo(targetPos);

    if (task.phase === 'walking_to_target') {
      // Check if source agent reached target agent vicinity
      if (distance <= 1.45 || task.timer > 8.0) {
        task.phase = 'exchanging';
        task.timer = 0;

        // Source agent offers document/card
        this.controller.play(task.sourceIndex, 'wave');

        // Target agent faces source agent and receives document
        const toSource = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize();
        const rotY = Math.atan2(toSource.x, toSource.z);
        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        this.controller.characterManager.setOrientation(task.targetIndex, targetQuat);
        this.controller.play(task.targetIndex, 'listen');
      }
    } else if (task.phase === 'exchanging') {
      if (task.timer >= 2.5) {
        // Exchange finished: record into target agent's workspace memory
        this.workspaceMemory.recordProgress(
          task.targetIndex,
          `Received: ${task.title} from Node 0${task.sourceIndex}`,
          task.summary
        );

        // Target celebrates / approves
        this.controller.play(task.targetIndex, 'happy');

        // Source returns to spawn or desk
        task.phase = 'returning';
        task.timer = 0;
        this.returnAgentToWorkstation(task.sourceIndex);
      }
    } else if (task.phase === 'returning') {
      if (task.timer >= 2.0) {
        task.phase = 'completed';
        this.activeHandoff = null;

        // Process next handoff in queue if present
        if (this.handoffQueue.length > 0) {
          const next = this.handoffQueue.shift()!;
          this.startHandoff(next);
        }
      }
    }
  }

  private returnAgentToWorkstation(agentIndex: number): void {
    let poi = this.controller.poiManager.getPoi(`sit_work-${agentIndex}`);
    if (!poi) {
      poi = this.controller.poiManager.getPoi(`sit_idle-${((agentIndex - 1) % 4) + 1}`);
    }
    if (!poi) {
      const workPois = this.controller.poiManager.getFreePois('sit_work', agentIndex);
      if (workPois.length > 0) poi = workPois[0];
    }
    const currentPos = this.controller.getCPUPosition(agentIndex);
    if (poi && currentPos) {
      const arrival = poi.id.includes('work') ? 'sit_work' : 'sit_idle';
      this.controller.prepareSitDown(agentIndex, arrival);
      this.controller.walkToPoi(agentIndex, poi.id, undefined, currentPos);
    } else {
      this.controller.play(agentIndex, 'sit_idle');
    }
  }

  public getActiveHandoff(): HandoffTask | null {
    return this.activeHandoff;
  }
}
