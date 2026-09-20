import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { AgentWorkspaceMemory } from '../../src/simulation/behavior/AgentWorkspaceMemory';
import { AgentInteractionManager } from '../../src/simulation/behavior/AgentInteractionManager';
import { AgentBehaviorEngine } from '../../src/simulation/behavior/AgentBehaviorEngine';
import {
  DIRECTOR_SEQUENCES,
  VISION_SEQUENCES,
  STRATEGIST_SEQUENCES,
  WRITER_SEQUENCES,
  HUNTER_SEQUENCES,
  MIRROR_SEQUENCES,
  AMBIENT_SEQUENCES,
} from '../../src/simulation/behavior/AgentSequences';

test.describe('Agent Workspace Memory Tests', () => {
  test('Initializes default workspace memory for all 6 agents with correct types', () => {
    const memory = new AgentWorkspaceMemory();
    const all = memory.getAllMemories();
    expect(all.length).toBe(6);

    const director = memory.getMemory(1);
    expect(director?.role).toBe('Director');
    expect(director?.itemType).toBe('folder');
    expect(director?.count).toBe(0);

    const vision = memory.getMemory(2);
    expect(vision?.role).toBe('Vision');
    expect(vision?.itemType).toBe('paper');

    const hunter = memory.getMemory(5);
    expect(hunter?.role).toBe('Hunter');
    expect(hunter?.itemType).toBe('card');
  });

  test('Records progress and increments item counter with custom stage names', () => {
    const memory = new AgentWorkspaceMemory();
    memory.recordProgress(4, 'Drafted 3 STAR bullets for Senior Engineer role', 'STAR Optimization V2');

    const writer = memory.getMemory(4);
    expect(writer?.count).toBe(1);
    expect(writer?.stageName).toBe('STAR Optimization V2');
    expect(writer?.items.length).toBe(1);
    expect(writer?.items[0].title).toBe('Drafted 3 STAR bullets for Senior Engineer role');
  });

  test('Caps historical workspace items at 20', () => {
    const memory = new AgentWorkspaceMemory();
    for (let i = 1; i <= 25; i++) {
      memory.recordProgress(1, `Architecture Directive #${i}`);
    }

    const director = memory.getMemory(1);
    expect(director?.count).toBe(25);
    expect(director?.items.length).toBe(20);
    expect(director?.items[0].title).toBe('Architecture Directive #25');
  });
});

test.describe('Agent Behavior Sequences Spec Tests', () => {
  test('Director coding sprint has high priority (2) and multiple structured steps', () => {
    const seq = DIRECTOR_SEQUENCES.activeCodingSprint(1);
    expect(seq.priority).toBe(2);
    expect(seq.steps.length).toBeGreaterThanOrEqual(3);
    expect(seq.steps[0].semanticState).toBe('WRITING');
    expect(seq.steps[1].semanticState).toBe('WORKING');
  });

  test('Vision ATS Scan adapts dynamically based on ATS score threshold', () => {
    const highAts = VISION_SEQUENCES.atsScanRoutine(2, 92);
    expect(highAts.steps[highAts.steps.length - 1].expression).toBe('happy');

    const lowAts = VISION_SEQUENCES.atsScanRoutine(2, 58);
    expect(lowAts.steps.some(s => s.semanticState === 'ERROR')).toBe(true);
  });

  test('Writer document slip micro-failure has low frequency and recovers gracefully', () => {
    const clumsySeq = WRITER_SEQUENCES.documentSlipCatch(4);
    expect(clumsySeq.priority).toBe(5);
    expect(clumsySeq.steps.some(s => s.expression === 'surprised')).toBe(true);
    expect(clumsySeq.steps.some(s => s.expression === 'happy')).toBe(true);
  });
});

