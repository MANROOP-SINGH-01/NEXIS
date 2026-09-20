import * as THREE from 'three/webgpu';
import { BodyPartHitResult, BodyPartId, CharacterRigMapping } from './PhysicsTypes';

/**
 * Hanging and physical reaction mode per anatomical region.
 */
export type LimbHangMode =
  | 'HEAD_HANG'       // Body hangs beneath head; spine stretches; limbs dangle
  | 'ARM_PULL'        // Arm stretches toward cursor; shoulder carries load; torso twists
  | 'FOREARM_PULL'    // Elbow flexes; forearm carries grab; torso compensates
  | 'HAND_PULL'       // Hand extends; high rotational leverage; opposite arm counter-balances
  | 'LEG_INVERT'      // Inverted pendulum; held leg pulled; free leg kicks; torso hangs
  | 'FOOT_PULL'       // Maximum inverted leverage; foot leads; body swings beneath
  | 'CENTER_OF_MASS'; // Torso / Pelvis: highly stable center of mass tracking

export interface BodyPartProfile {
  id: BodyPartId;
  label: string;
  boneKey: keyof CharacterRigMapping;
  // Local capsule segment endpoints (relative to character center at origin, standing)
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  // Physical properties
  mass: number;
  stiffness: number;
  damping: number;
  leverageMultiplier: number;
  hangMode: LimbHangMode;
}

/**
 * Complete registry of all 15 interactive body parts with exact physical properties
 * matching the character proportions (height ~ 1.05m).
 */
