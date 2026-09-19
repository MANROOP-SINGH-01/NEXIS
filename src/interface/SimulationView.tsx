import { Maximize2, Minimize2, Eye, Activity, Cpu } from 'lucide-react';
import React, { useState } from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useLocale } from '../integration/hooks/useLocale';
import UIOverlay from './UIOverlay';
import TeamFlowModal from './TeamFlowModal';
import { AuditModal } from './AuditModal';
import { TeamBadge } from './components/TeamBadge';
import { ActionLogPanel } from './ActionLogPanel';
import PhaseOneControlPanel from './PhaseOneControlPanel';

interface SimulationViewProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}

const SimulationView: React.FC<SimulationViewProps> = ({ canvasRef, isFullscreen, setIsFullscreen }) => {
  const { selectedNpcIndex, activeAuditTaskId, setActiveAuditTaskId, setSelectedNpc } = useUiStore();
  const { isLogOpen, setLogOpen } = useCoreStore();
  const activeSet = useActiveTeam();
  const { t } = useLocale();
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(true);

  React.useEffect(() => {
    if (activeAuditTaskId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [activeAuditTaskId]);

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative bg-[#0A0B0E]">
      {/* 1. Floating Glass Subheader Toolbar with proper 12px gaps */}
      <div className="h-14 border-b border-[rgba(255,255,255,0.08)] px-6 bg-[#121317]/85 backdrop-blur-[20px] flex items-center justify-between shrink-0 z-20 select-none text-white">
        <div className="flex items-center gap-4">
          {/* Agent Network Badge */}
          <button
            onClick={() => setIsFlowModalOpen(true)}
            className="flex items-center gap-2 hover:bg-[#1A1B20] px-2.5 py-1.5 rounded-xl transition-all active:scale-95 group cursor-pointer border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]"
            title="Inspect Agent Mesh Flow"
          >
            <TeamBadge system={activeSet} />
            <div className="w-5 h-5 rounded-lg bg-[#1A1B20] border border-white/10 flex items-center justify-center text-[#9CA3AF] group-hover:text-[#FF5C1A] transition-colors">
              <Eye size={12} />
            </div>
          </button>

          <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />

          {/* Quick Agent Focus Chips with strict 12px gaps */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
              FOCUS:
            </span>
            {['Director', 'Vision', 'Strategist', 'Writer', 'Hunter', 'Mirror'].map((name, idx) => {
              const agentNum = idx + 1;
              const isSelected = selectedNpcIndex === agentNum;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedNpc(isSelected ? null : agentNum)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1A1B20] text-white font-bold border border-[#FF5C1A]/50 shadow-[0_0_12px_rgba(255,92,26,0.25)]'
                      : 'bg-[#121317] text-[#9CA3AF] hover:text-white hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C1A] animate-pulse" />}
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Telemetry Feed Toggle */}
          <button
            onClick={() => setLogOpen(!isLogOpen)}
            className={`h-8 px-3 rounded-full text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              isLogOpen
                ? 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30 shadow-xs'
                : 'bg-[#121317] text-[#9CA3AF] border-[rgba(255,255,255,0.08)] hover:text-white hover:bg-[#1A1B20]'
            }`}
            title="Toggle Live Telemetry Feed"
          >
            <Activity size={13} className={isLogOpen ? 'text-[#3B82F6]' : 'text-[#6B7280]'} />
            <span>FEED {isLogOpen ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mission Dispatch Toggle */}
          <button
            onClick={() => setIsDispatchOpen(!isDispatchOpen)}
            className={`h-8 px-3 rounded-full text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              isDispatchOpen
                ? 'bg-[#FF5C1A]/15 text-[#FF5C1A] border-[#FF5C1A]/30 shadow-xs'
                : 'bg-[#121317] text-[#9CA3AF] border-[rgba(255,255,255,0.08)] hover:text-white hover:bg-[#1A1B20]'
            }`}
            title="Toggle Agent Mesh Dispatch Panel"
          >
            <Cpu size={13} className={isDispatchOpen ? 'text-[#FF5C1A]' : 'text-[#6B7280]'} />
            <span>DISPATCH {isDispatchOpen ? 'ON' : 'OFF'}</span>
          </button>

          {/* Spatial Mesh Status Soft Pill Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
            <span>3D MESH READY</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#1A1B20] transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Panel"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 2. 3D Canvas Viewport + Side Panels with Edge Vignette */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {/* Left: Telemetry Activity Feed */}
        {isLogOpen && <ActionLogPanel />}

        {/* Center: 3D Living Office Canvas */}
        <div 
          ref={canvasRef} 
          className="flex-1 min-h-0 relative overflow-hidden bg-[#0A0B0E]"
          role="region"
          aria-label={t('simulationCanvas')}
        >
          {/* Subtle Studio Edge Vignette */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(10,11,14,0.85)] z-10" />
          <UIOverlay />
        </div>

        {/* Right: Mission Dispatch Panel */}
        {isDispatchOpen && (
          <PhaseOneControlPanel onClose={() => setIsDispatchOpen(false)} />
        )}
      </div>

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
    </div>
  );
};

export default SimulationView;
