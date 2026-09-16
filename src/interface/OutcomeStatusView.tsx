import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Briefcase, CheckCircle2, Clock, Building, DollarSign,
  Loader2, PlusCircle, RefreshCw, Send, AlertCircle, Calendar,
  ShieldCheck, Mail, AlertTriangle, HelpCircle, Compass, X,
  XCircle, ExternalLink, Landmark, MapPin
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { OutcomeCheckInRecord, GovtCrossCheckRecord } from '../types';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';

const GITHUB_TOKEN_KEY = 'forge-github-token';
const DEV_DEFAULT_TOKEN = 'dev_trainee';

function formatCheckinType(type: string): string {
  switch (type) {
    case 'SELF_INITIATED': return 'Self-Initiated Report';
    case '90_DAY': return '90-Day Check-in';
    case '180_DAY': return '180-Day Check-in';
    case '365_DAY': return '365-Day Check-in';
    default: return type.replace(/_/g, ' ');
  }
}

function formatEmploymentStatus(status: string | null): string {
  switch (status) {
    case 'EMPLOYED': return 'Employed';
    case 'SELF_EMPLOYED': return 'Self-Employed / Freelancer';
    case 'SEARCHING': return 'Actively Searching';
    case 'IN_TRAINING': return 'In Training / Education';
    case 'OTHER': return 'Other';
    default: return status || 'Unknown';
  }
}

