import * as THREE from 'three/webgpu';
import { CharacterRigMapping, ProceduralLimbKey } from './PhysicsTypes';

/**
 * Robust, dynamic bone mapper that inspects any loaded skeleton
 * and establishes canonical indices for physics and secondary motion.
 */
export class BoneMapping {
  public static readonly CANONICAL_INDICES: CharacterRigMapping = {
    root: 0,
    hips: 1,
    legL: 2,
    legR: 3,
    spine: 4,
    head: 5,
    armL: 6,
    lowerArmL: 7,
    armR: 8,
    lowerArmR: 9,
  };

  /**
   * Discovers and validates bone indices from a THREE.Skeleton.
   */
  public static mapSkeleton(skeleton: THREE.Skeleton): CharacterRigMapping {
    const bones = skeleton.bones;
    const mapping: Partial<CharacterRigMapping> = {};

    const findIndex = (regex: RegExp): number => {
      return bones.findIndex(b => regex.test(b.name));
    };

    const rootIdx = findIndex(/^root$/i);
    const hipsIdx = findIndex(/^hips?$|^pelvis$/i);
    const spineIdx = findIndex(/^spine|^chest|^torso/i);
    const headIdx = findIndex(/^head$/i);
    const armLIdx = findIndex(/^arm\.l$|^left.*upper.*arm|^upper.*arm.*l$|^arm_l$/i);
    const lowerArmLIdx = findIndex(/^lower\.arm\.l$|^forearm\.l$|^left.*forearm|^lowerarm_l$/i);
    const armRIdx = findIndex(/^arm\.r$|^right.*upper.*arm|^upper.*arm.*r$|^arm_r$/i);
    const lowerArmRIdx = findIndex(/^lower\.arm\.r$|^forearm\.r$|^right.*forearm|^lowerarm_r$/i);
    const legLIdx = findIndex(/^leg\.l$|^left.*thigh|^thigh\.l$|^leg_l$/i);
    const legRIdx = findIndex(/^leg\.r$|^right.*thigh|^thigh\.r$|^leg_r$/i);

    mapping.root = rootIdx !== -1 ? rootIdx : this.CANONICAL_INDICES.root;
    mapping.hips = hipsIdx !== -1 ? hipsIdx : this.CANONICAL_INDICES.hips;
    mapping.spine = spineIdx !== -1 ? spineIdx : this.CANONICAL_INDICES.spine;
    mapping.head = headIdx !== -1 ? headIdx : this.CANONICAL_INDICES.head;
    mapping.armL = armLIdx !== -1 ? armLIdx : this.CANONICAL_INDICES.armL;
    mapping.lowerArmL = lowerArmLIdx !== -1 ? lowerArmLIdx : this.CANONICAL_INDICES.lowerArmL;
    mapping.armR = armRIdx !== -1 ? armRIdx : this.CANONICAL_INDICES.armR;
    mapping.lowerArmR = lowerArmRIdx !== -1 ? lowerArmRIdx : this.CANONICAL_INDICES.lowerArmR;
    mapping.legL = legLIdx !== -1 ? legLIdx : this.CANONICAL_INDICES.legL;
    mapping.legR = legRIdx !== -1 ? legRIdx : this.CANONICAL_INDICES.legR;

    return mapping as CharacterRigMapping;
  }

  /**
   * Helper to map a procedural limb key to the corresponding bone index.
   */
  public static getBoneIndexForLimb(mapping: CharacterRigMapping, limbKey: ProceduralLimbKey): number {
    switch (limbKey) {
      case 'spine': return mapping.spine;
      case 'head': return mapping.head;
      case 'armL': return mapping.armL;
      case 'lowerArmL': return mapping.lowerArmL;
      case 'armR': return mapping.armR;
      case 'lowerArmR': return mapping.lowerArmR;
      case 'legL': return mapping.legL;
      case 'legR': return mapping.legR;
    }
  }

  /**
   * Returns a friendly debug summary of the detected bones.
   */
  public static describeMapping(skeleton: THREE.Skeleton, mapping: CharacterRigMapping): string {
    const bones = skeleton.bones;
    return [
      `Root: [${mapping.root}] ${bones[mapping.root]?.name ?? 'n/a'}`,
      `Hips: [${mapping.hips}] ${bones[mapping.hips]?.name ?? 'n/a'}`,
      `Spine: [${mapping.spine}] ${bones[mapping.spine]?.name ?? 'n/a'}`,
      `Head: [${mapping.head}] ${bones[mapping.head]?.name ?? 'n/a'}`,
      `Arm.L: [${mapping.armL}] ${bones[mapping.armL]?.name ?? 'n/a'}`,
      `LowerArm.L: [${mapping.lowerArmL}] ${bones[mapping.lowerArmL]?.name ?? 'n/a'}`,
      `Arm.R: [${mapping.armR}] ${bones[mapping.armR]?.name ?? 'n/a'}`,
      `LowerArm.R: [${mapping.lowerArmR}] ${bones[mapping.lowerArmR]?.name ?? 'n/a'}`,
      `Leg.L: [${mapping.legL}] ${bones[mapping.legL]?.name ?? 'n/a'}`,
      `Leg.R: [${mapping.legR}] ${bones[mapping.legR]?.name ?? 'n/a'}`,
    ].join(' | ');
  }
}
