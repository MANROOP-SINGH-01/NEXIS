import * as THREE from 'three/webgpu';
import { GrabInfo, OFFICE_BOUNDS, BodyPartId } from './PhysicsTypes';
import { ObstacleSystem } from './ObstacleSystem';
import { BODY_PARTS_CONFIG, BodyPartProfile } from './BodyPartRegistry';

/**
 * Handles 3D pointer grab detection, camera-plane coordinate projection,
 * office boundary containment, and exact local-offset preservation.
 */
export class GrabController {
  private raycaster = new THREE.Raycaster();
  private grabInfo: GrabInfo | null = null;
  private currentPointer = new THREE.Vector2();
  private initialOrientation = new THREE.Quaternion();

  // Smoothed velocity & acceleration tracking of the grab target
  private smoothedTargetVelocity = new THREE.Vector3();
  private smoothedTargetAcceleration = new THREE.Vector3();
  private smoothedTargetPos = new THREE.Vector3();
  private prevTargetPos = new THREE.Vector3();
  private prevTargetVel = new THREE.Vector3();
  private hasPrevTarget = false;

  constructor(private camera: THREE.PerspectiveCamera) {}

  public isGrabbed(): boolean {
    return this.grabInfo !== null;
  }

  public getGrabInfo(): GrabInfo | null {
    return this.grabInfo;
  }

  public getGrabbedBodyPart(): BodyPartId | null {
    return this.grabInfo?.bodyPart ?? null;
  }

  public getSmoothedVelocity(): THREE.Vector3 {
    return this.smoothedTargetVelocity;
  }

  public getSmoothedAcceleration(): THREE.Vector3 {
    return this.smoothedTargetAcceleration;
  }

  /**
   * Initiates a physical grab on a specific character body part.
   *
   * @param characterIndex Index of the character
   * @param bodyPosition Current 3D center/origin of the character
   * @param bodyOrientation Current rotation quaternion of the character
   * @param pointerNDC Pointer in normalized device coordinates [-1, 1]
   * @param hitPointWorld Optional pre-computed 3D intersection point
   * @param boneIndex Bone index of the grabbed part
   * @param bodyPart Specific anatomical body region
   */
  public startGrab(
    characterIndex: number,
    bodyPosition: THREE.Vector3,
    bodyOrientation: THREE.Quaternion,
    pointerNDC: THREE.Vector2,
    hitPointWorld?: THREE.Vector3,
    boneIndex: number = -1,
    bodyPart: BodyPartId = 'chest'
  ): GrabInfo {
    this.currentPointer.copy(pointerNDC);
    this.initialOrientation.copy(bodyOrientation);
    this.raycaster.setFromCamera(pointerNDC, this.camera);

    let hitPoint: THREE.Vector3;
    if (hitPointWorld) {
      hitPoint = hitPointWorld.clone();
    } else {
      // Find nearest point on ray to body center
      const ray = this.raycaster.ray;
      const toBody = new THREE.Vector3().subVectors(bodyPosition, ray.origin);
      const proj = toBody.dot(ray.direction);
      hitPoint = ray.origin.clone().addScaledVector(ray.direction, Math.max(0.1, proj));
    }

    // Calculate local offset relative to current body orientation
    // O_local = Q^-1 * (P_hit - P_body)
    const invQuat = bodyOrientation.clone().invert();
    const grabOffsetLocal = new THREE.Vector3()
      .subVectors(hitPoint, bodyPosition)
      .applyQuaternion(invQuat);

    // Create camera-facing interaction plane passing through hitPoint
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const planeNormal = camDir.negate(); // Plane facing camera
    const grabPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hitPoint);

    const grabDistance = this.camera.position.distanceTo(hitPoint);
    const profile = BODY_PARTS_CONFIG[bodyPart] || BODY_PARTS_CONFIG.chest;

    this.grabInfo = {
      characterIndex,
      bodyPart,
      grabPointWorld: hitPoint,
      grabOffsetLocal,
      targetPointWorld: bodyPosition.clone(),
      grabPlane,
      grabDistance,
      grabbedBoneIndex: boneIndex,
      timeGrabbed: performance.now() / 1000,
      constraintStiffness: profile.stiffness,
      stiffness: profile.stiffness,
      damping: profile.damping,
    };

    this.prevTargetPos.copy(bodyPosition);
    this.smoothedTargetPos.copy(bodyPosition);
    this.prevTargetVel.set(0, 0, 0);
    this.smoothedTargetVelocity.set(0, 0, 0);
    this.smoothedTargetAcceleration.set(0, 0, 0);
    this.hasPrevTarget = true;

