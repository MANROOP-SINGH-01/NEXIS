import * as THREE from 'three/webgpu';
import { CharacterPhysicsSettings, DEFAULT_PHYSICS_SETTINGS } from './PhysicsTypes';

/**
 * Physical rigid-body & spring solver for the character's root transform.
 * Drives 3D position, linear velocity, acceleration, orientation quaternion,
 * and angular momentum with critically damped following, gravity, and tilt.
 */
export class CharacterPhysicsController {
  public position = new THREE.Vector3();
  public linearVelocity = new THREE.Vector3();
  public linearAcceleration = new THREE.Vector3();
  public orientation = new THREE.Quaternion();
  public angularVelocity = new THREE.Vector3(); // (pitch, yaw, roll) rad/s

  private settings: CharacterPhysicsSettings;
  private prevVelocity = new THREE.Vector3();
  private baseFacingYaw = 0; // Baseline facing direction in radians

  public isGrabbed = false;
  public isAirborne = false;

  constructor(settings: Partial<CharacterPhysicsSettings> = {}) {
    this.settings = { ...DEFAULT_PHYSICS_SETTINGS, ...settings };
  }

  /**
   * Resets the physics state to a specific position and facing.
   */
  public reset(pos: THREE.Vector3, facingQuaternion?: THREE.Quaternion): void {
    this.position.copy(pos);
    this.linearVelocity.set(0, 0, 0);
    this.linearAcceleration.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.prevVelocity.set(0, 0, 0);
    this.isGrabbed = false;
    this.isAirborne = false;

    if (facingQuaternion) {
      this.orientation.copy(facingQuaternion);
      const euler = new THREE.Euler().setFromQuaternion(facingQuaternion, 'YXZ');
      this.baseFacingYaw = euler.y;
    } else {
      this.orientation.identity();
      this.baseFacingYaw = 0;
    }
  }

  public setFacingYaw(yaw: number): void {
    this.baseFacingYaw = yaw;
  }

  /**
   * Updates physics for a grabbed character following a target position.
   */
  public updateGrabbed(targetPos: THREE.Vector3, delta: number): void {
    if (delta <= 0.0001) return;
    const dt = Math.min(delta, 0.05);

    // Spring force toward target: F = k * (target - pos) - c * vel
    const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    const springForce = toTarget.multiplyScalar(this.settings.followStiffness);
    const dampingForce = this.linearVelocity.clone().multiplyScalar(this.settings.followDamping);
    const totalForce = springForce.sub(dampingForce);

    // Acceleration a = F / m
    this.linearAcceleration.copy(totalForce).divideScalar(this.settings.bodyMass);

    // Semi-implicit Euler integration
    this.linearVelocity.addScaledVector(this.linearAcceleration, dt);

    // Speed clamp
    const speed = this.linearVelocity.length();
    if (speed > this.settings.maxFollowSpeed) {
      this.linearVelocity.multiplyScalar(this.settings.maxFollowSpeed / speed);
    }

    this.position.addScaledVector(this.linearVelocity, dt);

    // Floor clamp
    if (this.position.y < this.settings.floorY) {
      this.position.y = this.settings.floorY;
      if (this.linearVelocity.y < 0) this.linearVelocity.y = 0;
    }

    // Dynamic Torso Tilt from acceleration
    // Moving/accelerating right (+x) leans body to the left (-roll)
    // Moving/accelerating forward (+z) leans body backward (-pitch)
    const targetPitch = THREE.MathUtils.clamp(
      -this.linearAcceleration.z * 0.016,
      -this.settings.maxTiltPitch,
      this.settings.maxTiltPitch
    );
    const targetRoll = THREE.MathUtils.clamp(
      this.linearAcceleration.x * 0.016,
      -this.settings.maxTiltRoll,
      this.settings.maxTiltRoll
    );

    // Face movement direction if moving fast enough, otherwise keep facing yaw
    const horizSpeed = Math.hypot(this.linearVelocity.x, this.linearVelocity.z);
    if (horizSpeed > 0.4) {
      const moveYaw = Math.atan2(this.linearVelocity.x, this.linearVelocity.z);
      this.baseFacingYaw = THREE.MathUtils.lerp(this.baseFacingYaw, moveYaw, 0.1);
    }

    const targetEuler = new THREE.Euler(targetPitch, this.baseFacingYaw, targetRoll, 'YXZ');
    const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

    // Smooth tilt interpolation
    this.orientation.slerp(targetQuat, Math.min(1.0, 16.0 * dt));

    this.isAirborne = this.position.y > this.settings.floorY + 0.05;
  }

