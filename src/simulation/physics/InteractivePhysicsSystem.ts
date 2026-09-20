import * as THREE from 'three/webgpu';
import { BodyPartRegistry } from './BodyPartRegistry';
import { ObstacleSystem } from './ObstacleSystem';
import { PhysicalInteractionController } from './PhysicalInteractionController';
import { BodyPartHitResult, BodyPartId, PhysicalState } from './PhysicsTypes';

/**
 * System-level manager for all interactive physical characters in the scene.
 * Coordinates input routing, per-character physical controllers, and
 * packs procedural matrices, orientations, and weights into GPU buffers.
 */
export class InteractivePhysicsSystem {
  private controllers = new Map<number, PhysicalInteractionController>();
  private activeGrabbedIndex: number | null = null;
  private hoveredIndex: number | null = null;
  private hoveredBodyPart: BodyPartId | null = null;

  // Shared GPU buffers (packed for all instances)
  // 10 bones * 16 floats = 160 floats per instance
  private bonesArray: Float32Array;
  private weightArray: Float32Array;
  private orientationArray: Float32Array; // vec4 (x, y, z, w) per instance

  public proceduralBonesAttribute: THREE.StorageBufferAttribute;
  public proceduralWeightAttribute: THREE.StorageInstancedBufferAttribute;
  public orientationAttribute: THREE.StorageInstancedBufferAttribute;

  private boundGlobalRelease: () => void;

  constructor(
    private baseSkeleton: THREE.Skeleton,
    private camera: THREE.PerspectiveCamera,
    public readonly maxInstances: number = 8
  ) {
    this.bonesArray = new Float32Array(maxInstances * 10 * 16);
    this.weightArray = new Float32Array(maxInstances);
    this.orientationArray = new Float32Array(maxInstances * 4);

    // Initialize identity quaternions (x=0, y=0, z=0, w=1)
    for (let i = 0; i < maxInstances; i++) {
      this.orientationArray[i * 4 + 3] = 1.0;
    }

    this.proceduralBonesAttribute = new THREE.StorageBufferAttribute(this.bonesArray, 16);
    this.proceduralWeightAttribute = new THREE.StorageInstancedBufferAttribute(this.weightArray, 1);
    this.orientationAttribute = new THREE.StorageInstancedBufferAttribute(this.orientationArray, 4);

    // Create a controller for every character instance
    for (let i = 0; i < maxInstances; i++) {
      this.controllers.set(i, new PhysicalInteractionController(i, baseSkeleton, camera));
    }

    // Fail-safe global release listener: guarantees character falls to floor whenever mouse is released anywhere
    this.boundGlobalRelease = () => {
      if (this.activeGrabbedIndex !== null) {
        this.handlePointerUp();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', this.boundGlobalRelease, { passive: true });
      window.addEventListener('mouseup', this.boundGlobalRelease, { passive: true });
      window.addEventListener('blur', this.boundGlobalRelease, { passive: true });
      window.addEventListener('pointercancel', this.boundGlobalRelease, { passive: true });
    }
  }

  public getController(index: number): PhysicalInteractionController | undefined {
    return this.controllers.get(index);
  }

  public getActiveGrabbedIndex(): number | null {
    return this.activeGrabbedIndex;
  }

  public getHoveredIndex(): number | null {
    return this.hoveredIndex;
  }

  public getHoveredBodyPart(): BodyPartId | null {
    return this.hoveredBodyPart;
  }

  public setHoveredBodyPart(part: BodyPartId | null): void {
    this.hoveredBodyPart = part;
  }

  public setHoveredIndex(index: number | null, part: BodyPartId | null = null): void {
    this.hoveredBodyPart = part;
    if (this.hoveredIndex === index) return;
    if (this.hoveredIndex !== null && this.hoveredIndex !== this.activeGrabbedIndex) {
      const prev = this.controllers.get(this.hoveredIndex);
      if (prev && prev.state === 'HOVER') prev.setState('IDLE');
    }
    this.hoveredIndex = index;
    if (index !== null && index !== this.activeGrabbedIndex) {
      const cur = this.controllers.get(index);
      if (cur && cur.state === 'IDLE') cur.setState('HOVER');
    }
  }

  /**
   * Performs hit testing across all character instances in the scene against all 15 anatomical body parts.
   */
  public raycastAllCharacters(
    ray: THREE.Ray,
    positions: (THREE.Vector3 | null | undefined)[],
    orientations?: (THREE.Quaternion | null | undefined)[]
  ): { characterIndex: number; hit: BodyPartHitResult } | null {
    let closestOverall: { characterIndex: number; hit: BodyPartHitResult } | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < this.maxInstances; i++) {
      const ctrl = this.controllers.get(i);
      const pos = positions[i] ?? (ctrl ? ctrl.physics.position : null);
      if (!pos) continue;

      const quat = orientations?.[i] ?? (ctrl ? ctrl.physics.orientation : new THREE.Quaternion());
      const rigMapping = ctrl?.rigMapping;
      const skeleton = ctrl?.skeleton;

      const hitResult = BodyPartRegistry.raycastCharacter(
        i,
        ray,
        pos,
        quat,
        rigMapping,
        skeleton
      );

      if (hitResult && hitResult.distance < minDistance) {
        minDistance = hitResult.distance;
        closestOverall = {
          characterIndex: i,
          hit: hitResult,
        };
      }
    }

    return closestOverall;
  }

