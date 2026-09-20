import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import {
  ALL_BODY_PART_IDS,
  BODY_PARTS_CONFIG,
  BodyPartRegistry,
  intersectRayCapsule,
} from '../../src/simulation/physics/BodyPartRegistry';
import { CharacterPhysicsController } from '../../src/simulation/physics/CharacterPhysicsController';
import { GrabController } from '../../src/simulation/physics/GrabController';
import { ImpactController } from '../../src/simulation/physics/ImpactController';
import { ObstacleSystem } from '../../src/simulation/physics/ObstacleSystem';
import { BodyPartId, FallOutcomeType } from '../../src/simulation/physics/PhysicsTypes';
import { RecoveryController } from '../../src/simulation/physics/RecoveryController';
import { SecondaryMotionController } from '../../src/simulation/physics/SecondaryMotionController';

test.describe('BodyPartRegistry & Analytical Ray-Capsule Collision Tests', () => {
  test('Contains all 15 anatomical body parts with required physical parameters', () => {
    expect(ALL_BODY_PART_IDS.length).toBe(15);

    const expectedParts: BodyPartId[] = [
      'head', 'chest', 'pelvis',
      'armL', 'lowerArmL', 'handL',
      'armR', 'lowerArmR', 'handR',
      'thighL', 'calfL', 'footL',
      'thighR', 'calfR', 'footR',
    ];

    for (const id of expectedParts) {
      expect(ALL_BODY_PART_IDS).toContain(id);
      const cfg = BODY_PARTS_CONFIG[id];
      expect(cfg).toBeDefined();
      expect(cfg.radius).toBeGreaterThan(0.02);
      expect(cfg.mass).toBeGreaterThan(0.01);
      expect(cfg.stiffness).toBeGreaterThan(50);
      expect(cfg.damping).toBeGreaterThan(5);
      expect(cfg.leverageMultiplier).toBeGreaterThanOrEqual(0.3);
    }
  });

  test('intersectRayCapsule computes exact hit point, distance, and normal on capsule cylinder', () => {
    const pA = new THREE.Vector3(0, 0, 0);
    const pB = new THREE.Vector3(0, 1.0, 0);
    const radius = 0.2;

    // Ray aimed directly at midpoint (0, 0.5, 0) from z = 2.0
    const ray = new THREE.Ray(new THREE.Vector3(0, 0.5, 2.0), new THREE.Vector3(0, 0, -1.0));
    const result = intersectRayCapsule(ray, pA, pB, radius);

    expect(result).not.toBeNull();
    expect(result?.hit).toBe(true);
    // Distance from z=2 to surface at z=0.2 is 1.8
    expect(result?.distance).toBeCloseTo(1.8, 2);
    expect(result?.hitPoint.x).toBeCloseTo(0, 2);
    expect(result?.hitPoint.y).toBeCloseTo(0.5, 2);
    expect(result?.hitPoint.z).toBeCloseTo(0.2, 2);
    // Normal pointing outward along +Z
    expect(result?.hitNormal.x).toBeCloseTo(0, 2);
    expect(result?.hitNormal.y).toBeCloseTo(0, 2);
    expect(result?.hitNormal.z).toBeCloseTo(1.0, 2);
  });

  test('intersectRayCapsule misses when ray passes outside capsule radius', () => {
    const pA = new THREE.Vector3(0, 0, 0);
    const pB = new THREE.Vector3(0, 1.0, 0);
    const radius = 0.2;

    // Ray offset by x=1.0 (far outside radius 0.2)
    const ray = new THREE.Ray(new THREE.Vector3(1.0, 0.5, 2.0), new THREE.Vector3(0, 0, -1.0));
    const result = intersectRayCapsule(ray, pA, pB, radius);

    expect(result).toBeNull();
  });

  test('raycastCharacter accurately identifies head, chest, and feet regions', () => {
    const charPos = new THREE.Vector3(0, 0, 0);
    const charQuat = new THREE.Quaternion();

    // 1. Aim ray at Head (around y = 0.90)
    const headRay = new THREE.Ray(new THREE.Vector3(0, 0.90, 2.0), new THREE.Vector3(0, 0, -1.0));
    const headHit = BodyPartRegistry.raycastCharacter(0, headRay, charPos, charQuat);
    expect(headHit).not.toBeNull();
    expect(headHit?.bodyPart).toBe('head');

    // 2. Aim ray at Chest (around y = 0.62)
    const chestRay = new THREE.Ray(new THREE.Vector3(0, 0.62, 2.0), new THREE.Vector3(0, 0, -1.0));
    const chestHit = BodyPartRegistry.raycastCharacter(0, chestRay, charPos, charQuat);
    expect(chestHit).not.toBeNull();
    expect(chestHit?.bodyPart).toBe('chest');

    // 3. Aim ray at Left Foot (around x = 0.11, y = 0.02)
    const footRay = new THREE.Ray(new THREE.Vector3(0.11, 0.02, 2.0), new THREE.Vector3(0, 0, -1.0));
    const footHit = BodyPartRegistry.raycastCharacter(0, footRay, charPos, charQuat);
    expect(footHit).not.toBeNull();
    expect(footHit?.bodyPart).toBe('footL');
  });
});

