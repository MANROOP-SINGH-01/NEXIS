/**
 * FILE: src/interface/interventions/InterventionManagementView.tsx
 * PURPOSE: Human-in-the-Loop Intervention Management & Officer Approval Gate.
 * SPECIFICATION: Section 14.5, 15.3, 19.5 & Phase 10.
 *
 * CRITICAL POLICY (Section 15.3):
 * Every automated intervention recommendation MUST receive explicit human approval
 * before being delivered to candidates.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronRight,
  Building2,
  FileText,
  BadgeAlert,
  Sliders,
} from 'lucide-react';

interface InterventionItem {
  id: string;
  traineeId: string;
  rootCause: string;
  interventionType: string;
  recommendedAction: string;
  evidenceRefs: string[];
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DELIVERED' | 'COMPLETED' | 'DISMISSED';
  approvedBy: string | null;
  approvedAt: string | null;
  outcomeReassessed: boolean;
  metadata?: {
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    confidence?: number;
    targetAgent?: string;
    title?: string;
  };
  createdAt: string;
}

const ROOT_CAUSE_LABELS: Record<string, { label: string; color: string }> = {
  SKILL_MISMATCH: { label: 'Skill Mismatch', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
  EXPERIENCE_GAP: { label: 'Lack of Experience', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  LOCATION_MISMATCH: { label: 'Location Mismatch', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  SALARY_MISMATCH: { label: 'Salary Mismatch', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  TRANSPORT: { label: 'Transport Barrier', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
  LANGUAGE: { label: 'Language Barrier', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  INTERVIEW_PERFORMANCE: { label: 'Interview Performance', color: 'bg-rose-500/10 text-rose-700 border-rose-200' },
  COURSE_RELEVANCE: { label: 'Course Relevance Deficit', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-200' },
  EMPLOYER_DEMAND: { label: 'Low Employer Demand', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  CAREGIVING: { label: 'Caregiving Responsibility', color: 'bg-teal-500/10 text-teal-700 border-teal-200' },
};

export const InterventionManagementView: React.FC = () => {
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rootCauseFilter, setRootCauseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('District Officer (MH-GOV)');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal / action state
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/interventions/queue', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setInterventions(data.queue || []);
      }
    } catch (e) {
      // Fallback sample records if offline
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/interventions/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          approvedBy: officerName,
          notes: approvalNotes || 'Approved per District Skilling Review Committee',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Intervention approved successfully by human officer', 'success');
        setInterventions((prev) =>
          prev.map((item) => (item.id === id ? data.intervention : item))
        );
        setSelectedIntervention(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Approval failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeliver = async (item: InterventionItem) => {
    if (item.status !== 'APPROVED' || !item.approvedBy) {
      showToast('Blocked: Section 15.3 requires human officer approval before delivery!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/interventions/${item.id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deliveryChannel: 'IN_APP' }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Intervention delivered to candidate successfully', 'success');
        setInterventions((prev) =>
          prev.map((i) => (i.id === item.id ? data.intervention : i))
        );
      } else {
        const err = await res.json();
        showToast(err.error || 'Delivery failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered queue
  const filtered = interventions.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (rootCauseFilter !== 'ALL' && item.rootCause !== rootCauseFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.traineeId.toLowerCase().includes(q) ||
        item.recommendedAction.toLowerCase().includes(q) ||
        item.rootCause.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = interventions.filter((i) => i.status === 'PENDING_APPROVAL').length;
  const approvedCount = interventions.filter((i) => i.status === 'APPROVED').length;
  const deliveredCount = interventions.filter((i) => i.status === 'DELIVERED').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] overflow-y-auto custom-scrollbar font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 border shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {toastMessage.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 border-b-2 border-[#111111] bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                Phase 10 Core Engine
              </span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} />
                Section 15.3 Human Approval Protocol
              </span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-extrabold text-[#111111] tracking-tight uppercase"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Root-Cause & Intervention Governance
            </h1>
            <p className="text-xs text-zinc-600 mt-1 max-w-2xl font-medium">
              Deterministic 10-cause diagnostic engine. No algorithmic remediation or pathway alteration is delivered to a trainee without certified officer verification.
            </p>
          </div>

          {/* Officer Identity & Refresh */}
          <div className="flex items-center gap-3 bg-zinc-50 p-2.5 border border-zinc-300">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Reviewing Officer</div>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="text-xs font-semibold text-zinc-900 bg-transparent border-b border-zinc-300 focus:outline-none focus:border-[#111111]"
              />
            </div>
            <button
              onClick={fetchQueue}
              className="p-2 bg-white border border-zinc-300 hover:border-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer"
              title="Refresh Review Queue"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-[#111111] p-4 shadow-[3px_3px_0px_#111111]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Pending Approval</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <div
              className="text-2xl font-black text-[#111111] mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {pendingCount}
            </div>
            <div className="text-[10px] text-amber-700 mt-1 font-semibold">Requires Officer Sign-off</div>
          </div>

          <div className="bg-white border-2 border-[#111111] p-4 shadow-[3px_3px_0px_#111111]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Approved & Ready</span>
              <ShieldCheck size={16} className="text-blue-500" />
            </div>
            <div
              className="text-2xl font-black text-[#111111] mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {approvedCount}
            </div>
            <div className="text-[10px] text-blue-700 mt-1 font-semibold">Ready for Candidate Delivery</div>
          </div>

          <div className="bg-white border-2 border-[#111111] p-4 shadow-[3px_3px_0px_#111111]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Delivered</span>
              <Send size={16} className="text-emerald-500" />
            </div>
            <div
              className="text-2xl font-black text-[#111111] mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {deliveredCount}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 font-semibold">Dispatched to Trainee Portal</div>
          </div>

          <div className="bg-white border-2 border-[#111111] p-4 shadow-[3px_3px_0px_#111111]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Taxonomy Classes</span>
              <Layers size={16} className="text-purple-500" />
            </div>
            <div
              className="text-2xl font-black text-[#111111] mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              10
            </div>
            <div className="text-[10px] text-purple-700 mt-1 font-semibold">Deterministic Root Causes</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border-2 border-[#111111] p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center border border-zinc-300">
              {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Root Cause Selector */}
            <select
              value={rootCauseFilter}
              onChange={(e) => setRootCauseFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 border border-zinc-300 bg-white focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All Root Causes (10)</option>
              {Object.entries(ROOT_CAUSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-9 pr-3 py-1.5 border border-zinc-300 bg-white focus:outline-none focus:border-[#111111] w-64"
            />
          </div>
        </div>

        {/* Interventions Queue List */}
        <div className="bg-white border-2 border-[#111111] shadow-[4px_4px_0px_#111111] divide-y divide-zinc-200">
          {loading ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-bold flex flex-col items-center gap-2">
              <RefreshCw size={20} className="animate-spin text-[#111111]" />
              <span>Loading intervention records...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
              <div className="text-sm font-bold text-zinc-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Queue Clear
              </div>
              <div className="text-xs text-zinc-500 max-w-sm mx-auto">
                No interventions match the selected filter criteria. All pending cases have been resolved.
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const causeMeta = ROOT_CAUSE_LABELS[item.rootCause] || {
                label: item.rootCause,
                color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
              };
              const isApproved = item.status === 'APPROVED' || item.status === 'DELIVERED';

              return (
                <div key={item.id} className="p-5 hover:bg-zinc-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Item Details */}
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold border ${causeMeta.color}`}>
                          {causeMeta.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-500">
                          ID: {item.traineeId}
                        </span>
                        {item.status === 'PENDING_APPROVAL' && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Clock size={10} /> Pending Officer Approval
                          </span>
                        )}
                        {item.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck size={10} /> Approved by {item.approvedBy}
                          </span>
                        )}
                        {item.status === 'DELIVERED' && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Delivered to Trainee
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-sm font-bold text-zinc-900"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {item.recommendedAction}
                      </h3>

                      {/* Evidence References */}
                      {item.evidenceRefs && item.evidenceRefs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Evidence:</span>
                          {item.evidenceRefs.map((ref, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono text-[10px]"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                      {item.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => setSelectedIntervention(item)}
                          className="w-full sm:w-auto px-4 py-2 bg-[#111111] text-white hover:bg-zinc-800 text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#111111] cursor-pointer"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          <UserCheck size={14} />
                          <span>Review & Approve</span>
                        </button>
                      )}

                      {item.status === 'APPROVED' && (
                        <button
                          onClick={() => handleDeliver(item)}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#065F46] cursor-pointer"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          <Send size={14} />
                          <span>Deliver to Trainee</span>
                        </button>
                      )}

                      {item.status === 'PENDING_APPROVAL' && (
                        <button
                          disabled
                          className="w-full sm:w-auto px-3 py-2 bg-zinc-100 text-zinc-400 text-xs font-bold border border-zinc-200 cursor-not-allowed flex items-center justify-center gap-1.5"
                          title="Locked: Section 15.3 requires officer sign-off first."
                        >
                          <Send size={12} />
                          <span>Deliver (Locked)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {selectedIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border-2 border-[#111111] p-6 max-w-lg w-full shadow-[6px_6px_0px_#111111] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2
                className="text-base font-bold text-[#111111] uppercase tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Officer Approval Sign-off
              </h2>
              <button
                onClick={() => setSelectedIntervention(null)}
                className="text-zinc-400 hover:text-zinc-900 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-600 space-y-2">
              <p>
                <strong>Trainee ID:</strong> {selectedIntervention.traineeId}
              </p>
              <p>
                <strong>Diagnosed Root Cause:</strong> {selectedIntervention.rootCause}
              </p>
              <p>
                <strong>Recommended Action:</strong> {selectedIntervention.recommendedAction}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 uppercase">
                Approval Notes / Committee Reference:
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Reviewed diagnostic signals; approved remedial bridge pathway."
                className="w-full p-2 text-xs border border-zinc-300 focus:outline-none focus:border-[#111111] h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedIntervention(null)}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedIntervention.id)}
                className="px-4 py-2 bg-[#111111] text-white hover:bg-zinc-800 text-xs font-bold uppercase shadow-[2px_2px_0px_#111111] cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Stamp Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterventionManagementView;