  /**
   * Attempts to grab a character at pointer coordinates.
   */
  public handlePointerDown(
    characterIndex: number,
    pointerNDC: THREE.Vector2,
    hitPointWorld?: THREE.Vector3,
    boneIndex: number = -1,
    currentWorldPosition?: THREE.Vector3,
    currentWorldOrientation?: THREE.Quaternion,
    bodyPart: BodyPartId = 'chest'
  ): boolean {
    // Only one character grabbed at a time: if an active grab was somehow pending, release it immediately!
    if (this.activeGrabbedIndex !== null) {
      this.handlePointerUp();
    }

    const controller = this.controllers.get(characterIndex);
    if (!controller) return false;

    if (currentWorldPosition) {
      controller.physics.reset(currentWorldPosition, currentWorldOrientation);
    }

    this.activeGrabbedIndex = characterIndex;
    controller.startGrab(pointerNDC, hitPointWorld, boneIndex, bodyPart);
    return true;
  }

  /**
   * Updates pointer position for active grabbed character.
   */
  public handlePointerMove(pointerNDC: THREE.Vector2, delta: number): void {
    if (this.activeGrabbedIndex === null) return;
    const controller = this.controllers.get(this.activeGrabbedIndex);
    if (controller) {
      controller.updatePointerMove(pointerNDC, delta);
    }
  }

  /**
   * Releases active grabbed character.
   */
  public handlePointerUp(): void {
    if (this.activeGrabbedIndex === null) return;
    const controller = this.controllers.get(this.activeGrabbedIndex);
    if (controller) {
      controller.release();
    }
    this.activeGrabbedIndex = null;
  }

  /**
   * Main per-frame update loop.
   * Advances physics on all controllers and packs results into GPU attributes.
   *
   * @param delta Delta time in seconds
   * @param baseAnimBones Baseline skeleton bones from the base animation player
   */
  public update(delta: number, baseAnimBones?: THREE.Bone[]): void {
    // Auto-release watchdog: Ensure orphaned or invalid grabs are dropped back to floor
    if (this.activeGrabbedIndex !== null) {
      const activeCtrl = this.controllers.get(this.activeGrabbedIndex);
      if (!activeCtrl || !activeCtrl.grab.isGrabbed()) {
        this.handlePointerUp();
      }
    }

    let needsBonesUpdate = false;
    let needsWeightUpdate = false;
    let needsOrientationUpdate = false;

    // 1. Advance individual physics controllers
    for (let i = 0; i < this.maxInstances; i++) {
      const ctrl = this.controllers.get(i);
      if (ctrl) ctrl.update(delta, baseAnimBones);
    }

    // 2. Resolve agent-to-agent collisions so characters push apart and never stick inside each other
    const activePositions: THREE.Vector3[] = [];
    const activeVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < this.maxInstances; i++) {
      const ctrl = this.controllers.get(i);
      if (ctrl) {
        activePositions.push(ctrl.physics.position);
        activeVelocities.push(ctrl.physics.linearVelocity);
      }
    }
    ObstacleSystem.resolveAgentOverlap(activePositions, activeVelocities, this.activeGrabbedIndex);

    // 3. Pack procedural weights, orientations, and bone matrices into GPU buffers
    for (let i = 0; i < this.maxInstances; i++) {
      const ctrl = this.controllers.get(i);
      if (!ctrl) continue;

      // Pack procedural weight
      const prevWeight = this.weightArray[i];
      if (Math.abs(prevWeight - ctrl.proceduralWeight) > 0.001 || ctrl.proceduralWeight > 0.001) {
        this.weightArray[i] = ctrl.proceduralWeight;
        needsWeightUpdate = true;
      }

      // Pack orientation quaternion
      const q = ctrl.physics.orientation;
      this.orientationArray[i * 4 + 0] = q.x;
      this.orientationArray[i * 4 + 1] = q.y;
      this.orientationArray[i * 4 + 2] = q.z;
      this.orientationArray[i * 4 + 3] = q.w;
      needsOrientationUpdate = true;

      // Pack bone matrices if active
      if (ctrl.proceduralWeight > 0.001) {
        const offset = i * 10 * 16;
        this.bonesArray.set(ctrl.proceduralBoneMatrices, offset);
        needsBonesUpdate = true;
      }
    }

    if (needsBonesUpdate) {
      this.proceduralBonesAttribute.needsUpdate = true;
    }
    if (needsWeightUpdate) {
      this.proceduralWeightAttribute.needsUpdate = true;
    }
    if (needsOrientationUpdate) {
      this.orientationAttribute.needsUpdate = true;
    }
  }

  /**
   * Syncs position from an external source (e.g. initial spawn or AI navigation)
   * when not currently being physically manipulated.
   */
  public syncExternalPosition(index: number, pos: THREE.Vector3, facing?: THREE.Quaternion): void {
    const ctrl = this.controllers.get(index);
    if (!ctrl) return;
    // Only update if character is not currently undergoing physical interaction
    if (ctrl.state === 'IDLE' || ctrl.state === 'HOVER') {
      ctrl.physics.reset(pos, facing);
    }
  }

  public isCharacterPhysical(index: number): boolean {
    const ctrl = this.controllers.get(index);
    if (!ctrl) return false;
    return ctrl.state !== 'IDLE' && ctrl.state !== 'HOVER';
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', this.boundGlobalRelease);
      window.removeEventListener('mouseup', this.boundGlobalRelease);
      window.removeEventListener('blur', this.boundGlobalRelease);
      window.removeEventListener('pointercancel', this.boundGlobalRelease);
    }
    this.controllers.clear();
    this.activeGrabbedIndex = null;
    this.hoveredIndex = null;
  }
}