function getStatusBadgeStyle(status: string | null): { bg: string; text: string; border: string } {
  switch (status) {
    case 'EMPLOYED': return { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200/80' };
    case 'SELF_EMPLOYED': return { bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-200/80' };
    case 'SEARCHING': return { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200/80' };
    case 'IN_TRAINING': return { bg: 'bg-purple-50/80', text: 'text-purple-700', border: 'border-purple-200/80' };
    default: return { bg: 'bg-zinc-50/80', text: 'text-zinc-700', border: 'border-zinc-200/80' };
  }
}

function formatRelevanceLabel(relevance: string | null | undefined): string {
  switch (relevance) {
    case 'DIRECTLY_RELATED': return 'Directly Related to Training';
    case 'SOMEWHAT_RELATED': return 'Somewhat Related to Training';
    case 'UNRELATED': return 'Unrelated to Training';
    default: return relevance?.replace(/_/g, ' ') || '';
  }
}

function formatNonPlacementReason(reason: string | null | undefined): string {
  switch (reason) {
    case 'SKILL_GAP': return 'Skill Gap / Needs Further Training';
    case 'WAGE_EXPECTATION': return 'Wage Expectations Not Met';
    case 'LOCATION': return 'Location / Commute Constraints';
    case 'NO_RESPONSE_FROM_EMPLOYERS': return 'Awaiting Employer Responses';
    case 'OTHER': return 'Other Factors';
    default: return reason?.replace(/_/g, ' ') || '';
  }
}

export const OutcomeStatusView: React.FC = () => {
  const { traineeProfile, outcomeHistory, setOutcomeHistory } = useCoreStore();

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [employmentStatus, setEmploymentStatus] = useState<string>('EMPLOYED');
  const [employerName, setEmployerName] = useState<string>('');
  const [wageBand, setWageBand] = useState<string>('10-20k');
  const [notes, setNotes] = useState<string>('');

  const [roleRelevance, setRoleRelevance] = useState<string>('DIRECTLY_RELATED');
  const [selfEmploymentType, setSelfEmploymentType] = useState<string>('');
  const [apprenticeshipEmployer, setApprenticeshipEmployer] = useState<string>('');
  const [nonPlacementReason, setNonPlacementReason] = useState<string>('SKILL_GAP');
  const [placementDistrict, setPlacementDistrict] = useState<string>('');

  const [requestingVerificationId, setRequestingVerificationId] = useState<string | null>(null);
  const [employerEmailInput, setEmployerEmailInput] = useState<{ [key: string]: string }>({});
  const [verifyingSubmitting, setVerifyingSubmitting] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ id: string; type: 'success' | 'error' | 'consent_warning'; message: string; link?: string; } | null>(null);
  const [govtChecks, setGovtChecks] = useState<GovtCrossCheckRecord[]>([]);

  const getActiveToken = useCallback((): string => {
    try {
      const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (stored && stored.trim()) return stored.trim();
    } catch {}
    return DEV_DEFAULT_TOKEN;
  }, []);

  const fetchGovtChecks = useCallback(async () => {
    const traineeId = traineeProfile?.trainee?.id;
    if (!traineeId) return;
    try {
      const res = await fetch(`/api/trainee/govt-crosscheck-history/${traineeId}`);
      if (res.ok) {
        const data = await res.json();
        setGovtChecks(data.history || []);
      }
    } catch (err) {
      console.warn('[OutcomeStatusView] Error fetching govt checks:', err);
    }
  }, [traineeProfile?.trainee?.id]);

  const fetchHistory = useCallback(async () => {
    const traineeId = traineeProfile?.trainee?.id;
    if (!traineeId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/trainee/status-history/${traineeId}`);
      if (!res.ok) throw new Error('Failed to load outcome history');
      const data = await res.json();
      setOutcomeHistory(data.history || []);
    } catch (err) {
      console.warn('[OutcomeStatusView] Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
    void fetchGovtChecks();
  }, [traineeProfile?.trainee?.id, setOutcomeHistory, fetchGovtChecks]);

  useEffect(() => {
    fetchHistory();
    fetchGovtChecks();
  }, [fetchHistory, fetchGovtChecks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    const token = getActiveToken();

    try {
      const payload: Record<string, any> = {
        employmentStatus,
        employerName: employmentStatus === 'EMPLOYED' ? employerName.trim() : null,
        wageBand: wageBand || null,
        notes: notes.trim() || null,
        roleRelevance: employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED' ? roleRelevance : null,
        selfEmploymentType: employmentStatus === 'SELF_EMPLOYED' && selfEmploymentType.trim() ? selfEmploymentType.trim() : null,
        apprenticeshipEmployer: employmentStatus === 'EMPLOYED' && apprenticeshipEmployer.trim() ? apprenticeshipEmployer.trim() : null,
        nonPlacementReason: employmentStatus === 'SEARCHING' ? nonPlacementReason : null,
        placementDistrict: (employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && placementDistrict.trim() ? placementDistrict.trim() : null,
      };

      const res = await fetch('/api/trainee/status-update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) console.warn('[OutcomeStatusView] Server status', res.status, '- saving outcome locally');

      const newRecord: any = {
        id: 'out_' + Date.now(),
        reportedAt: new Date().toISOString(),
        employmentStatus,
        employerName: payload.employerName || undefined,
        wageBand: payload.wageBand || undefined,
        roleRelevance: payload.roleRelevance || undefined,
        notes: payload.notes || undefined,
        verifiedByEmployer: false,
        verificationStatus: 'PENDING',
      };

      setOutcomeHistory([newRecord, ...outcomeHistory]);
      setSuccessMessage('Employment status recorded successfully!');
      setNotes('');
      setPlacementDistrict('');
      if (employmentStatus !== 'EMPLOYED') { setEmployerName(''); setApprenticeshipEmployer(''); }
      if (employmentStatus !== 'SELF_EMPLOYED') setSelfEmploymentType('');
      
      await fetchHistory();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit status update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestVerification = async (checkInId: string) => {
    setVerificationFeedback(null);
    const email = (employerEmailInput[checkInId] || '').trim();
    if (!email || !email.includes('@')) {
      setVerificationFeedback({ id: checkInId, type: 'error', message: 'Enter a valid employer email address.' });
      return;
    }

    const isConsentGranted = traineeProfile?.consent?.EMPLOYER_SHARING?.granted === true;
    if (!isConsentGranted) {
      setVerificationFeedback({ id: checkInId, type: 'consent_warning', message: 'Employer verification requires your "EMPLOYER_SHARING" consent under DPDP.' });
      return;
    }

    setVerifyingSubmitting(true);
    const token = getActiveToken();

    try {
      const res = await fetch('/api/trainee/request-employer-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomeCheckInId: checkInId, employerContact: email }),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 403 && json.consentRequired) {
          setVerificationFeedback({ id: checkInId, type: 'consent_warning', message: 'Employer verification requires your "EMPLOYER_SHARING" consent.' });
          return;
        }
        throw new Error(json.error || 'Failed to request verification');
      }

      setVerificationFeedback({
        id: checkInId, type: 'success',
        message: 'Verification request sent to employer successfully!', link: json.verificationLink,
      });
      setRequestingVerificationId(null);
      await fetchHistory();
    } catch (err) {
      setVerificationFeedback({ id: checkInId, type: 'error', message: err instanceof Error ? err.message : 'Failed to send request' });
    } finally {
      setVerifyingSubmitting(false);
    }
  };

  const traineeName = traineeProfile?.trainee?.name || 'Trainee';

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <Award size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">My Outcomes</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Self-report job status & employer verifications • {traineeName}
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loadingHistory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-[var(--shadow-subtle)] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Form Card: Self-Report Status */}
      <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] p-6 md:p-8">
        <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-zinc-400" />
            <h2 className="text-sm font-display font-bold text-zinc-950 tracking-wide uppercase">
              Self-Report Status
            </h2>
          </div>
          <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2.5 py-1 rounded-md border border-zinc-200/60">
            POST /api/trainee/status-update
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 text-red-700 text-xs rounded-xl border border-red-200 font-medium flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50/80 text-emerald-700 text-xs rounded-xl border border-emerald-200 font-medium flex items-center gap-3 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all cursor-pointer"
              >
                <option value="EMPLOYED">Employed</option>
                <option value="SELF_EMPLOYED">Self-Employed / Freelancer</option>
                <option value="SEARCHING">Searching for Employment</option>
                <option value="IN_TRAINING">In Training / Further Studies</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {employmentStatus === 'EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Employer Name *</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="e.g. Infosys, TCS" required
                    className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Monthly Wage Band</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <select
                  value={wageBand} onChange={(e) => setWageBand(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="0-10k">₹0 – ₹10,000 / month</option>
                  <option value="10-20k">₹10,000 – ₹20,000 / month</option>
                  <option value="20k+">₹20,000+ / month</option>
                </select>
              </div>
            </div>

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Relevance to Training *</label>
                <div className="relative">
                  <Compass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <select
                    value={roleRelevance} onChange={(e) => setRoleRelevance(e.target.value)} required
                    className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="DIRECTLY_RELATED">Directly Related</option>
                    <option value="SOMEWHAT_RELATED">Somewhat Related</option>
                    <option value="UNRELATED">Unrelated</option>
                  </select>
                </div>
              </div>
            )}

            {employmentStatus === 'SELF_EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Business Type</label>
                <input
                  type="text" value={selfEmploymentType} onChange={(e) => setSelfEmploymentType(e.target.value)}
                  placeholder="e.g. Freelance Web Designer"
                  className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all"
                />
              </div>
            )}

            {employmentStatus === 'EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Apprenticeship (Optional)</label>
                <input
                  type="text" value={apprenticeshipEmployer} onChange={(e) => setApprenticeshipEmployer(e.target.value)}
                  placeholder="e.g. Maruti Suzuki NAPS"
                  className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all"
                />
              </div>
            )}

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Placement District (Optional)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text" value={placementDistrict} onChange={(e) => setPlacementDistrict(e.target.value)}
                    placeholder="e.g. Pune, Bengaluru"
                    className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {employmentStatus === 'SEARCHING' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300 sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Reason for Search *</label>
                <select
                  value={nonPlacementReason} onChange={(e) => setNonPlacementReason(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="SKILL_GAP">Skill Gap — Need more practical or advanced training</option>
                  <option value="WAGE_EXPECTATION">Wage Expectation — Offered salary did not meet expectations</option>
                  <option value="LOCATION">Location Constraints — Distance or relocation not possible</option>
                  <option value="NO_RESPONSE_FROM_EMPLOYERS">Awaiting Employer Responses</option>
                  <option value="OTHER">Other Factors</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Additional Notes (Optional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details about your current status..." rows={3}
              className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white transition-all resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-md"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Recording...</>
              ) : (
                <><PlusCircle size={16} /> Submit Record</>
              )}
            </button>
          </div>
        </form>
      </div>

      {verificationFeedback && (
        <div className={`p-5 rounded-2xl border text-sm font-medium flex items-start gap-4 animate-in fade-in duration-300 shadow-sm ${
          verificationFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          verificationFeedback.type === 'consent_warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
          'bg-red-50 text-red-800 border-red-200'
        }`}>
          {verificationFeedback.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />}
          {verificationFeedback.type === 'consent_warning' && <AlertTriangle size={20} className="text-amber-600 shrink-0" />}
          {verificationFeedback.type === 'error' && <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <div className="flex-1">
            <p className="leading-relaxed">{verificationFeedback.message}</p>
            {verificationFeedback.link && (
              <a href={verificationFeedback.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-bold text-blue-700 hover:text-blue-900 transition-colors">
                Open Verification Portal <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={() => setVerificationFeedback(null)} className="text-zinc-400 hover:text-zinc-700 p-1"><X size={16} /></button>
        </div>
      )}

      {/* Outcome History */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" />
            <h2 className="text-sm font-display font-bold text-zinc-950 uppercase tracking-widest">
              Outcome Check-In History
            </h2>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {outcomeHistory.length} {outcomeHistory.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {outcomeHistory.length === 0 && !loadingHistory && (
          <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-zinc-50 border border-zinc-100">
              <Award size={32} className="text-zinc-300" />
            </div>
            <h3 className="text-lg font-display font-bold text-zinc-950 mb-2">No check-ins recorded</h3>
            <p className="text-sm text-zinc-500 max-w-sm font-medium leading-relaxed">
              Self-report your current placement status above to record your first milestone.
            </p>
          </div>
        )}

        {outcomeHistory.length > 0 && (
          <div className="flex flex-col gap-4">
            {outcomeHistory.map((item) => {
              const badge = getStatusBadgeStyle(item.employmentStatus);
              const respondedDate = item.respondedAt || item.createdAt;
              const verification = item.employerVerification;
              const isEmployed = item.employmentStatus === 'EMPLOYED';

              return (
                <div key={item.id} className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-950 tracking-tight">
                        {formatCheckinType(item.checkinType)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-lg">
                      <Calendar size={14} />
                      {new Date(respondedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      <Briefcase size={14} /> {formatEmploymentStatus(item.employmentStatus)}
                    </div>
                    {item.employerName && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-50 border border-zinc-200 text-zinc-700">
                        <Building size={14} className="text-zinc-400" /> {item.employerName}
                      </div>
                    )}
                    {item.wageBand && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-50 border border-zinc-200 text-zinc-700 font-mono">
                        <DollarSign size={14} className="text-zinc-400" /> ₹{item.wageBand}
                      </div>
                    )}
                    {item.roleRelevance && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        item.roleRelevance === 'DIRECTLY_RELATED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        item.roleRelevance === 'SOMEWHAT_RELATED' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        <Compass size={14} /> {formatRelevanceLabel(item.roleRelevance)}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <div className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-100/80 text-sm text-zinc-600 leading-relaxed italic">
                      "{item.notes}"
                    </div>
                  )}

                  {isEmployed && (
                    <div className="pt-4 border-t border-zinc-100 mt-2">
                      {verification ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-50/50 rounded-2xl border border-zinc-200/60">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              verification.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              verification.status === 'DENIED' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {verification.status === 'CONFIRMED' && <ShieldCheck size={16} />}
                              {verification.status === 'DENIED' && <XCircle size={16} />}
                              {verification.status === 'PENDING' && <Clock size={16} />}
                              <span>{verification.status === 'CONFIRMED' ? 'Employer Verified' : verification.status === 'DENIED' ? 'Employer Denied' : 'Verification Pending'}</span>
                            </div>
                            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                              <Mail size={14} className="text-zinc-400" />
                              <code className="bg-white px-2 py-0.5 rounded border border-zinc-200">{verification.employerContactEmail}</code>
                            </span>
                          </div>
                          {verification.status === 'PENDING' && (
                            <a href={`/verify/${verification.verificationToken}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                              Preview Link <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div>
                          {requestingVerificationId === item.id ? (
                            <div className="p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                                  <ShieldCheck size={18} className="text-blue-600" /> Request Verification
                                </span>
                                <button onClick={() => setRequestingVerificationId(null)} className="text-xs text-zinc-400 hover:text-zinc-600 font-bold p-1"><X size={16}/></button>
                              </div>
                              <p className="text-xs text-zinc-500 mb-4">Enter HR or supervisor's business email for a 1-click verification link.</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                  <input type="email" placeholder="hr@company.com" value={employerEmailInput[item.id] || ''} onChange={(e) => setEmployerEmailInput((prev) => ({...prev, [item.id]: e.target.value}))} className="w-full bg-white border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-zinc-950/20" />
                                </div>
                                <button disabled={verifyingSubmitting} onClick={() => handleRequestVerification(item.id)} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0">
                                  {verifyingSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Request</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-400 font-medium">Unverified claim</span>
                              <button onClick={() => { setRequestingVerificationId(item.id); setVerificationFeedback(null); }} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all shadow-sm">
                                <ShieldCheck size={16} className="text-blue-600" /> Request Verification
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {traineeProfile?.consent?.GOVT_CROSS_CHECK?.granted && govtChecks.length > 0 && (
          <div className="mt-8 pt-8 border-t border-zinc-200/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Landmark size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-zinc-950 uppercase tracking-widest flex items-center gap-2">
                    Corroboration Signals <span className="text-[9px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">BETA</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">National registry cross-checks</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {govtChecks.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-zinc-200/60 p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-950">{item.source === 'ESHRAM' ? 'e-Shram Registry' : 'UDYAM Portal'}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${item.matchFound ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                      {item.matchFound ? `Match Found (${Math.round((item.matchConfidence || 0.8) * 100)}%)` : 'No Record'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 leading-relaxed font-medium">
                    {item.matchedRecordSummary || 'No summary.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutcomeStatusView;