test.describe('Agent Behavior Engine Logic Tests', () => {
  function createMockController() {
    const positions: Record<number, THREE.Vector3> = {
      1: new THREE.Vector3(0, 0, 0),
      2: new THREE.Vector3(2, 0, 0),
      3: new THREE.Vector3(4, 0, 0),
      4: new THREE.Vector3(6, 0, 0),
      5: new THREE.Vector3(8, 0, 0),
      6: new THREE.Vector3(10, 0, 0),
    };

    return {
      play: (_idx: number, _anim: string) => {},
      setExpression: (_idx: number, _expr: string) => {},
      moveTo: (_idx: number, _pos: THREE.Vector3) => true,
      getCPUPosition: (idx: number) => positions[idx] || new THREE.Vector3(0, 0, 0),
      poiManager: {
        getFreePois: () => [],
        getPoi: (_id: string) => null,
      },
      characterManager: {
        setExpression: (_idx: number, _expr: string) => {},
      },
    } as any;
  }

  test('Engine triggers sequences and updates runtime states correctly', () => {
    const mockController = createMockController();
    const memory = new AgentWorkspaceMemory();
    const interaction = new AgentInteractionManager(mockController, memory);
    const engine = new AgentBehaviorEngine(mockController, interaction, memory);

    const triggered = engine.triggerSequence(DIRECTOR_SEQUENCES.activeCodingSprint(1));
    expect(triggered).toBe(true);
    expect(engine.hasActiveSequence(1)).toBe(true);

    const runtime = engine.getRuntimeState(1);
    expect(runtime?.semanticState).toBe('WRITING');
    expect(runtime?.stepIndex).toBe(1);
    expect(runtime?.totalSteps).toBeGreaterThanOrEqual(3);
  });

  test('Higher priority sequence interrupts lower priority sequence', () => {
    const mockController = createMockController();
    const memory = new AgentWorkspaceMemory();
    const interaction = new AgentInteractionManager(mockController, memory);
    const engine = new AgentBehaviorEngine(mockController, interaction, memory);

    // 1. Trigger ambient sequence (priority 5)
    engine.triggerSequence(AMBIENT_SEQUENCES.keyboardCorrection(4));
    expect(engine.getRuntimeState(4)?.priority).toBe(5);

    // 2. Trigger high-priority workflow sequence (priority 2)
    const success = engine.triggerSequence(WRITER_SEQUENCES.resumeForgeOptimizing(4, 85));
    expect(success).toBe(true);
    expect(engine.getRuntimeState(4)?.priority).toBe(2);
    expect(engine.getRuntimeState(4)?.semanticState).toBe('READING');
  });

  test('CoreStore ATS_SCORE event triggers Vision & Writer sequences and updates memory', () => {
    const mockController = createMockController();
    const memory = new AgentWorkspaceMemory();
    const interaction = new AgentInteractionManager(mockController, memory);
    const engine = new AgentBehaviorEngine(mockController, interaction, memory);

    engine.handleCoreStoreEvent('ATS_SCORE', { score: 88 });

    expect(engine.hasActiveSequence(2)).toBe(true); // Vision active
    expect(engine.hasActiveSequence(4)).toBe(true); // Writer active

    const visionMemory = memory.getMemory(2);
    expect(visionMemory?.count).toBe(1);
    expect(visionMemory?.items[0].title).toContain('ATS Audit Score: 88%');
  });

  test('Step timer advances steps deterministically in update tick', () => {
    const mockController = createMockController();
    const memory = new AgentWorkspaceMemory();
    const interaction = new AgentInteractionManager(mockController, memory);
    const engine = new AgentBehaviorEngine(mockController, interaction, memory);

    const seq = DIRECTOR_SEQUENCES.activeCodingSprint(1);
    engine.triggerSequence(seq);

    const firstStepDuration = seq.steps[0].duration;
    // Advance time by first step duration + 0.1s
    engine.update(firstStepDuration + 0.1);

    const runtime = engine.getRuntimeState(1);
    expect(runtime?.stepIndex).toBe(2);
    expect(runtime?.semanticState).toBe(seq.steps[1].semanticState);
  });
});
