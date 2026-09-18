import * as THREE from 'three/webgpu';
import { BoneMapping } from './BoneMapping';
import { CharacterPhysicsController } from './CharacterPhysicsController';
import { GrabController } from './GrabController';
import { ImpactController } from './ImpactController';
import {
  CharacterPhysicsSettings,
  CharacterRigMapping,
  DEFAULT_PHYSICS_SETTINGS,
  PhysicalState,
} from './PhysicsTypes';
import { RecoveryController } from './RecoveryController';
import { SecondaryMotionController } from './SecondaryMotionController';

/**
 * Unified controller coordinating all physics sub-systems for a single 3D character instance:
 *  - Grab & 3D pointer following with local offset preservation
 *  - Procedural secondary limb & head inertia
 *  - Airborne ballistics, gravity, and angular momentum
 *  - Dynamic ground impact compression & wobble shockwave
 *  - Graceful balance recovery back to idle AI behavior
 */
export class PhysicalInteractionController {
  public state: PhysicalState = 'IDLE';

  public readonly physics: CharacterPhysicsController;
  public readonly grab: GrabController;
  public readonly secondaryMotion: SecondaryMotionController;
  public readonly impact: ImpactController;
  public readonly recovery: RecoveryController;

  // Local cloned skeleton for this specific character instance
  public skeleton: THREE.Skeleton;
  public rigMapping: CharacterRigMapping;

  // Output skinning matrices (10 bones * 16 floats = 160 floats)
  public proceduralBoneMatrices = new Float32Array(10 * 16);
  public proceduralWeight = 0.0; // [0.0 = base animation only, 1.0 = full procedural physics]

  // Callback to inform external systems (e.g. SceneManager/UI) of state transitions
  public onStateChange?: (state: PhysicalState) => void;

  constructor(
    public readonly characterIndex: number,
    baseSkeleton: THREE.Skeleton,
    camera: THREE.PerspectiveCamera,
    settings: Partial<CharacterPhysicsSettings> = {}
  ) {
    this.skeleton = baseSkeleton.clone();
    this.rigMapping = BoneMapping.mapSkeleton(this.skeleton);

    this.physics = new CharacterPhysicsController(settings);
    this.grab = new GrabController(camera);
    this.secondaryMotion = new SecondaryMotionController();
    this.impact = new ImpactController();
    this.recovery = new RecoveryController(settings.recoveryDuration ?? DEFAULT_PHYSICS_SETTINGS.recoveryDuration);
  }

  public setState(newState: PhysicalState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange?.(newState);
  }

  /**
   * Resets this character's physical state to a world position.
   */
  public resetTo(position: THREE.Vector3, orientation?: THREE.Quaternion): void {
    this.physics.reset(position, orientation);
    this.secondaryMotion.reset();
    this.impact.reset();
    this.recovery.reset();
    this.proceduralWeight = 0.0;
    this.setState('IDLE');
  }

  /**
   * Starts grabbing this character at a 3D pointer location.
   */
  public startGrab(
    pointerNDC: THREE.Vector2,
    hitPointWorld?: THREE.Vector3,
    boneIndex: number = -1
  ): void {
    this.recovery.interrupt();
    this.impact.reset();

    this.grab.startGrab(
      this.characterIndex,
      this.physics.position,
      this.physics.orientation,
      pointerNDC,
      hitPointWorld,
      boneIndex
    );

    this.physics.isGrabbed = true;
    this.proceduralWeight = 1.0;
    this.setState('GRABBED');
  }

  /**
   * Updates pointer motion while grabbed.
   */
  public updatePointerMove(pointerNDC: THREE.Vector2, delta: number): void {
    if (!this.grab.isGrabbed()) return;

    const targetPos = this.grab.updateGrabTarget(
      pointerNDC,
      this.physics.orientation,
      delta,
      DEFAULT_PHYSICS_SETTINGS.floorY
    );

    if (targetPos) {
      this.physics.updateGrabbed(targetPos, delta);

      const speed = this.physics.linearVelocity.length();
      if (speed > 0.1) {
        this.setState('MOVING');
      } else {
        this.setState('HELD');
      }
    }
  }

  /**
   * Releases this character, transferring momentum to free-fall ballistics.
   */
  public release(): void {
    if (!this.grab.isGrabbed()) return;

    const releaseData = this.grab.releaseGrab();
    this.physics.isGrabbed = false;

    if (releaseData) {
      // Transfer smoothed pointer velocity into rigid body
      this.physics.linearVelocity.copy(releaseData.releaseVelocity);

      // Inject angular momentum proportional to lateral fling
      this.physics.angularVelocity.set(
        -releaseData.releaseVelocity.z * 0.4,
        releaseData.releaseVelocity.x * 0.3,
        releaseData.releaseVelocity.x * 0.4
      );
    }

    if (this.physics.position.y > DEFAULT_PHYSICS_SETTINGS.floorY + 0.05 || this.physics.linearVelocity.y > 0.5) {
      this.setState('AIRBORNE');
    } else {
      this.beginSettling();
    }
  }

