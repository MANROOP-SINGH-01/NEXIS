import * as THREE from 'three/webgpu';
import { getActiveAgentSet } from '../integration/store/teamStore';
import { AgentBehavior, AnimationName, CharacterStateKey, ExpressionKey, ICharacterDriver } from '../types';

import { AgentStateBuffer } from './behavior/AgentStateBuffer';
import { CharacterStateMachine } from './behavior/CharacterStateMachine';
import { CharacterManager } from './entities/CharacterManager';
import { NavMeshManager } from './pathfinding/NavMeshManager';
import { PathAgent } from './pathfinding/PathAgent';
import { PoiManager } from './world/PoiManager';
import { ObstacleSystem } from './physics/ObstacleSystem';

/**
 * CharacterController — unified API for controlling any character (player or NPC).
 *
 * Composes:
 *  - CharacterManager     → GPU rendering, animation baking, expression buffers
 *  - CharacterStateMachine → declarative state→animation+expression mapping
 *  - PathAgent[]          → per-agent CPU path following
 *  - NavMeshManager       → path queries
 *  - PoiManager           → POI lookup and occupancy
 *
 * Implements ICharacterDriver so it can be passed to the state machine and
 * behavior drivers without circular dependencies.
 *
 * All behavior code (PlayerInputDriver, NpcAgentDriver) goes through this class.
 */
export class CharacterController implements ICharacterDriver {
  private stateMachine: CharacterStateMachine;
  private pathAgents: PathAgent[] = [];
  /** Per-agent callback fired when the agent reaches its path destination. */
  private arrivalCallbacks: ((index: number) => void)[] = [];
  private walkDuration: number[] = [];
  private lastStumbleTime: number[] = [];
  private lastGreetingCheck = 0;

  constructor(
    public readonly characterManager: CharacterManager,
    private readonly navMesh: NavMeshManager,
    public readonly poiManager: PoiManager,
  ) {
    const count = characterManager.getCount();
    this.stateMachine = new CharacterStateMachine(count);

    const stateBuffer = characterManager.getAgentStateBuffer()!;
    for (let i = 0; i < count; i++) {
      this.pathAgents.push(new PathAgent(i, stateBuffer));
      this.walkDuration[i] = 0;
      this.lastStumbleTime[i] = 0;
    }
  }

  // ── High-level character API ─────────────────────────────────

  /**
   * Transition a character to the given state.
   * The state machine applies the correct animation + expression automatically.
   * Non-interruptible states (e.g. 'sit_down') will queue the new state until ready.
   */
  public play(index: number, state: CharacterStateKey): void {
    // If transitioning away from a seated state, release any POIs
    const currentState = this.stateMachine.getState(index);
    const isCurrentlySeated = currentState === 'sit_idle' || currentState === 'sit_work' || currentState === 'sit_down';
    const isNewStateSeated = state === 'sit_idle' || state === 'sit_work' || state === 'sit_down';

    if (isCurrentlySeated && !isNewStateSeated) {
      this.poiManager.releaseAll(index);
    }

    this.stateMachine.transition(index, state, this);
  }

  /** Prepares the final seated state ('sit_idle' or 'sit_work') before sit_down animation finishes. */
  public prepareSitDown(index: number, finalState: 'sit_idle' | 'sit_work'): void {
    this.stateMachine.prepareSitDown(index, finalState);
  }

  /**
   * Walk a character to a world-space position using the navmesh.
   * Automatically transitions to 'walk' and then to `arrivalState` on arrival.
   *
   * @param arrivalState State to enter upon reaching the destination (default: 'idle')
   * @param onArrival    Optional callback fired when the destination is reached
   * @param fromPosition Optional start position (defaults to current CPU position)
   * @param targetOrientation Optional orientation to snap to upon arrival
   */
  public moveTo(
    index: number,
    target: THREE.Vector3,
    arrivalState: CharacterStateKey = 'idle',
    onArrival?: (index: number) => void,
    fromPosition?: THREE.Vector3,
    targetOrientation?: THREE.Quaternion,
  ): boolean {
    let from: THREE.Vector3;

    if (fromPosition) {
      from = fromPosition.clone();
    } else {
      const positions = this.characterManager.getCPUPositions();
      if (!positions) return false;

      from = new THREE.Vector3(
        positions[index * 4],
        positions[index * 4 + 1],
        positions[index * 4 + 2],
      );
    }

    // Push start position out of any obstacle so navmesh can find a clean path
    ObstacleSystem.resolveCollision(from);

    const path = this.navMesh.findPath(from, target);

    if (path.length === 0) {
      // Emergency Unstuck: If the agent was trapped inside an obstacle or off navmesh,
      // teleport directly to the target destination and assume target orientation.
      this.characterManager.setPosition(index, target);
      if (targetOrientation) {
        this.characterManager.setOrientation(index, targetOrientation);
      }
      this.play(index, arrivalState);
      onArrival?.(index);
      return true;
    }

    // Ensure the agent ends up at the exact target position,
    // not at the nearest navmesh polygon boundary.
    path[path.length - 1] = target.clone();

    this.pathAgents[index].setPath(path, from);
    this.arrivalCallbacks[index] = (i) => {
      if (targetOrientation) {
        this.characterManager.setOrientation(i, targetOrientation);
      }
      this.play(i, arrivalState);
      onArrival?.(i);
    };

    this.setPhysicsMode(index, AgentBehavior.GOTO);
    this.play(index, 'walk');

    return true;
  }