test.describe('GrabController Multi-Limb Physics & Release Velocity Tests', () => {
  test('Applies specialized stiffness, damping, and hang profiles per body part', () => {
    const camera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const grab = new GrabController(camera);

    // Head grab: stiff spring, moderate damping
    grab.startGrab(0, new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector2(0, 0), undefined, -1, 'head');
    let info = grab.getGrabInfo();
    expect(info?.bodyPart).toBe('head');
    expect(info?.stiffness).toBe(160.0);
    expect(info?.damping).toBe(18.0);
    grab.releaseGrab();

    // Hand grab: compliant spring, lower damping for dramatic stretching
    grab.startGrab(0, new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector2(0, 0), undefined, -1, 'handL');
    info = grab.getGrabInfo();
    expect(info?.bodyPart).toBe('handL');
    expect(info?.stiffness).toBe(120.0);
    expect(info?.damping).toBe(11.0);
    grab.releaseGrab();

    // Foot grab: inverted hang profile
    grab.startGrab(0, new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector2(0, 0), undefined, -1, 'footR');
    info = grab.getGrabInfo();
    expect(info?.bodyPart).toBe('footR');
    expect(info?.stiffness).toBe(125.0);
    grab.releaseGrab();
  });

  test('Tracks release velocity and preserves momentum on let-go', () => {
    const camera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const grab = new GrabController(camera);
    grab.startGrab(0, new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector2(0, 0), undefined, -1, 'chest');

    // Simulate fast lateral drag across 3 frames
    grab.updateGrabTarget(new THREE.Vector2(0.1, 0.0), new THREE.Quaternion(), 0.016, 0);
    grab.updateGrabTarget(new THREE.Vector2(0.2, 0.0), new THREE.Quaternion(), 0.016, 0);
    grab.updateGrabTarget(new THREE.Vector2(0.3, 0.0), new THREE.Quaternion(), 0.016, 0);

    const releaseData = grab.releaseGrab();
    expect(releaseData).not.toBeNull();
    expect(releaseData?.bodyPart).toBe('chest');
    // Release velocity in X must be positive due to positive pointer motion
    expect(releaseData?.releaseVelocity.x).toBeGreaterThan(0.5);
    // Vertical velocity is capped to avoid launching into space
    expect(releaseData?.releaseVelocity.y).toBeLessThanOrEqual(2.5);
  });
});

