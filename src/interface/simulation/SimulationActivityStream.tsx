/**
 * FILE: src/interface/simulation/SimulationActivityStream.tsx
 * PURPOSE: Real-time agent activity stream inside 3D scene for Outcome Intelligence & Candidate agents.
 * SPECIFICATION: Master Spec Section 9, 15.2, 15.3, 21.1 & 27 (Phase 16).
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Filter,
  Maximize2,
  Minimize2,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Section15Finding } from './EvidenceInspectionPanel';
import { EvidenceBadge } from '../common/EvidenceBadge';

interface SimulationActivityStreamProps {
  onSelectFinding: (finding: Section15Finding) => void;
}

export const SimulationActivityStream: React.FC<SimulationActivityStreamProps> = ({
  onSelectFinding,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [findings, setFindings] = useState<Section15Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastLiveEventTime, setLastLiveEventTime] = useState<string>('Just now');

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/specialist-agents/findings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.findings)) {
          setFindings(data.findings);
          setLastLiveEventTime('Updated');
        }
      }
    } catch (err) {
      console.error('Failed to fetch specialist findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();

    // Listen to real-time SSE stream
    const eventSource = new EventSource('/api/agents/activity');
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected' || data.type === 'ping') return;

        setLastLiveEventTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // If payload includes findingId, refetch findings
        if (data.payload) {
          fetchFindings();
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const filteredFindings = findings.filter((f) => {
    if (filter === 'ALL') return true;
    if (filter === 'OUTCOME') return f.agent === 'outcome-tracking';
    if (filter === 'FOLLOWUP') return f.agent === 'follow-up';
    if (filter === 'VERIF') return f.agent === 'employment-verification';
    if (filter === 'INTERVENTION') return f.agent === 'career-intervention';
    return true;
  });

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'outcome-tracking':
        return '#2457A6'; // Navy/Blue
      case 'follow-up':
        return '#C2410C'; // Saffron
      case 'employment-verification':
        return '#15803D'; // Green
      case 'career-intervention':
        return '#E53935'; // Red
      case 'data-quality':
        return '#7C3AED'; // Purple
      default:
        return '#111111';
    }
  };

  return (
    <div
      className="absolute bottom-16 left-3 sm:left-4 z-20 transition-all duration-200"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Collapsed Compact Floating Capsule */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="h-9 px-3 bg-white text-[#111111] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:bg-[#F5F0E6] flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all select-none"
          title="Expand Outcome Intelligence Agent Activity Stream"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#15803D]" />
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={12} className="text-[#E53935]" />
            <span className="hidden sm:inline">OUTCOME INTELLIGENCE STREAM</span>
            <span className="sm:hidden">AGENT STREAM</span>
          </span>
          <span className="px-1.5 py-0.5 bg-[#111111] text-white text-[10px] font-mono">
            {findings.length}
          </span>
          <ChevronUp size={13} />
        </button>
      ) : (
        /* Expanded Floating Stream Window */
        <div
          className="w-[340px] sm:w-[420px] bg-white border-2 border-[#111111] shadow-[6px_6px_0px_#111111] flex flex-col overflow-hidden select-none animate-in slide-in-from-bottom-3 duration-150 max-h-[460px]"
        >
          {/* Stream Header */}
          <div className="px-3.5 py-2.5 bg-[#F5F0E6] border-b-2 border-[#111111] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#15803D]" />
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] block">
                  AGENT ACTIVITY STREAM
                </span>
                <span className="text-[9px] text-[#7A7A7A] font-mono block">
                  Live SSE Telemetry // {lastLiveEventTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchFindings}
                className="w-6 h-6 flex items-center justify-center bg-white border border-[#111111] hover:bg-[#F5F0E6] text-[#111111] cursor-pointer"
                title="Refresh Stream"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 flex items-center justify-center bg-white border border-[#111111] hover:bg-[#E53935] hover:text-white transition-colors cursor-pointer text-[#111111]"
                title="Minimize Stream"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="px-2 py-1.5 bg-[#FFFFFF] border-b border-[#111111] flex items-center gap-1 overflow-x-auto text-[9px] font-bold uppercase shrink-0 custom-scrollbar">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'OUTCOME', label: 'Outcome' },
              { id: 'FOLLOWUP', label: 'Follow-Up' },
              { id: 'VERIF', label: 'Verification' },
              { id: 'INTERVENTION', label: 'Interventions' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-2 py-1 border transition-colors cursor-pointer shrink-0 ${
                  filter === t.id
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-[#F5F0E6] text-[#7A7A7A] border-[#111111]/30 hover:text-[#111111]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Finding Entries Stream List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 bg-[#FAF8F5] custom-scrollbar">
            {filteredFindings.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A7A7A] font-mono">
                No active agent events in selected filter.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const agentColor = getAgentColor(finding.agent);
                return (
                  <div
                    key={finding.findingId}
                    className="p-2.5 bg-white border border-[#111111] shadow-[2px_2px_0px_#111111] flex flex-col gap-1.5 transition-all hover:bg-[#FFFFFF]"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 shrink-0"
                          style={{ backgroundColor: agentColor }}
                        />
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider truncate"
                          style={{ color: agentColor }}
                        >
                          {finding.agentName || finding.agent}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <EvidenceBadge
                          type={finding.inferenceType === 'VERIFIED' ? 'VERIFIED' : 'INFERRED'}
                          confidence={finding.confidence}
                          size="sm"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] font-medium text-[#111111] leading-snug line-clamp-2 font-sans">
                      {finding.summary}
                    </p>

                    <div className="pt-1.5 border-t border-[#111111]/10 flex items-center justify-between text-[9px] font-mono text-[#7A7A7A]">
                      <span className="truncate max-w-[170px]">
                        ID: {finding.traineeId || finding.district || 'State Cohort'}
                      </span>

                      <button
                        onClick={() => onSelectFinding(finding)}
                        className="px-2 py-0.5 bg-[#111111] hover:bg-[#E53935] text-white font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        title="Open Section 15.3 Evidence Dossier"
                      >
                        <span>INSPECT</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stream Footer */}
          <div className="px-3 py-1.5 bg-[#F5F0E6] border-t border-[#111111] flex items-center justify-between text-[9px] font-mono text-[#7A7A7A] shrink-0">
            <span>AUTONOMOUS WORKSPACE TELEMETRY</span>
            <span className="text-[#15803D] font-bold">● ACTIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationActivityStream;
