import { Maximize2, Minimize2, X, Activity, Cpu, Play, Compass, Eye, ArrowRight, ShieldCheck, Layers, ChevronRight, CheckSquare } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useLocale } from '../integration/hooks/useLocale';
import { getAllCharacters } from '../data/agents';
import UIOverlay from './UIOverlay';
import TeamFlowModal from './TeamFlowModal';
import { AuditModal } from './AuditModal';
import { ActionLogPanel } from './ActionLogPanel';
import PhaseOneControlPanel from './PhaseOneControlPanel';
import { colors } from '../theme/bauhaus';
import { SimulationActivityStream } from './simulation/SimulationActivityStream';
import { EvidenceInspectionPanel, Section15Finding } from './simulation/EvidenceInspectionPanel';
import { WorkQueueNavigator } from './simulation/WorkQueueNavigator';

interface SimulationViewProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}

const AGENT_SPECIALTIES: Record<string, string> = {
  'Director': 'Career Strategy & Pipeline Orchestration',
  'Vision': 'Visual UX & ATS Layout Optimization',
  'Strategist': 'Job Description Intent & Skill Gap Mining',
  'Writer': 'STAR-Metric Bullet & Resume Tailoring',
  'Hunter': 'Autonomous Blue Ocean Job Radar',
  'Mirror': 'Recursive Interview Pressure Simulation',
};

const AGENT_DEFAULT_TASKS: Record<string, string> = {
  'Director': 'Building unified career trajectory roadmap',
  'Vision': 'Scanning visual layout and recruiter eye-path',
  'Strategist': 'Synthesizing market competencies and role intent',
  'Writer': 'Drafting quantified achievement bullets',
  'Hunter': 'Indexing high-affinity direct company listings',
  'Mirror': 'Stress-testing technical and system claims',
};