    return this.grabInfo;
  }

  /**
   * Updates the 3D target point based on pointer movement, clamping strictly
   * within the office 3D model boundaries.
   */
  public updateGrabTarget(
    pointerNDC: THREE.Vector2,
    bodyOrientation: THREE.Quaternion,
    delta: number,
    floorY: number = 0.0
  ): THREE.Vector3 | null {
    if (!this.grabInfo) return null;

    this.currentPointer.copy(pointerNDC);
    this.raycaster.setFromCamera(pointerNDC, this.camera);

    const hitIntersection = new THREE.Vector3();
    const hasHit = this.raycaster.ray.intersectPlane(this.grabInfo.grabPlane, hitIntersection);

    if (!hasHit) {
      // Fallback: project at preserved depth from camera
      const ray = this.raycaster.ray;
      hitIntersection.copy(ray.origin).addScaledVector(ray.direction, this.grabInfo.grabDistance);
    }

    // Extract horizontal facing yaw so dynamic pitch/roll tilt does not feedback-shake the target point
    const euler = new THREE.Euler().setFromQuaternion(bodyOrientation, 'YXZ');
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
    const currentRotatedOffset = this.grabInfo.grabOffsetLocal.clone().applyQuaternion(yawQuat);

    // Body target position = PointerWorld - Offset_world
    let targetBodyPos = new THREE.Vector3().subVectors(hitIntersection, currentRotatedOffset);

    // Apply specialized hang behavior based on the grabbed body region
    const profile = BODY_PARTS_CONFIG[this.grabInfo.bodyPart] || BODY_PARTS_CONFIG.chest;
    const isHead = profile.hangMode === 'HEAD_HANG';
    const isLeg = profile.hangMode === 'FOOT_PULL' || profile.hangMode === 'LEG_INVERT';

    // Generous floating clearance: elevate character so their feet dangle playfully above floor & desks
    const minDangleHeight = floorY + 0.55;
    targetBodyPos.y = Math.max(minDangleHeight, targetBodyPos.y + (isHead ? 0.35 : (isLeg ? 0.55 : 0.25)));

    // Strict Office 3D Model Bounding Box Clamp: prevent escaping outside room borders
    targetBodyPos.x = THREE.MathUtils.clamp(targetBodyPos.x, OFFICE_BOUNDS.minX, OFFICE_BOUNDS.maxX);
    targetBodyPos.z = THREE.MathUtils.clamp(targetBodyPos.z, OFFICE_BOUNDS.minZ, OFFICE_BOUNDS.maxZ);
    targetBodyPos.y = THREE.MathUtils.clamp(targetBodyPos.y, minDangleHeight, (OFFICE_BOUNDS.maxHeldY ?? 2.90));

    // Smooth target interpolation to filter out mouse sampling jitter and create buttery 60fps motion
    const dt = Math.max(0.001, Math.min(0.05, delta));
    const smoothFactor = 1.0 - Math.exp(-32.0 * dt);
    this.smoothedTargetPos.lerp(targetBodyPos, smoothFactor);
    this.grabInfo.targetPointWorld.copy(this.smoothedTargetPos);

    // Filtered velocity & acceleration estimation
    if (delta > 0.0001 && this.hasPrevTarget) {
      const rawVel = new THREE.Vector3()
        .subVectors(this.smoothedTargetPos, this.prevTargetPos)
        .divideScalar(delta);

      // Clamp extreme spikes from rapid cursor moves or jumps
      const maxVel = 45.0;
      if (rawVel.length() > maxVel) {
        rawVel.normalize().multiplyScalar(maxVel);
      }

      // Smooth velocity with exponential blend
      const velAlpha = 1.0 - Math.exp(-24.0 * delta);
      this.smoothedTargetVelocity.lerp(rawVel, velAlpha);

      // Smooth acceleration
      const rawAccel = new THREE.Vector3()
        .subVectors(this.smoothedTargetVelocity, this.prevTargetVel)
        .divideScalar(delta);
      const accelAlpha = 1.0 - Math.exp(-18.0 * delta);
      this.smoothedTargetAcceleration.lerp(rawAccel, accelAlpha);

      this.prevTargetVel.copy(this.smoothedTargetVelocity);
      this.prevTargetPos.copy(this.smoothedTargetPos);
    }

    return this.grabInfo.targetPointWorld;
  }

  /**
   * Ends the grab, returning the release velocity and release info.
   */
  public releaseGrab(): { releaseVelocity: THREE.Vector3; characterIndex: number; bodyPart: BodyPartId } | null {
    if (!this.grabInfo) return null;

    const charIndex = this.grabInfo.characterIndex;
    const bodyPart = this.grabInfo.bodyPart;
    const releaseVelocity = this.smoothedTargetVelocity.clone();

    // Prevent lateral flinging through walls
    const horizontalSpeed = Math.hypot(releaseVelocity.x, releaseVelocity.z);
    const maxHorizontalSpeed = 4.5;
    if (horizontalSpeed > maxHorizontalSpeed) {
      const scale = maxHorizontalSpeed / horizontalSpeed;
      releaseVelocity.x *= scale;
      releaseVelocity.z *= scale;
    }

    // Upward fling: allow throwing up into the air within visible ceiling bounds
    releaseVelocity.y = Math.min(2.5, Math.max(-12.0, releaseVelocity.y));

    this.grabInfo = null;
    this.hasPrevTarget = false;

    return {
      releaseVelocity,
      characterIndex: charIndex,
      bodyPart,
    };
  }
}
