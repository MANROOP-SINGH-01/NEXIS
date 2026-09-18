import React, { useState } from 'react';
import {
  X, Activity, CheckCircle2, Clock, Cpu, FileCode2,
  Lock, MessageSquare, Sparkles, Zap, ChevronRight
} from 'lucide-react';
import { getAllCharacters } from '../data/agents';
import { useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { useChatAvailability } from '../integration/hooks/useChatAvailability';
import { useSceneManager } from '../simulation/SceneContext';
import { Avatar } from './components/Avatar';
import ChatPanel from './ChatPanel';
import { Button } from './primitives/Button';

const AGENT_ROLE_MAP: Record<string, { mission: string; outputPlaceholder: string }> = {
  'Nexus-Director': {
    mission: 'Executive orchestration across strategy, tailoring, discovery, and interview simulation pipelines.',
    outputPlaceholder: 'Executive Orchestration Plan\n- Pipeline status: Synchronized with active career profile\n- Active workstreams: Intent mining, achievement quantification, market indexing\n- Next deliverable: End-to-end verified career package for target submission',
  },
  'Nexus-Vision': {
    mission: 'Visual UX auditor analyzing recruiter scan-flow, readability density, and layout balance.',
    outputPlaceholder: 'Visual UX Audit\n- First-scan eye path: Optimal top-third distribution\n- Readability index: 94/100 (clean ATS typography hierarchy)\n- Section spacing: Balanced whitespace across Experience & Projects',
  },
  'Nexus-Strategist': {
    mission: 'Hiring intent miner extracting prerequisite technologies, risk gaps, and credential weights.',
    outputPlaceholder: 'JD Intent & Skill Matrix\n- Key Priorities: Distributed systems, API resiliency, latency engineering\n- Claimed Strengths: Production delivery, system ownership, pipeline scaling\n- Verification Target: Quantitative metrics for high-throughput messaging',
  },
  'Nexus-Writer': {
    mission: 'STAR-metric engineer rewriting experiences into quantifiable, high-impact bullet points.',
    outputPlaceholder: 'Quantified Impact Bullets\n- Engineered distributed ingestion layer processing 12M+ daily events with 99.98% reliability.\n- Reduced critical API latency by 42% via Redis cluster caching and async event batching.\n- Automated CI/CD regression suites cutting deployment lead times from 45m to 8m.',
  },
  'Nexus-Hunter': {
    mission: 'Autonomous discovery engine ranking direct career listings with Blue Ocean advantage.',
    outputPlaceholder: 'Blue Ocean Search Stream\n- Searched: site:workatastartup.com, Greenhouse boards, Lever pipelines\n- Filtered out: Crowded multi-applicant LinkedIn boards\n- Prime Target candidates: 3 high-affinity startup roles identified',
  },
  'Nexus-Mirror': {
    mission: 'Recursive interview simulator stress-testing answers with real-time pressure scoring.',
    outputPlaceholder: 'Interview Question Matrix\n- Technical Claim: Latency optimization & caching tradeoffs\n- Cross-Question: "Walk me through what failed first when cache invalidation hit peak load."\n- Pressure Delta: +12 (stress-testing operational edge cases)',
  },
};

export const AgentDetailDrawer: React.FC = () => {
  const { selectedNpcIndex, setSelectedNpc, agentStatuses, isChatting, setChatting } = useUiStore();
  const { tasks, nexusActivityLog } = useCoreStore();
  const system = useActiveTeam();
  const scene = useSceneManager();
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');

  const allCharacters = getAllCharacters(system);
  const agent = selectedNpcIndex !== null ? allCharacters.find((a) => a.index === selectedNpcIndex) ?? null : null;
  const isOpen = selectedNpcIndex !== null && agent !== null && agent.index !== system.user.index;

  const { canChat, reason } = useChatAvailability(selectedNpcIndex);

  const rawStatus = (selectedNpcIndex !== null ? agentStatuses[selectedNpcIndex] : null) || 'idle';
  const activeTask = tasks.find((t) => t.assignedAgentId === selectedNpcIndex && t.status === 'in_progress');
  const holdTask = tasks.find((t) => t.assignedAgentId === selectedNpcIndex && t.status === 'on_hold');

  let statusLabel = 'Standby';
  let statusColor = 'text-zinc-400 bg-zinc-900 border-zinc-800';
  let pulseColor = 'bg-zinc-500';

  if (activeTask || rawStatus === 'working') {
    statusLabel = 'Executing Pipeline';
    statusColor = 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30';
    pulseColor = 'bg-indigo-400';
  } else if (holdTask || rawStatus === 'on_hold') {
    statusLabel = 'Review Needed';
    statusColor = 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    pulseColor = 'bg-amber-400';
  } else if (rawStatus === 'talking') {
    statusLabel = 'Consulting';
    statusColor = 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
    pulseColor = 'bg-cyan-400';
  } else if (rawStatus === 'moving') {
    statusLabel = 'Relocating to Desk';
    statusColor = 'text-purple-300 bg-purple-500/10 border-purple-500/30';
    pulseColor = 'bg-purple-400';
  }

  const latestFinishedTask = tasks
    .filter((t) => t.assignedAgentId === selectedNpcIndex && (t.output || t.draftOutput))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const agentConfig = agent ? AGENT_ROLE_MAP[agent.name] : null;
  const realOutput = latestFinishedTask?.output || latestFinishedTask?.draftOutput || null;
  const displayOutput = realOutput || agentConfig?.outputPlaceholder || 'Output pipeline ready. Real deliverables will stream here upon pipeline execution.';

  const agentLogs = nexusActivityLog
    .filter((entry) => {
      if (!agent) return false;
      const lower = agent.name.toLowerCase();
      return lower.includes(entry.agentType);
    })
    .slice(-4).reverse();

  const handleClose = () => {
    setSelectedNpc(null);
    if (isChatting) setChatting(false);
  };

  const handleStartChat = () => {
    if (canChat && selectedNpcIndex !== null) {
      setActiveTab('chat');
      scene?.startChat(selectedNpcIndex);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#0c0d14]/95 backdrop-blur-2xl border-l border-zinc-800/80 shadow-2xl z-50 flex flex-col transition-transform duration-300 select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-label="Agent Details Drawer"
      >
        {agent && (
          <>
            {/* Header */}
            <div className="p-5 border-b border-zinc-800/80 flex flex-col gap-4 bg-zinc-950/40">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 p-1 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-md">
                    <Avatar type={agent.index === system.leadAgent.index ? 'lead' : 'sub'} color={agent.color} size={42} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold font-['Space_Grotesk'] text-white tracking-tight truncate">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border"
                        style={{ backgroundColor: `${agent.color}15`, color: agent.color, borderColor: `${agent.color}30` }}
                      >
                        {agent.index === system.leadAgent.index ? 'Master Orchestrator' : 'Specialist Agent'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 truncate">{agent.model}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Close Drawer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center justify-between bg-[#12131c] rounded-xl p-3 border border-zinc-800">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Activity size={13} className="text-indigo-400" />
                  Live State
                </span>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pulseColor} animate-pulse`} />
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex px-5 pt-2 border-b border-zinc-800/80 bg-zinc-950/20">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 pb-3 text-center font-mono uppercase tracking-wider text-[11px] transition-all border-b-2 font-semibold ${
                  activeTab === 'details'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Telemetry
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 pb-3 text-center font-mono uppercase tracking-wider text-[11px] transition-all border-b-2 font-semibold flex items-center justify-center gap-2 ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <MessageSquare size={13} />
                Consultation
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#090a0f]/40 p-5 space-y-6">
              {activeTab === 'chat' ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 min-h-[350px] bg-[#12131c] rounded-2xl border border-zinc-800 overflow-hidden">
                    <ChatPanel />
                  </div>
                </div>
              ) : (
                <>
                  {/* Mission / Task */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 px-0.5">
                      <Sparkles size={12} className="text-amber-400" />
                      Assigned Mission
                    </span>
                    <div className="bg-[#12131c] border border-zinc-800 rounded-xl p-4">
                      {activeTask ? (
                        <div>
                          <p className="text-xs font-bold text-white mb-1">"{activeTask.title}"</p>
                          <p className="text-xs text-zinc-400 leading-relaxed">{activeTask.description}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {agentConfig?.mission || agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Output */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <FileCode2 size={12} className="text-indigo-400" />
                        Live Deliverable
                      </span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        realOutput ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {realOutput ? 'Final Output' : 'Schema Preview'}
                      </span>
                    </div>
                    <div className="bg-[#12131c] text-zinc-300 rounded-xl p-4 text-xs font-mono border border-zinc-800 relative overflow-hidden group shadow-inner">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Cpu size={11} />
                          {realOutput ? 'Pipeline Synthesized' : 'Expected Template'}
                        </span>
                        <span>{agent.model}</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                        {displayOutput}
                      </pre>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 px-0.5">
                      <Clock size={12} className="text-cyan-400" />
                      Recent Activity
                    </span>
                    {agentLogs.length > 0 ? (
                      <div className="space-y-2">
                        {agentLogs.map((log) => (
                          <div key={log.id} className="p-3 rounded-xl border border-zinc-800/80 bg-[#12131c] flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-xs text-zinc-200">{log.action}</p>
                              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 line-clamp-2">
                              {typeof log.result === 'string' ? log.result : JSON.stringify(log.result)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
                        <p className="text-xs text-zinc-500">No actions recorded in current session.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Action Bar */}
            {activeTab === 'details' && (
              <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
                <Button
                  variant="glow"
                  size="md"
                  onClick={handleStartChat}
                  disabled={!canChat}
                  className="w-full py-3"
                  leftIcon={canChat ? <MessageSquare size={14} /> : <Lock size={14} />}
                >
                  {canChat ? `Consult with ${agent.name}` : (reason || 'Agent Busy')}
                </Button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
};

export default AgentDetailDrawer;