export const BODY_PARTS_CONFIG: Record<BodyPartId, BodyPartProfile> = {
  head: {
    id: 'head',
    label: 'Head',
    boneKey: 'head',
    start: new THREE.Vector3(0, 0.72, 0),
    end: new THREE.Vector3(0, 0.98, 0),
    radius: 0.20,
    mass: 0.15,
    stiffness: 160.0,
    damping: 18.0,
    leverageMultiplier: 0.6,
    hangMode: 'HEAD_HANG',
  },
  chest: {
    id: 'chest',
    label: 'Chest',
    boneKey: 'spine',
    start: new THREE.Vector3(0, 0.44, 0),
    end: new THREE.Vector3(0, 0.70, 0),
    radius: 0.18,
    mass: 0.35,
    stiffness: 260.0,
    damping: 24.0,
    leverageMultiplier: 0.4,
    hangMode: 'CENTER_OF_MASS',
  },
  pelvis: {
    id: 'pelvis',
    label: 'Pelvis',
    boneKey: 'hips',
    start: new THREE.Vector3(0, 0.22, 0),
    end: new THREE.Vector3(0, 0.42, 0),
    radius: 0.17,
    mass: 0.30,
    stiffness: 280.0,
    damping: 26.0,
    leverageMultiplier: 0.3,
    hangMode: 'CENTER_OF_MASS',
  },
  armL: {
    id: 'armL',
    label: 'Left Arm',
    boneKey: 'armL',
    start: new THREE.Vector3(0.14, 0.60, 0),
    end: new THREE.Vector3(0.26, 0.48, 0),
    radius: 0.08,
    mass: 0.07,
    stiffness: 180.0,
    damping: 16.0,
    leverageMultiplier: 0.9,
    hangMode: 'ARM_PULL',
  },
  lowerArmL: {
    id: 'lowerArmL',
    label: 'Left Forearm',
    boneKey: 'lowerArmL',
    start: new THREE.Vector3(0.26, 0.48, 0),
    end: new THREE.Vector3(0.33, 0.36, 0),
    radius: 0.07,
    mass: 0.05,
    stiffness: 150.0,
    damping: 14.0,
    leverageMultiplier: 1.2,
    hangMode: 'FOREARM_PULL',
  },
  handL: {
    id: 'handL',
    label: 'Left Hand',
    boneKey: 'lowerArmL',
    start: new THREE.Vector3(0.33, 0.36, 0),
    end: new THREE.Vector3(0.38, 0.28, 0),
    radius: 0.07,
    mass: 0.03,
    stiffness: 120.0,
    damping: 11.0,
    leverageMultiplier: 1.6,
    hangMode: 'HAND_PULL',
  },
  armR: {
    id: 'armR',
    label: 'Right Arm',
    boneKey: 'armR',
    start: new THREE.Vector3(-0.14, 0.60, 0),
    end: new THREE.Vector3(-0.26, 0.48, 0),
    radius: 0.08,
    mass: 0.07,
    stiffness: 180.0,
    damping: 16.0,
    leverageMultiplier: 0.9,
    hangMode: 'ARM_PULL',
  },
  lowerArmR: {
    id: 'lowerArmR',
    label: 'Right Forearm',
    boneKey: 'lowerArmR',
    start: new THREE.Vector3(-0.26, 0.48, 0),
    end: new THREE.Vector3(-0.33, 0.36, 0),
    radius: 0.07,
    mass: 0.05,
    stiffness: 150.0,
    damping: 14.0,
    leverageMultiplier: 1.2,
    hangMode: 'FOREARM_PULL',
  },
  handR: {
    id: 'handR',
    label: 'Right Hand',
    boneKey: 'lowerArmR',
    start: new THREE.Vector3(-0.33, 0.36, 0),
    end: new THREE.Vector3(-0.38, 0.28, 0),
    radius: 0.07,
    mass: 0.03,
    stiffness: 120.0,
    damping: 11.0,
    leverageMultiplier: 1.6,
    hangMode: 'HAND_PULL',
  },
  thighL: {
    id: 'thighL',
    label: 'Left Thigh',
    boneKey: 'legL',
    start: new THREE.Vector3(0.11, 0.30, 0),
    end: new THREE.Vector3(0.11, 0.16, 0),
    radius: 0.09,
    mass: 0.12,
    stiffness: 200.0,
    damping: 20.0,
    leverageMultiplier: 0.8,
    hangMode: 'LEG_INVERT',
  },
  calfL: {
    id: 'calfL',
    label: 'Left Calf',
    boneKey: 'legL',
    start: new THREE.Vector3(0.11, 0.16, 0),
    end: new THREE.Vector3(0.11, 0.06, 0),
    radius: 0.08,
    mass: 0.08,
    stiffness: 160.0,
    damping: 16.0,
    leverageMultiplier: 1.2,
    hangMode: 'LEG_INVERT',
  },
  footL: {
    id: 'footL',
    label: 'Left Foot',
    boneKey: 'legL',
    start: new THREE.Vector3(0.11, 0.06, -0.02),
    end: new THREE.Vector3(0.11, 0.01, 0.08),
    radius: 0.07,
    mass: 0.04,
    stiffness: 125.0,
    damping: 12.0,
    leverageMultiplier: 1.7,
    hangMode: 'FOOT_PULL',
  },
  thighR: {
    id: 'thighR',
    label: 'Right Thigh',
    boneKey: 'legR',
    start: new THREE.Vector3(-0.11, 0.30, 0),
    end: new THREE.Vector3(-0.11, 0.16, 0),
    radius: 0.09,
    mass: 0.12,
    stiffness: 200.0,
    damping: 20.0,
    leverageMultiplier: 0.8,
    hangMode: 'LEG_INVERT',
  },
  calfR: {
    id: 'calfR',
    label: 'Right Calf',
    boneKey: 'legR',
    start: new THREE.Vector3(-0.11, 0.16, 0),
    end: new THREE.Vector3(-0.11, 0.06, 0),
    radius: 0.08,
    mass: 0.08,
    stiffness: 160.0,
    damping: 16.0,
    leverageMultiplier: 1.2,
    hangMode: 'LEG_INVERT',
  },
  footR: {
    id: 'footR',
    label: 'Right Foot',
    boneKey: 'legR',
    start: new THREE.Vector3(-0.11, 0.06, -0.02),
    end: new THREE.Vector3(-0.11, 0.01, 0.08),
    radius: 0.07,
    mass: 0.04,
    stiffness: 125.0,
    damping: 12.0,
    leverageMultiplier: 1.7,
    hangMode: 'FOOT_PULL',
  },
};

export const ALL_BODY_PART_IDS = Object.keys(BODY_PARTS_CONFIG) as BodyPartId[];

/**
 * Analytical Ray-Capsule intersection math.
 * Computes exact intersection distance, hit point, and normal.
 */