  private beginSettling(): void {
    this.setState('SETTLING');
    this.recovery.startRecovery();
  }

  /**
   * Main per-frame physics & procedural animation update.
   *
   * @param delta Delta time in seconds
   * @param baseAnimBones Optional baseline bone matrices from current AnimationMixer clip
   */
  public update(delta: number, baseAnimBones?: THREE.Bone[]): void {
    const dt = Math.min(delta, 0.05);

    switch (this.state) {
      case 'GRABBED':
      case 'HELD':
      case 'MOVING': {
        this.proceduralWeight = Math.min(1.0, this.proceduralWeight + dt * 10.0);
        // Secondary motion driven by grab velocity and acceleration
        this.secondaryMotion.update(
          this.physics.linearVelocity,
          this.physics.linearAcceleration,
          this.physics.orientation,
          this.physics.isAirborne,
          dt
        );
        break;
      }

      case 'AIRBORNE':
      case 'RELEASED': {
        this.proceduralWeight = 1.0;
        // Free-fall simulation with gravity, air drag, and ground impact check
        this.physics.updateFreeFall(dt, (impactSpeed, pos) => {
          this.handleGroundImpact(impactSpeed, pos);
        });

        // Secondary motion driven by falling speed and air drag
        this.secondaryMotion.update(
          this.physics.linearVelocity,
          this.physics.linearAcceleration,
          this.physics.orientation,
          true,
          dt
        );
        break;
      }

      case 'IMPACT': {
        this.impact.update(dt);
        // Apply compression offset into character Y
        this.physics.position.y = DEFAULT_PHYSICS_SETTINGS.floorY + this.impact.getCompressionOffset();

        this.secondaryMotion.update(
          this.physics.linearVelocity,
          this.physics.linearAcceleration,
          this.physics.orientation,
          false,
          dt
        );

        if (!this.impact.hasActiveImpact()) {
          this.setState('SETTLING');
          this.recovery.startRecovery();
        }
        break;
      }

      case 'SETTLING':
      case 'RECOVERING': {
        this.setState('RECOVERING');
        this.physics.stabilizeUpright(dt);

        const isFinished = this.recovery.update(dt);
        this.proceduralWeight = this.recovery.getBlendWeight();

        this.secondaryMotion.update(
          this.physics.linearVelocity,
          this.physics.linearAcceleration,
          this.physics.orientation,
          false,
          dt
        );

        if (isFinished) {
          this.proceduralWeight = 0.0;
          this.setState('IDLE');
        }
        break;
      }

      case 'IDLE':
      case 'HOVER': {
        this.proceduralWeight = 0.0;
        break;
      }
    }

    // Evaluate procedural skinning matrices if proceduralWeight > 0
    if (this.proceduralWeight > 0.001) {
      this.evaluateProceduralSkeleton(baseAnimBones);
    }
  }

  private handleGroundImpact(speed: number, pos: THREE.Vector3): void {
    this.setState('IMPACT');
    this.impact.triggerImpact(this.physics.linearVelocity);
    this.secondaryMotion.injectImpactShock(speed, new THREE.Vector3(0, 1, 0));
  }

  /**
   * Applies secondary motion rotations onto the local skeleton and extracts boneMatrices.
   */
  private evaluateProceduralSkeleton(baseAnimBones?: THREE.Bone[]): void {
    // 1. Copy base animation pose to local skeleton if available
    if (baseAnimBones && baseAnimBones.length >= this.skeleton.bones.length) {
      for (let i = 0; i < this.skeleton.bones.length; i++) {
        this.skeleton.bones[i].position.copy(baseAnimBones[i].position);
        this.skeleton.bones[i].quaternion.copy(baseAnimBones[i].quaternion);
        this.skeleton.bones[i].scale.copy(baseAnimBones[i].scale);
      }
    }

    // 2. Apply procedural secondary limb rotations
    this.secondaryMotion.applyToSkeleton(this.skeleton, this.rigMapping, this.proceduralWeight);

    // 3. Apply impact squash scale to root/hips
    const squash = this.impact.getSquashScale();
    if (Math.abs(squash - 1.0) > 0.001) {
      const hipsBone = this.skeleton.bones[this.rigMapping.hips];
      if (hipsBone) {
        hipsBone.scale.set(1.0 / Math.sqrt(squash), squash, 1.0 / Math.sqrt(squash));
      }
    }

    // 4. Update skeleton world matrices
    const rootBone = this.skeleton.bones[this.rigMapping.root];
    if (rootBone) {
      rootBone.updateMatrixWorld(true);
    }
    this.skeleton.update();

    // 5. Copy boneMatrices into output buffer
    this.proceduralBoneMatrices.set(this.skeleton.boneMatrices);
  }
}