const SimulationView: React.FC<SimulationViewProps> = ({ canvasRef, isFullscreen, setIsFullscreen }) => {
  const { selectedNpcIndex, activeAuditTaskId, setActiveAuditTaskId, setSelectedNpc, setAgentDrawerOpen, setAgentReviewQueueOpen } = useUiStore();
  const { isLogOpen, setLogOpen, tasks, agentStatuses, currentResume } = useCoreStore();
  const activeSet = useActiveTeam();
  const { t } = useLocale();
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [behaviorTick, setBehaviorTick] = useState(0);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Section15Finding | null>(null);
  const [isQueueNavOpen, setIsQueueNavOpen] = useState(false);

  // Poll runtime behavior state and desk workspace memory from simulation engine
  React.useEffect(() => {
    const timer = setInterval(() => {
      setBehaviorTick((t) => t + 1);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (activeAuditTaskId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [activeAuditTaskId]);

  const allCharacters = useMemo(() => getAllCharacters(activeSet), [activeSet]);
  const selectedAgent = useMemo(() => {
    if (selectedNpcIndex === null) return null;
    const found = allCharacters.find((a) => a.index === selectedNpcIndex);
    return found && found.index !== activeSet.user.index ? found : null;
  }, [selectedNpcIndex, allCharacters, activeSet.user.index]);

  const runtimeState = useMemo(() => {
    if (!selectedAgent || typeof window === 'undefined') return null;
    const engine = (window as any).__behaviorEngine;
    return engine?.getRuntimeState(selectedAgent.index) ?? null;
  }, [selectedAgent, behaviorTick]);

  const workspaceMemory = useMemo(() => {
    if (!selectedAgent || typeof window === 'undefined') return null;
    const mem = (window as any).__workspaceMemory;
    return mem?.getMemory(selectedAgent.index) ?? null;
  }, [selectedAgent, behaviorTick]);

  // Bauhaus status calculation for selected agent
  const selectedStatus = useMemo(() => {
    if (!selectedAgent) return { label: 'IDLE', icon: '○', color: '#111111' };
    if (runtimeState && runtimeState.semanticState !== 'IDLE') {
      const stateMap: Record<string, { label: string; icon: string; color: string }> = {
        'ANALYZING': { label: 'ANALYZING', icon: '■', color: '#2457A6' },
        'SCANNING': { label: 'SCANNING', icon: '■', color: '#2457A6' },
        'DRAFTING': { label: 'DRAFTING', icon: '■', color: '#173F7A' },
        'OPTIMIZING': { label: 'OPTIMIZING', icon: '■', color: '#2E7D32' },
        'INTERVIEWING': { label: 'INTERVIEWING', icon: '■', color: '#C92C2C' },
        'WAITING_HANDOFF': { label: 'HANDOFF', icon: '▲', color: '#F4C430' },
        'REVIEWING': { label: 'REVIEWING', icon: '◆', color: '#E53935' },
      };
      if (stateMap[runtimeState.semanticState]) return stateMap[runtimeState.semanticState];
    }
    const rawStatus = agentStatuses[selectedAgent.index];
    const isWorking = rawStatus === 'working' || rawStatus === 'talking' || tasks.some((t) => t.assignedAgentId === selectedAgent.index && t.status === 'in_progress');
    const isOnHold = tasks.some((t) => t.assignedAgentId === selectedAgent.index && t.status === 'on_hold');

    if (isWorking) {
      return { label: 'PROCESSING', icon: '■', color: '#2457A6' };
    }
    if (isOnHold) {
      return { label: 'WAITING', icon: '▲', color: '#F4C430' };
    }
    return { label: 'ACTIVE', icon: '●', color: '#E53935' };
  }, [selectedAgent, agentStatuses, tasks, runtimeState]);

  const selectedCurrentTask = useMemo(() => {
    if (runtimeState?.taskDescription) return runtimeState.taskDescription;
    if (!selectedAgent) return '';
    const activeTask = tasks.find((t) => t.assignedAgentId === selectedAgent.index && t.status === 'in_progress');
    if (activeTask) return activeTask.title;
    return AGENT_DEFAULT_TASKS[selectedAgent.name] || 'Monitoring workspace telemetry';
  }, [selectedAgent, tasks, runtimeState]);

  const movementReason = useMemo(() => {
    if (!selectedAgent) return 'NONE';
    const sceneMgr = typeof window !== 'undefined' ? (window as any).__sceneManager : null;
    const driver = sceneMgr?.driverManager?.getNpcDriver(selectedAgent.index);
    if (driver?.getMovementReason) {
      return driver.getMovementReason();
    }
    if (runtimeState?.activeSequenceName) {
      return `ACTIVE: ${runtimeState.activeSequenceName}`;
    }
    return 'NONE (AT WORKSTATION)';
  }, [selectedAgent, runtimeState]);

  const physicsTelemetry = useMemo(() => {
    if (!selectedAgent || typeof window === 'undefined') return null;
    const sceneMgr = (window as any).__sceneManager;
    const phys = sceneMgr?.getPhysicsSystem?.();
    if (!phys) return null;
    const ctrl = phys.getController(selectedAgent.index);
    if (!ctrl) return null;

    const state = ctrl.state;
    const isPhysical = state !== 'IDLE' && state !== 'HOVER';
    const grabbedPart = ctrl.getGrabbedBodyPart();
    const outcome = ctrl.getFallOutcome();
    const weightPct = Math.round(ctrl.proceduralWeight * 100);

    return {
      state,
      isPhysical,
      grabbedPart,
      outcome,
      weightPct,
    };
  }, [selectedAgent, behaviorTick]);

  const isReadyToRun = Boolean(currentResume.content && currentResume.targetJD);

  const rosterAgents = [
    { name: 'Director', index: 1, color: colors.agents.director, code: '01' },
    { name: 'Vision', index: 2, color: colors.agents.vision, code: '02' },
    { name: 'Strategist', index: 3, color: colors.agents.strategist, code: '03' },
    { name: 'Writer', index: 4, color: colors.agents.writer, code: '04' },
    { name: 'Hunter', index: 5, color: colors.agents.hunter, code: '05' },
    { name: 'Mirror', index: 6, color: colors.agents.mirror, code: '06' },
  ];

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative font-sans select-none" style={{ backgroundColor: '#F5F0E6' }}>
      {/* 1. Architectural Header Frame */}
      <div
        className="h-10 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none overflow-x-hidden min-w-0 max-w-full"
        style={{
          backgroundColor: '#F5F0E6',
          borderBottom: '2px solid #111111',
          color: '#111111',
        }}
      >
        {/* Left: Architectural Studio Label */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 shrink-0 bg-[#E53935]" />
            <span
              className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#111111] truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              01 // NEXIS ARCHITECTURAL STUDIO
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#111111] hidden sm:block opacity-40" />

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#111111]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="w-1.5 h-1.5 bg-[#2E7D32]" />
            <span>06 SYNCHRONIZED NODES</span>
          </div>
        </div>

        {/* Right: Architectural Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Section 21.1 Bidirectional Work Queue Launcher */}
          <button
            onClick={() => setIsQueueNavOpen(true)}
            className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#EFE7D8]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '1px solid #111111',
            }}
            title="Open Conventional Work Queues (Section 21.1)"
          >
            <Layers size={12} className="text-[#2457A6]" />
            <span className="hidden md:inline">WORK QUEUES</span>
          </button>

          {/* Section 15.5 Agent Review Queue Launcher */}
          <button
            onClick={() => setAgentReviewQueueOpen(true)}
            className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#EFE7D8]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '1px solid #111111',
            }}
            title="Open Section 15.5 Agent Review Queue (Kanban)"
          >
            <CheckSquare size={12} className="text-[#D97706]" />
            <span className="hidden md:inline">REVIEW QUEUE</span>
          </button>

          {/* Section 15.3 Evidence Panel Launcher */}
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/specialist-agents/findings');
                if (res.ok) {
                  const data = await res.json();
                  if (data.findings && data.findings.length > 0) {
                    setSelectedFinding(data.findings[0]);
                  }
                }
              } catch {}
              setIsEvidencePanelOpen(true);
            }}
            className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#EFE7D8]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '1px solid #111111',
            }}
            title="Open Section 15.3 Evidence Findings Ledger"
          >
            <ShieldCheck size={12} className="text-[#15803D]" />
            <span className="hidden md:inline">EVIDENCE DOSSIER</span>
          </button>

          <button
            onClick={() => setIsFlowModalOpen(true)}
            className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#EFE7D8]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '1px solid #111111',
            }}
            title="Inspect Agent Mesh Topology"
          >
            <Compass size={12} className="text-[#E53935]" />
            <span className="hidden md:inline">MESH FLOW</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-7 h-7 flex items-center justify-center transition-colors cursor-pointer text-[#111111] hover:bg-[#EFE7D8]"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #111111',
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D Workspace'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Primary 3D Office Workspace (Takes ~80-85% Screen Hero) */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <div
          ref={canvasRef}
          className="flex-1 min-h-0 relative overflow-hidden bg-[#F5F0E6]"
          role="region"
          aria-label={t('simulationCanvas')}
        >
          {/* Architectural Framing Overlay & Registration Crosshairs */}
          <div className="pointer-events-none absolute inset-0 z-10">
            {/* Corner Drafting Markers */}
            <span className="absolute top-2 left-2 text-[9px] font-mono font-bold text-[#111111] opacity-50">+ 00.00</span>
            <span className="absolute top-2 right-2 text-[9px] font-mono font-bold text-[#111111] opacity-50">+ 01.00</span>
            <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-[#111111] opacity-50">+ 00.01</span>
            {/* Bottom-right Bauhaus Geometric Accent */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#F4C430] border border-[#111111]" />
              <span className="w-2.5 h-2.5 bg-[#2457A6]" />
            </div>
          </div>

          <UIOverlay />

          {/* Section 9: Real-time Agent Activity Stream inside 3D scene */}
          <SimulationActivityStream
            onSelectFinding={(f) => {
              console.log('[NEXIS-DEBUG] onSelectFinding triggered in SimulationView:', f?.findingId);
              setSelectedFinding(f);
              setIsEvidencePanelOpen(true);
            }}
          />

          {/* 3. Floating Bauhaus Selected Agent Editorial Card (Section 08) — Double Bezel & Spring Entry */}
          {selectedAgent && (
            <div
              className="absolute top-4 right-4 z-20 w-72 sm:w-80 select-none double-bezel animate-modal-enter"
              style={{
                transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
              }}
            >
              <div
                className="w-full bg-[#FFFFFF] border border-[#111111] overflow-hidden"
                style={{ borderRadius: '0px' }}
              >
                {/* Header Stripe with Agent Color & Code */}
                <div
                  className="flex items-center justify-between px-3 py-2 border-b border-[#111111]"
                  style={{ backgroundColor: '#F5F0E6' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 shrink-0"
                      style={{ backgroundColor: selectedAgent.color || '#111111' }}
                    />
                    <span
                      className="text-[12px] font-bold tracking-wider text-[#111111] uppercase"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      0{selectedAgent.index} // AGENT DOSSIER
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNpc(null)}
                    className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center text-[#111111] hover:bg-[#FFFFFF] border border-[#111111] active:scale-[0.9] transition-all touch-manipulation cursor-pointer"
                    title="Deselect Agent"
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* Body: Typographic Hierarchy */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3
                      className="text-xl font-black uppercase tracking-tight text-[#111111] leading-none"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {selectedAgent.name}
                    </h3>
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A7A] mt-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {AGENT_SPECIALTIES[selectedAgent.name] || 'Autonomous Domain Agent'}
                    </p>
                  </div>

                  {/* Status Indicator & Step Progress */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#111111]"
                      style={{ backgroundColor: '#F5F0E6' }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", color: selectedStatus.color }}
                      >
                        {selectedStatus.icon} {selectedStatus.label}
                      </span>
                    </div>

                    {runtimeState?.totalSteps ? (
                      <span
                        className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-wider"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        PHASE {runtimeState.stepIndex}/{runtimeState.totalSteps}
                      </span>
                    ) : null}
                  </div>

                  {/* Current Task */}
                  <div className="pt-2 border-t border-[#111111]">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest text-[#7A7A7A] block mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      CURRENT FOCUS
                    </span>
                    <p
                      className="text-xs text-[#111111] font-medium leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {selectedCurrentTask}
                    </p>
                  </div>

                  {/* Physical Workspace Memory Ledger */}
                  {workspaceMemory && (
                    <div className="p-2 border border-[#111111] bg-[#FAF8F5]">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest text-[#7A7A7A]"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          DESK WORKSPACE LEDGER
                        </span>
                        <span
                          className="text-[9px] font-mono font-bold text-[#111111] bg-[#EFE7D8] px-1 py-0.5 border border-[#111111]"
                        >
                          {workspaceMemory.count} {workspaceMemory.itemType.toUpperCase()}S
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#111111] mt-1 truncate">
                        {workspaceMemory.stageName}
                      </p>
                    </div>
                  )}

                  {/* Movement Reason / Spatial Telemetry (Section 46) */}
                  <div className="pt-2 border-t border-[#111111]">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest text-[#7A7A7A] block mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      MOVEMENT REASON
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#111111] bg-[#F5F0E6]">
                      <span className="w-1.5 h-1.5 bg-[#2E7D32]" />
                      <span className="font-mono text-[10px] font-bold text-[#111111] truncate max-w-[210px]">
                        {movementReason}
                      </span>
                    </div>
                  </div>

                  {/* Physical Interaction Telemetry (Active Ragdoll System) */}
                  {physicsTelemetry && physicsTelemetry.isPhysical && (
                    <div className="p-2 border border-[#111111] bg-[#FAF8F5]">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest text-[#E53935]"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          PHYSICAL INTERACTION // ACTIVE
                        </span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#E53935] text-[#FFFFFF]">
                          {physicsTelemetry.state}
                        </span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] font-mono">
                        <div>
                          <span className="text-[#7A7A7A]">GRABBED: </span>
                          <span className="font-bold text-[#111111]">
                            {physicsTelemetry.grabbedPart ? physicsTelemetry.grabbedPart.toUpperCase() : 'NONE'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#7A7A7A]">PHYSICS: </span>
                          <span className="font-bold text-[#111111]">{physicsTelemetry.weightPct}%</span>
                        </div>
                        {physicsTelemetry.outcome && (
                          <div className="col-span-2">
                            <span className="text-[#7A7A7A]">OUTCOME: </span>
                            <span className="font-bold text-[#2457A6]">{physicsTelemetry.outcome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Trigger — Bauhaus Primary CTA with Button-in-Button Trailing Arrow Pill */}
                  <button
                    onClick={() => setAgentDrawerOpen(true)}
                    className="group w-full h-9 sm:h-8 px-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer mt-2 touch-manipulation select-none transition-all duration-120 active:scale-[0.98] active:translate-y-0.5 motion-reduce:transform-none"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: '#E53935',
                      color: '#FFFFFF',
                      border: '2px solid #111111',
                      boxShadow: '3px 3px 0px #111111',
                      transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
                    }}
                    title="Open Detailed Consultation & Deliverables Drawer"
                  >
                    <span>OPEN AGENT DOSSIER</span>
                    <span className="flex items-center justify-center w-5 h-5 bg-[#FFFFFF] text-[#111111] border border-[#111111] transition-transform duration-120 group-hover:translate-x-0.5 motion-reduce:transform-none shrink-0">
                      <ArrowRight size={11} strokeWidth={2.5} />
                    </span>
                  </button>

                  {/* Section 15.3 Evidence Findings Trigger */}
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/specialist-agents/findings');
                        if (res.ok) {
                          const data = await res.json();
                          const matched = data.findings?.find((f: any) =>
                            f.agent?.toLowerCase().includes(selectedAgent.name.toLowerCase())
                          ) || data.findings?.[0];
                          if (matched) {
                            setSelectedFinding(matched);
                            setIsEvidencePanelOpen(true);
                          }
                        }
                      } catch {}
                    }}
                    className="w-full h-8 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer mt-1.5 touch-manipulation select-none transition-all duration-120 bg-white hover:bg-[#F5F0E6] text-[#111111] border border-[#111111]"
                    title="Inspect Section 15.3 Evidence Finding for Selected Agent"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-[#15803D]" />
                      <span>EVIDENCE DOSSIER (SEC 15.3)</span>
                    </span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Bottom Bauhaus Agent & Action Bar (Sections 03, 14, 15) */}
        <div
          className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none overflow-x-auto custom-scrollbar"
          style={{
            backgroundColor: '#FFFFFF',
            borderTop: '2px solid #111111',
            color: '#111111',
          }}
        >
          {/* Left: Editorial Agent Roster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className="text-[10px] font-bold uppercase tracking-widest text-[#7A7A7A] mr-1 hidden lg:inline"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              AGENTS / 06
            </span>

            {rosterAgents.map(({ name, index: agentNum, color, code }) => {
              const isSelected = selectedNpcIndex === agentNum;
              const engine = typeof window !== 'undefined' ? (window as any).__behaviorEngine : null;
              const agentRuntime = engine?.getRuntimeState(agentNum);
              const isBusy = agentStatuses[agentNum] === 'working' || (agentRuntime && agentRuntime.semanticState !== 'IDLE');

              return (
                <button
                  key={name}
                  onClick={() => setSelectedNpc(isSelected ? null : agentNum)}
                  className="h-10 sm:h-9 px-2.5 sm:px-3 text-xs touch-manipulation select-none transition-all duration-100 active:scale-[0.96] cursor-pointer flex items-center gap-1.5 shrink-0"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: isSelected ? '#111111' : '#F5F0E6',
                    color: isSelected ? '#FFFFFF' : '#111111',
                    border: '1px solid #111111',
                    boxShadow: isSelected ? 'none' : '1px 1px 0px #111111',
                    transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
                  }}
                  title={`Select Agent ${code} - ${name} (${agentRuntime?.semanticState || 'IDLE'})`}
                  aria-pressed={isSelected}
                >
                  <span
                    className="w-2 h-2 shrink-0 relative"
                    style={{ backgroundColor: color }}
                  >
                    {isBusy && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#E53935]" />
                    )}
                  </span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: isSelected ? '#E53935' : '#7A7A7A' }}
                  >
                    {code}
                  </span>
                  <span className="text-[11px] font-bold tracking-tight uppercase hidden sm:inline">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Contextual Action Controls & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
            {/* Telemetry Feed Toggle */}
            <button
              onClick={() => setLogOpen(!isLogOpen)}
              className="group h-10 sm:h-9 px-3 text-[11px] font-bold uppercase tracking-wider touch-manipulation select-none transition-all duration-120 cursor-pointer flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: isLogOpen ? '#111111' : '#FFFFFF',
                color: isLogOpen ? '#FFFFFF' : '#111111',
                border: '2px solid #111111',
                boxShadow: isLogOpen ? 'none' : '2px 2px 0px #111111',
                transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
              }}
              title="Toggle Live Telemetry Feed"
            >
              <Activity size={13} style={{ color: isLogOpen ? '#E53935' : '#111111' }} />
              <span className="hidden md:inline">FEED</span>
              <span className="text-[9px]">{isLogOpen ? '●' : '○'}</span>
            </button>

            {/* Mission Drawer Toggle */}
            <button
              onClick={() => setIsDispatchOpen(!isDispatchOpen)}
              className="group h-10 sm:h-9 px-3 text-[11px] font-bold uppercase tracking-wider touch-manipulation select-none transition-all duration-120 cursor-pointer flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: isDispatchOpen ? '#111111' : '#FFFFFF',
                color: isDispatchOpen ? '#FFFFFF' : '#111111',
                border: '2px solid #111111',
                boxShadow: isDispatchOpen ? 'none' : '2px 2px 0px #111111',
                transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
              }}
              title="Open Target Job & Candidate Mission Workspace"
            >
              <Cpu size={13} style={{ color: isDispatchOpen ? '#F4C430' : '#111111' }} />
              <span>MISSION // 01</span>
              <span className="text-[9px]">{isDispatchOpen ? '●' : '○'}</span>
            </button>

            {/* Monumental Primary Action Button (Section 15) — Button-in-Button Trailing Arrow Pill */}
            <button
              onClick={() => {
                setIsDispatchOpen(true);
              }}
              className="group h-10 sm:h-9 px-3 sm:px-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer shrink-0 touch-manipulation select-none transition-all duration-120 active:scale-[0.98] active:translate-y-0.5 motion-reduce:transform-none"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: '#E53935',
                color: '#FFFFFF',
                border: '2px solid #111111',
                boxShadow: '3px 3px 0px #111111',
                transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
              }}
              title="Execute Nexus Multi-Agent Mesh Pipeline"
            >
              <Play size={12} className="fill-current transition-transform duration-120 group-hover:scale-110" />
              <span>RUN AGENT MESH</span>
              <span className="flex items-center justify-center w-5 h-5 bg-[#FFFFFF] text-[#111111] border border-[#111111] transition-transform duration-120 group-hover:translate-x-0.5 motion-reduce:transform-none shrink-0">
                <ArrowRight size={11} strokeWidth={2.5} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Contextual Overlay Drawer: Right Mission Panel (Sections 10-15) */}
      {isDispatchOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200"
            onClick={() => setIsDispatchOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[420px] md:w-[460px] shadow-[-8px_0px_0px_#111111] animate-drawer-enter">
            <PhaseOneControlPanel onClose={() => setIsDispatchOpen(false)} />
          </div>
        </>
      )}

      {/* 6. Contextual Overlay Drawer: Left Telemetry Feed */}
      {isLogOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity"
            onClick={() => setLogOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 bottom-0 z-40 w-full sm:w-[380px] md:w-[420px] shadow-[8px_0px_0px_#111111] animate-in slide-in-from-left duration-200">
            <ActionLogPanel />
          </div>
        </>
      )}

      {/* 7. Global Modals */}
      {isFlowModalOpen && (
        <TeamFlowModal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          system={activeSet}
        />
      )}

      {activeAuditTaskId && (
        <AuditModal
          isOpen={!!activeAuditTaskId}
          taskId={activeAuditTaskId}
          onClose={() => setActiveAuditTaskId(null)}
        />
      )}

      {/* 8. Phase 16: Section 15.3 Evidence Inspection Panel */}
      <EvidenceInspectionPanel
        finding={selectedFinding}
        isOpen={isEvidencePanelOpen}
        onClose={() => setIsEvidencePanelOpen(false)}
        onFindingReviewed={(updated) => setSelectedFinding(updated)}
      />

      {/* 9. Phase 16: Section 21.1 Conventional Work Queue Navigator */}
      <WorkQueueNavigator
        isOpen={isQueueNavOpen}
        onClose={() => setIsQueueNavOpen(false)}
      />
    </div>
  );
};

export default SimulationView;
