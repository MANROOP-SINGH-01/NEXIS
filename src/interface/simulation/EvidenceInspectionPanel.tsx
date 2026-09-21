/**
 * FILE: src/interface/simulation/EvidenceInspectionPanel.tsx
 * PURPOSE: Evidence Panel reachable from 3D scene rendering full Section 15.3 finding schema.
 * SPECIFICATION: Master Spec Section 9, 15.3, 19.3, 19.5, 21.1 & 27 (Phase 16).
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  Database,
  Cpu,
  User,
  MapPin,
  Building,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { useUiStore } from '../../integration/store/uiStore';

export interface Section15Finding {
  findingId: string;
  agent: string;
  agentRole?: string;
  agentName?: string;
  timestamp: string;
  traineeId?: string | null;
  providerId?: string | null;
  district?: string | null;
  inputSources: Array<{
    sourceType: string;
    sourceId?: string | null;
    description: string;
    timestamp?: string;
  }>;
  evidenceReferences: string[];
  confidence: number;
  inferenceType: 'INFERRED' | 'VERIFIED';
  modelVersion: string;
  findingType: string;
  summary: string;
  targetCohort?: string | null;
  details?: Record<string, any>;
  recommendedAction?: {
    actionType: string;
    description: string;
    requiresHumanApproval?: boolean;
    suggestedPayload?: any;
  } | null;
  humanReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string;
}

interface EvidenceInspectionPanelProps {
  finding: Section15Finding | null;
  isOpen: boolean;
  onClose: () => void;
  onFindingReviewed?: (updated: Section15Finding) => void;
}

export const EvidenceInspectionPanel: React.FC<EvidenceInspectionPanelProps> = ({
  finding,
  isOpen,
  onClose,
  onFindingReviewed,
}) => {
  const { setActiveSidebarTab } = useUiStore();
  const [activeTab, setActiveTab] = useState<'provenance' | 'details' | 'action'>('provenance');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFinding, setCurrentFinding] = useState<Section15Finding | null>(finding);

  React.useEffect(() => {
    if (finding) {
      setCurrentFinding(finding);
      setReviewNotes(finding?.reviewNotes || '');
    }
  }, [finding]);

  const DEFAULT_FALLBACK_FINDING: Section15Finding = {
    findingId: 'fnd_sec15_sample',
    agent: 'outcome-tracking',
    agentRole: 'Longitudinal Trainee Journey Observer',
    agentName: 'Outcome Tracking Agent',
    timestamp: new Date().toISOString(),
    traineeId: 'trn_pune_4401',
    confidence: 94,
    inferenceType: 'VERIFIED',
    modelVersion: 'nexis-outcome-engine-v2.0',
    findingType: 'EMPLOYMENT_TRANSITION_DETECTED',
    summary: 'Verified employment transition at Tata Motors Pune manufacturing unit via PFMS remittance matching.',
    inputSources: [
      { sourceType: 'PFMS_DIRECT_BENEFIT', description: 'Monthly PF remittance verified', timestamp: '2026-03-01' },
      { sourceType: 'EMPLOYER_PAYROLL', description: 'Active payroll listing in Auto Sector', timestamp: '2026-03-01' }
    ],
    evidenceReferences: ['ev_pfms_pune_001', 'ev_offer_letter_pune'],
    targetCohort: 'MSBTE-2025-PUNE-AUTO',
    recommendedAction: {
      actionType: 'CONFIRM_LONGITUDINAL_RETENTION',
      description: 'Mark T_90 employment retention checkpoint as confirmed.',
      requiresHumanApproval: true,
    },
    humanReviewStatus: 'PENDING',
  };

  const f = currentFinding || finding || DEFAULT_FALLBACK_FINDING;

  if (!isOpen) return null;

  const handleReview = async (decision: 'APPROVED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/specialist-agents/findings/${f.findingId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          decision,
          notes: reviewNotes || `Reviewed via 3D Office Evidence Panel by Officer`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.finding || {
          ...f,
          humanReviewStatus: decision,
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'officer_sih_demo',
          reviewNotes,
        };
        setCurrentFinding(updated);
        if (onFindingReviewed) onFindingReviewed(updated);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJumpToQueue = (targetTab: string) => {
    onClose();
    setActiveSidebarTab(targetTab as any);
  };

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
    >
      <div
        className="w-full max-w-2xl bg-white border-2 border-[#111111] shadow-[8px_8px_0px_#111111] flex flex-col max-h-[92vh] overflow-hidden text-[#111111]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F5F0E6] border-b-2 border-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 bg-[#E53935] border border-[#111111] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#7A7A7A] uppercase block">
                SECTION 15.3 AGENT FINDING DOSSIER
              </span>
              <h2
                id="evidence-modal-title"
                className="text-sm sm:text-base font-black uppercase text-[#111111] truncate"
              >
                {f.findingType.replace(/_/g, ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <EvidenceBadge
              type={f.inferenceType === 'VERIFIED' ? 'VERIFIED' : 'INFERRED'}
              confidence={f.confidence}
              showDevanagari={true}
              size="sm"
            />
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-white border border-[#111111] hover:bg-[#E53935] hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Sub-Header Metadata Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#FFFFFF] border-b border-[#111111] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-wider block">AGENT</span>
            <span className="font-bold text-[#111111] text-[11px] truncate block">{f.agentName || f.agent}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-wider block">FINDING ID</span>
            <span className="font-mono text-[10px] font-bold text-[#2457A6] truncate block">{f.findingId}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-wider block">TARGET COHORT</span>
            <span className="font-mono text-[11px] font-semibold text-[#111111] truncate block">
              {f.traineeId || f.district || 'State Aggregate'}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-wider block">MODEL VERSION</span>
            <span className="font-mono text-[10px] text-[#7A7A7A] truncate block">{f.modelVersion}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 flex border-b border-[#111111] bg-[#F5F0E6] text-xs font-bold uppercase tracking-wider shrink-0">
          <button
            onClick={() => setActiveTab('provenance')}
            className={`px-3 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'provenance'
                ? 'border-[#E53935] text-[#E53935] bg-white'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            Provenance & Sources ({f.inputSources?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'details'
                ? 'border-[#E53935] text-[#E53935] bg-white'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            Telemetry & Formula
          </button>
          <button
            onClick={() => setActiveTab('action')}
            className={`px-3 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'action'
                ? 'border-[#E53935] text-[#E53935] bg-white'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            Governance & Queue
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans custom-scrollbar">
          {/* Executive Summary Card */}
          <div className="p-3 sm:p-4 bg-[#FAF8F5] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#7A7A7A] block mb-1">
              OBSERVED AGENT FINDING // VERBATIM
            </span>
            <p className="text-xs sm:text-sm font-semibold text-[#111111] leading-relaxed">
              {f.summary}
            </p>
          </div>

          {activeTab === 'provenance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                  Input Sources (Audit Trail)
                </span>
                <span className="text-[10px] font-mono text-[#7A7A7A]">Section 15.3 Invariant</span>
              </div>

              {f.inputSources && f.inputSources.length > 0 ? (
                f.inputSources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-[#111111] flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 bg-[#2457A6] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-mono">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#2457A6]">
                          {src.sourceType}
                        </span>
                        {src.timestamp && (
                          <span className="text-[9px] font-mono text-[#7A7A7A]">
                            {new Date(src.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#111111] mt-0.5 font-medium">{src.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic">No external input sources linked.</p>
              )}

              {/* Traceable Evidence References */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A7A] block mb-1.5">
                  Traceable Evidence Tokens
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {f.evidenceReferences && f.evidenceReferences.length > 0 ? (
                    f.evidenceReferences.map((ref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EFE7D8] text-[#111111] border border-[#111111]"
                      >
                        #{ref}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">None referenced</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-3">
              {/* Confidence Metric Breakdown */}
              <div className="p-3 bg-white border border-[#111111]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                    Section 19.3 Confidence Calculation
                  </span>
                  <span className="text-xs font-mono font-black text-[#111111]">{f.confidence}/100</span>
                </div>

                <div className="w-full h-2.5 bg-[#EFE7D8] border border-[#111111] overflow-hidden">
                  <div
                    className="h-full bg-[#15803D] transition-all duration-300"
                    style={{ width: `${f.confidence}%` }}
                  />
                </div>

                <p className="text-[10px] text-[#7A7A7A] mt-1.5 font-mono">
                  Formula: C = min(100, 25S + 25E + 20D + 15T + 15X). Deterministic score, not probabilistic hallucination.
                </p>
              </div>

              {/* Structured Details JSON */}
              {f.details && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A7A] block mb-1">
                    Structured Telemetry Attributes
                  </span>
                  <pre className="p-3 bg-[#111111] text-[#A3E635] text-[11px] font-mono border border-[#111111] overflow-x-auto rounded-none max-h-48 custom-scrollbar">
                    {JSON.stringify(f.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'action' && (
            <div className="space-y-4">
              {/* Recommended Action Box */}
              {f.recommendedAction ? (
                <div className="p-3 sm:p-4 bg-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#E53935]">
                      {f.recommendedAction.actionType}
                    </span>
                    {f.recommendedAction.requiresHumanApproval && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={11} />
                        Human Gate Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#111111]">{f.recommendedAction.description}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No automated recommendation attached.</p>
              )}

              {/* Human Approval Status & Actions */}
              <div className="p-3.5 bg-[#FAF8F5] border border-[#111111]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                    Human-in-the-Loop Review Status
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      f.humanReviewStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : f.humanReviewStatus === 'REJECTED'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {f.humanReviewStatus}
                  </span>
                </div>

                {f.reviewedBy && (
                  <p className="text-[10px] text-zinc-600 mb-2 font-mono">
                    Signed by: {f.reviewedBy} on {new Date(f.reviewedAt || '').toLocaleString()}
                  </p>
                )}

                {f.humanReviewStatus === 'PENDING' && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-[#111111]/20">
                    <input
                      type="text"
                      placeholder="Optional officer review notes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview('APPROVED')}
                        disabled={isSubmitting}
                        className="flex-1 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        Approve Finding
                      </button>
                      <button
                        onClick={() => handleReview('REJECTED')}
                        disabled={isSubmitting}
                        className="flex-1 py-1.5 bg-[#E53935] hover:bg-[#B91C1C] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
                      >
                        <XCircle size={13} />
                        Reject Finding
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation to Conventional Work Queues */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A7A] block mb-2">
                  Bidirectional Navigation to Work Queues (Section 21.1)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleJumpToQueue('my-outcome')}
                    className="p-2 bg-white border border-[#111111] text-left hover:bg-[#F5F0E6] flex items-center justify-between text-xs font-bold cursor-pointer group"
                  >
                    <span>📈 Outcome Timeline Queue</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleJumpToQueue('interventions')}
                    className="p-2 bg-white border border-[#111111] text-left hover:bg-[#F5F0E6] flex items-center justify-between text-xs font-bold cursor-pointer group"
                  >
                    <span>⚡ Intervention Approvals</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#F5F0E6] border-t-2 border-[#111111] flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-[#7A7A7A]">
            SIH 2026 // SECTION 15.3 GOVERNANCE COMPLIANT
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111111] hover:bg-[#E53935] text-white text-xs font-bold uppercase tracking-wider transition-colors border border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvidenceInspectionPanel;