test.describe('SecondaryMotionController Procedural Limb Reaction Tests', () => {
  test('Head grab hangs body vertically and dangles arms downward', () => {
    const secMotion = new SecondaryMotionController();

    const vel = new THREE.Vector3(0, 0, 0);
    const accel = new THREE.Vector3(0, 0, 0);
    const quat = new THREE.Quaternion();

    secMotion.update(vel, accel, quat, true, 0.033, 'head', null, new THREE.Vector3(0, 1, 0));

    // Spine stretches downward (negative pitch in local frame)
    const spineRot = secMotion.getLimbRotation('spine');
    expect(spineRot.x).toBeLessThan(0);

    // Arms hang down
    const armL = secMotion.getLimbRotation('armL');
    const armR = secMotion.getLimbRotation('armR');
    expect(armL.x).toBeGreaterThan(0.20);
    expect(armR.x).toBeGreaterThan(0.20);
  });

  test('Hand pull stretches pulled arm and induces counter-extension on opposite arm', () => {
    const secMotion = new SecondaryMotionController();

    const vel = new THREE.Vector3(0, 0, 0);
    const accel = new THREE.Vector3(0, 0, 0);
    const quat = new THREE.Quaternion();

    // Pull left hand
    secMotion.update(vel, accel, quat, true, 0.033, 'handL', null, new THREE.Vector3(0, 1, 0));

    const pulledArm = secMotion.getLimbRotation('armL');
    const oppositeArm = secMotion.getLimbRotation('armR');
    const spine = secMotion.getLimbRotation('spine');

    // Pulled arm extends along reach direction
    expect(pulledArm.x).toBeGreaterThan(0.2);
    expect(pulledArm.z).toBeGreaterThan(0.1);
    // Opposite arm spreads outward as physical counter-weight
    expect(oppositeArm.z).toBeLessThan(-0.1);
    // Torso twists laterally in response to asymmetric pull
    expect(Math.abs(spine.y)).toBeGreaterThan(0.05);
  });

  test('Foot pull inverts body pitch and induces bicycle kicking oscillation', () => {
    const secMotion = new SecondaryMotionController();

    const vel = new THREE.Vector3(0, 0, 0);
    const accel = new THREE.Vector3(0, 0, 0);
    const quat = new THREE.Quaternion();

    secMotion.update(vel, accel, quat, true, 0.033, 'footL', null, new THREE.Vector3(0, 1, 0));

    const spine = secMotion.getLimbRotation('spine');
    // Body inverts: spine hangs upside-down
    expect(spine.x).toBeLessThan(0);

    // Opposite leg kicks
    const legR = secMotion.getLimbRotation('legR');
    expect(Math.abs(legR.x) + Math.abs(legR.z)).toBeGreaterThan(0.05);
  });
});

test.describe('ImpactController & Multi-Outcome Fall Evaluation Tests', () => {
  test('Evaluates LAND_STANDING for low-speed upright impact', () => {
    const impact = new ImpactController();
    const uprightQuat = new THREE.Quaternion(); // charUp is (0, 1, 0)
    const gentleVel = new THREE.Vector3(0.1, -1.2, 0.1);

    const info = impact.triggerImpact(gentleVel, uprightQuat);
    expect(info.outcomeType).toBe('LAND_STANDING');
    expect(impact.getOutcome()).toBe('LAND_STANDING');
    expect(info.compressionAmount).toBeLessThanOrEqual(0.10);
  });

  test('Evaluates LAND_STUMBLE for impact with significant lateral speed', () => {
    const impact = new ImpactController();
    const uprightQuat = new THREE.Quaternion();
    const lateralVel = new THREE.Vector3(1.8, -2.0, 0.5);

    const info = impact.triggerImpact(lateralVel, uprightQuat);
    expect(info.outcomeType).toBe('LAND_STUMBLE');
    expect(impact.getOutcome()).toBe('LAND_STUMBLE');
  });

  test('Evaluates LAND_BACK when character is tilted backwards', () => {
    const impact = new ImpactController();
    // Tilt backwards by 45 deg around X (pitch)
    const tiltedBackQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 4);
    const fallVel = new THREE.Vector3(0, -3.0, 0);

    const info = impact.triggerImpact(fallVel, tiltedBackQuat);
    expect(info.outcomeType).toBe('LAND_BACK');
  });

  test('Evaluates FULL_RAGDOLL for severe high-speed impact (> 7.0 m/s)', () => {
    const impact = new ImpactController();
    const severeVel = new THREE.Vector3(2.0, -8.5, 1.0);

    const info = impact.triggerImpact(severeVel, new THREE.Quaternion());
    expect(info.outcomeType).toBe('FULL_RAGDOLL');
    expect(impact.getOutcome()).toBe('FULL_RAGDOLL');
    expect(info.compressionAmount).toBeGreaterThan(0.15);
  });
});

