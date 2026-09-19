import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { PhysicalInteractionController } from '../../src/simulation/physics/PhysicalInteractionController';
import { GrabController } from '../../src/simulation/physics/GrabController';
import { CharacterPhysicsController } from '../../src/simulation/physics/CharacterPhysicsController';
import { ImpactController } from '../../src/simulation/physics/ImpactController';
import { RecoveryController } from '../../src/simulation/physics/RecoveryController';
import { SecondaryMotionController } from '../../src/simulation/physics/SecondaryMotionController';
import { ObstacleSystem } from '../../src/simulation/physics/ObstacleSystem';

function createMockSkeleton(): THREE.Skeleton {
  const names = ['root', 'hips', 'leg.L', 'leg.R', 'spine', 'head', 'arm.L', 'lower.arm.L', 'arm.R', 'lower.arm.R'];
  const bones = names.map(name => {
    const b = new THREE.Bone();
    b.name = name;
    return b;
  });
  bones[0].add(bones[1]);
  bones[1].add(bones[2]);
  bones[1].add(bones[3]);
  bones[1].add(bones[4]);
  bones[4].add(bones[5]);
  bones[4].add(bones[6]);
  bones[6].add(bones[7]);
  bones[4].add(bones[8]);
  bones[8].add(bones[9]);
  return new THREE.Skeleton(bones);
}