  /**
   * Updates physics during free-fall or ballistic motion after release.
   */
  public updateFreeFall(delta: number, onImpact?: (speed: number, pos: THREE.Vector3) => void): void {
    if (delta <= 0.0001) return;
    const dt = Math.min(delta, 0.05);

    // Gravity and air drag
    const gravityAccel = new THREE.Vector3(0, this.settings.gravity, 0);
    this.linearAcceleration.copy(gravityAccel);
    this.linearVelocity.addScaledVector(this.linearAcceleration, dt);
    this.linearVelocity.multiplyScalar(Math.pow(this.settings.airDrag, dt * 60));

    this.position.addScaledVector(this.linearVelocity, dt);

    // Angular momentum update
    this.angularVelocity.multiplyScalar(Math.pow(this.settings.angularDrag, dt * 60));

    // Mild upright restoration torque in air (keeps character relatively feet-first)
    const currentEuler = new THREE.Euler().setFromQuaternion(this.orientation, 'YXZ');
    const uprightTorqueX = -currentEuler.x * 6.0;
    const uprightTorqueZ = -currentEuler.z * 6.0;
    this.angularVelocity.x += uprightTorqueX * dt;
    this.angularVelocity.z += uprightTorqueZ * dt;

    const deltaEuler = new THREE.Euler(
      this.angularVelocity.x * dt,
      this.angularVelocity.y * dt,
      this.angularVelocity.z * dt,
      'YXZ'
    );
    const deltaQuat = new THREE.Quaternion().setFromEuler(deltaEuler);
    this.orientation.multiply(deltaQuat);

    // Ground / floor collision detection
    if (this.position.y <= this.settings.floorY) {
      const impactSpeed = Math.abs(this.linearVelocity.y);
      this.position.y = this.settings.floorY;

      if (impactSpeed >= this.settings.minImpactVelocity) {
        // Rebound with restitution
        this.linearVelocity.y = impactSpeed * this.settings.bounceRestitution;
        // Ground friction dampens lateral slide
        this.linearVelocity.x *= 0.55;
        this.linearVelocity.z *= 0.55;

        // Ground dampens tumble
        this.angularVelocity.multiplyScalar(0.4);

        if (onImpact) {
          onImpact(impactSpeed, this.position.clone());
        }
      } else {
        // Impact speed below threshold: settle to ground
        this.linearVelocity.y = 0;
        this.linearVelocity.x *= 0.4;
        this.linearVelocity.z *= 0.4;
        this.isAirborne = false;
      }
    } else {
      this.isAirborne = true;
    }
  }

  /**
   * Smoothly stabilizes the body upright on the floor.
   */
  public stabilizeUpright(delta: number, speedMultiplier: number = 8.0): void {
    const dt = Math.min(delta, 0.05);

    // Upright quaternion preserving facing yaw
    const uprightEuler = new THREE.Euler(0, this.baseFacingYaw, 0, 'YXZ');
    const uprightQuat = new THREE.Quaternion().setFromEuler(uprightEuler);

    this.orientation.slerp(uprightQuat, Math.min(1.0, speedMultiplier * dt));
    this.angularVelocity.multiplyScalar(0.2);
    this.linearVelocity.multiplyScalar(0.3);
  }
}
