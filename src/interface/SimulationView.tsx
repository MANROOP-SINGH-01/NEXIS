import { Maximize2, Minimize2, Eye, Bot, Sparkles, Activity } from 'lucide-react';
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

interface SimulationViewProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}

const SimulationView: React.FC<SimulationViewProps> = ({ canvasRef, isFullscreen, setIsFullscreen }) => {
  const { selectedNpcIndex, activeAuditTaskId, setActiveAuditTaskId, setSelectedNpc } = useUiStore();
  const activeSet = useActiveTeam();
  const { t } = useLocale();
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);

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
      <div className="h-12 border-b border-zinc-800/80 flex items-center justify-between px-4 sm:px-6 bg-[#0c0d14]/80 backdrop-blur-xl shrink-0 z-20 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFlowModalOpen(true)}
            className="flex items-center gap-2 hover:bg-zinc-800/60 px-2.5 py-1 rounded-xl transition-all active:scale-95 group cursor-pointer border border-transparent hover:border-zinc-700/60"
            title="Inspect Agent Mesh Flow"
          >
            <TeamBadge system={activeSet} />
            <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
              <Eye size={12} />
            </div>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Quick Agent Focus Chips */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mr-1">
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
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="mint" size="sm" className="hidden sm:inline-flex font-mono">
            3D SPATIAL MESH READY
          </Badge>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Panel"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div 
        ref={canvasRef} 
        className="flex-1 min-h-0 relative overflow-hidden bg-[#090a0f]"
        role="region"
        aria-label={t('simulationCanvas')}
      >
        <UIOverlay />
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