test.describe('Physical Interaction System Tests', () => {

  test('PhysicalInteractionController state transitions IDLE -> GRABBED -> MOVING -> AIRBORNE -> IMPACT -> RECOVERING -> IDLE', () => {
    const skeleton = createMockSkeleton();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();

    const controller = new PhysicalInteractionController(0, skeleton, camera);
    controller.resetTo(new THREE.Vector3(0, 0, 0));

    expect(controller.state).toBe('IDLE');
    expect(controller.proceduralWeight).toBe(0);

    // 1. Grab
    const pointerNDC = new THREE.Vector2(0, 0);
    const hitPoint = new THREE.Vector3(0, 1.0, 0);
    controller.startGrab(pointerNDC, hitPoint);
    expect(controller.state).toBe('GRABBED');
    expect(controller.proceduralWeight).toBe(1.0);

    // 2. Move pointer rapidly
    controller.updatePointerMove(new THREE.Vector2(0.3, 0.3), 0.016);
    expect(controller.state).toBe('MOVING');

    // 3. Release into airborne
    controller.release();
    expect(controller.state).toBe('AIRBORNE');

    // 4. Step physics until it reaches ground (IMPACT)
    let reachedImpact = false;
    for (let step = 0; step < 120; step++) {
      controller.update(0.016);
      if (controller.state === 'IMPACT') {
        reachedImpact = true;
        break;
      }
    }
    expect(reachedImpact).toBe(true);

    // 5. Step until impact transitions into recovering
    let reachedRecovery = false;
    for (let step = 0; step < 120; step++) {
      controller.update(0.016);
      if (controller.state === 'RECOVERING') {
        reachedRecovery = true;
        break;
      }
    }
    expect(reachedRecovery).toBe(true);

    // 6. Step until recovery completes and returns to IDLE
    let reachedIdle = false;
    for (let step = 0; step < 120; step++) {
      controller.update(0.016);
      if (controller.state === 'IDLE') {
        reachedIdle = true;
        break;
      }
    }
    expect(reachedIdle).toBe(true);
    expect(controller.proceduralWeight).toBe(0);
  });

  test('GrabController preserves initial local offset without teleporting', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();

    const grabCtrl = new GrabController(camera);
    const characterPos = new THREE.Vector3(0, 0, 0);
    const hitPoint = new THREE.Vector3(0.2, 0.8, 0.1); // Grab point off-center
    const pointerNDC = new THREE.Vector2(0, 0);

    const grabInfo = grabCtrl.startGrab(
      0,
      characterPos,
      new THREE.Quaternion(),
      pointerNDC,
      hitPoint
    );

    expect(grabCtrl.isGrabbed()).toBe(true);
    expect(grabInfo.grabOffsetLocal.x).toBeCloseTo(0.2, 4);
    expect(grabInfo.grabOffsetLocal.y).toBeCloseTo(0.8, 4);
    expect(grabInfo.grabOffsetLocal.z).toBeCloseTo(0.1, 4);

    // Moving pointer should compute target position that subtracts the offset
    const targetPos = grabCtrl.updateGrabTarget(
      new THREE.Vector2(0.1, 0.1),
      new THREE.Quaternion(),
      0.016
    );

    expect(targetPos).not.toBeNull();
    // Verify targetPos does not produce NaN or infinity
    expect(Number.isFinite(targetPos!.x)).toBe(true);
    expect(Number.isFinite(targetPos!.y)).toBe(true);
    expect(Number.isFinite(targetPos!.z)).toBe(true);
  });

  test('CharacterPhysicsController produces realistic critically damped tracking and velocity', () => {
    const physics = new CharacterPhysicsController();
    physics.reset(new THREE.Vector3(0, 0, 0));

    const targetPos = new THREE.Vector3(2, 2, 0);

    // Step several frames towards target
    for (let i = 0; i < 15; i++) {
      physics.updateGrabbed(targetPos, 0.016);
    }

    // Must have moved toward target
    expect(physics.position.x).toBeGreaterThan(0);
    expect(physics.position.y).toBeGreaterThan(0);
    // Velocity must be positive in X and Y directions
    expect(physics.linearVelocity.x).toBeGreaterThan(0);
    expect(physics.linearVelocity.y).toBeGreaterThan(0);

    // Free fall gravity test
    const initYVel = 2.0;
    physics.linearVelocity.y = initYVel;
    physics.position.y = 5.0; // High in the air
    physics.updateFreeFall(0.016);
    // Gravity (-9.81 * 1.5) should decrease Y velocity
    expect(physics.linearVelocity.y).toBeLessThan(initYVel);
  });

  test('SecondaryMotionController generates inertial limb lag opposing acceleration', () => {
    const secondary = new SecondaryMotionController();

    // Body accelerating rapidly to the right (+X)
    const acceleration = new THREE.Vector3(20, 0, 0);
    const velocity = new THREE.Vector3(5, 0, 0);
    const orientation = new THREE.Quaternion();

    for (let i = 0; i < 8; i++) {
      secondary.update(velocity, acceleration, orientation, false, 0.016);
    }

    const armAngle = secondary.getLimbAngle('armL');
    // Arm must roll/swing in response to lateral acceleration
    expect(Math.abs(armAngle.z) + Math.abs(armAngle.x)).toBeGreaterThan(0.01);
  });

  test('ImpactController produces squash & stretch compression and damped wobble on collision', () => {
    const impact = new ImpactController();

    // Trigger ground impact with downward velocity of -8 m/s
    impact.triggerImpact(new THREE.Vector3(0, -8, 0));

    expect(impact.hasActiveImpact()).toBe(true);

    // Update for 1 frame
    impact.update(0.016);
    const squashY = impact.getSquashScale();

    // Squash: Y scale must compress (< 1.0)
    expect(squashY).toBeLessThan(1.0);

    // Compression offset must be downward (< 0) or non-zero
    expect(Math.abs(impact.getCompressionOffset())).toBeGreaterThan(0);
  });

  test('RecoveryController smoothly restores upright orientation and decays procedural weight', () => {
    const recovery = new RecoveryController(0.5);

    recovery.startRecovery();
    expect(recovery.isUnderway()).toBe(true);
    expect(recovery.getBlendWeight()).toBeCloseTo(1.0, 2);

    // Update halfway through recovery
    recovery.update(0.25);
    expect(recovery.getBlendWeight()).toBeLessThan(1.0);
    expect(recovery.getBlendWeight()).toBeGreaterThan(0.0);

    // Update to completion
    const finished = recovery.update(0.3);
    expect(finished).toBe(true);
    expect(recovery.isUnderway()).toBe(false);
    expect(recovery.getBlendWeight()).toBe(0.0);
  });

  test('ObstacleSystem prevents characters from penetrating reception counter, desks, and plants', () => {
    // 1. Test point inside reception counter [-3.50, 0, 3.94]
    const counterInside = new THREE.Vector3(-3.50, 0.2, 3.94);
    const counterVel = new THREE.Vector3(0, 0, 2.0);
    const resolvedCounter = ObstacleSystem.resolveCollision(counterInside, counterVel);

    expect(resolvedCounter).toBe(true);
    // Character must be pushed outside the counter box
    const counterBox = ObstacleSystem.getObstacles().find(o => o.id === 'static-counter')?.box;
    expect(counterBox).toBeDefined();
    const isStillInside =
      counterInside.x > counterBox!.min.x &&
      counterInside.x < counterBox!.max.x &&
      counterInside.z > counterBox!.min.z &&
      counterInside.z < counterBox!.max.z;
    expect(isStillInside).toBe(false);

    // 2. Test point inside potted plant 1 [-2.13, 0, 3.92]
    const plantInside = new THREE.Vector3(-2.13, 0.1, 3.92);
    const resolvedPlant = ObstacleSystem.resolveCollision(plantInside);
    expect(resolvedPlant).toBe(true);
    const plantBox = ObstacleSystem.getObstacles().find(o => o.id === 'static-plant.001')?.box;
    expect(plantBox).toBeDefined();
    const isPlantInside =
      plantInside.x > plantBox!.min.x &&
      plantInside.x < plantBox!.max.x &&
      plantInside.z > plantBox!.min.z &&
      plantInside.z < plantBox!.max.z;
    expect(isPlantInside).toBe(false);
  });

  test('ObstacleSystem resolves agent overlap by separating co-located characters', () => {
    // Two agents standing at almost identical positions
    const posA = new THREE.Vector3(0, 0, 0);
    const posB = new THREE.Vector3(0.05, 0, 0.05);

    const positions = [posA, posB];
    const hadOverlap = ObstacleSystem.resolveAgentOverlap(positions);

    expect(hadOverlap).toBe(true);
    const distanceAfter = posA.distanceTo(posB);
    // Distance after separation must be at least the safe separation threshold (0.64m)
    expect(distanceAfter).toBeGreaterThanOrEqual(0.64);
  });

  test('SecondaryMotionController generates cute clumsy windmilling arms and kicking legs when airborne', () => {
    const secondary = new SecondaryMotionController();
    const velocity = new THREE.Vector3(2.0, -3.5, 1.0); // Thrown downward and forward
    const acceleration = new THREE.Vector3(0, -9.81, 0);
    const orientation = new THREE.Quaternion();

    // Advance airborne frames
    for (let i = 0; i < 10; i++) {
      secondary.update(velocity, acceleration, orientation, true, 0.016);
    }

    const armL = secondary.getLimbAngle('armL');
    const armR = secondary.getLimbAngle('armR');
    const legL = secondary.getLimbAngle('legL');
    const legR = secondary.getLimbAngle('legR');
    const head = secondary.getLimbAngle('head');

    // Both arms and legs must have dynamic, non-zero flail/kick displacements
    expect(Math.abs(armL.x) + Math.abs(armL.z)).toBeGreaterThan(0.1);
    expect(Math.abs(armR.x) + Math.abs(armR.z)).toBeGreaterThan(0.1);
    expect(Math.abs(legL.x) + Math.abs(legL.z)).toBeGreaterThan(0.1);
    expect(Math.abs(legR.x) + Math.abs(legR.z)).toBeGreaterThan(0.1);
    // Head must show clumsy tilt back
    expect(Math.abs(head.x) + Math.abs(head.z)).toBeGreaterThan(0.05);
  });

  test('RecoveryController generates cute cartoon shimmy wobble during recovery', () => {
    const recovery = new RecoveryController(0.6);
    recovery.startRecovery();

    // Advance to 30% progress
    recovery.update(0.18);
    const wobble = recovery.getRecoveryWobble();

    // Must have active, non-zero recovery shimmy
    expect(Math.abs(wobble)).toBeGreaterThan(0.005);
  });

});
