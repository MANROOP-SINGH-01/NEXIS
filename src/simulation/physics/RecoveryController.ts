import { FallOutcomeType } from './PhysicsTypes';

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
  private currentOutcome: FallOutcomeType = 'LAND_STANDING';

  constructor(duration: number = 0.75) {
    this.recoveryDuration = duration;
  }

  public startRecovery(outcome: FallOutcomeType = 'LAND_STANDING', customDuration?: number): void {
    this.currentOutcome = outcome;
    if (customDuration) {
      this.recoveryDuration = customDuration;
    } else {
      switch (outcome) {
        case 'LAND_STANDING': this.recoveryDuration = 0.45; break;
        case 'LAND_STUMBLE':  this.recoveryDuration = 0.75; break;
        case 'LAND_ROLL':     this.recoveryDuration = 1.05; break;
        case 'LAND_BACK':     this.recoveryDuration = 1.20; break;
        case 'LAND_FRONT':    this.recoveryDuration = 0.95; break;
        case 'FULL_RAGDOLL':  this.recoveryDuration = 1.50; break;
      }
    }
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

  public getOutcome(): FallOutcomeType {
    return this.currentOutcome;
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

  /**
   * Returns a cute cartoon wobble/dust-off shimmy as the character gets back on their feet.
   */
  public getRecoveryWobble(): number {
    if (!this.isRecovering) return 0;
    const progress = Math.min(1.0, this.recoveryTimer / Math.max(0.1, this.recoveryDuration));

    // Outcome specific wobble intensity
    let mult = 0.14;
    if (this.currentOutcome === 'LAND_STUMBLE') mult = 0.22;
    else if (this.currentOutcome === 'FULL_RAGDOLL') mult = 0.28;
    else if (this.currentOutcome === 'LAND_STANDING') mult = 0.06;

    // 3 rapid playful shimmies decaying to 0
    return Math.sin(progress * Math.PI * 6.0) * (1.0 - progress) * mult;
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
