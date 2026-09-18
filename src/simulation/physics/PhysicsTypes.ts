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
 * State of a grabbed character.
 */
export interface GrabInfo {
  characterIndex: number;
  grabPointWorld: THREE.Vector3;
  grabOffsetLocal: THREE.Vector3;
  targetPointWorld: THREE.Vector3;
  grabPlane: THREE.Plane;
  grabDistance: number;
  grabbedBoneIndex: number;
  timeGrabbed: number;
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
}

/**
 * Strict bounding box constraints for the 3D office model interior.
 * Keeps agents strictly contained within visible walls and floor.
 */
export const OFFICE_BOUNDS = {
  minX: -4.20,
  maxX: 4.20,
  minZ: -4.20,
  maxZ: 4.20,
  floorY: 0.0,
  ceilY: 5.5,
  maxHeldY: 1.80,
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
  followStiffness: number;          // Spring constant k (e.g. 140)
  followDamping: number;            // Damping ratio c (e.g. 18)
  bodyMass: number;                 // Apparent mass (kg)
  maxFollowSpeed: number;           // Velocity clamp (m/s)

  // Airborne & Gravity
  gravity: number;                  // Gravity acceleration m/s^2 (-19.6)
  airDrag: number;                  // Linear air resistance (0.982)
  angularDrag: number;              // Rotational air resistance (0.93)

  // Torso tilt & lean (dynamic pendulum swing)
  maxTiltPitch: number;             // Max forward/back lean (radians)
  maxTiltRoll: number;              // Max sideways lean (radians)
  tiltResponsiveness: number;       // How fast torso responds to acceleration

  // Ground collision & impact
  minImpactVelocity: number;        // Threshold for triggering impact reaction (m/s)
  maxSquashCompression: number;     // Max vertical compression on hard landing
  bounceRestitution: number;        // Elasticity of landing (0.15 - 0.25)
  settleThresholdSpeed: number;     // Speed below which settling begins

  // Recovery
  recoveryDuration: number;         // Time in seconds to smoothly stand upright (0.6 - 1.0s)
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

  followStiffness: 140.0,
  followDamping: 18.0,
  bodyMass: 1.0,
  maxFollowSpeed: 20.0,

  gravity: -19.6,
  airDrag: 0.982,
  angularDrag: 0.93,

  maxTiltPitch: THREE.MathUtils.degToRad(38),
  maxTiltRoll: THREE.MathUtils.degToRad(34),
  tiltResponsiveness: 0.26,

  minImpactVelocity: 1.0,
  maxSquashCompression: 0.20,
  bounceRestitution: 0.22,
  settleThresholdSpeed: 0.12,

  recoveryDuration: 0.85,
  proceduralBlendSpeed: 8.0,
};

