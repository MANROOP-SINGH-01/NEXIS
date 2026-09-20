import React, { useState } from 'react';
import {
  X, Activity, CheckCircle2, Clock, Cpu, FileCode2,
  Lock, MessageSquare, Sparkles, Zap, ChevronRight, Copy, Check, Terminal
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

const AGENT_BADGE_MAP: Record<string, string> = {
  'Nexus-Director': 'Executive Strategy',
  'Nexus-Vision': 'Visual UX & ATS Layout',
  'Nexus-Strategist': 'JD Intent & Gap Miner',
  'Nexus-Writer': 'STAR-Metric Engineer',
  'Nexus-Hunter': 'Opportunity Radar',
  'Nexus-Mirror': 'Interview Simulator',
};

export const AgentDetailDrawer: React.FC = () => {
  const { selectedNpcIndex, setSelectedNpc, agentStatuses, isChatting, setChatting, isAgentDrawerOpen, setAgentDrawerOpen } = useUiStore();
  const { tasks, nexusActivityLog } = useCoreStore();
  const system = useActiveTeam();
  const scene = useSceneManager();
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');

  const allCharacters = getAllCharacters(system);
  const agent = selectedNpcIndex !== null ? allCharacters.find((a) => a.index === selectedNpcIndex) ?? null : null;
  const isOpen = isAgentDrawerOpen && selectedNpcIndex !== null && agent !== null && agent.index !== system.user.index;

  const { canChat, reason } = useChatAvailability(selectedNpcIndex);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyDeliverable = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy deliverable to clipboard', err);
    }
  };

  const rawStatus = (selectedNpcIndex !== null ? agentStatuses[selectedNpcIndex] : null) || 'idle';
  const activeTask = tasks.find((t) => t.assignedAgentId === selectedNpcIndex && t.status === 'in_progress');
  const holdTask = tasks.find((t) => t.assignedAgentId === selectedNpcIndex && t.status === 'on_hold');

  let statusLabel = 'Standby';
  let statusColor = 'text-[#555555] bg-[#EFE7D8] border-[#C8C0B4]';
  let pulseColor = 'bg-[#7A7A7A]';

  if (activeTask || rawStatus === 'working') {
    statusLabel = 'Executing Pipeline';
    statusColor = 'text-[#2E7D32] bg-[rgba(46,125,50,0.1)] border-[rgba(46,125,50,0.3)]';
    pulseColor = 'bg-[#2E7D32]';
  } else if (holdTask || rawStatus === 'on_hold') {
    statusLabel = 'Review Needed';
    statusColor = 'text-[#F4C430] bg-[rgba(244,196,48,0.15)] border-[rgba(244,196,48,0.4)]';
    pulseColor = 'bg-[#F4C430]';
  } else if (rawStatus === 'talking') {
    statusLabel = 'Consulting';
    statusColor = 'text-[#2457A6] bg-[rgba(36,87,166,0.1)] border-[rgba(36,87,166,0.3)]';
    pulseColor = 'bg-[#2457A6]';
  } else if (rawStatus === 'moving') {
    statusLabel = 'Relocating to Desk';
    statusColor = 'text-[#173F7A] bg-[rgba(23,63,122,0.1)] border-[rgba(23,63,122,0.3)]';
    pulseColor = 'bg-[#173F7A]';
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
    setAgentDrawerOpen(false);
    setSelectedNpc(null);
    if (isChatting) setChatting(false);
  };

  const handleTabChange = (tab: 'details' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setChatting(true);
      if (selectedNpcIndex !== null) {
        scene?.startChat(selectedNpcIndex);
      }
    } else {
      if (isChatting) {
        setChatting(false);
      }
    }
  };

  const handleStartChat = () => {
    if (canChat && selectedNpcIndex !== null) {
      handleTabChange('chat');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-[#111111]/50 backdrop-blur-[2px] z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={handleClose}
      />
      
      {/* Bauhaus Drawer with Apple-grade Sheet Physics */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[440px] z-50 flex flex-col motion-gpu transition-all duration-280 select-none font-sans ${
          isOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 pointer-events-none invisible'
        }`}
        style={{
          backgroundColor: '#F5F0E6',
          borderLeft: '2px solid #111111',
          boxShadow: '-8px 0px 0px rgba(17,17,17,0.08)',
          transitionTimingFunction: 'var(--ease-sheet, cubic-bezier(0.32, 0.72, 0, 1))',
        }}
        aria-label="Agent Details Drawer"
        aria-hidden={!isOpen}
      >
        {agent && (
          <>
            {/* Header */}
            <div
              className="p-5 flex flex-col gap-4"
              style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '2px solid #111111',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="shrink-0 p-1"
                    style={{
                      border: '2px solid #111111',
                      borderRadius: '0px',
                      backgroundColor: '#F5F0E6',
                    }}
                  >
                    <Avatar type={agent.index === system.leadAgent.index ? 'lead' : 'sub'} color={agent.color} size={42} />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-base font-bold text-[#111111] uppercase tracking-tight truncate"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          backgroundColor: '#F5F0E6',
                          color: '#111111',
                          border: '1px solid #111111',
                          borderRadius: '0px',
                        }}
                      >
                        {AGENT_BADGE_MAP[agent.name] || (agent.index === system.leadAgent.index ? 'Master Orchestrator' : 'Specialist Agent')}
                      </span>
                      <span className="text-[10px] font-mono text-[#7A7A7A] truncate">{agent.model}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center text-[#111111] hover:bg-[#EFE7D8] active:scale-[0.95] transition-all touch-manipulation cursor-pointer shrink-0"
                  style={{ border: '1px solid #111111', borderRadius: '0px' }}
                  title="Close Drawer"
                  aria-label="Close Agent Details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Pill */}
              <div
                className="flex items-center justify-between p-2.5"
                style={{
                  backgroundColor: '#F5F0E6',
                  border: '1px solid #111111',
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Activity size={13} className="text-[#E53935]" />
                  Live State
                </span>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif", borderRadius: '0px' }}
                >
                  <span className={`w-1.5 h-1.5 ${pulseColor} animate-pulse`} />
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Tab Navigation Segmented Control */}
            <div
              className="px-5 py-2.5"
              style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '2px solid #111111',
              }}
            >
              <div
                className="flex gap-0"
                style={{ border: '2px solid #111111' }}
              >
                <button
                  onClick={() => handleTabChange('details')}
                  className="flex-1 py-2 min-h-[44px] text-center uppercase tracking-wider text-[11px] touch-manipulation select-none transition-all duration-100 active:scale-[0.98] font-bold cursor-pointer"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: activeTab === 'details' ? '#111111' : 'transparent',
                    color: activeTab === 'details' ? '#F5F0E6' : '#555555',
                    borderRight: '1px solid #111111',
                  }}
                >
                  Telemetry & Output
                </button>
                <button
                  onClick={() => handleTabChange('chat')}
                  className="flex-1 py-2 min-h-[44px] text-center uppercase tracking-wider text-[11px] touch-manipulation select-none transition-all duration-100 active:scale-[0.98] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: activeTab === 'chat' ? '#111111' : 'transparent',
                    color: activeTab === 'chat' ? '#F5F0E6' : '#555555',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>Consultation</span>
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div
              className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5"
              style={{ backgroundColor: '#F5F0E6' }}
            >
              {activeTab === 'chat' ? (
                <div className="h-full flex flex-col">
                  <div
                    className="flex-1 min-h-[350px] overflow-hidden"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #111111',
                    }}
                  >
                    <ChatPanel />
                  </div>
                </div>
              ) : (
                <>
                  {/* Mission / Task */}
                  <div className="space-y-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5 px-0.5"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Sparkles size={12} className="text-[#E53935]" />
                      Assigned Mission
                    </span>
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #111111',
                        borderRadius: '0px',
                      }}
                    >
                      {activeTask ? (
                        <div>
                          <p
                            className="text-xs font-bold text-[#111111] mb-1 uppercase"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            "{activeTask.title}"
                          </p>
                          <p className="text-xs text-[#555555] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {activeTask.description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#111111] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {agentConfig?.mission || agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Output with Double-Bezel Framing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <FileCode2 size={12} className="text-[#2457A6]" />
                        Live Deliverable
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyDeliverable(displayOutput)}
                          className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#111111] hover:bg-[#EFE7D8] active:scale-[0.96] px-2.5 py-1 min-h-[32px] touch-manipulation transition-all cursor-pointer"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #111111',
                            borderRadius: '0px',
                          }}
                          title="Copy deliverable content"
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} className="text-[#2E7D32]" />
                              <span className="text-[#2E7D32]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            backgroundColor: realOutput ? 'rgba(46,125,50,0.1)' : '#EFE7D8',
                            color: realOutput ? '#2E7D32' : '#7A7A7A',
                            border: `1px solid ${realOutput ? 'rgba(46,125,50,0.3)' : '#C8C0B4'}`,
                          }}
                        >
                          {realOutput ? 'Final Output' : 'Schema Preview'}
                        </span>
                      </div>
                    </div>
                    <div className="double-bezel">
                      <div
                        className="p-4 text-xs font-mono relative overflow-hidden bg-[#FFFFFF] border border-[#111111]"
                        style={{ borderRadius: '0px' }}
                      >
                        <div
                          className="flex items-center justify-between pb-2 mb-3 text-[10px]"
                          style={{ borderBottom: '1px solid #D5CFC5', color: '#7A7A7A' }}
                        >
                          <span className="flex items-center gap-1.5 font-mono font-bold text-[#111111]">
                            <Terminal size={11} className="text-[#E53935]" />
                            {realOutput ? 'pipeline.artifacts.out' : 'template.draft.spec'}
                          </span>
                          <span className="font-mono px-1.5 py-0.5 bg-[#F5F0E6] border border-[#111111] text-[9px] text-[#111111] font-bold">
                            {agent.model}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#222222] select-text">
                          {displayOutput}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5 px-0.5"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Clock size={12} className="text-[#111111]" />
                      Recent Activity
                    </span>
                    {agentLogs.length > 0 ? (
                      <div className="space-y-2">
                        {agentLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 flex flex-col gap-1"
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #111111',
                              borderRadius: '0px',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs text-[#111111] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {log.action}
                              </p>
                              <span className="text-[9px] font-mono text-[#555555] bg-[#F5F0E6] px-1.5 py-0.5 border border-[#C8C0B4]">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#555555] line-clamp-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {typeof log.result === 'string' ? log.result : JSON.stringify(log.result)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="p-5 text-center"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px dashed #111111',
                        }}
                      >
                        <p className="text-xs text-[#7A7A7A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          No actions recorded in current session.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Action Bar */}
            {activeTab === 'details' && (
              <div
                className="p-4"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderTop: '2px solid #111111',
                }}
              >
                <button
                  onClick={handleStartChat}
                  disabled={!canChat}
                  className="group w-full min-h-[44px] py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer touch-manipulation select-none transition-all duration-120 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:active:scale-100 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: canChat ? '#E53935' : '#EFE7D8',
                    color: canChat ? '#FFFFFF' : '#888888',
                    border: '2px solid #111111',
                    borderRadius: '0px',
                    boxShadow: canChat ? '3px 3px 0px #111111' : 'none',
                    transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {canChat ? <MessageSquare size={14} className="transition-transform duration-120 group-hover:scale-110" /> : <Lock size={14} />}
                    <span>{canChat ? `Consult with ${agent.name}` : (reason || 'Agent Busy')}</span>
                  </div>
                  {canChat && (
                    <span className="flex items-center justify-center w-5 h-5 bg-[#FFFFFF] text-[#111111] border border-[#111111] transition-transform duration-120 group-hover:translate-x-0.5 motion-reduce:transform-none shrink-0">
                      →
                    </span>
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