  /**
   * Walk a character to a POI by ID.
   * Occupies the POI immediately; releases existing ones first.
   */
  public walkToPoi(
    index: number,
    poiId: string,
    onArrival?: (index: number) => void,
    fromPosition?: THREE.Vector3,
  ): boolean {
    const poi = this.poiManager.getPoi(poiId);
    if (!poi) return false;

    // Allow designated owner to reclaim their own workstation if occupied by another agent
    if (poi.occupiedBy !== null && poi.occupiedBy !== index) {
      if (poi.id.includes(`-${index}`)) {
        this.poiManager.releaseAll(poi.occupiedBy);
        poi.occupiedBy = null;
      } else {
        return false;
      }
    }

    const targetState = poi.arrivalState;
    const isSitVariant = targetState === 'sit_idle' || targetState === 'sit_work';

    if (isSitVariant) {
      // Pre-arm the sit sequence: sitTarget is stored NOW, before the async arrival fires.
      this.stateMachine.prepareSitDown(index, targetState as 'sit_idle' | 'sit_work');
    }

    // Check path before releasing old POIs
    const moved = this.moveTo(index, poi.position, 'idle', (i) => {
      // 1. Teleport to exact POI position (removes any sub-unit navmesh offset)
      this.characterManager.setPosition(i, poi.position);

      // 2. Snap orientation to POI facing direction (skip if it's an 'area' POI)
      if (!poi.id.startsWith('area')) {
        this.characterManager.setOrientation(i, poi.quaternion);
      }

      // 3. Switch GPU to SEATED so the character won't be moved by any stray GOTO commands
      if (isSitVariant) {
        this.setPhysicsMode(i, AgentBehavior.SEATED);
        this.play(i, 'sit_down');
      } else {
        this.play(i, targetState);
      }

      onArrival?.(i);
    }, fromPosition);

    if (!moved) return false;

    this.poiManager.releaseAll(index);
    this.poiManager.occupy(poiId, index);

    return true;
  }

  /** Returns the final path destination for an agent if currently moving. */
  public getDestination(index: number): THREE.Vector3 | null {
    if (!this.pathAgents[index]) return null;
    return this.pathAgents[index].getDestination();
  }

  /**
   * Checks if an agent is in the final approach to their path destination (e.g. workstation chair).
   * Allows bypassing obstacle collision during the final approach so chair arrival triggers cleanly.
   */
  public isApproachingDestination(index: number, threshold: number = 0.65): boolean {
    const agent = this.pathAgents[index];
    if (!agent || !agent.isMoving) return false;
    const dest = agent.getDestination();
    if (!dest) return false;
    const pos = this.getCPUPosition(index);
    if (!pos) return false;
    return Math.hypot(pos.x - dest.x, pos.z - dest.z) < threshold;
  }

  /** Speaking mouth animation overlay — independent of character state. */
  public setSpeaking(index: number, isSpeaking: boolean): void {
    this.characterManager.setSpeaking(index, isSpeaking);
  }

  public getState(index: number): CharacterStateKey {
    return this.stateMachine.getState(index);
  }

  // ── Per-frame update ─────────────────────────────────────────

  /**
   * Main update loop. Call once per frame.
   *  1. Updates GPU expression buffers (blink, mouth animation).
   *  2. Runs GPU compute shader (physics/movement).
   *  3. Ticks the state machine timers (non-looping state auto-transitions).
   *  4. Advances per-agent path following.
   */
  public update(delta: number, renderer: any): void {
    this.characterManager.update(delta, renderer);
    this.stateMachine.update(delta, this);
  }

