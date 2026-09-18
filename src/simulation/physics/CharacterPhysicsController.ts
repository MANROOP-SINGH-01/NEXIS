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

    // Office boundary clamp: enforce that character remains inside the office model
    if (this.position.x <= this.settings.minX) {
      this.position.x = this.settings.minX;
      if (this.linearVelocity.x < 0) this.linearVelocity.x = 0;
    } else if (this.position.x >= this.settings.maxX) {
      this.position.x = this.settings.maxX;
      if (this.linearVelocity.x > 0) this.linearVelocity.x = 0;
    }

    if (this.position.z <= this.settings.minZ) {
      this.position.z = this.settings.minZ;
      if (this.linearVelocity.z < 0) this.linearVelocity.z = 0;
    } else if (this.position.z >= this.settings.maxZ) {
      this.position.z = this.settings.maxZ;
      if (this.linearVelocity.z > 0) this.linearVelocity.z = 0;
    }

    if (this.position.y < this.settings.floorY) {
      this.position.y = this.settings.floorY;
      if (this.linearVelocity.y < 0) this.linearVelocity.y = 0;
    } else if (this.position.y > this.settings.ceilY) {
      this.position.y = this.settings.ceilY;
      if (this.linearVelocity.y > 0) this.linearVelocity.y = 0;
    }

    // Dynamic Clumsy Ninja Torso Tilt & Pendulum Swing from velocity & acceleration
    // Moving/accelerating right (+x) leans body to the left (-roll)
    // Moving/accelerating forward (+z) leans body backward (-pitch)
    const targetPitch = THREE.MathUtils.clamp(
      (-this.linearVelocity.z * 0.05 - this.linearAcceleration.z * 0.016),
      -this.settings.maxTiltPitch,
      this.settings.maxTiltPitch
    );
    const targetRoll = THREE.MathUtils.clamp(
      (this.linearVelocity.x * 0.05 + this.linearAcceleration.x * 0.016),
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

    // Wall-Aware Tilt Damping:
    // If dynamic tilt would project the head or accessories outside the diorama border,
    // smoothly blend targetQuat towards upright orientation preserving baseFacingYaw.
    const uprightQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.baseFacingYaw);
    const headOffset = new THREE.Vector3(0, 1.25, 0).applyQuaternion(targetQuat);
    let slerpWeight = 0;
    const SAFE_LIMIT = 4.65;

    if (this.position.x + headOffset.x > SAFE_LIMIT && headOffset.x > 0.001) {
      slerpWeight = Math.max(slerpWeight, (this.position.x + headOffset.x - SAFE_LIMIT) / headOffset.x);
    }
    if (this.position.x + headOffset.x < -SAFE_LIMIT && headOffset.x < -0.001) {
      slerpWeight = Math.max(slerpWeight, (-SAFE_LIMIT - (this.position.x + headOffset.x)) / -headOffset.x);
    }
    if (this.position.z + headOffset.z > SAFE_LIMIT && headOffset.z > 0.001) {
      slerpWeight = Math.max(slerpWeight, (this.position.z + headOffset.z - SAFE_LIMIT) / headOffset.z);
    }
    if (this.position.z + headOffset.z < -SAFE_LIMIT && headOffset.z < -0.001) {
      slerpWeight = Math.max(slerpWeight, (-SAFE_LIMIT - (this.position.z + headOffset.z)) / -headOffset.z);
    }

    if (slerpWeight > 0) {
      targetQuat.slerp(uprightQuat, Math.min(1.0, slerpWeight));
    }

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

    // Office Wall Bounds Collision with energetic Clumsy Ninja elastic rebound
    if (this.position.x <= this.settings.minX) {
      this.position.x = this.settings.minX;
      this.linearVelocity.x = Math.abs(this.linearVelocity.x) * 0.45;
      this.angularVelocity.z = Math.min(this.angularVelocity.z, 0);
    } else if (this.position.x >= this.settings.maxX) {
      this.position.x = this.settings.maxX;
      this.linearVelocity.x = -Math.abs(this.linearVelocity.x) * 0.45;
      this.angularVelocity.z = Math.max(this.angularVelocity.z, 0);
    }

    if (this.position.z <= this.settings.minZ) {
      this.position.z = this.settings.minZ;
      this.linearVelocity.z = Math.abs(this.linearVelocity.z) * 0.45;
      this.angularVelocity.x = Math.max(this.angularVelocity.x, 0);
    } else if (this.position.z >= this.settings.maxZ) {
      this.position.z = this.settings.maxZ;
      this.linearVelocity.z = -Math.abs(this.linearVelocity.z) * 0.45;
      this.angularVelocity.x = Math.min(this.angularVelocity.x, 0);
    }

    if (this.position.y >= this.settings.ceilY) {
      this.position.y = this.settings.ceilY;
      this.linearVelocity.y = -Math.abs(this.linearVelocity.y) * 0.35;
    }

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

    // Containment guard during free-fall / bounce tumble
    const currentHeadOffset = new THREE.Vector3(0, 1.25, 0).applyQuaternion(this.orientation);
    let fallSlerp = 0;
    const SAFE_LIMIT = 4.65;
    if (this.position.x + currentHeadOffset.x > SAFE_LIMIT && currentHeadOffset.x > 0.001) {
      fallSlerp = Math.max(fallSlerp, (this.position.x + currentHeadOffset.x - SAFE_LIMIT) / currentHeadOffset.x);
    }
    if (this.position.x + currentHeadOffset.x < -SAFE_LIMIT && currentHeadOffset.x < -0.001) {
      fallSlerp = Math.max(fallSlerp, (-SAFE_LIMIT - (this.position.x + currentHeadOffset.x)) / -currentHeadOffset.x);
    }
    if (this.position.z + currentHeadOffset.z > SAFE_LIMIT && currentHeadOffset.z > 0.001) {
      fallSlerp = Math.max(fallSlerp, (this.position.z + currentHeadOffset.z - SAFE_LIMIT) / currentHeadOffset.z);
    }
    if (this.position.z + currentHeadOffset.z < -SAFE_LIMIT && currentHeadOffset.z < -0.001) {
      fallSlerp = Math.max(fallSlerp, (-SAFE_LIMIT - (this.position.z + currentHeadOffset.z)) / -currentHeadOffset.z);
    }
    if (fallSlerp > 0) {
      const freeUpright = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentEuler.y);
      this.orientation.slerp(freeUpright, Math.min(1.0, fallSlerp * 0.6));
      this.angularVelocity.multiplyScalar(0.7);
    }

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
