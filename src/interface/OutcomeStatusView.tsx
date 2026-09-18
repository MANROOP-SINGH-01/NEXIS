import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Briefcase, CheckCircle2, Clock, Building, DollarSign,
  Loader2, PlusCircle, RefreshCw, Send, AlertCircle, Calendar,
  ShieldCheck, Mail, AlertTriangle, HelpCircle, Compass, X,
  XCircle, ExternalLink, Landmark, MapPin, Sparkles
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { OutcomeCheckInRecord, GovtCrossCheckRecord } from '../types';

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
    case 'EMPLOYED': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'SELF_EMPLOYED': return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
    case 'SEARCHING': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'IN_TRAINING': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
    default: return { bg: 'bg-white/5', text: 'text-zinc-400', border: 'border-white/10' };
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
      const auth = localStorage.getItem('nexis-auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.state?.token) return parsed.state.token;
      }
      const stored = localStorage.getItem('forge-github-token');
      if (stored && stored.trim()) return stored.trim();
    } catch {}
    return 'dev_trainee';
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const token = getActiveToken();
    try {
      const res = await fetch('/api/trainee/outcomes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOutcomeHistory(Array.isArray(data) ? data : []);
      }

      const pRes = await fetch('/api/trainee/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData.govtCrossChecks)) {
          setGovtChecks(pData.govtCrossChecks);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [getActiveToken, setOutcomeHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    const token = getActiveToken();

    try {
      const bodyPayload: any = {
        employmentStatus,
        employerName: employmentStatus === 'EMPLOYED' ? employerName.trim() : null,
        wageBand: (employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') ? wageBand : null,
        notes: notes.trim() ? notes.trim() : null,
        roleRelevance: (employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') ? roleRelevance : null,
        selfEmploymentType: employmentStatus === 'SELF_EMPLOYED' ? selfEmploymentType.trim() : null,
        apprenticeshipEmployer: employmentStatus === 'EMPLOYED' ? apprenticeshipEmployer.trim() : null,
        nonPlacementReason: employmentStatus === 'SEARCHING' ? nonPlacementReason : null,
        placementDistrict: (employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') ? placementDistrict.trim() : null,
      };

      const res = await fetch('/api/trainee/status-update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit milestone');
      }

      const data = await res.json();
      setSuccessMessage('Milestone outcome recorded securely with audit-ready timestamp!');
      setEmployerName('');
      setNotes('');
      setSelfEmploymentType('');
      setApprenticeshipEmployer('');
      setPlacementDistrict('');

      if (data.checkIn) {
        setOutcomeHistory([data.checkIn, ...outcomeHistory]);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestVerification = async (checkInId: string) => {
    const email = employerEmailInput[checkInId]?.trim();
    if (!email) {
      setVerificationFeedback({ id: checkInId, type: 'error', message: 'Please enter a valid employer/HR email address.' });
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
        message: 'Verification request dispatched to employer successfully!', link: json.verificationLink,
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
    <div className="flex-1 bg-[#090A0F] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#12131C] border border-white/10 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <Award size={22} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Placement & Corroboration
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Career Outcomes</h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Self-report employment transitions & request employer verification • {traineeName}
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loadingHistory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#12131C] border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin text-indigo-400' : ''} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Form Card: Self-Report Status */}
      <div className="bg-[#12131C] rounded-3xl border border-white/10 shadow-xl p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-indigo-400" />
            <h2 className="text-xs font-display font-bold text-white tracking-wider uppercase">
              Record Employment Milestone
            </h2>
          </div>
          <span className="text-[10px] bg-white/5 text-zinc-400 font-mono font-bold px-2.5 py-1 rounded-md border border-white/10">
            DPDP Compliant
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20 font-medium flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-300 text-xs rounded-xl border border-emerald-500/20 font-medium flex items-center gap-3 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="EMPLOYED" className="bg-[#12131C]">Employed</option>
                <option value="SELF_EMPLOYED" className="bg-[#12131C]">Self-Employed / Freelancer</option>
                <option value="SEARCHING" className="bg-[#12131C]">Searching for Opportunities</option>
                <option value="IN_TRAINING" className="bg-[#12131C]">In Training / Education</option>
                <option value="OTHER" className="bg-[#12131C]">Other</option>
              </select>
            </div>

            {employmentStatus === 'EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Employer / Company Name *</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="e.g. Infosys, TCS, Google" required
                    className="w-full bg-[#1A1B26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Monthly Wage Band</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <select
                  value={wageBand} onChange={(e) => setWageBand(e.target.value)}
                  className="w-full bg-[#1A1B26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="0-10k" className="bg-[#12131C]">₹0 – ₹10,000 / month</option>
                  <option value="10-20k" className="bg-[#12131C]">₹10,000 – ₹20,000 / month</option>
                  <option value="20k+" className="bg-[#12131C]">₹20,000+ / month</option>
                </select>
              </div>
            </div>

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Relevance to Training *</label>
                <div className="relative">
                  <Compass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <select
                    value={roleRelevance} onChange={(e) => setRoleRelevance(e.target.value)} required
                    className="w-full bg-[#1A1B26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="DIRECTLY_RELATED" className="bg-[#12131C]">Directly Related</option>
                    <option value="SOMEWHAT_RELATED" className="bg-[#12131C]">Somewhat Related</option>
                    <option value="UNRELATED" className="bg-[#12131C]">Unrelated</option>
                  </select>
                </div>
              </div>
            )}

            {employmentStatus === 'SELF_EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Business Type / Domain</label>
                <input
                  type="text" value={selfEmploymentType} onChange={(e) => setSelfEmploymentType(e.target.value)}
                  placeholder="e.g. Freelance Web Developer"
                  className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600 transition-all"
                />
              </div>
            )}

            {employmentStatus === 'EMPLOYED' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Apprenticeship (Optional)</label>
                <input
                  type="text" value={apprenticeshipEmployer} onChange={(e) => setApprenticeshipEmployer(e.target.value)}
                  placeholder="e.g. NAPS / NATS Partner"
                  className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600 transition-all"
                />
              </div>
            )}

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Placement District (Optional)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text" value={placementDistrict} onChange={(e) => setPlacementDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru, Pune, Delhi NCR"
                    className="w-full bg-[#1A1B26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600 transition-all"
                  />
                </div>
              </div>
            )}

            {employmentStatus === 'SEARCHING' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-300 sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Primary Search Factor *</label>
                <select
                  value={nonPlacementReason} onChange={(e) => setNonPlacementReason(e.target.value)}
                  className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="SKILL_GAP" className="bg-[#12131C]">Skill Gap — Need more practical or advanced training</option>
                  <option value="WAGE_EXPECTATION" className="bg-[#12131C]">Wage Expectation — Offered compensation did not meet target</option>
                  <option value="LOCATION" className="bg-[#12131C]">Location Constraints — Relocation or commute barrier</option>
                  <option value="NO_RESPONSE_FROM_EMPLOYERS" className="bg-[#12131C]">Awaiting Employer Responses / Application Review</option>
                  <option value="OTHER" className="bg-[#12131C]">Other Factors</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Additional Context (Optional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details about role level, project scope, or onboarding dates..." rows={3}
              className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600 transition-all resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Recording Milestone...</>
              ) : (
                <><PlusCircle size={16} /> Submit Milestone Record</>
              )}
            </button>
          </div>
        </form>
      </div>

      {verificationFeedback && (
        <div className={`p-5 rounded-2xl border text-sm font-medium flex items-start gap-4 animate-in fade-in duration-300 shadow-xl ${
          verificationFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
          verificationFeedback.type === 'consent_warning' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
          'bg-rose-500/10 text-rose-300 border-rose-500/20'
        }`}>
          {verificationFeedback.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
          {verificationFeedback.type === 'consent_warning' && <AlertTriangle size={20} className="text-amber-400 shrink-0" />}
          {verificationFeedback.type === 'error' && <AlertCircle size={20} className="text-rose-400 shrink-0" />}
          <div className="flex-1">
            <p className="leading-relaxed">{verificationFeedback.message}</p>
            {verificationFeedback.link && (
              <a href={verificationFeedback.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Open Verification Portal <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={() => setVerificationFeedback(null)} className="text-zinc-400 hover:text-white p-1 cursor-pointer"><X size={16} /></button>
        </div>
      )}

      {/* Outcome History */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            <h2 className="text-xs font-display font-bold text-white uppercase tracking-widest">
              Outcome Audit History
            </h2>
          </div>
          <span className="text-xs font-bold text-zinc-400 font-mono">
            {outcomeHistory.length} {outcomeHistory.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {outcomeHistory.length === 0 && !loadingHistory && (
          <div className="bg-[#12131C] rounded-3xl border border-white/10 shadow-xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white/5 border border-white/10">
              <Award size={32} className="text-zinc-500" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">No outcome records yet</h3>
            <p className="text-sm text-zinc-400 max-w-sm font-medium leading-relaxed">
              Self-report your current transition status above to start your verified track record.
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
                <div key={item.id} className="bg-[#12131C] rounded-3xl border border-white/10 shadow-xl p-6 flex flex-col gap-4 hover:border-white/20 transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-display font-bold text-white tracking-tight">
                        {formatCheckinType(item.checkinType)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                        item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl font-mono">
                      <Calendar size={13} />
                      {new Date(respondedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      <Briefcase size={14} /> {formatEmploymentStatus(item.employmentStatus)}
                    </div>
                    {item.employerName && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-zinc-200">
                        <Building size={14} className="text-indigo-400" /> {item.employerName}
                      </div>
                    )}
                    {item.wageBand && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-zinc-200 font-mono">
                        <DollarSign size={14} className="text-emerald-400" /> ₹{item.wageBand}
                      </div>
                    )}
                    {item.roleRelevance && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        item.roleRelevance === 'DIRECTLY_RELATED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        item.roleRelevance === 'SOMEWHAT_RELATED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-zinc-400 border-white/10'
                      }`}>
                        <Compass size={14} /> {formatRelevanceLabel(item.roleRelevance)}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-sm text-zinc-300 leading-relaxed italic">
                      "{item.notes}"
                    </div>
                  )}

                  {isEmployed && (
                    <div className="pt-4 border-t border-white/10 mt-1">
                      {verification ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              verification.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              verification.status === 'DENIED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {verification.status === 'CONFIRMED' && <ShieldCheck size={15} />}
                              {verification.status === 'DENIED' && <XCircle size={15} />}
                              {verification.status === 'PENDING' && <Clock size={15} />}
                              <span>{verification.status === 'CONFIRMED' ? 'Employer Verified' : verification.status === 'DENIED' ? 'Employer Denied' : 'Verification Pending'}</span>
                            </div>
                            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                              <Mail size={13} className="text-zinc-500" />
                              <code className="bg-black/40 px-2 py-0.5 rounded border border-white/10 text-zinc-300 font-mono">{verification.employerContactEmail}</code>
                            </span>
                          </div>
                          {verification.status === 'PENDING' && (
                            <a href={`/verify/${verification.verificationToken}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5">
                              Preview Link <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div>
                          {requestingVerificationId === item.id ? (
                            <div className="p-5 bg-white/[0.03] rounded-2xl border border-indigo-500/30 animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                  <ShieldCheck size={18} className="text-indigo-400" /> Request Employer Attestation
                                </span>
                                <button onClick={() => setRequestingVerificationId(null)} className="text-xs text-zinc-400 hover:text-white font-bold p-1 cursor-pointer"><X size={16}/></button>
                              </div>
                              <p className="text-xs text-zinc-400 mb-4">Send an automated, 1-click verification link to your HR or supervisor's work email.</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                  <input 
                                    type="email" 
                                    placeholder="hr@company.com" 
                                    value={employerEmailInput[item.id] || ''} 
                                    onChange={(e) => setEmployerEmailInput((prev) => ({...prev, [item.id]: e.target.value}))} 
                                    className="w-full bg-[#1A1B26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-zinc-600" 
                                  />
                                </div>
                                <button 
                                  disabled={verifyingSubmitting} 
                                  onClick={() => handleRequestVerification(item.id)} 
                                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-lg shadow-indigo-500/20"
                                >
                                  {verifyingSubmitting ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Request</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-medium">Unverified Self-Reported Claim</span>
                              <button 
                                onClick={() => { setRequestingVerificationId(item.id); setVerificationFeedback(null); }} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                <ShieldCheck size={15} /> Request Verification
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
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Landmark size={20} />
                </div>
                <div>
                  <h2 className="text-xs font-display font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    National Registry Cross-Checks <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">BETA</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Government-level corroboration telemetry</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {govtChecks.map((item) => (
                <div key={item.id} className="bg-[#12131C] rounded-2xl border border-white/10 p-5 flex flex-col gap-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{item.source === 'ESHRAM' ? 'e-Shram Registry' : 'UDYAM Portal'}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                      item.matchFound ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-500 border-white/10'
                    }`}>
                      {item.matchFound ? `Match Found (${Math.round((item.matchConfidence || 0.8) * 100)}%)` : 'No Record Found'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed font-medium">
                    {item.matchedRecordSummary || 'No corroborating record summary.'}
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
