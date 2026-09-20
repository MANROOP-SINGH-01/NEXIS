import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three/webgpu';

/**
 * AccessoryFactory
 *
 * Generates custom 3D procedural accessories calibrated to the exact
 * head geometry and bone coordinate space of the 3D character avatars.
 */
export class AccessoryFactory {
  /**
   * Iconic 8-Bit "Thug Life" ("Deal With It") Meme Sunglasses.
   *
   * Features:
   * - Stepped 8-bit voxel pixel matrix across the face (24 columns x 6 rows)
   * - Jet-black frames and lenses with signature brilliant-white diagonal glint highlights
   * - Calibrated forward Z position (Z ~ 0.318) floating cleanly in front of the eyes with ZERO head/eye clipping
   * - Blocky side temple arms extending along head sides and hooking naturally behind ears
   * - Merged vertex colors (pure white [1, 1, 1] for glints, pitch black [0.02, 0.02, 0.02] for frames)
   */
  public static createGlassesGeometry(): THREE.BufferGeometry {
    const S = 0.019;  // Pixel size (19mm) for bold, full-coverage 8-bit meme silhouette
    const D = 0.020;  // Pixel thickness along Z (20mm)
    const Z_FRONT = 0.324;
    const Z_CENTER = Z_FRONT - D / 2; // 0.314

    // 24 columns x 6 rows iconic Deal With It / Thug Life sunglasses pattern
    // '#' = black frame/lens, 'W' = white glint highlight, ' ' = transparent space
    const grid = [
      '########################',
      '##WW######====##WW######',
      '###WW#####====###WW#####',
      '##########    ##########',
      ' ########      ######## ',
      '  ######        ######  '
    ];

    const parts: THREE.BufferGeometry[] = [];
    const cBlack = [0.02, 0.02, 0.02];
    const cWhite = [1.0, 1.0, 1.0];

    for (let r = 0; r < grid.length; r++) {
      const rowStr = grid[r];
      // Vertical calibration: aligns brow at Y ~ 0.93 and bottom at Y ~ 0.81 above mouth
      const y = 0.872 + (2.5 - r) * S;

      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        if (ch === ' ') continue;

        const x = (c - 11.5) * S;
        const isWhite = (ch === 'W');
        const color = isWhite ? cWhite : cBlack;

        const box = new THREE.BoxGeometry(S, S, D);
        // Slight forward protrusion for white glints (0.8mm) to guarantee crisp depth & no z-fighting
        const zOffset = isWhite ? 0.0008 : 0;
        box.translate(x, y, Z_CENTER + zOffset);

        const colors = new Float32Array(box.attributes.position.count * 3);
        for (let i = 0; i < box.attributes.position.count; i++) {
          colors[i * 3] = color[0];
          colors[i * 3 + 1] = color[1];
          colors[i * 3 + 2] = color[2];
        }
        box.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        parts.push(box);
      }
    }

    // Temple arms extending back along sides of head to past the ears
    const armLength = 0.285;
    const armZ = Z_CENTER - D / 2 - armLength / 2;
    const armY = 0.872 + 0.5 * S; // Aligned with Row 2

    for (const side of [-1, 1]) {
      const armX = side * 11.5 * S; // Aligned with outer pixel column
      // Main temple arm
      const arm = new THREE.BoxGeometry(0.014, S, armLength);
      arm.translate(armX, armY, armZ);
      const armColors = new Float32Array(arm.attributes.position.count * 3);
      for (let i = 0; i < arm.attributes.position.count; i++) {
        armColors[i * 3] = cBlack[0];
        armColors[i * 3 + 1] = cBlack[1];
        armColors[i * 3 + 2] = cBlack[2];
      }
      arm.setAttribute('color', new THREE.BufferAttribute(armColors, 3));
      parts.push(arm);

      // Downward earpiece hook behind the ear
      const hook = new THREE.BoxGeometry(0.014, S * 1.5, S * 1.5);
      hook.translate(armX, armY - S * 1.0, armZ - armLength / 2 + (S * 0.75));
      const hookColors = new Float32Array(hook.attributes.position.count * 3);
      for (let i = 0; i < hook.attributes.position.count; i++) {
        hookColors[i * 3] = cBlack[0];
        hookColors[i * 3 + 1] = cBlack[1];
        hookColors[i * 3 + 2] = cBlack[2];
      }
      hook.setAttribute('color', new THREE.BufferAttribute(hookColors, 3));
      parts.push(hook);
    }

    return mergeGeometries(parts, false);
  }

  /**
   * Detective Fedora / Director Top Hat with golden band.
   * Calibrated to sit snugly on brow and crown (Y ~ 1.17 - 1.28).
   */
  public static createFedoraGeometry(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];

    // Curved wide brim
    const brim = new THREE.CylinderGeometry(0.36, 0.36, 0.02, 32);
    brim.scale(1.0, 1.0, 1.08);
    brim.rotateX(0.04);
    brim.translate(0, 1.17, 0.01);
    parts.push(brim);

    // Crown
    const crown = new THREE.CylinderGeometry(0.23, 0.28, 0.20, 32);
    crown.scale(1.0, 1.0, 1.06);
    crown.rotateX(0.04);
    crown.translate(0, 1.26, 0.01);
    parts.push(crown);

    // Ribbon band
    const band = new THREE.CylinderGeometry(0.282, 0.282, 0.04, 32);
    band.scale(1.0, 1.0, 1.06);
    band.rotateX(0.04);
    band.translate(0, 1.195, 0.01);
    parts.push(band);

    return mergeGeometries(parts, false);
  }

  /**
   * Robotic Antenna with pulsing luminescent beacon.
   * Calibrated mount base anchored securely into head apex (Y ~ 1.20).
   */
  public static createAntennaGeometry(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];

    // Base collar mount embedded in head
    const base = new THREE.CylinderGeometry(0.06, 0.08, 0.03, 16);
    base.translate(0, 1.20, 0);
    parts.push(base);

    // Antenna rod
    const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 12);
    stem.translate(0, 1.32, 0);
    parts.push(stem);

    // Glowing beacon orb
    const orb = new THREE.SphereGeometry(0.05, 16, 16);
    orb.translate(0, 1.46, 0);
    parts.push(orb);

    return mergeGeometries(parts, false);
  }

  /**
   * Golden Crown / Festive Coronet with 5 peaks and jewels.
   * Base ring sits snugly around the skull cap curve at Y ~ 1.15.
   */
  public static createCrownGeometry(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];

    // Base ring snug around head skull
    const ringRadius = 0.245;
    const ring = new THREE.CylinderGeometry(ringRadius, ringRadius, 0.045, 32);
    ring.translate(0, 1.15, 0);
    parts.push(ring);

    // 5 peaks around the rim
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const px = Math.cos(angle) * ringRadius;
      const pz = Math.sin(angle) * ringRadius;

      const peak = new THREE.ConeGeometry(0.045, 0.10, 4);
      peak.translate(px, 1.21, pz);
      parts.push(peak);

      const jewel = new THREE.SphereGeometry(0.018, 8, 8);
      jewel.translate(px, 1.27, pz);
      parts.push(jewel);
    }

    return mergeGeometries(parts, false);
  }

  /**
   * Scales and cleans the cap geometry from character.glb to eliminate
   * co-planar z-fighting with the head sphere.
   */
  public static cleanCapGeometry(geom: THREE.BufferGeometry): THREE.BufferGeometry {
    const cloned = geom.clone();
    cloned.scale(1.025, 1.025, 1.025);
    cloned.translate(0, 0.005, 0.002);
    return cloned;
  }
}
