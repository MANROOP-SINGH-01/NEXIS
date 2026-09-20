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

// Bauhaus agent telemetry accents with unique hues
const agentColorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  'Nexus-Vision': { bg: '#FFFFFF', text: '#2457A6', dot: '#2457A6', border: '#2457A6' },
  'Nexus-Strategist': { bg: '#FFFFFF', text: '#7C3AED', dot: '#7C3AED', border: '#7C3AED' },
  'Nexus-Writer': { bg: '#FFFFFF', text: '#10B981', dot: '#10B981', border: '#10B981' },
  'Nexus-Hunter': { bg: '#FFFFFF', text: '#B45309', dot: '#F59E0B', border: '#F59E0B' },
  'Nexus-Mirror': { bg: '#FFFFFF', text: '#0891B2', dot: '#06B6D4', border: '#06B6D4' },
  'Nexus-Director': { bg: '#FFFFFF', text: '#111111', dot: '#111111', border: '#111111' },
}

const statusDotMap = {
  completed: { dot: '#2457A6', text: '#2457A6', label: 'COMPLETED' },
  warning: { dot: '#F4C430', text: '#8B6914', label: 'ATTENTION' },
  success: { dot: '#2E7D32', text: '#2E7D32', label: 'VERIFIED' },
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
  const agentColor = agentColorMap[entry.agent] || { bg: '#FFFFFF', text: '#111111', dot: '#111111', border: '#111111' }
  const statusMeta = statusDotMap[entry.status] || statusDotMap.completed

  return (
    <div className="relative flex items-start gap-3 group animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Vertical Connecting Timeline Line */}
      {!isLast && (
        <div
          className="absolute left-3.5 top-7 bottom-0 w-[2px] pointer-events-none"
          style={{ backgroundColor: '#111111' }}
        />
      )}

      {/* Bauhaus Colored Icon Chip on Timeline */}
      <div
        className="relative z-10 w-7 h-7 flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: agentColor.bg,
          color: agentColor.text,
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        <Icon size={13} />
      </div>

      {/* Main Timeline Card Content */}
      <div className="flex-1 min-w-0 pb-4">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-full text-left p-2 -m-2 transition-colors cursor-pointer hover:bg-[#FFFFFF]"
          style={{ borderRadius: '0px' }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Agent Name + Status Dot */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-xs font-bold text-[#111111] truncate uppercase"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {entry.agent}
              </span>
              <span
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: statusMeta.text }}
              >
                <span className="w-1.5 h-1.5" style={{ backgroundColor: statusMeta.dot }} />
                <span>{statusMeta.label}</span>
              </span>
            </div>

            {/* Timestamp & Expand Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-[#7A7A7A]">
                {formatTime(entry.timestamp)}
              </span>
              {isOpen ? (
                <ChevronDown size={13} className="text-[#111111]" />
              ) : (
                <ChevronRight size={13} className="text-[#7A7A7A]" />
              )}
            </div>
          </div>

          {/* Action Header */}
          <p
            className="text-xs font-medium text-[#222222] mt-1 tracking-tight"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {entry.action}
          </p>
        </button>

        {/* Collapsible Details */}
        {isOpen ? (
          <div
            className="mt-2 p-3 text-[11px] font-mono text-[#333333] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #111111',
              borderRadius: '0px',
              boxShadow: '2px 2px 0px #111111',
            }}
          >
            {entry.details}
            {entry.status === 'warning' && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#E53935]">
                <AlertTriangle size={11} />
                Requires Review
              </div>
            )}
          </div>
        ) : (
          <p
            className="text-[11px] text-[#7A7A7A] line-clamp-1 mt-0.5 leading-relaxed font-mono"
          >
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
    <aside
      className="w-full sm:w-72 lg:w-80 max-w-[calc(100vw-32px)] flex flex-col h-full min-h-0 z-20 shrink-0 font-sans overflow-hidden select-none"
      style={{
        backgroundColor: '#F5F0E6',
        borderRight: '2px solid #111111',
      }}
    >
      {/* 1. Panel Header */}
      <div
        className="h-14 px-4 flex items-center justify-between shrink-0"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #111111',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 flex items-center justify-center text-[#111111]"
            style={{
              backgroundColor: '#F5F0E6',
              border: '1px solid #111111',
            }}
          >
            <Activity size={16} />
          </div>
          <div>
            <span
              className="text-xs font-bold text-[#111111] uppercase tracking-wider block"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              TELEMETRY FEED
            </span>
            <span
              className="text-[10px] uppercase font-medium text-[#7A7A7A]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {filterAgent ? `Filter: ${filterAgent.name}` : 'Live Agent Operations'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          {/* Filter button */}
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer text-[#111111] hover:bg-[#EFE7D8]"
            style={{
              backgroundColor: filterAgent ? '#111111' : '#FFFFFF',
              color: filterAgent ? '#F5F0E6' : '#111111',
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
            title="Filter by Agent"
            aria-label="Filter by Agent"
          >
            <Filter size={14} />
          </button>

          {/* Close button */}
          <button
            onClick={() => setLogOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-[#EFE7D8] transition-colors cursor-pointer"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
            title="Close Feed"
            aria-label="Close Feed"
          >
            <X size={15} />
          </button>

          {/* Dropdown Menu */}
          {isFilterMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsFilterMenuOpen(false)} 
              />
              <div
                className="absolute right-0 top-10 w-48 shadow-[4px_4px_0px_#111111] py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #111111',
                  borderRadius: '0px',
                }}
              >
                <button
                  onClick={() => {
                    setLogOpen(true, null)
                    setIsFilterMenuOpen(false)
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#F5F0E6] transition-colors"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: logFilterAgentIndex === null ? '#E53935' : '#111111',
                  }}
                >
                  <div
                    className="w-2 h-2"
                    style={{
                      backgroundColor: logFilterAgentIndex === null ? '#E53935' : '#C8C0B4',
                    }}
                  />
                  All Agents
                </button>
                <div className="h-[1px] bg-[#111111] my-1" />
                {agents.map((agent) => (
                  <button
                    key={agent.index}
                    onClick={() => {
                      setLogOpen(true, agent.index)
                      setIsFilterMenuOpen(false)
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#F5F0E6] transition-colors"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: logFilterAgentIndex === agent.index ? '#111111' : '#555555',
                    }}
                  >
                    <div className="w-2 h-2" style={{ backgroundColor: agent.color }} />
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
            <Activity size={24} className="mx-auto text-[#7A7A7A] opacity-40 mb-2" />
            <p className="text-xs uppercase tracking-wider text-[#7A7A7A]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Awaiting live telemetry events...
            </p>
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
