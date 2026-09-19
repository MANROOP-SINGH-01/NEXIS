import { Maximize2, Minimize2, Eye, Bot, Sparkles, Activity, Cpu } from 'lucide-react';
import React, { useState } from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useLocale } from '../integration/hooks/useLocale';
import UIOverlay from './UIOverlay';
import TeamFlowModal from './TeamFlowModal';
import { AuditModal } from './AuditModal';
import { TeamBadge } from './components/TeamBadge';
import { Badge } from './primitives/Badge';
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
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative bg-[#090a0f]">
      {/* Simulation View Header Bar */}
      <div className="h-12 border-b border-[#EADFCF] flex items-center justify-between px-4 sm:px-6 bg-[#F8F3EC]/95 backdrop-blur-xl shrink-0 z-20 select-none text-[#181512]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFlowModalOpen(true)}
            className="flex items-center gap-2 hover:bg-[#EFE7DC] px-2 py-1 rounded-xl transition-all active:scale-95 group cursor-pointer border border-[#EADFCF]"
            title="Inspect Agent Mesh Flow"
          >
            <TeamBadge system={activeSet} />
            <div className="w-5 h-5 rounded-lg bg-white border border-[#EADFCF] flex items-center justify-center text-[#6A6359] group-hover:text-[#F47B20] transition-colors">
              <Eye size={11} />
            </div>
          </button>

          <div className="h-4 w-[1px] bg-[#EADFCF] hidden sm:block" />

          {/* Quick Agent Focus Chips */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#999084] mr-1">
              FOCUS:
            </span>
            {['Director', 'Vision', 'Strategist', 'Writer', 'Hunter', 'Mirror'].map((name, idx) => {
              const agentNum = idx + 1;
              const isSelected = selectedNpcIndex === agentNum;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedNpc(isSelected ? null : agentNum)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181512] text-white font-bold shadow-xs'
                      : 'bg-white text-[#6A6359] hover:text-[#181512] hover:bg-[#F3ECE0] border border-[#EADFCF]'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Activity Logs Toggle */}
          <button
            onClick={() => setLogOpen(!isLogOpen)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isLogOpen
                ? 'bg-[#FFF0E4] text-[#F47B20] border-[#FDCBA7] shadow-xs'
                : 'bg-white text-[#6A6359] border-[#EADFCF] hover:text-[#181512] hover:bg-[#F3ECE0]'
            }`}
            title="Toggle Live Telemetry Feed"
          >
            <Activity size={12} className={isLogOpen ? 'text-[#F47B20]' : 'text-[#999084]'} />
            FEED {isLogOpen ? 'ON' : 'OFF'}
          </button>

          {/* Mission Dispatch Side Panel Toggle */}
          <button
            onClick={() => setIsDispatchOpen(!isDispatchOpen)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isDispatchOpen
                ? 'bg-[#FFF0E4] text-[#F47B20] border-[#FDCBA7] shadow-xs'
                : 'bg-white text-[#6A6359] border-[#EADFCF] hover:text-[#181512] hover:bg-[#F3ECE0]'
            }`}
            title="Toggle Agent Mesh Dispatch Panel"
          >
            <Cpu size={12} className={isDispatchOpen ? 'text-[#F47B20]' : 'text-[#999084]'} />
            DISPATCH {isDispatchOpen ? 'ON' : 'OFF'}
          </button>

          <Badge variant="mint" size="sm" className="hidden sm:inline-flex font-mono">
            3D SPATIAL MESH READY
          </Badge>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-[#999084] hover:text-[#181512] hover:bg-[#EFE7DC] rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Panel"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport + Side Panels */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {isLogOpen && <ActionLogPanel />}
        <div 
          ref={canvasRef} 
          className="flex-1 min-h-0 relative overflow-hidden bg-[#090a0f]"
          role="region"
          aria-label={t('simulationCanvas')}
        >
          <UIOverlay />
        </div>
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
