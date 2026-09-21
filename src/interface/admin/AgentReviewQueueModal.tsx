/**
 * FILE: src/interface/admin/AgentReviewQueueModal.tsx
 * PURPOSE: Kanban-style Agent Review Queue for Officer Approval/Rejection of Findings & Interventions.
 * SPECIFICATION: Master Spec Section 15.3, 15.5 (Step 10), 21.2 & Phase 12.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Ban,
  AlertTriangle,
  Layers,
  Filter,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Sparkles,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';

export interface AgentReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentFinding {
  findingId: string;
  agent: string;
  agentRole: string;
  agentName: string;
  timestamp: string;
  traineeId: string | null;
  providerId: string | null;
  district: string | null;
  confidence: number;
  inferenceType: 'INFERRED' | 'VERIFIED';
  findingType: string;
  summary: string;
  details?: Record<string, any>;
  recommendedAction?: {
    actionType: string;
    description: string;
    requiresHumanApproval: boolean;
  } | null;
  humanReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string;
  queueJobId?: string | null;
  durationMs?: number | null;
}

interface QueueStatus {
  queueName: string;
  mode: string;
  depth: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  oldestPendingJobAgeMs: number;
  rosterCount: number;
}

export const AgentReviewQueueModal: React.FC<AgentReviewQueueModalProps> = ({ isOpen, onClose }) => {
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewNoteModal, setReviewNoteModal] = useState<{ findingId: string; decision: 'APPROVED' | 'REJECTED' } | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [findingsRes, statusRes] = await Promise.all([
        fetch('/api/specialist-agents/findings', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/specialist-agents/queue-status', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (findingsRes?.findings) {
        setFindings(findingsRes.findings);
      }
      if (statusRes?.success) {
        setQueueStatus(statusRes);
      }
    } catch (err) {
      console.error('Failed to load agent review queue data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  const handleReviewAction = async (findingId: string, decision: 'APPROVED' | 'REJECTED', notes: string = '') => {
    setSubmittingId(findingId);
    try {
      const res = await fetch(`/api/specialist-agents/findings/${findingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision, notes }),
      });

      if (res.ok) {
        setFindings((prev) =>
          prev.map((f) =>
            f.findingId === findingId
              ? { ...f, humanReviewStatus: decision, reviewedAt: new Date().toISOString(), reviewNotes: notes }
              : f
          )
        );
      }
    } catch (err) {
      console.error('Failed to submit review decision:', err);
    } finally {
      setSubmittingId(null);
      setReviewNoteModal(null);
      setNoteText('');
    }
  };

  if (!isOpen) return null;

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    if (selectedAgentFilter !== 'ALL' && f.agent !== selectedAgentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSummary = f.summary?.toLowerCase().includes(q);
      const matchAgent = f.agent?.toLowerCase().includes(q);
      const matchTrainee = f.traineeId?.toLowerCase().includes(q);
      const matchDistrict = f.district?.toLowerCase().includes(q);
      if (!matchSummary && !matchAgent && !matchTrainee && !matchDistrict) return false;
    }
    return true;
  });

  const pendingList = filteredFindings.filter((f) => f.humanReviewStatus === 'PENDING');
  const approvedList = filteredFindings.filter((f) => f.humanReviewStatus === 'APPROVED');
  const rejectedList = filteredFindings.filter((f) => f.humanReviewStatus === 'REJECTED');

  const uniqueAgents = Array.from(new Set(findings.map((f) => f.agent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#111111]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-label="Agent Review Queue"
        className="w-full max-w-7xl max-h-[92vh] flex flex-col bg-[#F5F0E6] border-4 border-[#111111] shadow-[10px_10px_0px_#111111] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-[#2457A6] text-[#FFFFFF] p-4 border-b-4 border-[#111111] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFFFFF] text-[#2457A6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black font-mono tracking-wider uppercase">
                  AGENT REVIEW QUEUE (एजंट पुनरावलोकन रांग)
                </h2>
                <span className="text-[10px] bg-[#FEF9E7] text-[#111111] font-mono font-bold px-2 py-0.5 border border-[#111111]">
                  SECTION 15.5 KANBAN
                </span>
              </div>
              <p className="text-xs text-[#EBF3FC] font-mono mt-0.5">
                Human-in-the-loop governance board for approving & rejecting specialist agent findings and sensitive interventions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-[#FFFFFF] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#F5F0E6] text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all"
              title="Refresh queue findings"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#2457A6]' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#E53935] text-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#C62828] transition-all"
              aria-label="Close review queue"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Real-time Queue Telemetry Strip */}
        <div className="bg-[#FFFFFF] border-b-2 border-[#111111] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#111111] shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Cpu size={14} className="text-[#2457A6]" />
              <span className="font-bold">Queue Mode:</span>
              <span className="bg-[#EBF3FC] text-[#2457A6] px-2 py-0.5 border border-[#2457A6] font-bold uppercase text-[10px]">
                {queueStatus?.mode || 'IN-MEMORY-WORKER'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-[#10B981]" />
              <span>Active/Depth:</span>
              <span className="font-black">{queueStatus?.depth ?? pendingList.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#2457A6]" />
              <span>Completed:</span>
              <span className="font-black">{queueStatus?.completed ?? approvedList.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#D97706]" />
              <span>Pending Review:</span>
              <span className="font-black text-[#D97706]">{pendingList.length}</span>
            </div>
          </div>

          <div className="text-[11px] text-[#666666]">
            Governance Gate: <span className="font-bold text-[#E53935]">Section 15.3 Mandatory HITL</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-[#EFE7D8] border-b-2 border-[#111111] p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-[#111111]">
              <Filter size={14} className="text-[#2457A6]" />
              <span>Agent:</span>
            </div>
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] px-2.5 py-1 text-xs font-mono font-bold text-[#111111] focus:outline-none"
            >
              <option value="ALL">All Agents ({findings.length})</option>
              {uniqueAgents.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              placeholder="Search candidate, district, finding..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* 3-Column Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
          {/* COLUMN 1: PENDING REVIEW */}
          <div className="flex flex-col bg-[#FFFBEB] border-2 border-[#D97706] shadow-[4px_4px_0px_#111111] overflow-hidden max-h-full">
            <div className="bg-[#FEF3C7] border-b-2 border-[#D97706] p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#D97706]" />
                <h3 className="text-xs font-mono font-black text-[#92400E] uppercase tracking-wider">
                  Pending Review (पुनरावलोकन प्रलंबित)
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-[#D97706] text-[#FFFFFF] font-mono font-black text-xs border border-[#111111]">
                {pendingList.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {pendingList.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#92400E]">
                  No pending findings awaiting officer review. Queue is clear!
                </div>
              ) : (
                pendingList.map((f) => (
                  <FindingCard
                    key={f.findingId}
                    finding={f}
                    onApprove={() => setReviewNoteModal({ findingId: f.findingId, decision: 'APPROVED' })}
                    onReject={() => setReviewNoteModal({ findingId: f.findingId, decision: 'REJECTED' })}
                    isSubmitting={submittingId === f.findingId}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: APPROVED */}
          <div className="flex flex-col bg-[#ECFDF5] border-2 border-[#10B981] shadow-[4px_4px_0px_#111111] overflow-hidden max-h-full">
            <div className="bg-[#D1FAE5] border-b-2 border-[#10B981] p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#10B981]" />
                <h3 className="text-xs font-mono font-black text-[#065F46] uppercase tracking-wider">
                  Approved Findings (मंजूर निष्कर्ष)
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-[#10B981] text-[#FFFFFF] font-mono font-black text-xs border border-[#111111]">
                {approvedList.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {approvedList.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#065F46]">
                  No approved findings recorded yet.
                </div>
              ) : (
                approvedList.map((f) => (
                  <FindingCard key={f.findingId} finding={f} isReadOnly />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: REJECTED */}
          <div className="flex flex-col bg-[#FEF2F2] border-2 border-[#EF4444] shadow-[4px_4px_0px_#111111] overflow-hidden max-h-full">
            <div className="bg-[#FEE2E2] border-b-2 border-[#EF4444] p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-[#EF4444]" />
                <h3 className="text-xs font-mono font-black text-[#991B1B] uppercase tracking-wider">
                  Rejected / Overruled (नाकारले)
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-[#EF4444] text-[#FFFFFF] font-mono font-black text-xs border border-[#111111]">
                {rejectedList.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {rejectedList.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#991B1B]">
                  No rejected findings in audit trail.
                </div>
              ) : (
                rejectedList.map((f) => (
                  <FindingCard key={f.findingId} finding={f} isReadOnly />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 25.3 Bottom Disclaimer */}
        <div className="bg-[#FFFFFF] border-t-2 border-[#111111] p-2.5 text-center text-[10px] font-mono text-[#666666] shrink-0">
          Synthetic demonstration data — not official Maharashtra government statistics. Review queue changes maintain append-only audit trail in accordance with Section 15.3 & 22.4.
        </div>
      </div>

      {/* Officer Notes Confirmation Modal */}
      {reviewNoteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#111111]/70">
          <div className="w-full max-w-md bg-[#FFFFFF] border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-2">
              <h4 className="text-xs font-mono font-black uppercase text-[#111111]">
                {reviewNoteModal.decision === 'APPROVED' ? 'Confirm Finding Approval' : 'Confirm Finding Rejection'}
              </h4>
              <button onClick={() => setReviewNoteModal(null)} className="p-1 hover:bg-[#F5F0E6]">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-mono text-[#333333]">
              You are recording an official officer review decision: <strong>{reviewNoteModal.decision}</strong>. Enter audit justification notes below (optional):
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Verified against physical employer documentation and telephonic audit..."
              className="w-full h-24 p-2.5 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#111111]">
              <button
                onClick={() => setReviewNoteModal(null)}
                className="px-3 py-1.5 border-2 border-[#111111] text-xs font-mono font-bold uppercase hover:bg-[#F5F0E6]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewAction(reviewNoteModal.findingId, reviewNoteModal.decision, noteText)}
                disabled={submittingId !== null}
                className={`px-4 py-1.5 border-2 border-[#111111] text-xs font-mono font-black uppercase text-[#FFFFFF] shadow-[2px_2px_0px_#111111] ${
                  reviewNoteModal.decision === 'APPROVED' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#EF4444] hover:bg-[#DC2626]'
                }`}
              >
                Confirm {reviewNoteModal.decision}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FindingCardProps {
  finding: AgentFinding;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onApprove,
  onReject,
  isSubmitting = false,
  isReadOnly = false,
}) => {
  return (
    <div className="bg-[#FFFFFF] border-2 border-[#111111] p-3 shadow-[3px_3px_0px_#111111] space-y-2.5 text-xs font-mono">
      {/* Top agent and badge */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E5E7EB] pb-2">
        <div>
          <span className="inline-block bg-[#EBF3FC] text-[#2457A6] font-bold text-[10px] px-1.5 py-0.5 border border-[#2457A6] uppercase">
            {finding.agent}
          </span>
          <div className="text-[11px] font-black text-[#111111] mt-1">{finding.agentRole}</div>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`inline-block text-[10px] font-black px-1.5 py-0.5 border ${
              finding.inferenceType === 'VERIFIED'
                ? 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#D97706]'
            }`}
          >
            {finding.confidence}% {finding.inferenceType}
          </span>
        </div>
      </div>

      {/* Target Subject Context */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#4B5563]">
        {finding.traineeId && <span><strong>Trainee:</strong> {finding.traineeId}</span>}
        {finding.district && <span><strong>Dist:</strong> {finding.district}</span>}
        {finding.providerId && <span><strong>Prov:</strong> {finding.providerId}</span>}
      </div>

      {/* Finding Summary */}
      <p className="text-xs text-[#111111] leading-relaxed font-sans">{finding.summary}</p>

      {/* Recommended Action Pill */}
      {finding.recommendedAction && (
        <div className="p-2 bg-[#F9FAFB] border border-[#D1D5DB] text-[11px] space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">
              Recommendation: {finding.recommendedAction.actionType}
            </span>
            {finding.recommendedAction.requiresHumanApproval && (
              <span className="text-[9px] bg-[#FEE2E2] text-[#991B1B] font-bold px-1 border border-[#EF4444]">
                REQUIRES SIGN-OFF
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#4B5563]">{finding.recommendedAction.description}</p>
        </div>
      )}

      {/* Reviewer Note Audit Trail (if reviewed) */}
      {finding.reviewedAt && (
        <div className="text-[10px] text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
          Reviewed by <strong>{finding.reviewedBy || 'Officer'}</strong> at{' '}
          {new Date(finding.reviewedAt).toLocaleTimeString()}
          {finding.reviewNotes && <div className="italic text-[#374151] mt-0.5">"{finding.reviewNotes}"</div>}
        </div>
      )}

      {/* Telemetry info */}
      {(finding.queueJobId || finding.durationMs !== undefined) && (
        <div className="flex items-center justify-between text-[9px] text-[#9CA3AF] pt-1">
          <span>Job: {finding.queueJobId ? finding.queueJobId.slice(0, 14) : 'local'}</span>
          {finding.durationMs !== undefined && <span>{finding.durationMs}ms</span>}
        </div>
      )}

      {/* Actions (Only on pending cards) */}
      {!isReadOnly && onApprove && onReject && (
        <div className="flex items-center gap-2 pt-2 border-t-2 border-[#111111]">
          <button
            onClick={onApprove}
            disabled={isSubmitting}
            className="flex-1 py-1.5 bg-[#10B981] hover:bg-[#059669] text-[#FFFFFF] font-mono font-black text-xs uppercase border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} />
            <span>Approve</span>
          </button>
          <button
            onClick={onReject}
            disabled={isSubmitting}
            className="flex-1 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-[#FFFFFF] font-mono font-black text-xs uppercase border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Ban size={14} />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentReviewQueueModal;
