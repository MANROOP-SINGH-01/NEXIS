import React, { useState } from 'react';
import { getAgentSet, getAllAgents, getAllCharacters } from '../data/agents';
import { useUiStore } from '../integration/store/uiStore';
import InfoModal from './InfoModal';

import { MessageSquareWarning, PartyPopper, Siren, Loader2 } from 'lucide-react';
import { Task, useCoreStore } from '../integration/store/coreStore';
import { useTeamStore, useActiveTeam } from '../integration/store/teamStore';
import { USER_COLOR } from '../theme/brand';

interface AlertBubbleProps {
  icon: React.ReactNode;
  position: { x: number; y: number };
  visible: boolean;
  color?: string;
  onClick?: () => void;
}

const AlertBubble: React.FC<AlertBubbleProps> = ({ icon, position, visible, color = '#F4C430', onClick }) => {
  if (!visible) return null;

  return (
    <div
      className={`absolute z-20 ${onClick ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div
        className={`p-1.5 shadow-[2px_2px_0px_#111111] flex items-center justify-center transition-transform ${
          onClick ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
          color,
        }}
      >
        {icon}
      </div>
    </div>
  );
};

type PhaseLabel = { text: string; className: string };

function getAgentPhaseLabel(
  agentIndex: number,
  leadAgentIndex: number,
  tasks: Task[],
  phase: string,
  isGeneratingAsset: boolean,
  fallback: string,
): PhaseLabel {
  if (isGeneratingAsset && agentIndex === leadAgentIndex) {
    return { text: 'Delivering...', className: 'text-[#2457A6] animate-pulse' };
  }
  if (agentIndex === leadAgentIndex && phase === 'done') {
    return { text: 'Project Ready!', className: 'text-[#F4C430]' };
  }
  const holdTask = tasks.find(
    (t) => t.assignedAgentId === agentIndex && t.status === 'on_hold',
  );
  if (holdTask && phase !== 'done') {
    return { text: 'Approval Needed', className: 'text-[#E53935]' };
  }
  const activeTask = tasks.find(
    (t) => t.assignedAgentId === agentIndex && t.status === 'in_progress',
  );
  if (activeTask) {
    return { text: 'Working', className: 'text-[#2E7D32]' };
  }
  return { text: fallback, className: 'text-[#7A7A7A]' };
}

