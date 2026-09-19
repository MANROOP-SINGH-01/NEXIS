import { AlertTriangle, Brain, ChevronDown, ChevronRight, Eye, Filter, MessageSquare, Pencil, Target } from 'lucide-react'
import React, { useState } from 'react'
import { getAllAgents } from '../data/agents'
import { useCoreStore } from '../integration/store/coreStore'
import { useActiveTeam } from '../integration/store/teamStore'

type ForgeActivity = {
  id: string
  timestamp: number
  agent: string
  action: string
  details: string
  status: 'completed' | 'warning' | 'success'
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const iconByAgent: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Nexus-Vision': Eye,
  'Nexus-Strategist': Brain,
  'Nexus-Writer': Pencil,
  'Nexus-Hunter': Target,
  'Nexus-Mirror': MessageSquare,
  'Nexus-Director': Brain,
}

const statusStyles: Record<ForgeActivity['status'], string> = {
  completed: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const DISCUSSION_SCRIPT = [
  {
    from: 'Nexus-Strategist',
    to: 'Nexus-Writer',
    action: 'JD Priority Sync',
    details: 'Target role requires production-scale API ownership. Push quantified reliability + latency outcomes.',
    status: 'completed' as const,
  },
  {
    from: 'Nexus-Writer',
    to: 'Nexus-Vision',
    action: 'Bullet Clarity Check',
    details: 'Requesting scan-order validation. Should top bullets lead with business impact before technical detail?',
    status: 'completed' as const,
  },
  {
    from: 'Nexus-Vision',
    to: 'Nexus-Director',
    action: 'Resume Scan Feedback',
    details: 'Improved first-pass readability. Recommend condensing section headers for stronger recruiter skim speed.',
    status: 'success' as const,
  },
  {
    from: 'Nexus-Hunter',
    to: 'Nexus-Strategist',
    action: 'Market Signal Input',
    details: 'Open roles weight distributed systems + observability evidence. Add concrete project proof in tailored resume.',
    status: 'warning' as const,
  },
]

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const ForgeActivityEntryView: React.FC<{ entry: ForgeActivity }> = ({ entry }) => {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = entry.icon

  return (
    <div className="flex flex-col gap-1.5 group border-b border-zinc-50 pb-3 last:border-0">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between text-left hover:bg-zinc-50/50 rounded p-1 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center mt-0.5 shrink-0">
            <Icon size={13} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-darkDelegation uppercase tracking-widest">{entry.agent}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${statusStyles[entry.status]}`}>
                {entry.status}
              </span>
            </div>
            <p className="text-xs text-zinc-700 font-semibold mt-0.5">{entry.action}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
          <span className="text-[8px] font-mono text-zinc-400">{formatTime(entry.timestamp)}</span>
          {isOpen ? <ChevronDown size={12} className="text-zinc-300" /> : <ChevronRight size={12} className="text-zinc-300" />}
        </div>
      </button>
      {isOpen && (
        <div className="ml-9 mr-1 p-2 rounded-lg border border-zinc-100 bg-white text-[11px] text-zinc-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {entry.details}
          {entry.status === 'warning' && (
            <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-yellow-700">
              <AlertTriangle size={10} />
              Needs Review
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ActionLogPanel() {
  const { setLogOpen, logFilterAgentIndex, hasResumeAnalysis, resumeAnalysis, nexusActivityLog } = useCoreStore()
  const activeTeam = useActiveTeam()
  const agents = getAllAgents(activeTeam)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)

  const filterAgent = logFilterAgentIndex !== null ? agents.find((a) => a.index === logFilterAgentIndex) ?? null : null

  const analysisEntries: ForgeActivity[] = hasResumeAnalysis && resumeAnalysis?.activityFeed
    ? (resumeAnalysis.activityFeed || []).map((entry) => ({
      ...entry,
      icon: iconByAgent[entry.agent] || Eye,
    }))
    : []

  const liveEntries: ForgeActivity[] = (nexusActivityLog || []).map((entry) => {
    const agentMap = {
      vision: 'Nexus-Vision',
      strategist: 'Nexus-Strategist',
      writer: 'Nexus-Writer',
      hunter: 'Nexus-Hunter',
      mirror: 'Nexus-Mirror',
      director: 'Nexus-Director',
    } as const

    const statusMap = {
      positive: 'success',
      warning: 'warning',
      critical: 'warning',
    } as const

    const name = agentMap[entry.agentType]
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      agent: name,
      action: entry.action,
      details: typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result),
      status: statusMap[entry.impact],
      icon: iconByAgent[name] || Eye,
    }
  })

  const discussionEntries: ForgeActivity[] = DISCUSSION_SCRIPT.map((msg, i) => ({
    id: `discussion-${i}`,
    timestamp: Date.now() - (i + 1) * 90000,
    agent: msg.from,
    action: `${msg.action} -> ${msg.to}`,
    details: msg.details,
    status: msg.status,
    icon: iconByAgent[msg.from] || Eye,
  }))

  const activityEntries = [...liveEntries, ...analysisEntries, ...discussionEntries].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="w-[300px] h-full bg-[#FBF8F3] border-r border-[#EADFCF] flex flex-col pointer-events-auto overflow-hidden shrink-0 relative select-none">
      <div className="h-11 px-4 border-b border-[#EADFCF] flex items-center justify-between bg-[#F8F3EC] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-[#181512] font-['Space_Grotesk'] uppercase tracking-wider">Activity Feed</span>
          {filterAgent && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-tighter animate-in fade-in zoom-in duration-200"
              style={{ backgroundColor: filterAgent.color }}
            >
              {filterAgent.name}
              <button onClick={() => setLogOpen(true, null)} className="hover:scale-110 transition-transform cursor-pointer">x</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isFilterMenuOpen || logFilterAgentIndex !== null ? 'bg-[#181512] text-white' : 'text-[#6A6359] hover:text-[#181512] hover:bg-[#EFE7DC]'}`}
              title="Filter by agent"
            >
              <Filter size={13} />
            </button>

            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsFilterMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#EADFCF] rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      setLogOpen(true, null)
                      setIsFilterMenuOpen(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#FBF8F3] transition-colors ${logFilterAgentIndex === null ? 'text-[#F47B20]' : 'text-[#6A6359]'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${logFilterAgentIndex === null ? 'bg-[#F47B20]' : 'bg-transparent border border-[#EADFCF]'}`} />
                    All Agents
                  </button>
                  <div className="h-px bg-[#EADFCF] my-1" />
                  {agents.map((agent) => (
                    <button
                      key={agent.index}
                      onClick={() => {
                        setLogOpen(true, agent.index)
                        setIsFilterMenuOpen(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#FBF8F3] transition-colors ${logFilterAgentIndex === agent.index ? 'text-[#181512]' : 'text-[#6A6359]'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                      {agent.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setLogOpen(false)}
            className="p-1.5 text-[#999084] hover:text-[#181512] hover:bg-[#EFE7DC] rounded-lg transition-colors cursor-pointer"
            title="Hide Log Panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex border-b border-[#EADFCF] bg-[#F8F3EC]">
        <div className="flex-1 py-2 text-[10px] font-extrabold uppercase tracking-widest bg-white border-b-2 border-[#F47B20] text-[#F47B20] text-center">
          Agent Discussion &amp; Telemetry
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 shadow-[inset_0_-20px_20px_-20px_rgba(0,0,0,0.03)]">
        {activityEntries.length === 0 ? (
          <p className="text-[#999084] text-[10px] font-bold uppercase tracking-widest text-center py-16">Awaiting actions...</p>
        ) : (
          activityEntries.map((entry) => <ForgeActivityEntryView key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
