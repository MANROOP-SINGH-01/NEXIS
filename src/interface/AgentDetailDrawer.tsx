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

  let statusLabel = 'Idle / Standby';
  let statusColor = 'text-zinc-500 bg-zinc-100/50 border-zinc-200/50';
  let pulseColor = 'bg-zinc-400';

  if (activeTask || rawStatus === 'working') {
    statusLabel = 'Working / Generating';
    statusColor = 'text-emerald-700 bg-emerald-50/80 border-emerald-200/50';
    pulseColor = 'bg-emerald-500';
  } else if (holdTask || rawStatus === 'on_hold') {
    statusLabel = 'Review Needed';
    statusColor = 'text-blue-700 bg-blue-50/80 border-blue-200/50';
    pulseColor = 'bg-blue-500';
  } else if (rawStatus === 'talking') {
    statusLabel = 'In Discussion';
    statusColor = 'text-indigo-700 bg-indigo-50/80 border-indigo-200/50';
    pulseColor = 'bg-indigo-500';
  } else if (rawStatus === 'moving') {
    statusLabel = 'Moving to Desk';
    statusColor = 'text-amber-700 bg-amber-50/80 border-amber-200/50';
    pulseColor = 'bg-amber-500';
  }

  const latestFinishedTask = tasks
    .filter((t) => t.assignedAgentId === selectedNpcIndex && (t.output || t.draftOutput))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const agentConfig = agent ? AGENT_ROLE_MAP[agent.name] : null;
  const realOutput = latestFinishedTask?.output || latestFinishedTask?.draftOutput || null;
  const displayOutput = realOutput || agentConfig?.outputPlaceholder || 'Output pipeline ready. Real deliverables will stream here upon pipeline run.';

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
        className={`fixed inset-0 bg-zinc-950/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-2xl z-50 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-label="Agent Details Drawer"
      >
        {agent && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-zinc-100/50 flex flex-col gap-5 bg-gradient-to-b from-zinc-50/80 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 p-1 bg-white rounded-2xl border border-zinc-200/60 shadow-[var(--shadow-subtle)]">
                    <Avatar type={agent.index === system.leadAgent.index ? 'lead' : 'sub'} color={agent.color} size={48} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-display font-bold text-zinc-950 tracking-tight truncate">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border"
                        style={{ backgroundColor: `${agent.color}15`, color: agent.color, borderColor: `${agent.color}30` }}
                      >
                        {agent.index === system.leadAgent.index ? 'Lead Agent' : 'Specialist'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 truncate">{agent.model}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Close Drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-zinc-100 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Activity size={14} className="text-zinc-400" />
                  Live Status
                </span>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pulseColor} animate-pulse`} />
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex px-6 pt-2 border-b border-zinc-100 bg-white">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 pb-3 text-center uppercase tracking-wider text-[11px] transition-all border-b-2 font-bold ${
                  activeTab === 'details'
                    ? 'border-zinc-950 text-zinc-950'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Agent Details
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 pb-3 text-center uppercase tracking-wider text-[11px] transition-all border-b-2 font-bold flex items-center justify-center gap-2 ${
                  activeTab === 'chat'
                    ? 'border-zinc-950 text-zinc-950'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <MessageSquare size={14} />
                Discussion
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/30">
              {activeTab === 'chat' ? (
                <div className="h-full flex flex-col p-4">
                  <div className="flex-1 min-h-[350px] bg-white rounded-3xl shadow-[var(--shadow-subtle)] border border-zinc-200/60 overflow-hidden">
                    <ChatPanel />
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  {/* Mission / Task */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 px-1">
                      <Sparkles size={12} className="text-amber-500" />
                      Current Mission
                    </span>
                    <div className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm">
                      {activeTask ? (
                        <div>
                          <p className="text-sm font-bold text-zinc-950 mb-1">"{activeTask.title}"</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{activeTask.description}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                          {agentConfig?.mission || agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Output */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                        <FileCode2 size={12} />
                        Deliverable Output
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        realOutput ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200/80 text-zinc-600'
                      }`}>
                        {realOutput ? 'Final Artifact' : 'Placeholder'}
                      </span>
                    </div>
                    <div className="bg-[#0A0A0A] text-zinc-300 rounded-2xl p-5 text-xs font-mono shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-[10px] text-zinc-500 relative z-10">
                        <span className="flex items-center gap-1.5">
                          <Cpu size={12} />
                          {realOutput ? 'Generated via execution' : 'Expected schema output'}
                        </span>
                        <span>{agent.model}</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed relative z-10 text-zinc-300">
                        {displayOutput}
                      </pre>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 px-1">
                      <Clock size={12} />
                      Activity Log
                    </span>
                    {agentLogs.length > 0 ? (
                      <div className="space-y-2">
                        {agentLogs.map((log) => (
                          <div key={log.id} className="p-4 rounded-2xl border border-zinc-200/60 bg-white shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-200" />
                            <div className="flex items-center justify-between pl-2">
                              <p className="font-bold text-xs text-zinc-950">{log.action}</p>
                              <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 line-clamp-2 pl-2 font-medium">
                              {typeof log.result === 'string' ? log.result : JSON.stringify(log.result)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50">
                        <p className="text-xs text-zinc-400 font-medium">No actions logged yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            {activeTab === 'details' && (
              <div className="p-4 border-t border-zinc-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <button
                  onClick={handleStartChat}
                  disabled={!canChat}
                  className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {canChat ? (
                    <>
                      <MessageSquare size={14} />
                      Consult with {agent.name}
                      <ChevronRight size={14} className="ml-1 opacity-50" />
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      {reason || 'Agent Busy'}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
};

export default AgentDetailDrawer;
