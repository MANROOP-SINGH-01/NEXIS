import React from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import { Bot, Activity, CheckCircle2, Zap, AlertCircle, Move } from 'lucide-react';
import { getActiveAgentSet } from '../integration/store/teamStore';
import { getAllAgents } from '../data/agents';

export const AgentActivityHUD: React.FC = () => {
  const { phase } = useCoreStore();
  const { agentStatuses, isLowFpsFallback, setLowFpsFallback } = useUiStore();
  
  const system = getActiveAgentSet();
  const agents = getAllAgents(system).filter(a => a.index !== system.user.index);

  return (
    <div 
      className="absolute inset-0 flex flex-col p-6 z-40 animate-in fade-in duration-200 overflow-y-auto"
      style={{
        backgroundColor: '#F5F0E6',
        fontFamily: "'Space Grotesk', sans-serif",
        color: '#111111',
      }}
      aria-live="polite"
      role="status"
    >
      <div className="flex items-center justify-between pb-6 mb-6 border-b-2 border-[#111111]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-[#E53935]" />
            <h2 className="text-xl font-black tracking-widest uppercase text-[#111111]">
              01 // 2D TELEMETRY OVERLAY
            </h2>
          </div>
          <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">
            3D rendering suspended. Real-time autonomous node telemetry active.
          </p>
        </div>
        <button
          onClick={() => {
            const sm = (window as any).__sceneManager;
            if (sm && typeof sm.resumeFromFallback === 'function') {
              sm.resumeFromFallback();
            } else {
              setLowFpsFallback(false);
            }
          }}
          className="px-5 py-2.5 bg-[#111111] hover:bg-[#E53935] text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer border border-[#111111] shadow-[3px_3px_0px_#111111]"
        >
          RESUME 3D WORKSPACE →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const status = agentStatuses[agent.index] || 'idle';
          
          return (
            <div 
              key={agent.index}
              className="p-5 flex flex-col gap-3 transition-colors bg-[#FFFFFF] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold text-[#7A7A7A] uppercase tracking-widest mb-0.5">
                    NODE 0{agent.index + 1}
                  </div>
                  <div className="text-sm font-black uppercase text-[#111111]">{agent.name}</div>
                  <div className="text-xs text-[#555555] mt-0.5 leading-snug">{agent.description}</div>
                </div>
                <span className="text-xs">
                  {status === 'working' ? '■' : status === 'talking' ? '▲' : status === 'success' ? '●' : '○'}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-[#111111]/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-[10px] text-[#7A7A7A]">STATUS</span>
                <span style={{
                  color: status === 'working' ? '#2457A6' : status === 'talking' ? '#F4C430' : status === 'success' ? '#2E7D32' : status === 'error' ? '#E53935' : '#111111'
                }}>
                  {status === 'working' ? '■ PROCESSING' :
                   status === 'talking' ? '▲ COMMUNICATING' :
                   status === 'success' ? '● COMPLETE' :
                   status === 'error' ? '✖ FAILED' :
                   status === 'dragged' ? '▲ REPOSITIONING' :
                   '○ STANDBY'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