const UIOverlay: React.FC = () => {
  const {
    selectedNpcIndex,
    selectedPosition,
    hoveredNpcIndex,
    hoveredPoiLabel,
    hoverPosition,
    npcScreenPositions,
    setSelectedNpc,
  } = useUiStore();
  const [isHelpOpen, setHelpOpen] = useState(false);
  const {
    tasks,
    phase,
    isGeneratingAsset,
  } = useCoreStore();
  const system = useActiveTeam();
  const npcAgents = getAllAgents(system);
  const allPossibleAgents = getAllCharacters(system);

  const selectedAgent = selectedNpcIndex != null ? allPossibleAgents.find((a) => a.index === selectedNpcIndex) as any ?? null : null;
  const hoveredAgent = hoveredNpcIndex != null ? allPossibleAgents.find((a) => a.index === hoveredNpcIndex) as any ?? null : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none font-sans">
      {/* 1. Parallel Alert Bubbles System */}
      {npcAgents.map((agent) => {
        const pos = npcScreenPositions[agent.index];
        if (!pos) return null;

        const isCurrentlyHovered = hoveredNpcIndex === agent.index || selectedNpcIndex === agent.index;
        if (isCurrentlyHovered) return null;

        let alertIcon: React.ReactNode = null;
        let alertColor = '#F4C430'; // Bauhaus yellow

        if (agent.index === system.leadAgent.index && isGeneratingAsset) {
          alertIcon = <Loader2 size={16} className="animate-spin" />;
          alertColor = '#2457A6'; // Bauhaus blue
        } else if (agent.index === system.leadAgent.index && phase === 'idle') {
          alertIcon = <Siren size={16} />;
          alertColor = '#111111';
        } else if (agent.index === system.leadAgent.index && phase === 'done') {
          alertIcon = <PartyPopper size={16} />;
          alertColor = '#F4C430';
        } else {
          const pendingTask = tasks.find(
            (t) => t.status === 'on_hold' && t.assignedAgentId === agent.index,
          );
          if (pendingTask) {
            alertIcon = <MessageSquareWarning size={16} />;
            alertColor = '#E53935'; // Bauhaus red
          }
        }

        if (!alertIcon) return null;

        return (
          <AlertBubble
            key={`alert-${agent.index}`}
            icon={alertIcon}
            position={pos}
            visible={true}
            color={alertColor}
            onClick={() => setSelectedNpc(agent.index)}
          />
        );
      })}

      {/* 2. Selection/Hover Bubble (Bauhaus Editorial Badge) */}
      {(() => {
        if (selectedAgent && selectedPosition) {
          const isLeadAgentProjectReady = selectedAgent.index === system.leadAgent.index && phase === 'done';
          const label = getAgentPhaseLabel(selectedAgent.index, system.leadAgent.index, tasks, phase, isGeneratingAsset, '');

          return (
            <div
              className="absolute z-25 pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: selectedPosition.x,
                top: selectedPosition.y,
                transform: 'translate(-50%, -100%) translateY(-10px)',
              }}
            >
              <div
                className="px-3 py-1.5 flex items-center gap-2 whitespace-nowrap shadow-[3px_3px_0px_#111111] animate-in fade-in zoom-in-95 duration-150"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #111111',
                  borderRadius: '0px',
                }}
              >
                <div
                  className="w-2 h-2 shrink-0"
                  style={{ backgroundColor: selectedAgent.color, borderRadius: '0px' }}
                />
                <div className="flex items-center gap-1.5">
                  {selectedAgent.index === system.user.index ? (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest text-[#111111]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {selectedAgent.name} (You)
                    </span>
                  ) : isLeadAgentProjectReady ? (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${label.className}`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {label.text}
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest text-[#111111]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {selectedAgent.name}
                      </span>
                      {label.text && (
                        <>
                          <span className="text-[10px] text-[#7A7A7A]">/</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${label.className}`}
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {label.text}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (hoveredAgent && hoverPosition && hoveredNpcIndex !== selectedNpcIndex) {
          const isLeadAgentProjectReady = hoveredAgent.index === system.leadAgent.index && phase === 'done';
          const label = getAgentPhaseLabel(hoveredAgent.index, system.leadAgent.index, tasks, phase, isGeneratingAsset, '');

          return (
            <div
              className="absolute z-25 pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: hoverPosition.x,
                top: hoverPosition.y,
                transform: 'translate(-50%, -100%) translateY(-10px)',
              }}
            >
              <div
                className="px-3 py-1.5 flex items-center gap-2 whitespace-nowrap shadow-[2px_2px_0px_#111111] animate-in fade-in zoom-in-95 duration-150"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #111111',
                  borderRadius: '0px',
                }}
              >
                <div
                  className="w-2 h-2 shrink-0"
                  style={{ backgroundColor: hoveredAgent.color, borderRadius: '0px' }}
                />
                <div className="flex items-center gap-1.5">
                  {hoveredAgent.index === system.user.index ? (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest text-[#111111]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {hoveredAgent.name} (You)
                    </span>
                  ) : isLeadAgentProjectReady ? (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${label.className}`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {label.text}
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest text-[#111111]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {hoveredAgent.name}
                      </span>
                      {label.text && (
                        <>
                          <span className="text-[10px] text-[#7A7A7A]">/</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${label.className}`}
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {label.text}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* POI Hover Bubble */}
      {hoveredPoiLabel && hoverPosition && (
        <div
          className="absolute z-10 pointer-events-none transition-all duration-75 ease-out"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
            transform: 'translate(-50%, -100%) translateY(-10px)',
          }}
        >
          <div
            className="px-3 py-1 flex items-center gap-2 whitespace-nowrap shadow-[2px_2px_0px_#111111]"
            style={{
              backgroundColor: '#111111',
              color: '#F5F0E6',
              borderRadius: '0px',
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {hoveredPoiLabel}
            </span>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && <InfoModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
};

export default UIOverlay;
