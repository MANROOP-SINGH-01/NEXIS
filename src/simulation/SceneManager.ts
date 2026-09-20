import * as THREE from 'three/webgpu';
import { getAgentSet, getAllAgents, AgenticSystem } from '../data/agents';
import { CharacterController } from './CharacterController';
import { Engine } from './core/Engine';
import { Stage } from './core/Stage';
import { DriverManager } from './drivers/DriverManager';
import { CharacterManager } from './entities/CharacterManager';
import { InputManager } from './input/InputManager';
import { NavMeshManager } from './pathfinding/NavMeshManager';
import { PoiManager } from './world/PoiManager';
import { WorldManager } from './world/WorldManager';
import { ObstacleSystem } from './physics/ObstacleSystem';

import { AgentSimulation } from './core/AgentSimulation';
import { useCoreStore } from '../integration/store/coreStore';
import { getActiveAgentSet, useTeamStore } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { AgentBehavior, ChatMessage } from '../types';
import { BUBBLE_Y_OFFSET } from './constants';
import { AgentBehaviorEngine } from './behavior/AgentBehaviorEngine';
import { AgentInteractionManager } from './behavior/AgentInteractionManager';
import { AgentWorkspaceMemory } from './behavior/AgentWorkspaceMemory';

function buildDirectorLocalReply(message: string, state: ReturnType<typeof useCoreStore.getState>): string {
  const text = String(message || '').toLowerCase()
  const hasResume = !!state.currentResume.content.trim()
  const hasJD = !!state.currentResume.targetJD.trim()
  const hasAnalysis = !!state.hasResumeAnalysis
  const hasJobs = (state.discoveredJobs || []).length > 0

  const dictionary: Array<{ when: RegExp; reply: string }> = [
    {
      when: /(next|what now|plan|roadmap|sequence)/,
      reply: 'Next sequence: 1) refine top 6 bullets for JD impact, 2) verify proof-of-work links, 3) run Nexus-Hunter for 3 prime targets, 4) simulate interview pressure round.',
    },
    {
      when: /(ats|keyword|match|alignment|score)/,
      reply: 'For ATS lift, mirror JD nouns in summary + first 3 bullets, keep quantified outcomes, and remove generic filler. I can suggest exact keyword clusters if you paste the JD priority lines.',
    },
    {
      when: /(interview|mirror|question|grill)/,
      reply: 'Use Nexus-Mirror in two passes: pass A baseline answers, pass B recursive grill. Focus on architecture decisions, latency trade-offs, and one concrete production metric per answer.',
    },
    {
      when: /(job|apply|hunter|target|blue ocean)/,
      reply: 'For applications, prioritize direct career pages with high technical match and lower crowding. Shortlist 3 prime targets, tailor intro lines per role, then submit in a focused batch.',
    },
    {
      when: /(project|github|portfolio|proof|evidence)/,
      reply: 'Convert projects to proof blocks: problem, architecture choice, trade-off, impact metric, and repo or demo link. This increases trust faster than generic skill lists.',
    },
  ]

  for (const rule of dictionary) {
    if (rule.when.test(text)) return `Nexus-Director: ${rule.reply}`
  }

  if (!hasResume) {
    return 'Nexus-Director: Start with resume input first. Upload or paste your resume so I can generate role-aligned edits and strategy.'
  }
  if (!hasJD) {
    return 'Nexus-Director: Paste the target JD next. I will extract hiring intent, rank priorities, and map your strongest evidence against role requirements.'
  }
  if (!hasAnalysis) {
    return 'Nexus-Director: Run Phase 1 now. That gives ATS, gap analysis, and a submission-ready draft we can iterate with precision.'
  }
  if (!hasJobs) {
    return 'Nexus-Director: Your resume is ready for market targeting. Open Nexus-Hunter and generate prime targets, then we can optimize application order.'
  }
  return 'Nexus-Director: You are in optimization mode. Pick one target role, tighten the first 5 bullets for that role, and run one pressure interview loop before applying.'
}

/**
 * SceneManager — Visual Integration Layer.
 * 
 * DESIGN PRINCIPLE: Visual Reflex of Logic.
 * 1. Subscribes to the Store to Decouple logic from 3D.
 * 2. Visual actions are fire-and-forget.
 * 3. Smart POI assignment ensures NPCs find desks even with diverse GLB names.
 */
export class SceneManager {
  private engine: Engine;
  private stage: Stage;
  private characterManager: CharacterManager;
  private controller: CharacterController | null = null;
  private navMesh: NavMeshManager;
  private poiManager: PoiManager;
  private worldManager: WorldManager;
  private driverManager: DriverManager | null = null;
  private simulation: AgentSimulation | null = null;
  private workspaceMemory: AgentWorkspaceMemory | null = null;
  private interactionManager: AgentInteractionManager | null = null;
  private behaviorEngine: AgentBehaviorEngine | null = null;
  private inputManager: InputManager | null = null;
  public isLoaded: boolean = false;