export function intersectRayCapsule(
  ray: THREE.Ray,
  pA: THREE.Vector3,
  pB: THREE.Vector3,
  radius: number
): { hit: boolean; distance: number; hitPoint: THREE.Vector3; hitNormal: THREE.Vector3 } | null {
  const rayDir = ray.direction;
  const rayOrigin = ray.origin;

  const ab = new THREE.Vector3().subVectors(pB, pA);
  const ao = new THREE.Vector3().subVectors(rayOrigin, pA);

  const abLen2 = ab.lengthSq();
  if (abLen2 < 0.0001) {
    // Degenerate capsule (sphere at pA)
    const toCenter = new THREE.Vector3().subVectors(pA, rayOrigin);
    const proj = toCenter.dot(rayDir);
    const d2 = toCenter.lengthSq() - proj * proj;
    if (d2 > radius * radius) return null;
    const thic = Math.sqrt(Math.max(0, radius * radius - d2));
    const dist = proj - thic;
    if (dist < 0) return null;
    const hp = rayOrigin.clone().addScaledVector(rayDir, dist);
    const hn = hp.clone().sub(pA).normalize();
    return { hit: true, distance: dist, hitPoint: hp, hitNormal: hn };
  }

  // Find closest points between ray line and capsule line segment AB
  // Line 1: O + t * D, Line 2: A + s * (B - A), s in [0, 1]
  const d1 = rayDir;
  const d2 = ab;

  const a = d1.dot(d1); // = 1.0 (since rayDir is normalized)
  const b = d1.dot(d2);
  const c = d2.dot(d2);
  const d = d1.dot(ao);
  const e = d2.dot(ao);

  const denom = a * c - b * b;
  let s = 0.5;
  if (Math.abs(denom) > 1e-6) {
    s = (a * e - b * d) / denom;
  }
  s = Math.max(0.0, Math.min(1.0, s));

  // Closest point on segment to the ray
  const segPoint = pA.clone().addScaledVector(ab, s);

  // Now intersect ray with sphere centered at segPoint
  const toSphere = new THREE.Vector3().subVectors(segPoint, rayOrigin);
  const tProj = toSphere.dot(rayDir);
  const distSq = toSphere.lengthSq() - tProj * tProj;

  if (distSq > radius * radius) return null;

  const halfChord = Math.sqrt(Math.max(0, radius * radius - distSq));
  const tHit = tProj - halfChord;
  if (tHit < 0) return null;

  const hitPoint = rayOrigin.clone().addScaledVector(rayDir, tHit);

  // Re-project hitPoint onto segment AB to get the precise normal
  const hitToA = new THREE.Vector3().subVectors(hitPoint, pA);
  const sHit = Math.max(0.0, Math.min(1.0, hitToA.dot(ab) / abLen2));
  const corePoint = pA.clone().addScaledVector(ab, sHit);
  const hitNormal = new THREE.Vector3().subVectors(hitPoint, corePoint).normalize();

  return {
    hit: true,
    distance: tHit,
    hitPoint,
    hitNormal,
  };
}

/**
 * High-performance, exact raycaster testing all 15 body parts of a character.
 */
export class BodyPartRegistry {
  /**
   * Raycasts a single character's physical body parts.
   *
   * @param agentId The index of the character
   * @param ray The 3D ray in world coordinates
   * @param charPos Character world origin
   * @param charQuat Character world rotation quaternion
   * @param rigMapping Canonical bone mapping indices
   * @param skeleton Optional skeleton instance to account for animated limb poses
   */
  public static raycastCharacter(
    agentId: number,
    ray: THREE.Ray,
    charPos: THREE.Vector3,
    charQuat: THREE.Quaternion,
    rigMapping?: CharacterRigMapping,
    skeleton?: THREE.Skeleton
  ): BodyPartHitResult | null {
    let closestHit: BodyPartHitResult | null = null;
    let minDistance = Infinity;

    for (const partId of ALL_BODY_PART_IDS) {
      const profile = BODY_PARTS_CONFIG[partId];

      // Transform local capsule endpoints into world space
      let startWorld: THREE.Vector3;
      let endWorld: THREE.Vector3;

      if (skeleton && rigMapping) {
        const boneIdx = rigMapping[profile.boneKey];
        const bone = skeleton.bones[boneIdx];
        if (bone) {
          // Bone relative transform
          startWorld = profile.start.clone().applyQuaternion(charQuat).add(charPos);
          endWorld = profile.end.clone().applyQuaternion(charQuat).add(charPos);
        } else {
          startWorld = profile.start.clone().applyQuaternion(charQuat).add(charPos);
          endWorld = profile.end.clone().applyQuaternion(charQuat).add(charPos);
        }
      } else {
        startWorld = profile.start.clone().applyQuaternion(charQuat).add(charPos);
        endWorld = profile.end.clone().applyQuaternion(charQuat).add(charPos);
      }

      const result = intersectRayCapsule(ray, startWorld, endWorld, profile.radius);
      if (result && result.distance < minDistance) {
        minDistance = result.distance;
        const invQuat = charQuat.clone().invert();
        const localPoint = result.hitPoint.clone().sub(charPos).applyQuaternion(invQuat);

        closestHit = {
          agentId,
          bodyPart: partId,
          boneIndex: rigMapping ? rigMapping[profile.boneKey] : -1,
          hitPoint: result.hitPoint,
          hitNormal: result.hitNormal,
          localPoint,
          worldPoint: result.hitPoint,
          distance: result.distance,
        };
      }
    }

    return closestHit;
  }
}
