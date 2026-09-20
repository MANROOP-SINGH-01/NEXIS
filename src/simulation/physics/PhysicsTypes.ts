import * as THREE from 'three/webgpu';

/**
 * Interaction and physics state machine states.
 */
export type PhysicalState =
  | 'IDLE'
  | 'HOVER'
  | 'GRABBED'
  | 'HELD'
  | 'MOVING'
  | 'RELEASED'
  | 'AIRBORNE'
  | 'IMPACT'
  | 'SETTLING'
  | 'RECOVERING';

/**
 * Procedural limb identifiers.
 */
export type ProceduralLimbKey =
  | 'spine'
  | 'head'
  | 'armL'
  | 'lowerArmL'
  | 'armR'
  | 'lowerArmR'
  | 'legL'
  | 'legR';

/**
 * Verified canonical bone mapping indices for the character rig.
 */
export interface CharacterRigMapping {
  root: number;
  hips: number;
  spine: number;
  head: number;
  armL: number;
  lowerArmL: number;
  armR: number;
  lowerArmR: number;
  legL: number;
  legR: number;
}

/**
 * Physical properties for an individual secondary motion bone/limb.
 */
export interface LimbPhysicsConfig {
  stiffness: number;               // Spring restoration strength (e.g. 120 - 240)
  damping: number;                 // Velocity damping (e.g. 10 - 22)
  mass: number;                    // Apparent mass
  inertia: number;                 // Inertial lag multiplier
  gravityInfluence: number;        // Gravitational hang strength
  velocityInfluence: number;       // Linear velocity lag influence
  accelerationInfluence: number;   // Linear acceleration lag influence
  maxDisplacementAngle: number;    // Clamped angle in radians
}

/**
 * Individual anatomical body regions that can be independently targeted,
 * grabbed, pulled, and physically simulated.
 */
export type BodyPartId =
  | 'head'
  | 'chest'
  | 'pelvis'
  | 'armL'
  | 'lowerArmL'
  | 'handL'
  | 'armR'
  | 'lowerArmR'
  | 'handR'
  | 'thighL'
  | 'calfL'
  | 'footL'
  | 'thighR'
  | 'calfR'
  | 'footR';

/**
 * Procedural landing and recovery outcomes evaluated dynamically from physics trajectories.
 */
export type FallOutcomeType =
  | 'LAND_STANDING'
  | 'LAND_STUMBLE'
  | 'LAND_ROLL'
  | 'LAND_BACK'
  | 'LAND_FRONT'
  | 'FULL_RAGDOLL';

/**
 * Result of analytical ray-collider intersection against a specific character body part.
 */
export interface BodyPartHitResult {
  agentId: number;
  bodyPart: BodyPartId;
  boneIndex: number;
  hitPoint: THREE.Vector3;
  hitNormal: THREE.Vector3;
  localPoint: THREE.Vector3;
  worldPoint: THREE.Vector3;
  distance: number;
}

/**
 * State of a grabbed character.
 */
export interface GrabInfo {
  characterIndex: number;
  bodyPart: BodyPartId;
  grabPointWorld: THREE.Vector3;
  grabOffsetLocal: THREE.Vector3;
  targetPointWorld: THREE.Vector3;
  grabPlane: THREE.Plane;
  grabDistance: number;
  grabbedBoneIndex: number;
  timeGrabbed: number;
  constraintStiffness: number;
  stiffness?: number;
  damping: number;
}

/**
 * Ground/surface impact state.
 */
export interface ImpactInfo {
  impactVelocity: THREE.Vector3;
  impactMagnitude: number;
  compressionAmount: number;
  restitution: number;
  wobbleIntensity: number;
  timeSinceImpact: number;
  outcomeType?: FallOutcomeType;
}

/**
 * Strict bounding box constraints for the 3D office model interior.
 * Keeps agents strictly contained within visible walls and floor.
 */
export const OFFICE_BOUNDS = {
  minX: -5.20,
  maxX: 5.20,
  minZ: -5.20,
  maxZ: 5.20,
  floorY: 0.0,
  ceilY: 3.50,
  maxHeldY: 2.90,
};

/**
 * Overall physics and interaction tuning configuration.
 */
export interface CharacterPhysicsSettings {
  // Office model boundaries
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
  ceilY: number;
  maxHeldY?: number;

  // Body follow spring (Clumsy Ninja playful lag & overshoot)
  followStiffness: number;          // Spring constant k (e.g. 160)
  followDamping: number;            // Damping ratio c (e.g. 20)
  bodyMass: number;                 // Apparent mass (kg)
  maxFollowSpeed: number;           // Velocity clamp (m/s)

  // Airborne & Gravity
  gravity: number;                  // Gravity acceleration m/s^2 (-12.0 for floaty comical air time)
  airDrag: number;                  // Linear air resistance (0.96)
  angularDrag: number;              // Rotational air resistance (0.88)

  // Torso tilt & lean (dynamic pendulum swing)
  maxTiltPitch: number;             // Max forward/back lean (radians)
  maxTiltRoll: number;              // Max sideways lean (radians)
  tiltResponsiveness: number;       // How fast torso responds to acceleration

  // Ground collision & impact
  minImpactVelocity: number;        // Threshold for triggering impact reaction (m/s)
  maxSquashCompression: number;     // Max vertical compression on hard landing
  bounceRestitution: number;        // Elasticity of landing (0.32)
  settleThresholdSpeed: number;     // Speed below which settling begins

  // Recovery
  recoveryDuration: number;         // Time in seconds to smoothly stand upright
  proceduralBlendSpeed: number;     // Blend transition speed between baked anim & physics
}

export const DEFAULT_PHYSICS_SETTINGS: CharacterPhysicsSettings = {
  minX: OFFICE_BOUNDS.minX,
  maxX: OFFICE_BOUNDS.maxX,
  minZ: OFFICE_BOUNDS.minZ,
  maxZ: OFFICE_BOUNDS.maxZ,
  floorY: OFFICE_BOUNDS.floorY,
  ceilY: OFFICE_BOUNDS.ceilY,
  maxHeldY: OFFICE_BOUNDS.maxHeldY,

  followStiffness: 300.0,
  followDamping: 26.0,
  bodyMass: 1.0,
  maxFollowSpeed: 45.0,

  gravity: -12.0,
  airDrag: 0.96,
  angularDrag: 0.88,

  maxTiltPitch: THREE.MathUtils.degToRad(35),
  maxTiltRoll: THREE.MathUtils.degToRad(32),
  tiltResponsiveness: 0.25,

  minImpactVelocity: 0.6,
  maxSquashCompression: 0.22,
  bounceRestitution: 0.32,
  settleThresholdSpeed: 0.12,

  recoveryDuration: 0.85,
  proceduralBlendSpeed: 9.0,
};

