import * as THREE from 'three/webgpu';
import { ImpactInfo } from './PhysicsTypes';

/**
 * Procedural ground/surface impact processor.
 * Calculates velocity-dependent compression (squash/stretch),
 * damped wobble oscillations, and impulse shockwaves.
 */
export class ImpactController {
  private isImpacting = false;
  private timeSinceImpact = 0;
  private currentCompression = 0; // vertical offset/compression in meters
  private currentSquashScale = 1.0; // Y scale factor
  private wobbleRotation = new THREE.Vector3(); // (pitch, yaw, roll) wobble angles

  // Impact oscillation parameters
  private maxCompression = 0.16;
  private oscillationFrequency = 22.0; // rad/s
  private decayRate = 8.5; // exponential decay
  private impactDuration = 0.6; // seconds

  public hasActiveImpact(): boolean {
    return this.isImpacting;
  }

  public getSquashScale(): number {
    return this.currentSquashScale;
  }

  public getCompressionOffset(): number {
    return this.currentCompression;
  }

  public getWobbleRotation(): THREE.Vector3 {
    return this.wobbleRotation;
  }

  /**
   * Registers a ground collision event and initiates the procedural shockwave.
   */
  public triggerImpact(impactVelocity: THREE.Vector3, normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0)): ImpactInfo {
    const speed = impactVelocity.length();
    const vertSpeed = Math.abs(impactVelocity.y);

    // Compute compression proportional to vertical impact speed
    const normalizedSpeed = Math.min(15.0, vertSpeed);
    const rndFactor = 0.92 + Math.random() * 0.16; // Subtle 8% organic variance
    this.maxCompression = THREE.MathUtils.clamp(normalizedSpeed * 0.024 * rndFactor, 0.04, 0.22);

    // Lateral speed feeds into directional wobble
    const latSpeed = Math.hypot(impactVelocity.x, impactVelocity.z);
    const wobblePitch = (impactVelocity.z / Math.max(0.1, speed)) * 0.22 * rndFactor;
    const wobbleRoll = (-impactVelocity.x / Math.max(0.1, speed)) * 0.22 * rndFactor;
    this.wobbleRotation.set(wobblePitch, (Math.random() - 0.5) * 0.1, wobbleRoll);

    this.isImpacting = true;
    this.timeSinceImpact = 0;

    return {
      impactVelocity: impactVelocity.clone(),
      impactMagnitude: speed,
      compressionAmount: this.maxCompression,
      restitution: 0.2,
      wobbleIntensity: speed * 0.3,
      timeSinceImpact: 0,
    };
  }

  /**
   * Advances the damped impact oscillation.
   */
  public update(delta: number): void {
    if (!this.isImpacting) {
      this.currentCompression = 0;
      this.currentSquashScale = 1.0;
      this.wobbleRotation.set(0, 0, 0);
      return;
    }

    this.timeSinceImpact += delta;

    if (this.timeSinceImpact >= this.impactDuration) {
      this.isImpacting = false;
      this.currentCompression = 0;
      this.currentSquashScale = 1.0;
      this.wobbleRotation.set(0, 0, 0);
      return;
    }

    const t = this.timeSinceImpact;
    // Damped harmonic oscillator: e^(-decay * t) * cos(omega * t)
    const envelope = Math.exp(-this.decayRate * t);
    const oscillation = Math.cos(this.oscillationFrequency * t);

    // Vertical compression: sinks slightly into floor (negative Y offset)
    this.currentCompression = -this.maxCompression * envelope * oscillation;

    // Squash & Stretch scale (volume preserving: Y squash, X/Z bulge)
    this.currentSquashScale = 1.0 - this.maxCompression * envelope * oscillation * 0.8;

    // Decay wobble rotation
    this.wobbleRotation.multiplyScalar(envelope);
  }

  public reset(): void {
    this.isImpacting = false;
    this.timeSinceImpact = 0;
    this.currentCompression = 0;
    this.currentSquashScale = 1.0;
    this.wobbleRotation.set(0, 0, 0);
  }
}
