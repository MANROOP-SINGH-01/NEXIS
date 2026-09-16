import React from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import { Bot, Activity, CheckCircle2, Zap } from 'lucide-react';
import { getActiveAgentSet } from '../integration/store/teamStore';
import { getAllAgents } from '../data/agents';

export const AgentActivityHUD: React.FC = () => {
  const { agentStatuses, phase } = useCoreStore();
  const { isLowFpsFallback, setLowFpsFallback } = useUiStore();
  
  const system = getActiveAgentSet();
  const agents = getAllAgents(system).filter(a => a.index !== system.user.index);

  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col p-6 z-40 text-white animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-500" />
            2D Activity Fallback
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            3D rendering suspended due to sustained low framerate. Real-time telemetry active.
          </p>
        </div>
        <button
          onClick={() => setLowFpsFallback(false)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
        >
          Resume 3D Render
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
        {agents.map((agent) => {
          const status = agentStatuses[agent.index] || 'idle';
          
          return (
            <div 
              key={agent.index}
              className={`p-5 rounded-xl border flex flex-col gap-3 transition-colors ${
                status === 'working' 
                  ? 'bg-blue-900/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : status === 'talking'
                  ? 'bg-emerald-900/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    status === 'working' ? 'bg-blue-500/20 text-blue-400' :
                    status === 'talking' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-200">{agent.name}</div>
                    <div className="text-xs text-zinc-500">{agent.description}</div>
                  </div>
                </div>
                
                {status === 'working' && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
                {status === 'talking' && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
                {status === 'idle' && <CheckCircle2 className="w-4 h-4 text-zinc-600" />}
              </div>

              <div className="mt-2 text-sm">
                {status === 'working' && (
                  <span className="text-blue-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Processing task...
                  </span>
                )}
                {status === 'talking' && (
                  <span className="text-emerald-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Communicating...
                  </span>
                )}
                {status === 'idle' && (
                  <span className="text-zinc-500">Standby</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