  private lastAgentSetId: string | null = null;
  private selectedIndex: number | null = null;
  private coreHandler: ((npcIndex: number, text: string) => Promise<string | null>) | null = null;

  private unsubs: (() => void)[] = [];
  private isDisposed = false;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.engine = new Engine(container);
    this.stage = new Stage(this.engine.renderer.domElement);
    this.characterManager = new CharacterManager(this.stage.scene, this.stage.camera);
    this.navMesh = new NavMeshManager();
    this.poiManager = new PoiManager();
    this.characterManager.setPoiManager(this.poiManager);
    this.worldManager = new WorldManager(this.stage.scene, this.navMesh, this.poiManager);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    const activeSet = getActiveAgentSet();
    this.simulation = new AgentSimulation(activeSet);
    this.setCoreHandler((idx, text) => this.simulation!.handleUserMessage(idx, text));
    
    this.init();
    this.startWatchingCoreStore();
    this.engine.onLowFps(() => {
      console.warn('[SceneManager] FPS persistently low. Triggering 2D Fallback HUD.');
      useUiStore.getState().setLowFpsFallback(true);
    });
  }

  private startWatchingCoreStore() {
    this.unsubs.push(
      useCoreStore.subscribe((state, prevState) => {
        // Feed real-time events into deterministic behavior engine
        if (this.behaviorEngine) {
          // 1. Resume content uploaded
          if (state.currentResume.content && state.currentResume.content !== prevState.currentResume.content) {
            this.behaviorEngine.handleCoreStoreEvent('RESUME_UPLOAD', { content: state.currentResume.content });
          }

          // 2. ATS Score calculation updated
          const curAts = state.currentResume?.atsScore ?? state.resumeAnalysis?.atsCompatibility ?? null;
          const prevAts = prevState.currentResume?.atsScore ?? prevState.resumeAnalysis?.atsCompatibility ?? null;
          if (curAts !== null && curAts !== prevAts) {
            this.behaviorEngine.handleCoreStoreEvent('ATS_SCORE', { score: curAts });
          }

          // 3. Discovered jobs count
          const curJobs = (state.discoveredJobs || []).length;
          const prevJobs = (prevState.discoveredJobs || []).length;
          if (curJobs !== prevJobs && curJobs > 0) {
            this.behaviorEngine.handleCoreStoreEvent('JOBS_FOUND', { count: curJobs });
          }

          // 4. Task status transitions
          state.tasks.forEach(t => {
            const pt = prevState.tasks.find(old => old.id === t.id);
            if (!pt || pt.status !== t.status) {
              if (t.status === 'in_progress') {
                this.behaviorEngine!.handleCoreStoreEvent('TASK_PROGRESS', { agentId: t.assignedAgentId, title: t.title });
              } else if (t.status === 'done') {
                this.behaviorEngine!.handleCoreStoreEvent('TASK_DONE', { agentId: t.assignedAgentId, title: t.title });
              }
            }
          });
        }

        const agentIndices = Array.from(new Set(state.tasks.flatMap(t => [t.assignedAgentId].filter(id => id !== undefined && id !== 0))));

        agentIndices.forEach(id => {
          const myTasks = state.tasks.filter(t => t.assignedAgentId === id);
          const hasChange = myTasks.some(t => {
            const pt = prevState.tasks.find(old => old.id === t.id);
            return !pt || pt.status !== t.status;
          });
          
          if (!hasChange) return;

          const onHold = myTasks.find(t => t.status === 'on_hold');
          const inProgress = myTasks.find(t => t.status === 'in_progress');
          const justDone = myTasks.some(t => t.status === 'done' && !prevState.tasks.find(pt => pt.id === t.id && pt.status === 'done'));

          if (onHold) {
            this.moveNpcToBoardroom(id);
          } else if (inProgress) {
            this.setNpcWorking(id, true);
          } else if (justDone) {
            this.setNpcWorking(id, false);
            this.moveNpcToSpawn(id);
          }
        });

        // ── Proficiently ATS Workflow 3D Simulation Sync ────────────
        if (state.activeProposal && !prevState.activeProposal) {
          this.setNpcWorking(5, true);
        } else if (!state.activeProposal && prevState.activeProposal) {
          this.setNpcWorking(5, false);
        }
      })
    );
  }

  private async init() {
    await this.engine.init();
    if (this.isDisposed) return;

    await this.worldManager.load();
    await this.characterManager.load();
    if (this.isDisposed) return;

    const state = useUiStore.getState();
    this.characterManager.setInstanceCount(state.instanceCount);
    this.controller = new CharacterController(this.characterManager, this.navMesh, this.poiManager);
    
    // Instantiate Bauhaus Behavior System
    this.workspaceMemory = new AgentWorkspaceMemory();
    this.interactionManager = new AgentInteractionManager(this.controller, this.workspaceMemory);
    this.behaviorEngine = new AgentBehaviorEngine(this.controller, this.interactionManager, this.workspaceMemory);

    if (typeof window !== 'undefined') {
      (window as any).__behaviorEngine = this.behaviorEngine;
      (window as any).__workspaceMemory = this.workspaceMemory;
      (window as any).__interactionManager = this.interactionManager;
    }

    this.driverManager = new DriverManager(this.controller, this.behaviorEngine);
    
    const activeSet = getActiveAgentSet();
    const playerIndex = activeSet.user.index;
    this.driverManager.registerPlayer(playerIndex);

    getAllAgents(activeSet).forEach((agent) => {
      if (agent.index !== playerIndex) this.driverManager!.registerNpc(agent.index, agent);
    });

    // Seat agents at their designated workstation desks on initial load
    this.controller.warpAllToSpawn(playerIndex, getAllAgents(activeSet).map(a => a.index));

    this.inputManager = new InputManager(
      this.engine.renderer.domElement, this.stage.camera,
      () => this.controller!.getCPUPositions(), () => this.controller!.getCount(),
      (idx) => {
        if (useUiStore.getState().isChatting) useUiStore.getState().setChatting(false);
        this.selectedIndex = idx !== activeSet.user.index ? idx : null;
        useUiStore.getState().setSelectedNpc(this.selectedIndex);
        if (idx !== null && this.controller) {
          this.controller.playClickReaction(idx);
        }
      },
      (x, z) => this.driverManager?.getPlayerDriver().onFloorClick(x, z),
      (idx, pos) => {
        useUiStore.getState().setHoveredNpc(idx, pos);
        const hoveredPart = this.inputManager?.getHoveredBodyPart() ?? null;
        this.characterManager.getPhysicsSystem()?.setHoveredIndex(idx, hoveredPart);
      },
      () => this.poiManager.getAllPois(),
      (id, label, pos) => useUiStore.getState().setHoveredPoi(id, label, pos),
      (id) => this.driverManager?.getPlayerDriver().onPoiClick(id),
      (idx, pos) => {
        useUiStore.getState().setAgentStatus(idx, 'dragged');
        this.characterManager.setPosition(idx, pos);
      },
      (idx) => {
        useUiStore.getState().setAgentStatus(idx, 'idle');
        this.moveNpcToSpawn(idx); // agent paths back to default position on release
      },
      this.worldManager.getOffice() ?? undefined, (p) => this.navMesh.isPointOnNavMesh(p),
      (idx, pointerNDC, hitPointWorld, bodyPart = 'chest') => {
        this.stage.controls.enabled = false;

        // Select distinct picking up action and state based on grabbed body part
        let grabState: import('../types').CharacterStateKey = 'grabbed_body';
        if (bodyPart === 'head') {
          grabState = 'grabbed_head';
        } else if (bodyPart.includes('arm') || bodyPart.includes('hand')) {
          grabState = 'grabbed_arm';
        } else if (bodyPart.includes('leg') || bodyPart.includes('foot') || bodyPart.includes('calf') || bodyPart.includes('thigh')) {
          grabState = 'grabbed_leg';
        }

        this.controller?.play(idx, grabState);
        this.characterManager.setPhysicsMode(idx, AgentBehavior.PHYSICAL);
        useUiStore.getState().setAgentStatus(idx, 'dragged');

        const phys = this.characterManager.getPhysicsSystem();
        if (phys) {
          const livePos = this.controller?.getCPUPosition(idx);
          phys.handlePointerDown(idx, pointerNDC, hitPointWorld, -1, livePos ?? undefined, undefined, bodyPart);
          const ctrl = phys.getController(idx);
          if (ctrl) {
            ctrl.onStateChange = (state) => {
              if (state === 'AIRBORNE') {
                this.controller?.play(idx, 'airborne');
              } else if (state === 'IMPACT') {
                this.controller?.play(idx, 'impact');
              } else if (state === 'RECOVERING' || state === 'SETTLING') {
                const recoveryVariations: import('../types').CharacterStateKey[] = [
                  'recover_scratch',      // Picks self up + scratches head bewildered (user requested!)
                  'recover_cheer',        // Picks self up + dusts off & celebrates
                  'recover_fist_shake',   // Picks self up + shakes fist at user
                  'recover_dazed',        // Rapid dizzy shake-off
                ];
                const selected = recoveryVariations[Math.floor(Math.random() * recoveryVariations.length)];
                this.controller?.play(idx, selected);
              } else if (state === 'IDLE') {
                // Ensure landing position is completely clear of structures
                const safeLandingPos = ObstacleSystem.findSafeFloorPosition(
                  ctrl.physics.position,
                  ObstacleSystem.AGENT_RADIUS,
                  this.navMesh
                );
                ctrl.physics.position.copy(safeLandingPos);
                this.characterManager.setPosition(idx, safeLandingPos);

                // Synchronize character facing with landing orientation to prevent abrupt snapping
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ctrl.physics.orientation);
                this.characterManager.setFacing(idx, forward.x, forward.z);
                this.characterManager.setPhysicsMode(idx, AgentBehavior.IDLE);
                
                // Only force 'idle' if not currently playing a multi-step recovery sequence
                const curState = this.controller?.getState(idx);
                if (!curState || (!curState.startsWith('recover') && curState !== 'impact')) {
                  this.controller?.play(idx, 'idle');
                }
                useUiStore.getState().setAgentStatus(idx, 'idle');

                // Return NPC back to their designated workstation desk after finishing recovery
                const isUser = idx === getActiveAgentSet().user.index;
                if (!isUser) {
                  setTimeout(() => {
                    const latestState = this.controller?.getState(idx);
                    if (latestState === 'idle') {
                      this.moveNpcToSpawn(idx);
                    }
                  }, 2400);
                }
              }
            };
          }
        }
      },
      (pointerNDC, delta) => {
        const phys = this.characterManager.getPhysicsSystem();
        if (phys) {
          phys.handlePointerMove(pointerNDC, delta);
        }
      },
      (idx) => {
        this.stage.controls.enabled = true;
        const phys = this.characterManager.getPhysicsSystem();
        if (phys) {
          phys.handlePointerUp();
        }
      }
    );

    this.engine.renderer.setAnimationLoop(this.animate.bind(this));
    this.isLoaded = true;

    this.unsubs.push(useUiStore.subscribe((s, prev) => {
      if (s.instanceCount !== prev.instanceCount) this.controller?.setInstanceCount(s.instanceCount);
      if (s.activeSidebarTab !== prev.activeSidebarTab && s.activeSidebarTab) {
        this.behaviorEngine?.handleUserTabChange(s.activeSidebarTab);
      }
      const team = useTeamStore.getState();
      if (team.selectedAgentSetId !== this.lastAgentSetId) {
        this.lastAgentSetId = team.selectedAgentSetId;
        const set = getAgentSet(team.selectedAgentSetId, team.customSystems);
        this.reinitializeSimulation(set);
        this.worldManager.updateThemeColor(set.color);
        if (this.controller) {
          this.controller.setColors();
          this.controller.warpAllToSpawn(set.user.index, getAllAgents(set).map(a => a.index));
        }
      }
      if ((s.isChatting !== prev.isChatting || s.isThinking !== prev.isThinking || s.isTyping !== prev.isTyping) && this.controller) {
        const set = getActiveAgentSet();
        if (s.isChatting && !prev.isChatting && s.selectedNpcIndex !== null) {
           this._startChatVisuals(s.selectedNpcIndex);
        }
        
        if (s.isChatting && s.selectedNpcIndex !== null) {
          const npc = s.selectedNpcIndex, user = set.user.index;
          if (this.controller.getState(npc) !== 'walk') this.controller.play(npc, s.isThinking ? 'talk' : 'listen');
          this.controller.setSpeaking(npc, s.isThinking);
          if (this.controller.getState(user) !== 'walk') this.controller.play(user, s.isTyping ? 'talk' : 'listen');
          this.controller.setSpeaking(user, s.isTyping);
        } else if (!s.isChatting && prev.isChatting) {
          // Cleanup Chat Visuals
          const npc = prev.selectedNpcIndex;
          const user = set.user.index;
          if (npc !== null) {
            this.driverManager?.getNpcDriver(npc)?.setChatting(false);
            this.controller.setSpeaking(npc, false);
            this.controller.play(npc, 'idle');
            this.controller.poiManager.releaseAll(npc);
          }
          this.controller.setSpeaking(user, false);
          this.controller.play(user, 'idle');
          this.selectedIndex = null;
        }
      }

      // Monitor individual agent status changes for autonomous animations
      if (s.agentStatuses !== prev.agentStatuses && this.controller) {
        Object.keys(s.agentStatuses).forEach(key => {
          const idx = parseInt(key);
          const status = s.agentStatuses[idx];
          const prevStatus = prev.agentStatuses[idx];
          if (status !== prevStatus) {
             if (status === 'talking') this.setNpcTalking(idx, true);
             else if (prevStatus === 'talking') this.setNpcTalking(idx, false);
             
             if (status === 'working') this.setNpcWorking(idx, true);
             else if (prevStatus === 'working') this.setNpcWorking(idx, false);
             
             if (status === 'success') {
               this.controller!.play(idx, 'success');
               setTimeout(() => useUiStore.getState().setAgentStatus(idx, 'idle'), 3000);
             } else if (status === 'error') {
               this.controller!.play(idx, 'error');
               setTimeout(() => useUiStore.getState().setAgentStatus(idx, 'idle'), 3000);
             } else if (status === 'dragged') {
               this.controller!.play(idx, 'dragged');
             } else if (prevStatus === 'dragged' && status === 'idle') {
               this.controller!.play(idx, 'idle');
             }
          }
        });
      }
    }));
  }

  private _startChatVisuals(npcIndex: number): void {
    if (!this.controller) return;
    const pos = this.controller.getCPUPositions(); if (!pos) return;
    const set = getActiveAgentSet();
    const npc = new THREE.Vector3(pos[npcIndex * 4], 0, pos[npcIndex * 4 + 2]);
    const player = new THREE.Vector3(pos[set.user.index * 4], 0, pos[set.user.index * 4 + 2]);
    let dir = new THREE.Vector3().subVectors(player, npc).normalize();
    if (dir.length() < 0.01) dir.set(1, 0, 0);
    const target = npc.clone().addScaledVector(dir, 1.2);

    this.selectedIndex = npcIndex;
    this.driverManager?.getNpcDriver(npcIndex)?.setChatting(true);
    this.controller.cancelMovement(npcIndex);
    this.controller.play(npcIndex, 'listen');
    this.controller.getAgentStateBuffer()?.setWaypoint(npcIndex, dir.x, dir.z);
    this.driverManager?.getPlayerDriver()?.walkTo(target, 'listen', () => {
      const p = this.controller!.getCPUPositions()!;
      const fx = p[npcIndex * 4] - p[set.user.index * 4], fz = p[npcIndex * 4 + 2] - p[set.user.index * 4 + 2];
      this.controller!.getAgentStateBuffer()?.setWaypoint(set.user.index, fx, fz);
      this.controller!.getAgentStateBuffer()?.setWaypoint(npcIndex, -fx, -fz);
      this._triggerNpcGreeting(npcIndex);
    });
  }

  public startChat(npcIndex: number): void {
    useUiStore.getState().setChatting(true);
  }


  public async sendMessage(text: string): Promise<void> {
    const { selectedNpcIndex, isThinking } = useUiStore.getState();
    if (selectedNpcIndex === null || isThinking) return;
    useCoreStore.setState((s) => ({
      agentHistories: { ...s.agentHistories, [selectedNpcIndex!]: [...(s.agentHistories[selectedNpcIndex!] || []), { role: 'user', content: text }] }
    }));
    useUiStore.setState({ isThinking: true, isTyping: false });
    try {
      const activeSet = getActiveAgentSet();
      if (selectedNpcIndex === activeSet.leadAgent.index) {
        const context = (() => {
          const s = useCoreStore.getState();
          return `Resume:\n${s.currentResume.content || ''}\n\nJD:\n${s.currentResume.targetJD || ''}`;
        })();

        const history = (useCoreStore.getState().agentHistories[selectedNpcIndex] || []).slice(-8);

        const response = await fetch('/api/chat/director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context,
            key: 'AIzaSyB4HpGrIfcWEY6_GmTP52MvcLHlML7FZwQ',
            history,
          }),
        });

        const raw = await response.text();
        let json: any = null;
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }

        const reply = response.ok
          ? (json?.reply || buildDirectorLocalReply(text, useCoreStore.getState()))
          : buildDirectorLocalReply(text, useCoreStore.getState())
        useCoreStore.setState((s) => ({
          agentHistories: {
            ...s.agentHistories,
            [selectedNpcIndex!]: [
              ...(s.agentHistories[selectedNpcIndex!] || []),
              { role: 'assistant', content: reply },
            ],
          },
        }));

        if (!response.ok || json?.warning) {
          useCoreStore.getState().addNexusActivityEntry({
            agentType: 'director',
            action: 'Director Chat Fallback Notice',
            result: json?.warning || `Director API returned ${response.status}. Used local strategy reply.`,
            impact: 'warning',
          });
        }
      } else if (this.coreHandler) {
        await this.coreHandler(selectedNpcIndex!, text);
      }
      useUiStore.setState({ isThinking: false });
    } catch (err) {
      console.error('[SceneManager] sendMessage error:', err);
      const fallbackReply = buildDirectorLocalReply(text, useCoreStore.getState())
      useCoreStore.setState((s) => ({
        agentHistories: {
          ...s.agentHistories,
          [selectedNpcIndex!]: [
            ...(s.agentHistories[selectedNpcIndex!] || []),
            { role: 'assistant', content: fallbackReply },
          ],
        },
      }))
      useUiStore.setState({ isThinking: false });
    }
  }

  private reinitializeSimulation(activeSet: AgenticSystem) {
    if (this.simulation) this.simulation.dispose();
    this.simulation = new AgentSimulation(activeSet);
    this.setCoreHandler((idx, text) => this.simulation!.handleUserMessage(idx, text));
    if (this.driverManager) {
      const playerIndex = activeSet.user.index;
      this.driverManager.dispose();
      this.driverManager.registerPlayer(playerIndex);
      getAllAgents(activeSet).forEach((a) => {
        if (a.index !== playerIndex) this.driverManager!.registerNpc(a.index, a);
      });
    }
  }
  public setCoreHandler(handler: ((npcIndex: number, text: string) => Promise<string | null>) | null): void {
    this.coreHandler = handler;
  }

  public getLeadBrain() {
    if (!this.simulation) return null;
    const set = getActiveAgentSet();
    const lead = this.simulation.getAgent(set.leadAgent.index);
    return lead?.brain || null;
  }

  /** 
   * SMART DESK ASSIGNMENT
   * Attempts to find a work POI. If work-${index} is missing, it picks 
   * a desk from the 'sit_work' group based on the agent's unique index.
   */
  public setNpcWorking(index: number, working: boolean): void {
    if (!this.controller) return;
    if (working) {
      const id = `sit_work-${index}`;
      let poi = this.poiManager.getPoi(id);
      if (!poi) {
         // Smart fallback: assign a desk based on order (agent index is 1-based)
         const desks = this.poiManager.getPoisByPrefix('sit_work');
         if (desks.length > 0) poi = desks[(index - 1) % desks.length];
      }
      if (poi) this.controller.walkToPoi(index, poi.id);
    }
  }
  
  public setNpcTalking(index: number, talking: boolean): void {
    if (!this.controller) return;
    if (talking) {
      if (this.controller.getState(index) !== 'walk') this.controller.play(index, 'talk');
      this.controller.setSpeaking(index, true);
    } else {
      this.controller.setSpeaking(index, false);
      const task = useCoreStore.getState().tasks.find(t => t.status === 'on_hold' && t.assignedAgentId === index);
      this.controller.play(index, task ? 'listen' : 'idle');
    }
  }

  public moveNpcToBoardroom(index: number): void {
    if (!this.controller) return;
    const poi = this.poiManager.getPoi('area-boardroom') || this.poiManager.getPoi('boardroom');
    if (poi) {
      this.controller.walkToPoi(index, poi.id, () => {
        const core = useCoreStore.getState();
        const t = core.tasks.find(t => t.status === 'on_hold' && t.assignedAgentId === index);
      });
    }
  }

  public getPhysicsSystem() {
    return this.characterManager.getPhysicsSystem();
  }

  public moveNpcToSpawn(index: number, onArrival?: () => void): void {
    if (!this.controller) return;

    let poi = this.poiManager.getPoi(`sit_work-${index}`);
    if (!poi) {
      poi = this.poiManager.getPoi(`sit_idle-${((index - 1) % 4) + 1}`);
    }
    if (!poi) {
      poi = this.poiManager.getPoi(`spawn-${index}`) ||
            this.poiManager.getPoi(`idle-spawn-${index}`);
    }

    if (!poi) {
      onArrival?.();
      return;
    }

    // Ensure the returning agent can reclaim their own workstation
    if (poi.occupiedBy !== null && poi.occupiedBy !== index) {
      this.poiManager.releaseAll(index);
      poi.occupiedBy = null;
    }

    const currentPos = this.controller.getCPUPosition(index);
    const walked = this.controller.walkToPoi(index, poi.id, () => {
      onArrival?.();
    }, currentPos ?? undefined);

    // Fallback if pathfinding fails (e.g. dropped off navmesh or obstructed)
    if (!walked) {
      const isSitVariant = poi.arrivalState === 'sit_work' || poi.arrivalState === 'sit_idle' || poi.id.includes('sit');
      if (isSitVariant) {
        this.controller.prepareSitDown(index, poi.arrivalState as any);
      }
      this.characterManager.setPosition(index, poi.position);
      if (!poi.id.startsWith('area')) {
        this.characterManager.setOrientation(index, poi.quaternion);
      }
      this.characterManager.setPhysicsMode(index, isSitVariant ? AgentBehavior.SEATED : AgentBehavior.IDLE);
      this.controller.play(index, isSitVariant ? (poi.id.includes('work') ? 'sit_work' : 'sit_idle') : poi.arrivalState);
      this.poiManager.releaseAll(index);
      this.poiManager.occupy(poi.id, index);
      onArrival?.();
    }
  }

  private async _triggerNpcGreeting(idx: number): Promise<void> {
    const set = getActiveAgentSet();
    const agent = getAllAgents(set).find(a => a.index === idx);
    if (!agent) return;
    useUiStore.setState({ isThinking: true });
    const msg: ChatMessage = { role: 'assistant', text: `Hello. I am ${agent.name}. How can I assist you?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    useUiStore.setState({ chatMessages: [msg], isThinking: false });
  }

  public onResize() { 
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.stage.onResize(w, h);
    if (!useCoreStore.getState().isResizing) this.engine.onResize(w, h);
  }

  public attachTo(newContainer: HTMLElement) {
    if (!newContainer || this.isDisposed) return;
    if (this.engine.renderer.domElement.parentElement !== newContainer) {
      newContainer.appendChild(this.engine.renderer.domElement);
    }
    if (this.container !== newContainer) {
      this.container = newContainer;
      this.resizeObserver.disconnect();
      this.resizeObserver.observe(newContainer);
    }
    this.onResize();
  }

  public resumeFromFallback() {
    this.engine.suppressLowFps(true);
    useUiStore.getState().setLowFpsFallback(false);

    if (this.container && this.engine.renderer.domElement.parentElement !== this.container) {
      this.container.appendChild(this.engine.renderer.domElement);
    }

    this.engine.timer.update();

    if (this.stage) {
      if (!Number.isFinite(this.stage.camera.position.x) ||
          !Number.isFinite(this.stage.camera.position.y) ||
          !Number.isFinite(this.stage.camera.position.z)) {
        this.stage.camera.position.set(10, 8, 15);
      }
      if (!Number.isFinite(this.stage.controls.target.x) ||
          !Number.isFinite(this.stage.controls.target.y) ||
          !Number.isFinite(this.stage.controls.target.z)) {
        this.stage.controls.target.set(0, 0.8, 0);
      }
    }

    this.onResize();
    this.engine.render(this.stage.scene, this.stage.camera);
  }

  private animate() {
    this.engine.timer.update();
    const rawDelta = this.engine.timer.getDelta();
    const delta = Math.min(Math.max(rawDelta, 0.001), 0.1);

    this.stage.update();
    this.controller?.update(delta, this.engine.renderer);
    this.behaviorEngine?.update(delta);
    this.interactionManager?.update(delta);
    this.controller?.syncFromGPU(this.engine.renderer).then((pos) => {
      if (!pos || !this.controller) return;
      this.resolveWorldAndAgentCollisions(pos);
      this.controller.updatePaths(pos, delta);
      this.driverManager?.update(pos, delta);
      this.updateTransparency(pos, delta);
    });

    const player = getActiveAgentSet().user.index;
    const targetPos = this.controller?.getCPUPosition(this.selectedIndex ?? player);
    if (targetPos && Number.isFinite(targetPos.x) && Number.isFinite(targetPos.y) && Number.isFinite(targetPos.z)) {
      this.stage.setFollowTarget(targetPos);
    } else {
      this.stage.setFollowTarget(null);
    }

    const { selectedNpcIndex, setSelectedPosition, selectedPosition } = useUiStore.getState();
    const npcScreenPositions: Record<number, { x: number; y: number }> = {};
    const rect = this.container.getBoundingClientRect();
    if (this.controller && rect.width > 0 && rect.height > 0) {
      let hasSignificantShift = false;
      const prev = useUiStore.getState().npcScreenPositions;
      for (let i = 0; i < this.controller.getCount(); i++) {
        const p = this.controller.getCPUPosition(i);
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) {
          const s = p.clone();
          s.y += BUBBLE_Y_OFFSET;
          s.project(this.stage.camera);
          const nx = Math.round((s.x * 0.5 + 0.5) * rect.width);
          const ny = Math.round((s.y * -0.5 + 0.5) * rect.height);
          npcScreenPositions[i] = { x: nx, y: ny };
          const old = prev[i];
          if (!old || Math.abs(old.x - nx) > 1 || Math.abs(old.y - ny) > 1) {
            hasSignificantShift = true;
          }
        }
      }
      if (hasSignificantShift) {
        useUiStore.setState({ npcScreenPositions });
      }
    }

    if (selectedNpcIndex !== null && npcScreenPositions[selectedNpcIndex]) {
      const p = npcScreenPositions[selectedNpcIndex];
      if (Math.abs(p.x - (selectedPosition?.x ?? 0)) > 0.5 || Math.abs(p.y - (selectedPosition?.y ?? 0)) > 0.5) setSelectedPosition(p);
    } else if (selectedPosition !== null) setSelectedPosition(null);

    this.stage.setChatMode(useUiStore.getState().isChatting, this.controller?.getAgentState(player) === AgentBehavior.GOTO);
    this.engine.render(this.stage.scene, this.stage.camera);
  }

  private resolveWorldAndAgentCollisions(pos: Float32Array): void {
    if (!this.controller) return;
    const count = this.controller.getCount();
    const phys = this.characterManager.getPhysicsSystem();
    const grabbedIdx = phys?.getActiveGrabbedIndex() ?? null;

    const agentVecs: THREE.Vector3[] = [];
    const seatedSet = new Set<number>();

    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3(pos[i * 4], pos[i * 4 + 1], pos[i * 4 + 2]);
      const stateKey = this.controller.getState(i);
      const isSeated = stateKey === 'sit_idle' || stateKey === 'sit_work' || stateKey === 'sit_down';

      if (isSeated) {
        seatedSet.add(i);
      } else if (i !== grabbedIdx) {
        // Enforce solid furniture & obstacle collision on standing/walking characters
        // If agent is in the final approach to their target POI / workstation chair (< 0.65m),
        // skip obstacle repulsion so they can enter their chair and sit down cleanly without pushback
        const isApproaching = this.controller.isApproachingDestination(i, 0.65);
        if (!isApproaching) {
          if (ObstacleSystem.resolveCollision(p)) {
            pos[i * 4] = p.x;
            pos[i * 4 + 1] = p.y;
            pos[i * 4 + 2] = p.z;
            this.characterManager.setPosition(i, p);
          }
        }
      }
      agentVecs.push(p);
    }

    // Mutual agent-to-agent push-apart separation
    if (ObstacleSystem.resolveAgentOverlap(agentVecs, undefined, grabbedIdx, seatedSet)) {
      for (let i = 0; i < count; i++) {
        if (i !== grabbedIdx && !seatedSet.has(i)) {
          pos[i * 4] = agentVecs[i].x;
          pos[i * 4 + 1] = agentVecs[i].y;
          pos[i * 4 + 2] = agentVecs[i].z;
          this.characterManager.setPosition(i, agentVecs[i]);
        }
      }
    }
  }

  private updateTransparency(pos: Float32Array, delta: number) {
    if (!this.controller) return;
    const count = this.controller.getCount(), buffer = this.controller.getAgentStateBuffer();
    if (!buffer) return;
    for (let i = 0; i < count; i++) {
      let overlap = false;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        if (Math.abs(pos[i * 4]) > 0.001 || Math.abs(pos[i * 4 + 2]) > 0.001) {
          const dx = pos[i * 4] - pos[j * 4];
          const dz = pos[i * 4 + 2] - pos[j * 4 + 2];
          if (dx * dx + dz * dz < 0.36) { overlap = true; break; }
        }
      }
      const cur = buffer.getAlpha(i), tar = overlap ? 0.6 : 1.0;
      if (Math.abs(cur - tar) > 0.01) {
        const nextAlpha = THREE.MathUtils.clamp(
          THREE.MathUtils.lerp(cur, tar, Math.min(delta * 2.0, 1.0)),
          0.4,
          1.0
        );
        buffer.setAlpha(i, nextAlpha);
      }
    }
  }

  public resetScene() {
    if (!this.controller) return;
    useUiStore.getState().setChatting(false);
    const set = getActiveAgentSet();
    getAllAgents(set).forEach((a) => this.controller?.setSpeaking(a.index, false));
    this.controller.warpAllToSpawn(set.user.index, getAllAgents(set).map(a => a.index));
    this.stage.setFollowTarget(null);
    this.stage.setChatMode(false, false);
  }

  public getBehaviorEngine(): AgentBehaviorEngine | null {
    return this.behaviorEngine;
  }

  public getWorkspaceMemory(): AgentWorkspaceMemory | null {
    return this.workspaceMemory;
  }

  public getInteractionManager(): AgentInteractionManager | null {
    return this.interactionManager;
  }

  public dispose() { this.isDisposed = true; this.resizeObserver.disconnect(); this.unsubs.forEach(u => u()); this.driverManager?.dispose(); this.engine.dispose(); }
}