  /**
   * GPU→CPU position readback (async, 1-frame lag).
   * Returns the positions buffer so drivers can use it for logic.
   */
  public async syncFromGPU(renderer: any): Promise<Float32Array | null> {
    return this.characterManager.syncFromGPU(renderer);
  }

  /**
   * Advance path agents. Call after syncFromGPU resolves so positions are fresh.
   * Fires arrival callbacks for agents that reach their destination.
   * Also manages clumsy stumbling and peer social greetings.
   */
  public updatePaths(positions: Float32Array, delta: number = 0.016): void {
    const now = performance.now();

    for (let i = 0; i < this.pathAgents.length; i++) {
      if (!this.pathAgents[i].isMoving) {
        this.walkDuration[i] = 0;
        continue;
      }

      this.walkDuration[i] += delta;

      // Clumsy stumble: 4% chance during an ongoing walk sprint
      if (this.walkDuration[i] > 2.5 && Math.random() < 0.03 && (now - this.lastStumbleTime[i]) > 14000) {
        this.lastStumbleTime[i] = now;
        this.walkDuration[i] = 0;
        const phys = this.characterManager.getPhysicsSystem();
        if (phys) {
          const ctrl = phys.getController(i);
          // Playful comical bobblehead forward stumble
          ctrl?.secondaryMotion.injectImpulse('head', new THREE.Vector3(0, 0.50, 0.35));
          ctrl?.secondaryMotion.injectImpulse('spine', new THREE.Vector3(0, 0.30, 0.20));
        }
      }

      const currentPos = new THREE.Vector3(
        positions[i * 4],
        positions[i * 4 + 1],
        positions[i * 4 + 2],
      );

      const arrived = this.pathAgents[i].update(currentPos, delta);
      if (arrived) {
        // Keep the last movement direction when transitioning to IDLE
        const lastDir = this.pathAgents[i].getLastDirection();
        this.characterManager.setFacing(i, lastDir.x, lastDir.z);

        this.setPhysicsMode(i, AgentBehavior.IDLE);
        this.arrivalCallbacks[i]?.(i);
      }
    }

    // Peer proximity interaction: agents greet colleagues when walking near each other
    if (now - this.lastGreetingCheck > 12000) {
      const count = this.characterManager.getCount();
      for (let a = 1; a < count; a++) {
        for (let b = a + 1; b < count; b++) {
          const stateA = this.getState(a);
          const stateB = this.getState(b);
          const isSeatedA = stateA === 'sit_idle' || stateA === 'sit_work' || stateA === 'sit_down';
          const isSeatedB = stateB === 'sit_idle' || stateB === 'sit_work' || stateB === 'sit_down';

          if (!isSeatedA && !isSeatedB && stateA !== 'dragged' && stateB !== 'dragged') {
            const ax = positions[a * 4];
            const az = positions[a * 4 + 2];
            const bx = positions[b * 4];
            const bz = positions[b * 4 + 2];
            const distSq = (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

            // Within 1.5 meters proximity
            if (distSq < 2.25) {
              this.lastGreetingCheck = now;
              if (stateA === 'idle' || stateA === 'look_around') {
                this.play(a, 'wave');
              }
              if (stateB === 'idle' || stateB === 'look_around') {
                this.play(b, 'happy');
              }
              const phys = this.characterManager.getPhysicsSystem();
              if (phys) {
                phys.getController(a)?.secondaryMotion.injectImpulse('head', new THREE.Vector3(0, 0.35, 0.15));
                phys.getController(b)?.secondaryMotion.injectImpulse('head', new THREE.Vector3(0, 0.35, -0.15));
              }
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Joyful, comical reaction when user clicks on an agent.
   */
  public playClickReaction(index: number): void {
    const currentState = this.getState(index);
    const isSeated = currentState === 'sit_idle' || currentState === 'sit_work' || currentState === 'sit_down';

    if (isSeated) {
      this.play(index, 'happy');
      setTimeout(() => {
        const after = this.getState(index);
        if (after === 'idle' || after === 'happy') {
          this.play(index, 'sit_work');
        }
      }, 1600);
    } else {
      this.play(index, Math.random() < 0.5 ? 'happy' : 'wave');
    }

    const phys = this.characterManager.getPhysicsSystem();
    if (phys) {
      const ctrl = phys.getController(index);
      ctrl?.secondaryMotion.injectImpulse('head', new THREE.Vector3(0, 0.65, 0.30));
      ctrl?.secondaryMotion.injectImpulse('spine', new THREE.Vector3(0, 0.40, 0.20));
    }
  }

  /** Cancel movement for an agent and return to idle. */
  public cancelMovement(index: number): void {
    this.pathAgents[index].cancel();
    this.setPhysicsMode(index, AgentBehavior.IDLE);
  }

  /**
   * Instantly teleport every agent to their original spawn POI — no pathfinding,
   * no arrival callbacks. Spawn POIs are reassigned in sorted ID order, mirroring
   * the order used during initialisation.
   *
   * @param playerIndex  Index of the player character (teleported to world origin).
   * @param npcIndices   Indices of all NPC agents, in the desired spawn-assignment order.
   */
  public warpAllToSpawn(playerIndex: number, npcIndices: number[]): void {
    // 1. Release all POIs so spawn slots are free
    this.poiManager.releaseAll(playerIndex);
    npcIndices.forEach(i => this.poiManager.releaseAll(i));

    // 2. Cancel in-flight paths and snap physics to IDLE
    this.cancelMovement(playerIndex);
    npcIndices.forEach(i => this.cancelMovement(i));

    // 3. Teleport player to world origin
    this.characterManager.setPosition(playerIndex, new THREE.Vector3(0, 0, 0));
    this.play(playerIndex, 'idle');

    // 4. Reassign home workstation desks
    const spawnPois = this.poiManager.getPoisByPrefix('spawn');
    npcIndices.forEach((agentIndex, order) => {
      let poi = this.poiManager.getPoi(`sit_work-${agentIndex}`);
      if (!poi) {
        poi = this.poiManager.getPoi(`sit_idle-${((agentIndex - 1) % 4) + 1}`);
      }
      if (!poi && spawnPois.length > 0) {
        poi = spawnPois[order % spawnPois.length];
      }

      if (poi) {
        this.characterManager.setPosition(agentIndex, poi.position);
        this.characterManager.setOrientation(agentIndex, poi.quaternion);
        this.poiManager.occupy(poi.id, agentIndex);

        const isSeated = poi.id.includes('sit') || poi.arrivalState === 'sit_work' || poi.arrivalState === 'sit_idle';
        if (isSeated) {
          this.setPhysicsMode(agentIndex, AgentBehavior.SEATED);
          this.play(agentIndex, poi.id.includes('work') ? 'sit_work' : 'sit_idle');
        } else {
          this.play(agentIndex, 'idle');
        }
      } else {
        this.play(agentIndex, 'idle');
      }
    });
  }

  // ── Forwarded accessors ──────────────────────────────────────

  public getCPUPositions(): Float32Array | null {
    return this.characterManager.getCPUPositions();
  }

  public getCPUPosition(index: number): THREE.Vector3 | null {
    return this.characterManager.getCPUPosition(index);
  }

  public getCount(): number {
    return this.characterManager.getCount();
  }

  public getAgentStateBuffer(): AgentStateBuffer | null {
    return this.characterManager.getAgentStateBuffer();
  }

  public setColors(): void {
    this.characterManager.setColors();
    // Re-sync components after recreation
    const newCount = this.characterManager.getCount();
    const stateBuffer = this.characterManager.getAgentStateBuffer()!;
    this.pathAgents = [];
    for (let i = 0; i < newCount; i++) {
      this.pathAgents.push(new PathAgent(i, stateBuffer));
    }
    this.stateMachine = new CharacterStateMachine(newCount);
  }

  public setInstanceCount(count: number): void {
    this.characterManager.setInstanceCount(count);
    // Re-sync path agents and state machine after resize
    const newCount = this.characterManager.getCount();
    const stateBuffer = this.characterManager.getAgentStateBuffer()!;
    this.pathAgents = [];
    for (let i = 0; i < newCount; i++) {
      this.pathAgents.push(new PathAgent(i, stateBuffer));
    }
    this.stateMachine = new CharacterStateMachine(newCount);
  }

  public get isLoaded(): boolean {
    return this.characterManager.isLoaded;
  }

  // ── ICharacterDriver implementation ──────────────────────────

  public setPhysicsMode(index: number, mode: AgentBehavior): void {
    this.characterManager.setPhysicsMode(index, mode);
  }

  public setAnimation(index: number, name: AnimationName, loop: boolean = true): void {
    this.characterManager.setAnimation(index, name, loop);
  }

  public setExpression(index: number, key: ExpressionKey): void {
    this.characterManager.setExpression(index, key);
  }

  public getAgentState(index: number): AgentBehavior {
    return this.characterManager.getAgentState(index);
  }

  public getAnimationDuration(name: AnimationName): number {
    return this.characterManager.getAnimationDuration(name);
  }
}