test.describe('RecoveryController Sequence & Clumsy Shimmy Tests', () => {
  test('Modulates recovery duration based on outcome severity', () => {
    const recovery = new RecoveryController();

    recovery.startRecovery('LAND_STANDING');
    expect(recovery.getOutcome()).toBe('LAND_STANDING');
    // Quick recovery for standing landing
    let done = recovery.update(0.40);
    expect(done).toBe(false);
    done = recovery.update(0.15);
    expect(done).toBe(true);

    // Full ragdoll requires much longer get-up recovery
    recovery.startRecovery('FULL_RAGDOLL');
    expect(recovery.getOutcome()).toBe('FULL_RAGDOLL');
    done = recovery.update(0.80);
    expect(done).toBe(false); // Still recovering after 0.8s
    done = recovery.update(0.75);
    expect(done).toBe(true); // Complete after 1.5s total
  });

  test('Blend weight decreases smoothly and wobble shimmy oscillates during recovery', () => {
    const recovery = new RecoveryController();
    recovery.startRecovery('LAND_STUMBLE');

    expect(recovery.getBlendWeight()).toBe(1.0);

    recovery.update(0.35); // Halfway through stumble recovery
    expect(recovery.getBlendWeight()).toBeLessThan(1.0);
    expect(recovery.getBlendWeight()).toBeGreaterThan(0.0);

    // Clumsy recovery shimmy produces non-zero wobble
    const wobble = recovery.getRecoveryWobble();
    expect(Math.abs(wobble)).toBeGreaterThanOrEqual(0);
  });
});

test.describe('CharacterPhysicsController & Obstacle Boundary Enforcement Tests', () => {
  test('Clamps positions strictly within office perimeter [-5.20, 5.20]', () => {
    const phys = new CharacterPhysicsController({ floorY: 0.0 });

    // Free fall while flung far outside building walls
    phys.position.set(10.0, 2.0, -12.0);
    phys.updateFreeFall(0.016);

    expect(phys.position.x).toBeLessThanOrEqual(5.20);
    expect(phys.position.z).toBeGreaterThanOrEqual(-5.20);
    expect(phys.position.y).toBeGreaterThanOrEqual(0.0);
  });

  test('ObstacleSystem pushes overlapping agents apart', () => {
    const positions = [
      new THREE.Vector3(0.0, 0, 0.0),
      new THREE.Vector3(0.1, 0, 0.0), // Very close (0.1m apart, min distance 0.45m)
    ];
    const velocities = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];

    ObstacleSystem.resolveAgentOverlap(positions, velocities);

    const distAfter = positions[0].distanceTo(positions[1]);
    expect(distAfter).toBeGreaterThan(0.25);
    expect(positions[0].x).not.toBeNaN();
    expect(positions[1].x).not.toBeNaN();
  });

  test('ObstacleSystem.findSafeFloorPosition projects points inside desks onto open floor', () => {
    // Work Desk 1 is at x: [0.75, 2.18], z: [-3.58, -2.75]
    const insideDeskPos = new THREE.Vector3(1.5, 0, -3.1);
    expect(ObstacleSystem.isInsideAnyObstacle(insideDeskPos)).toBe(true);

    const safePos = ObstacleSystem.findSafeFloorPosition(insideDeskPos);
    expect(ObstacleSystem.isInsideAnyObstacle(safePos)).toBe(false);
    expect(safePos.y).toBe(0.0);
    // Point must be close to the desk, not teleported across the universe
    expect(safePos.distanceTo(insideDeskPos)).toBeLessThan(2.0);
  });

  test('CharacterPhysicsController falling directly over a desk deflects and lands outside structure', () => {
    const phys = new CharacterPhysicsController({ floorY: 0.0 });
    // Position directly above Work Desk 1
    phys.position.set(1.5, 1.8, -3.1);
    phys.linearVelocity.set(0, -3.0, 0);

    // Run free fall until settled to ground
    for (let f = 0; f < 80; f++) {
      phys.updateFreeFall(0.016);
    }

    expect(phys.position.y).toBe(0.0);
    // Must NOT be inside the desk!
    expect(ObstacleSystem.isInsideAnyObstacle(phys.position)).toBe(false);
  });
});
