import * as THREE from 'three/webgpu';
import { BoneMapping } from './BoneMapping';
import { CharacterRigMapping, LimbPhysicsConfig, ProceduralLimbKey } from './PhysicsTypes';

interface LimbSimulationState {
  currentAngle: THREE.Vector3;       // (pitch/x, yaw/y, roll/z) in radians
  angularVelocity: THREE.Vector3;
  targetAngle: THREE.Vector3;
  config: LimbPhysicsConfig;
}

/**
 * Procedural spring-damper secondary motion engine for character limbs and head.
 * Produces dynamic limb lag, inertial swing, counter-overshoot, and settling.
 */
export class SecondaryMotionController {
  private limbs = new Map<ProceduralLimbKey, LimbSimulationState>();

  // Base configurations tailored per anatomical group
  private static readonly LIMB_CONFIGS: Record<ProceduralLimbKey, LimbPhysicsConfig> = {
    armL: {
      stiffness: 140.0,
      damping: 14.0,
      mass: 0.5,
      inertia: 1.15,
      gravityInfluence: 1.2,
      velocityInfluence: 0.28,
      accelerationInfluence: 0.038,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    lowerArmL: {
      stiffness: 180.0,
      damping: 18.0,
      mass: 0.3,
      inertia: 0.9,
      gravityInfluence: 1.0,
      velocityInfluence: 0.22,
      accelerationInfluence: 0.025,
      maxDisplacementAngle: THREE.MathUtils.degToRad(60),
    },
    armR: {
      stiffness: 140.0,
      damping: 14.0,
      mass: 0.5,
      inertia: 1.15,
      gravityInfluence: 1.2,
      velocityInfluence: 0.28,
      accelerationInfluence: 0.038,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    lowerArmR: {
      stiffness: 180.0,
      damping: 18.0,
      mass: 0.3,
      inertia: 0.9,
      gravityInfluence: 1.0,
      velocityInfluence: 0.22,
      accelerationInfluence: 0.025,
      maxDisplacementAngle: THREE.MathUtils.degToRad(60),
    },
    legL: {
      stiffness: 160.0,
      damping: 16.0,
      mass: 0.8,
      inertia: 1.3,
      gravityInfluence: 1.4,
      velocityInfluence: 0.25,
      accelerationInfluence: 0.042,
      maxDisplacementAngle: THREE.MathUtils.degToRad(55),
    },
    legR: {
      stiffness: 160.0,
      damping: 16.0,
      mass: 0.8,
      inertia: 1.3,
      gravityInfluence: 1.4,
      velocityInfluence: 0.25,
      accelerationInfluence: 0.042,
      maxDisplacementAngle: THREE.MathUtils.degToRad(55),
    },
    spine: {
      stiffness: 220.0,
      damping: 22.0,
      mass: 1.0,
      inertia: 0.8,
      gravityInfluence: 0.4,
      velocityInfluence: 0.12,
      accelerationInfluence: 0.018,
      maxDisplacementAngle: THREE.MathUtils.degToRad(22),
    },
    head: {
      stiffness: 260.0,
      damping: 26.0,
      mass: 0.4,
      inertia: 0.7,
      gravityInfluence: 0.3,
      velocityInfluence: 0.10,
      accelerationInfluence: 0.014,
      maxDisplacementAngle: THREE.MathUtils.degToRad(16),
    },
  };

  constructor() {
    this.initLimbs();
  }

  private initLimbs(): void {
    const keys: ProceduralLimbKey[] = [
      'spine', 'head',
      'armL', 'lowerArmL',
      'armR', 'lowerArmR',
      'legL', 'legR'
    ];

    for (const key of keys) {
      this.limbs.set(key, {
        currentAngle: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        targetAngle: new THREE.Vector3(0, 0, 0),
        config: { ...SecondaryMotionController.LIMB_CONFIGS[key] },
      });
    }
  }

  /**
   * Resets all limb physical angles and velocities to zero.
   */
  public reset(): void {
    for (const state of this.limbs.values()) {
      state.currentAngle.set(0, 0, 0);
      state.angularVelocity.set(0, 0, 0);
      state.targetAngle.set(0, 0, 0);
    }
  }

  /**
   * Simulates the secondary motion of all limbs for one frame.
   *
   * @param bodyLinearVelocity World-space velocity of the character body
   * @param bodyLinearAcceleration World-space acceleration of the character body
   * @param bodyOrientation Current rotation quaternion of the character body
   * @param isAirborne Whether the character is in the air or held
   * @param delta Time step in seconds
   */
  public update(
    bodyLinearVelocity: THREE.Vector3,
    bodyLinearAcceleration: THREE.Vector3,
    bodyOrientation: THREE.Quaternion,
    isAirborne: boolean,
    delta: number
  ): void {
    if (delta <= 0.0001) return;
    const clampedDelta = Math.min(delta, 0.05); // Prevent spiral of death on tab unfocus

    // Transform world velocity & acceleration into local character frame
    const invOrientation = bodyOrientation.clone().invert();
    const localVel = bodyLinearVelocity.clone().applyQuaternion(invOrientation);
    const localAccel = bodyLinearAcceleration.clone().applyQuaternion(invOrientation);

    // Compute gravity vector in local character space
    const worldGravity = new THREE.Vector3(0, -9.81, 0);
    const localGravity = worldGravity.applyQuaternion(invOrientation);

    for (const [key, state] of this.limbs.entries()) {
      const cfg = state.config;

      // Target angular displacement computed from inertia and gravity
      const targetDisplacement = new THREE.Vector3();

      // 1. Inertial response from acceleration: F_inertial = -a_local
      // Forward/backward accel causes pitch (X)
      targetDisplacement.x = -localAccel.z * cfg.accelerationInfluence;
      // Lateral accel causes roll (Z)
      targetDisplacement.z = localAccel.x * cfg.accelerationInfluence;
      // Turning / lateral shear causes slight yaw (Y)
      targetDisplacement.y = -localAccel.x * (cfg.accelerationInfluence * 0.4);

      // Vertical acceleration causes arms and legs to hang or tuck
      if (key.startsWith('arm') || key.startsWith('leg')) {
        // Upward accel -> limbs lag down (positive pitch in local coordinates)
        targetDisplacement.x += Math.max(-0.6, Math.min(1.2, localAccel.y * cfg.accelerationInfluence * 1.8));
      }

      // 2. Velocity aerodynamic drag influence
      targetDisplacement.x -= localVel.z * cfg.velocityInfluence * 0.08;
      targetDisplacement.z += localVel.x * cfg.velocityInfluence * 0.08;

      // 3. Gravity dangle when airborne or held
      if (isAirborne) {
        if (key.startsWith('leg')) {
          // Legs dangle naturally along gravity vector
          targetDisplacement.x += (localGravity.y < -5.0 ? 0.35 : 0.1) * cfg.gravityInfluence;
          targetDisplacement.z += localGravity.x * 0.05 * cfg.gravityInfluence;
        } else if (key.startsWith('arm')) {
          // Arms hang downward
          targetDisplacement.x += 0.25 * cfg.gravityInfluence;
          targetDisplacement.z += (key.includes('L') ? 0.15 : -0.15) * cfg.gravityInfluence;
        }
      }

      // Clamp target to max angular displacement
      const targetLen = targetDisplacement.length();
      if (targetLen > cfg.maxDisplacementAngle) {
        targetDisplacement.multiplyScalar(cfg.maxDisplacementAngle / targetLen);
      }
      state.targetAngle.copy(targetDisplacement);

      // 4. Spring-damper integration:
      // F_spring = -stiffness * (current - target)
      // F_damping = -damping * angularVelocity
      const dispX = state.currentAngle.x - state.targetAngle.x;
      const dispY = state.currentAngle.y - state.targetAngle.y;
      const dispZ = state.currentAngle.z - state.targetAngle.z;

      const torqueX = -cfg.stiffness * dispX - cfg.damping * state.angularVelocity.x;
      const torqueY = -cfg.stiffness * dispY - cfg.damping * state.angularVelocity.y;
      const torqueZ = -cfg.stiffness * dispZ - cfg.damping * state.angularVelocity.z;

      const invInertia = 1.0 / Math.max(0.01, cfg.mass * cfg.inertia);
      const accelX = torqueX * invInertia;
      const accelY = torqueY * invInertia;
      const accelZ = torqueZ * invInertia;

      // Semi-implicit Euler integration
      state.angularVelocity.x += accelX * clampedDelta;
      state.angularVelocity.y += accelY * clampedDelta;
      state.angularVelocity.z += accelZ * clampedDelta;

      state.currentAngle.x += state.angularVelocity.x * clampedDelta;
      state.currentAngle.y += state.angularVelocity.y * clampedDelta;
      state.currentAngle.z += state.angularVelocity.z * clampedDelta;

      // Final safety clamp on angle
      state.currentAngle.x = THREE.MathUtils.clamp(state.currentAngle.x, -cfg.maxDisplacementAngle, cfg.maxDisplacementAngle);
      state.currentAngle.y = THREE.MathUtils.clamp(state.currentAngle.y, -cfg.maxDisplacementAngle, cfg.maxDisplacementAngle);
      state.currentAngle.z = THREE.MathUtils.clamp(state.currentAngle.z, -cfg.maxDisplacementAngle, cfg.maxDisplacementAngle);
    }
  }

  /**
   * Applies the procedural secondary angles directly onto a cloned character skeleton.
   *
   * @param skeleton THREE.Skeleton of the character
   * @param mapping Bone mapping indices
   * @param weight Procedural blend factor [0.0 = base animation only, 1.0 = full procedural]
   */
  public applyToSkeleton(
    skeleton: THREE.Skeleton,
    mapping: CharacterRigMapping,
    weight: number = 1.0
  ): void {
    if (weight <= 0.001) return;
    const bones = skeleton.bones;
    const clampedWeight = Math.min(1.0, Math.max(0.0, weight));

    const tempEuler = new THREE.Euler();
    const tempQuat = new THREE.Quaternion();

    for (const [key, state] of this.limbs.entries()) {
      const boneIndex = BoneMapping.getBoneIndexForLimb(mapping, key);
      const bone = bones[boneIndex];
      if (!bone) continue;

      const angle = state.currentAngle;
      tempEuler.set(
        angle.x * clampedWeight,
        angle.y * clampedWeight,
        angle.z * clampedWeight,
        'YXZ'
      );
      tempQuat.setFromEuler(tempEuler);

      // Compose bone rotation with existing base animation quaternion
      bone.quaternion.multiply(tempQuat);
    }
  }

  /**
   * Injects a sudden angular impulse (used for ground impacts or grabs).
   */
  public injectImpulse(limbKey: ProceduralLimbKey, impulse: THREE.Vector3): void {
    const state = this.limbs.get(limbKey);
    if (state) {
      state.angularVelocity.add(impulse);
    }
  }

  /**
   * Injects an impact shockwave across all limbs.
   */
  public injectImpactShock(impactSpeed: number, normal: THREE.Vector3): void {
    const intensity = Math.min(25.0, impactSpeed * 3.5);
    const rnd = () => (Math.random() - 0.5) * intensity * 0.4;

    this.injectImpulse('head', new THREE.Vector3(intensity * 0.5, rnd(), rnd()));
    this.injectImpulse('spine', new THREE.Vector3(intensity * 0.4, rnd(), rnd()));
    this.injectImpulse('armL', new THREE.Vector3(intensity * 0.8, intensity * 0.6, rnd()));
    this.injectImpulse('armR', new THREE.Vector3(intensity * 0.8, -intensity * 0.6, rnd()));
    this.injectImpulse('legL', new THREE.Vector3(-intensity * 0.9, rnd(), intensity * 0.5));
    this.injectImpulse('legR', new THREE.Vector3(-intensity * 0.9, rnd(), -intensity * 0.5));
  }

  public getLimbAngle(key: ProceduralLimbKey): THREE.Vector3 {
    return this.limbs.get(key)?.currentAngle ?? new THREE.Vector3();
  }
}
