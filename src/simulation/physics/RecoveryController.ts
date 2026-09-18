import * as THREE from 'three/webgpu';

/**
 * Manages the graceful balance recovery sequence after landing:
 * STABILIZE -> RECOVER -> STAND -> IDLE.
 * Smoothly interpolates orientation, limb procedural weights, and transitions back to AI autonomy.
 */
export class RecoveryController {
  private isRecovering = false;
  private recoveryTimer = 0;
  private recoveryDuration = 0.75; // seconds
  private blendWeight = 1.0; // Procedural physics blend weight [1.0 -> 0.0]

  constructor(duration: number = 0.75) {
    this.recoveryDuration = duration;
  }

  public startRecovery(duration?: number): void {
    if (duration) this.recoveryDuration = duration;
    this.isRecovering = true;
    this.recoveryTimer = 0;
    this.blendWeight = 1.0;
  }

  public isUnderway(): boolean {
    return this.isRecovering;
  }

  public getBlendWeight(): number {
    return this.blendWeight;
  }

  /**
   * Advances the recovery sequence.
   *
   * @param delta Delta time in seconds
   * @returns true when recovery is fully complete
   */
  public update(delta: number): boolean {
    if (!this.isRecovering) return false;

    this.recoveryTimer += delta;
    const progress = Math.min(1.0, this.recoveryTimer / Math.max(0.1, this.recoveryDuration));

    // Smooth cubic ease-out for balance restoration
    const eased = 1.0 - Math.pow(1.0 - progress, 3);

    // Procedural blend decreases from 1.0 down to 0.0
    this.blendWeight = Math.max(0.0, 1.0 - eased);

    if (progress >= 1.0) {
      this.isRecovering = false;
      this.blendWeight = 0.0;
      return true; // Complete
    }

    return false;
  }

  public interrupt(): void {
    this.isRecovering = false;
    this.recoveryTimer = 0;
    this.blendWeight = 1.0;
  }

  public reset(): void {
    this.isRecovering = false;
    this.recoveryTimer = 0;
    this.blendWeight = 0.0;
  }
}
