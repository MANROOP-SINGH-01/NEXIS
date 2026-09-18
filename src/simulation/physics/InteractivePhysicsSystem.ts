import * as THREE from 'three/webgpu';
import { PhysicalInteractionController } from './PhysicalInteractionController';
import { PhysicalState } from './PhysicsTypes';

/**
 * System-level manager for all interactive physical characters in the scene.
 * Coordinates input routing, per-character physical controllers, and
 * packs procedural matrices, orientations, and weights into GPU buffers.
 */
export class InteractivePhysicsSystem {
  private controllers = new Map<number, PhysicalInteractionController>();
  private activeGrabbedIndex: number | null = null;
  private hoveredIndex: number | null = null;

  // Shared GPU buffers (packed for all instances)
  // 10 bones * 16 floats = 160 floats per instance
  private bonesArray: Float32Array;
  private weightArray: Float32Array;
  private orientationArray: Float32Array; // vec4 (x, y, z, w) per instance

  public proceduralBonesAttribute: THREE.StorageBufferAttribute;
  public proceduralWeightAttribute: THREE.StorageInstancedBufferAttribute;
  public orientationAttribute: THREE.StorageInstancedBufferAttribute;

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

  public setHoveredIndex(index: number | null): void {
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
   * Attempts to grab a character at pointer coordinates.
   */
  public handlePointerDown(
    characterIndex: number,
    pointerNDC: THREE.Vector2,
    hitPointWorld?: THREE.Vector3,
    boneIndex: number = -1
  ): boolean {
    // Only one character grabbed at a time
    if (this.activeGrabbedIndex !== null) return false;

    const controller = this.controllers.get(characterIndex);
    if (!controller) return false;

    this.activeGrabbedIndex = characterIndex;
    controller.startGrab(pointerNDC, hitPointWorld, boneIndex);
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
    let needsBonesUpdate = false;
    let needsWeightUpdate = false;
    let needsOrientationUpdate = false;

    for (let i = 0; i < this.maxInstances; i++) {
      const ctrl = this.controllers.get(i);
      if (!ctrl) continue;

      ctrl.update(delta, baseAnimBones);

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
    this.controllers.clear();
    this.activeGrabbedIndex = null;
    this.hoveredIndex = null;
  }
}
