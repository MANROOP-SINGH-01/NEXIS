import { Background, Edge, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgenticSystem, getAllAgents, getAllCharacters } from '../data/agents';
import { DirectionalEdge } from './VisualConfigurator/edges/DirectionalEdge';
import { VisualFlowNode } from './VisualConfigurator/nodes/VisualFlowNode';
import { systemToFlow, VisualAgentNode } from './VisualConfigurator/flowUtils';
import { useFlowFocus } from './VisualConfigurator/hooks/useFlowFocus';
import { TeamBadge } from './components/TeamBadge';
import { TeamOutputBadge } from './components/TeamOutputBadge';

const nodeTypes = {
  agent: VisualFlowNode,
  user: VisualFlowNode,
};

const edgeTypes = {
  default: DirectionalEdge,
  hierarchy: DirectionalEdge,
  smoothstep: DirectionalEdge,
};

interface TeamFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: AgenticSystem;
}

const FlowViewport: React.FC<{ system: AgenticSystem }> = ({ system }) => {
  const { fitView } = useReactFlow();
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => systemToFlow(system), [system]);

  const [nodes] = useState<VisualAgentNode[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  // Focus lead agent by default
  const { nodesWithFocus, edgesWithFocus } = useFlowFocus(nodes, edges, null, system.leadAgent.id);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodesWithFocus}
      edges={edgesWithFocus}
      nodeTypes={nodeTypes as any}
      edgeTypes={edgeTypes as any}
      nodeOrigin={[0.5, 0]}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesConnectable={false}
      nodesDraggable={false}
      elementsSelectable={false}
      zoomOnScroll={true}
      maxZoom={1.5}
      minZoom={0.2}
      className="bg-[#F5F0E6]"
    >
      <Background gap={24} color="#C8C0B4" size={1.5} />
    </ReactFlow>
  );
};

const TeamFlowModal: React.FC<TeamFlowModalProps> = ({ isOpen, onClose, system }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 pointer-events-none font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs pointer-events-auto animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bauhaus Modal Content */}
      <div
        className="relative w-full h-full max-w-7xl overflow-hidden flex flex-col pointer-events-auto animate-in zoom-in-95 fade-in duration-200 ease-out shadow-[8px_8px_0px_#111111]"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        {/* Header */}
        <div
          className="h-16 flex items-center justify-between px-6 shrink-0"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '2px solid #111111',
          }}
        >
          <div className="flex items-center gap-4">
            <TeamBadge system={system} />
            <TeamOutputBadge system={system} className="hidden sm:flex" />
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-[#111111] hover:bg-[#EFE7D8] transition-all cursor-pointer"
            style={{
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
            title="Close Flow Modal"
            aria-label="Close Flow Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Flow Area */}
        <div className="flex-1 relative" style={{ backgroundColor: '#F5F0E6' }}>
          <ReactFlowProvider>
            <FlowViewport system={system} />
          </ReactFlowProvider>
        </div>

        {/* Footer/Legend */}
        <div
          className="px-6 py-3.5 flex items-center justify-between gap-6 overflow-x-auto shrink-0"
          style={{
            backgroundColor: '#EFE7D8',
            borderTop: '2px solid #111111',
          }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#E53935]" />
              <span
                className="text-[10px] font-bold text-[#111111] uppercase tracking-widest"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Hierarchy (Managed)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#2E7D32]" />
              <span
                className="text-[10px] font-bold text-[#555555] uppercase tracking-wider"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Active Telemetry Node
              </span>
            </div>
          </div>

          <p
            className="text-[11px] font-bold uppercase tracking-wider text-[#111111]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Agent Orchestration Architecture
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamFlowModal;
