import { AlertTriangle, Brain, ChevronDown, ChevronRight, Eye, Filter, MessageSquare, Pencil, Target, X, Activity } from 'lucide-react'
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

// Color-coded agent telemetry accents (consistent with 3D avatars)
const agentColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  'Nexus-Vision': { bg: 'bg-[#3B82F6]/15', text: 'text-[#3B82F6]', dot: '#3B82F6' },
  'Nexus-Strategist': { bg: 'bg-[#A855F7]/15', text: 'text-[#A855F7]', dot: '#A855F7' },
  'Nexus-Writer': { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', dot: '#10B981' },
  'Nexus-Hunter': { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', dot: '#F59E0B' },
  'Nexus-Mirror': { bg: 'bg-[#EC4899]/15', text: 'text-[#EC4899]', dot: '#EC4899' },
  'Nexus-Director': { bg: 'bg-[#FF5C1A]/15', text: 'text-[#FF5C1A]', dot: '#FF5C1A' },
}

const statusDotMap = {
  completed: { dot: 'bg-[#3B82F6]', text: 'text-[#3B82F6]', label: 'COMPLETED' },
  warning: { dot: 'bg-[#F59E0B]', text: 'text-[#F59E0B]', label: 'ATTENTION' },
  success: { dot: 'bg-[#22C55E]', text: 'text-[#22C55E]', label: 'VERIFIED' },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const ForgeActivityTimelineEntry: React.FC<{ entry: ForgeActivity; isLast: boolean }> = ({ entry, isLast }) => {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = entry.icon
  const agentColor = agentColorMap[entry.agent] || { bg: 'bg-white/10', text: 'text-white', dot: '#FFFFFF' }
  const statusMeta = statusDotMap[entry.status] || statusDotMap.completed

  return (
    <div className="relative flex items-start gap-3.5 group animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Vertical Connecting Timeline Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-[rgba(255,255,255,0.08)] pointer-events-none" />
      )}

      {/* Colored Icon Chip on Timeline */}
      <div className={`relative z-10 w-8 h-8 rounded-lg ${agentColor.bg} ${agentColor.text} border border-white/5 flex items-center justify-center shrink-0 shadow-xs mt-0.5`}>
        <Icon size={14} />
      </div>

      {/* Main Timeline Card Content */}
      <div className="flex-1 min-w-0 pb-4">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-full text-left p-2 -m-2 rounded-lg hover:bg-[#1A1B20]/60 transition-colors cursor-pointer group-hover:bg-[#1A1B20]/40"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Agent Name + Status Dot */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-bold text-white truncate">
                {entry.agent}
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                <span className={statusMeta.text}>{statusMeta.label}</span>
              </span>
            </div>

            {/* Timestamp & Expand Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-[#6B7280]">
                {formatTime(entry.timestamp)}
              </span>
              {isOpen ? (
                <ChevronDown size={13} className="text-[#6B7280]" />
              ) : (
                <ChevronRight size={13} className="text-[#6B7280]" />
              )}
            </div>
          </div>

          {/* Action Header */}
          <p className="text-xs font-medium text-[#EDEDED] mt-1 tracking-tight">
            {entry.action}
          </p>
        </button>

        {/* Collapsible / Expandable Details */}
        {isOpen ? (
          <div className="mt-2 p-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0A0B0E] text-[11px] font-mono text-[#9CA3AF] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
            {entry.details}
            {entry.status === 'warning' && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[#F59E0B]">
                <AlertTriangle size={11} />
                Requires Review
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5 leading-relaxed font-mono">
            {entry.details}
          </p>
        )}
      </div>
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
      positive: 'success' as const,
      warning: 'warning' as const,
      info: 'completed' as const,
    }

    const agentName = agentMap[entry.agentType] || 'Nexus-Director'
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      agent: agentName,
      action: entry.action,
      details: typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result),
      status: statusMap[entry.impact] || 'completed',
      icon: iconByAgent[agentName] || Brain,
    }
  })

  // Combine and sort chronologically descending (newest first)
  const allEntries = [...liveEntries, ...analysisEntries].sort((a, b) => b.timestamp - a.timestamp)
  const activityEntries = filterAgent
    ? allEntries.filter((e) => e.agent.toLowerCase().includes(filterAgent.name.toLowerCase()))
    : allEntries

  return (
    <aside className="w-80 border-r border-[rgba(255,255,255,0.08)] bg-[#121317]/95 backdrop-blur-xl flex flex-col h-full z-20 shrink-0 font-sans shadow-lg overflow-hidden select-none">
      {/* 1. Panel Header with 40px hit target actions */}
      <div className="h-14 px-4 border-b border-[rgba(255,255,255,0.08)] bg-[#121317] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              TELEMETRY FEED
            </span>
            <span className="text-[10px] font-mono text-[#6B7280]">
              {filterAgent ? `Filter: ${filterAgent.name}` : 'Live Agent Operations'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          {/* Filter button with 40px hit target */}
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              filterAgent ? 'bg-[#FF5C1A]/20 text-[#FF5C1A]' : 'text-[#6B7280] hover:text-white hover:bg-[#1A1B20]'
            }`}
            title="Filter by Agent"
            aria-label="Filter by Agent"
          >
            <Filter size={15} />
          </button>

          {/* Close button with 40px hit target */}
          <button
            onClick={() => setLogOpen(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#1A1B20] transition-colors cursor-pointer"
            title="Close Feed"
            aria-label="Close Feed"
          >
            <X size={16} />
          </button>

          {/* Dropdown Menu */}
          {isFilterMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsFilterMenuOpen(false)} 
              />
              <div className="absolute right-0 top-11 w-48 bg-[#16171D] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setLogOpen(true, null)
                    setIsFilterMenuOpen(false)
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-mono font-medium flex items-center gap-2 hover:bg-[#1A1B20] transition-colors ${
                    logFilterAgentIndex === null ? 'text-[#FF5C1A]' : 'text-[#9CA3AF]'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${logFilterAgentIndex === null ? 'bg-[#FF5C1A]' : 'border border-white/20'}`} />
                  All Agents
                </button>
                <div className="h-px bg-white/10 my-1" />
                {agents.map((agent) => (
                  <button
                    key={agent.index}
                    onClick={() => {
                      setLogOpen(true, agent.index)
                      setIsFilterMenuOpen(false)
                    }}
                    className={`w-full px-3.5 py-1.5 text-left text-xs font-mono font-medium flex items-center gap-2 hover:bg-[#1A1B20] transition-colors ${
                      logFilterAgentIndex === agent.index ? 'text-white font-bold' : 'text-[#9CA3AF]'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                    {agent.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Scrollable Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activityEntries.length === 0 ? (
          <div className="py-20 text-center">
            <Activity size={24} className="mx-auto text-[#6B7280] opacity-40 mb-2" />
            <p className="text-xs font-mono text-[#6B7280]">Awaiting live telemetry events...</p>
          </div>
        ) : (
          <div className="relative">
            {activityEntries.map((entry, idx) => (
              <ForgeActivityTimelineEntry
                key={entry.id}
                entry={entry}
                isLast={idx === activityEntries.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
