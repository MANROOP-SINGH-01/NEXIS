import * as THREE from 'three/webgpu';
import { BoneMapping } from './BoneMapping';
import { CharacterRigMapping, LimbPhysicsConfig, ProceduralLimbKey, BodyPartId } from './PhysicsTypes';

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
  private airborneTimer = 0;

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
      maxDisplacementAngle: THREE.MathUtils.degToRad(85),
    },
    lowerArmL: {
      stiffness: 180.0,
      damping: 18.0,
      mass: 0.3,
      inertia: 0.9,
      gravityInfluence: 1.0,
      velocityInfluence: 0.22,
      accelerationInfluence: 0.025,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    armR: {
      stiffness: 140.0,
      damping: 14.0,
      mass: 0.5,
      inertia: 1.15,
      gravityInfluence: 1.2,
      velocityInfluence: 0.28,
      accelerationInfluence: 0.038,
      maxDisplacementAngle: THREE.MathUtils.degToRad(85),
    },
    lowerArmR: {
      stiffness: 180.0,
      damping: 18.0,
      mass: 0.3,
      inertia: 0.9,
      gravityInfluence: 1.0,
      velocityInfluence: 0.22,
      accelerationInfluence: 0.025,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    legL: {
      stiffness: 160.0,
      damping: 16.0,
      mass: 0.8,
      inertia: 1.3,
      gravityInfluence: 1.4,
      velocityInfluence: 0.25,
      accelerationInfluence: 0.042,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    legR: {
      stiffness: 160.0,
      damping: 16.0,
      mass: 0.8,
      inertia: 1.3,
      gravityInfluence: 1.4,
      velocityInfluence: 0.25,
      accelerationInfluence: 0.042,
      maxDisplacementAngle: THREE.MathUtils.degToRad(75),
    },
    spine: {
      stiffness: 220.0,
      damping: 22.0,
      mass: 1.0,
      inertia: 0.8,
      gravityInfluence: 0.4,
      velocityInfluence: 0.12,
      accelerationInfluence: 0.018,
      maxDisplacementAngle: THREE.MathUtils.degToRad(35),
    },
    head: {
      stiffness: 260.0,
      damping: 26.0,
      mass: 0.4,
      inertia: 0.7,
      gravityInfluence: 0.3,
      velocityInfluence: 0.10,
      accelerationInfluence: 0.014,
      maxDisplacementAngle: THREE.MathUtils.degToRad(35),
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
    this.airborneTimer = 0;
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
   * @param grabbedBodyPart Optional specific body part being actively pulled/held
   * @param lookAtPoint Optional world coordinate target for head/eye tracking
   * @param characterWorldPos Optional character position in world space
   */
  public update(
    bodyLinearVelocity: THREE.Vector3,
    bodyLinearAcceleration: THREE.Vector3,
    bodyOrientation: THREE.Quaternion,
    isAirborne: boolean,
    delta: number,
    grabbedBodyPart?: BodyPartId | null,
    lookAtPoint?: THREE.Vector3 | null,
    characterWorldPos?: THREE.Vector3 | null
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

    // Update airborne timer for procedural falling animations
    if (isAirborne) {
      this.airborneTimer += clampedDelta;
    } else {
      this.airborneTimer = 0;
    }

    const t = this.airborneTimer;

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

      // 3. Body-Part-Specific Grab Physics Override
      if (grabbedBodyPart) {
        if (grabbedBodyPart === 'head') {
          // HEAD GRAB: Body hangs below head. Limbs dangle loosely.
          if (key === 'spine') {
            targetDisplacement.x += -0.15; // Spine stretches vertically
          } else if (key.startsWith('arm')) {
            targetDisplacement.x += 0.85; // Arms hang down
            targetDisplacement.z += Math.sin(t * 8.0) * 0.08;
          } else if (key.startsWith('leg')) {
            targetDisplacement.x += 0.45; // Legs hang loosely with small dangle
            targetDisplacement.z += Math.cos(t * 6.0) * 0.06;
          }
        } else if (grabbedBodyPart === 'handL' || grabbedBodyPart === 'lowerArmL' || grabbedBodyPart === 'armL') {
          // LEFT ARM GRAB: Left arm extends toward pull; right arm counters; torso twists
          if (key === 'armL') {
            targetDisplacement.x += 0.95;
            targetDisplacement.z += 0.65;
          } else if (key === 'lowerArmL') {
            targetDisplacement.x += 0.45;
          } else if (key === 'armR') {
            targetDisplacement.z -= 0.60; // Opposite arm flares out for balance
            targetDisplacement.x += 0.20;
          } else if (key === 'spine') {
            targetDisplacement.y -= 0.28; // Torso twists toward pulled arm
            targetDisplacement.z -= 0.15;
          }
        } else if (grabbedBodyPart === 'handR' || grabbedBodyPart === 'lowerArmR' || grabbedBodyPart === 'armR') {
          // RIGHT ARM GRAB: Right arm extends; left arm counters; torso twists
          if (key === 'armR') {
            targetDisplacement.x += 0.95;
            targetDisplacement.z -= 0.65;
          } else if (key === 'lowerArmR') {
            targetDisplacement.x += 0.45;
          } else if (key === 'armL') {
            targetDisplacement.z += 0.60; // Opposite arm flares out
            targetDisplacement.x += 0.20;
          } else if (key === 'spine') {
            targetDisplacement.y += 0.28; // Torso twists toward right
            targetDisplacement.z += 0.15;
          }
        } else if (grabbedBodyPart === 'footL' || grabbedBodyPart === 'calfL' || grabbedBodyPart === 'thighL') {
          // LEFT LEG GRAB: Held leg extends; free leg kicks; upper body inverts
          if (key === 'legL') {
            targetDisplacement.x -= 1.15; // Leg extends toward pull
          } else if (key === 'legR') {
            targetDisplacement.x += Math.sin(t * 14.0) * 0.65 + 0.35; // Free leg bicycle kicks
          } else if (key.startsWith('arm')) {
            targetDisplacement.x += 1.05; // Arms hang down toward floor
          } else if (key === 'spine') {
            targetDisplacement.x -= 0.35; // Torso inverted
          }
        } else if (grabbedBodyPart === 'footR' || grabbedBodyPart === 'calfR' || grabbedBodyPart === 'thighR') {
          // RIGHT LEG GRAB: Held leg extends; free leg kicks; upper body inverts
          if (key === 'legR') {
            targetDisplacement.x -= 1.15;
          } else if (key === 'legL') {
            targetDisplacement.x += Math.sin(t * 14.0) * 0.65 + 0.35;
          } else if (key.startsWith('arm')) {
            targetDisplacement.x += 1.05;
          } else if (key === 'spine') {
            targetDisplacement.x -= 0.35;
          }
        } else if (grabbedBodyPart === 'chest' || grabbedBodyPart === 'pelvis') {
          // CENTER OF MASS GRAB: Torso is primary region; limbs lag behind motion
          if (key.startsWith('arm') || key.startsWith('leg')) {
            targetDisplacement.x += Math.sin(t * 10.0) * 0.25;
          }
        }
      } else if (isAirborne) {
        const airSpeed = bodyLinearVelocity.length();
        const flailAmp = Math.min(1.0, 0.45 + airSpeed * 0.12);
        const flailFreq = 20.0;
        const kickFreq = 16.0;

        if (key === 'armL') {
          // Frantic cartoon windmilling arm
          targetDisplacement.x += (Math.sin(t * flailFreq) * 0.85 + 0.35) * flailAmp;
          targetDisplacement.z += (Math.cos(t * flailFreq) * 0.55 + 0.50) * flailAmp;
          targetDisplacement.y += Math.sin(t * flailFreq * 0.7) * 0.35 * flailAmp;
        } else if (key === 'lowerArmL') {
          // Cute rapid elbow flapping
          targetDisplacement.x += (Math.abs(Math.sin(t * flailFreq * 1.4)) * 0.75 + 0.30) * flailAmp;
          targetDisplacement.z += Math.sin(t * flailFreq) * 0.35 * flailAmp;
        } else if (key === 'armR') {
          // Counter-phase windmilling arm
          targetDisplacement.x += (Math.sin(t * flailFreq + Math.PI) * 0.85 + 0.35) * flailAmp;
          targetDisplacement.z += (-Math.cos(t * flailFreq + Math.PI) * 0.55 - 0.50) * flailAmp;
          targetDisplacement.y += -Math.sin(t * flailFreq * 0.7) * 0.35 * flailAmp;
        } else if (key === 'lowerArmR') {
          targetDisplacement.x += (Math.abs(Math.sin(t * flailFreq * 1.4 + Math.PI)) * 0.75 + 0.30) * flailAmp;
          targetDisplacement.z += -Math.sin(t * flailFreq) * 0.35 * flailAmp;
        } else if (key === 'legL') {
          // Running in the air bicycle kicks with cute wide splay
          targetDisplacement.x += Math.sin(t * kickFreq) * 0.75 * flailAmp;
          targetDisplacement.z += (0.32 + Math.cos(t * kickFreq * 0.5) * 0.15) * flailAmp;
        } else if (key === 'legR') {
          targetDisplacement.x += Math.sin(t * kickFreq + Math.PI) * 0.75 * flailAmp;
          targetDisplacement.z += (-0.32 - Math.cos(t * kickFreq * 0.5) * 0.15) * flailAmp;
        } else if (key === 'head') {
          // Bobblehead panic: tilted back in surprise with cute wobble
          targetDisplacement.x += (-0.35 + Math.sin(t * 15.0) * 0.22) * flailAmp;
          targetDisplacement.z += Math.cos(t * 13.0) * 0.25 * flailAmp;
        } else if (key === 'spine') {
          // Wobbly spine
          targetDisplacement.x += Math.sin(t * 12.0) * 0.16 * flailAmp;
          targetDisplacement.z += Math.cos(t * 10.0) * 0.16 * flailAmp;
        }
      } else {
        // Normal gravity influence when grounded or moving
        targetDisplacement.x += localGravity.z * (cfg.gravityInfluence * 0.015);
        targetDisplacement.z -= localGravity.x * (cfg.gravityInfluence * 0.015);

        // Organic idle micro-bobbing / sway when stationary so characters feel alive
        if (bodyLinearVelocity.lengthSq() < 0.04) {
          const timeSec = performance.now() * 0.0018;
          if (key === 'head') {
            targetDisplacement.x += Math.sin(timeSec * 2.0) * 0.025; // Gentle breathing nod
            targetDisplacement.z += Math.cos(timeSec * 1.4) * 0.02;  // Subtle head tilt
          } else if (key.startsWith('arm')) {
            targetDisplacement.x += Math.sin(timeSec * 1.6) * 0.025; // Gentle arm sway
          }
        }
      }

      // 4. Head Look-At Tracking (track cursor or grab point)
      if (key === 'head' && lookAtPoint && characterWorldPos) {
        const toTarget = lookAtPoint.clone().sub(characterWorldPos).applyQuaternion(invOrientation);
        if (toTarget.lengthSq() > 0.01) {
          toTarget.normalize();
          // Yaw (around Y) and Pitch (around X)
          const targetYaw = Math.atan2(toTarget.x, toTarget.z);
          const targetPitch = -Math.asin(Math.max(-1.0, Math.min(1.0, toTarget.y)));
          targetDisplacement.y += THREE.MathUtils.clamp(targetYaw * 0.55, -0.6, 0.6);
          targetDisplacement.x += THREE.MathUtils.clamp(targetPitch * 0.45, -0.5, 0.5);
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

  public getLimbRotation(key: ProceduralLimbKey): THREE.Vector3 {
    return this.getLimbAngle(key);
  }
}
