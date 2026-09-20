import { test, expect } from '@playwright/test';
import { AccessoryFactory } from '../../src/simulation/entities/AccessoryFactory';

test.describe('Accessory System & Thug Life Sunglasses Tests', () => {

  test('createGlassesGeometry generates 8-bit Thug Life sunglasses with proper bounds and clearance', () => {
    const geom = AccessoryFactory.createGlassesGeometry();
    expect(geom).toBeDefined();

    geom.computeBoundingBox();
    const box = geom.boundingBox!;
    expect(box).toBeDefined();

    // 1. Width: spans temple to temple (~0.39m total width)
    expect(box.min.x).toBeLessThan(-0.18);
    expect(box.max.x).toBeGreaterThan(0.18);

    // 2. Height: covers eye level (0.867) and stays clear of mouth (< 0.79)
    expect(box.min.y).toBeGreaterThan(0.79);
    expect(box.max.y).toBeGreaterThan(0.89);
    expect(box.min.y).toBeLessThan(0.867);
    expect(box.max.y).toBeGreaterThan(0.867);

    // 3. Depth & Forward Z clearance: sits in front of eyes (Z > 0.30) and reaches behind ears (Z < 0.06)
    expect(box.max.z).toBeGreaterThan(0.31);
    expect(box.min.z).toBeLessThan(0.06);
  });

  test('createGlassesGeometry includes vertex colors with jet black frames and brilliant white glints', () => {
    const geom = AccessoryFactory.createGlassesGeometry();
    const colorAttr = geom.getAttribute('color');
    expect(colorAttr).toBeDefined();
    expect(colorAttr.itemSize).toBe(3);

    let hasBlack = false;
    let hasWhite = false;

    for (let i = 0; i < colorAttr.count; i++) {
      const r = colorAttr.getX(i);
      const g = colorAttr.getY(i);
      const b = colorAttr.getZ(i);

      if (r < 0.1 && g < 0.1 && b < 0.1) {
        hasBlack = true;
      }
      if (r > 0.9 && g > 0.9 && b > 0.9) {
        hasWhite = true;
      }
    }

    expect(hasBlack).toBe(true);
    expect(hasWhite).toBe(true);
  });

  test('Procedural accessory suite generates valid geometries for all accessories', () => {
    const fedora = AccessoryFactory.createFedoraGeometry();
    expect(fedora.getAttribute('position').count).toBeGreaterThan(0);

    const antenna = AccessoryFactory.createAntennaGeometry();
    expect(antenna.getAttribute('position').count).toBeGreaterThan(0);

    const crown = AccessoryFactory.createCrownGeometry();
    expect(crown.getAttribute('position').count).toBeGreaterThan(0);
  });

  test('All 6 agents and User have 100% unique, non-overlapping colors', async () => {
    const { colors, USER_COLOR } = await import('../../src/theme/bauhaus');
    const { getAllCharacters, AGENTIC_SETS } = await import('../../src/data/agents');

    const agentColors = Object.values(colors.agents);
    const uniqueAgentColors = new Set(agentColors);

    // 1. All 6 agents have mutually exclusive colors
    expect(agentColors).toHaveLength(6);
    expect(uniqueAgentColors.size).toBe(6);

    // 2. User color is distinct from all 6 agent colors
    expect(uniqueAgentColors.has(USER_COLOR)).toBe(false);

    // 3. Characters returned by getAllCharacters have 7 unique colors
    const characters = getAllCharacters(AGENTIC_SETS[0]);
    expect(characters).toHaveLength(7);
    const characterColors = new Set(characters.map(c => c.color.toLowerCase()));
    expect(characterColors.size).toBe(7);
  });
});
