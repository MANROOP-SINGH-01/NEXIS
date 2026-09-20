import * as THREE from 'three/webgpu';
import { AgentStateBuffer } from '../behavior/AgentStateBuffer';
import { PATH_NODE_ARRIVAL } from '../constants';

/**
 * Manages path-following for a single agent on the CPU side.
 *
 * The GPU shader handles smooth interpolation toward the current waypoint;
 * PathAgent decides *which* waypoint to set next as the agent progresses
 * along its path.
 */
export class PathAgent {
  private path: THREE.Vector3[] = [];
  private nodeIndex = 0;
  private stuckTimer = 0;
  private lastPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  public isMoving = false;

  constructor(
    private readonly agentIndex: number,
    private readonly stateBuffer: AgentStateBuffer,
  ) {}

  /** Start following a new path. Immediately writes the first waypoint to the GPU buffer. */
  public setPath(path: THREE.Vector3[], fromPos?: THREE.Vector3): void {
    this.path = path;
    this.stuckTimer = 0;
    this.lastPos.set(Infinity, Infinity, Infinity);
    let prepended = false;
    if (fromPos && path.length > 0) {
      const firstNode = path[0];
      const distSq = (firstNode.x - fromPos.x) ** 2 + (firstNode.z - fromPos.z) ** 2;
      if (distSq > 0.0001) {
        this.path = [fromPos, ...path];
        prepended = true;
      }
    }
    this.nodeIndex = 0;
    this.isMoving = this.path.length > 0;
    if (this.isMoving) {
      if (prepended && this.path.length > 1) {
        this.nodeIndex = 1;
      }
      this._writeWaypoint(this.path[this.nodeIndex]);
    }
  }

  /** Cancel the current path. The agent will keep its last waypoint but stop following. */
  public cancel(): void {
    this.path = [];
    this.nodeIndex = 0;
    this.stuckTimer = 0;
    this.isMoving = false;
  }

  /**
   * Called every frame. Advances to the next path node when the agent is
   * close enough to the current one.
   *
   * @returns true when the agent has reached the final destination.
   */
  public update(currentPos: THREE.Vector3, delta: number = 0.016): boolean {
    if (!this.isMoving || this.path.length === 0) return false;

    const isFinalNode = this.nodeIndex >= this.path.length - 1;
    const target = this.path[this.nodeIndex];
    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const dist2 = dx * dx + dz * dz;

    // Relaxed arrival threshold for final destination (0.45m instead of 0.25m)
    // so furniture bounding boxes do not prevent chair arrival.
    const arrivalThreshold = isFinalNode ? 0.45 : PATH_NODE_ARRIVAL;

    if (dist2 < arrivalThreshold * arrivalThreshold) {
      this.nodeIndex++;
      this.stuckTimer = 0;
      if (this.nodeIndex >= this.path.length) {
        // Reached final destination
        this.isMoving = false;
        return true;
      }
      // Advance to next node
      this._writeWaypoint(this.path[this.nodeIndex]);
      return false;
    }

    // Stuck Recovery: Detect if agent is moving but making no forward progress
    const distFromLast = Math.hypot(currentPos.x - this.lastPos.x, currentPos.z - this.lastPos.z);
    if (distFromLast < 0.02) {
      this.stuckTimer += delta;
      if (this.stuckTimer > 0.8) {
        this.stuckTimer = 0;
        const finalDest = this.path[this.path.length - 1];
        const distToFinal = Math.hypot(currentPos.x - finalDest.x, currentPos.z - finalDest.z);

        // If close to final destination (< 0.85m), treat as arrived!
        if (distToFinal < 0.85 || isFinalNode) {
          this.isMoving = false;
          return true;
        } else {
          // Advance to next node if stuck against an obstacle corner along path
          this.nodeIndex++;
          if (this.nodeIndex >= this.path.length) {
            this.isMoving = false;
            return true;
          }
          this._writeWaypoint(this.path[this.nodeIndex]);
        }
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastPos.copy(currentPos);

    return false;
  }

  /** Returns the current target waypoint. */
  public getTarget(): THREE.Vector3 | null {
    if (!this.isMoving || this.path.length === 0) return null;
    return this.path[this.nodeIndex];
  }

  /** Returns the final destination of the current path. */
  public getDestination(): THREE.Vector3 | null {
    if (!this.isMoving || this.path.length === 0) return null;
    return this.path[this.path.length - 1];
  }

  /** Returns the last direction vector of the current path. */
  public getLastDirection(): THREE.Vector3 {
    if (this.path.length < 2) return new THREE.Vector3(0, 0, 1);
    const last = this.path[this.path.length - 1];
    const prev = this.path[this.path.length - 2];
    return new THREE.Vector3().subVectors(last, prev).normalize();
  }

  private _writeWaypoint(node: THREE.Vector3): void {
    this.stateBuffer.setWaypoint(this.agentIndex, node.x, node.z);
  }
}
