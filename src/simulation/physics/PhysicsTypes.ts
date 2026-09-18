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
 * Overall physics and interaction tuning configuration.
 */
export interface CharacterPhysicsSettings {
  // Body follow spring
  followStiffness: number;          // Spring constant k (e.g. 180)
  followDamping: number;            // Damping ratio c (e.g. 22, near critical)
  bodyMass: number;                 // Apparent mass (kg)
  maxFollowSpeed: number;           // Velocity clamp (m/s)

  // Airborne & Gravity
  gravity: number;                  // Gravity acceleration m/s^2 (-18.0)
  airDrag: number;                  // Linear air resistance (0.98)
  angularDrag: number;              // Rotational air resistance (0.92)

  // Torso tilt & lean
  maxTiltPitch: number;             // Max forward/back lean (radians)
  maxTiltRoll: number;              // Max sideways lean (radians)
  tiltResponsiveness: number;       // How fast torso responds to acceleration

  // Ground collision & impact
  floorY: number;                   // Floor elevation (0.0)
  minImpactVelocity: number;        // Threshold for triggering impact reaction (m/s)
  maxSquashCompression: number;     // Max vertical compression on hard landing
  bounceRestitution: number;        // Elasticity of landing (0.15 - 0.25)
  settleThresholdSpeed: number;     // Speed below which settling begins

  // Recovery
  recoveryDuration: number;         // Time in seconds to smoothly stand upright (0.6 - 1.0s)
  proceduralBlendSpeed: number;     // Blend transition speed between baked anim & physics
}

export const DEFAULT_PHYSICS_SETTINGS: CharacterPhysicsSettings = {
  followStiffness: 190.0,
  followDamping: 24.0,
  bodyMass: 1.0,
  maxFollowSpeed: 28.0,

  gravity: -19.6,
  airDrag: 0.982,
  angularDrag: 0.93,

  maxTiltPitch: THREE.MathUtils.degToRad(32),
  maxTiltRoll: THREE.MathUtils.degToRad(28),
  tiltResponsiveness: 0.22,

  floorY: 0.0,
  minImpactVelocity: 1.2,
  maxSquashCompression: 0.18,
  bounceRestitution: 0.20,
  settleThresholdSpeed: 0.12,

  recoveryDuration: 0.75,
  proceduralBlendSpeed: 8.0,
};
