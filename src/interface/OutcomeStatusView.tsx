import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Briefcase, CheckCircle2, Clock, Building, DollarSign,
  Loader2, PlusCircle, RefreshCw, Send, AlertCircle, Calendar,
  ShieldCheck, Mail, AlertTriangle, HelpCircle, Compass, X,
  XCircle, ExternalLink, Landmark, MapPin, Sparkles
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { OutcomeCheckInRecord, GovtCrossCheckRecord } from '../types';
import { isDemoMode } from '../demo/demoData';

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
    case 'EMPLOYED': return { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', border: 'border-[#22C55E]/20' };
    case 'SELF_EMPLOYED': return { bg: 'bg-[#FF5C1A]/10', text: 'text-[#FF5C1A]', border: 'border-[#FF5C1A]/20' };
    case 'SEARCHING': return { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/20' };
    case 'IN_TRAINING': return { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', border: 'border-[#3B82F6]/20' };
    default: return { bg: 'bg-[#1A1B20]', text: 'text-[#8B949E]', border: 'border-white/8' };
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

const DEFAULT_OUTCOMES: OutcomeCheckInRecord[] = [
  {
    id: 'out-1',
    traineeId: 'demo-user',
    checkinType: 'SELF_INITIATED',
    status: 'COMPLETED',
    employmentStatus: 'EMPLOYED',
    employerName: 'Razorpay Software',
    wageBand: '20k+',
    roleRelevance: 'DIRECTLY_RELATED',
    placementDistrict: 'Bengaluru, Karnataka',
    notes: 'Senior Full Stack Engineer role architecting high-throughput checkout APIs and payment gateways.',
    scheduledFor: '2026-09-14T10:00:00Z',
    createdAt: '2026-09-14T10:00:00Z',
    respondedAt: '2026-09-14T10:00:00Z',
    employerVerification: {
      id: 'ver-1',
      outcomeCheckInId: 'out-1',
      status: 'CONFIRMED',
      employerContactEmail: 'hr-verifications@razorpay.com',
      verificationToken: 'token_rzp_9921',
      verifiedAt: '2026-09-15T12:30:00Z',
    } as any,
  },
  {
    id: 'out-2',
    traineeId: 'demo-user',
    checkinType: '90_DAY',
    status: 'COMPLETED',
    employmentStatus: 'SELF_EMPLOYED',
    employerName: '',
    wageBand: '10-20k',
    roleRelevance: 'DIRECTLY_RELATED',
    selfEmploymentType: 'Cloud Infrastructure & Full-Stack Consulting',
    placementDistrict: 'Remote / India',
    notes: 'Independent engineering consultant building serverless microservices for fintech clients.',
    scheduledFor: '2026-06-10T14:00:00Z',
    createdAt: '2026-06-10T14:00:00Z',
    respondedAt: '2026-06-10T14:00:00Z',
  }
];

export const OutcomeStatusView: React.FC = () => {
  const { traineeProfile, outcomeHistory, setOutcomeHistory } = useCoreStore();

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [employmentStatus, setEmploymentStatus] = useState<string>('EMPLOYED');
  const [employerName, setEmployerName] = useState<string>('');
  const [wageBand, setWageBand] = useState<string>('20k+');
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
        const records = Array.isArray(data) && data.length > 0 ? data : (isDemoMode() ? DEFAULT_OUTCOMES : []);
        setOutcomeHistory(records);
      } else {
        if (isDemoMode()) setOutcomeHistory(DEFAULT_OUTCOMES);
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
      if (isDemoMode()) setOutcomeHistory(DEFAULT_OUTCOMES);
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
      if (isDemoMode()) {
        const mockNew: OutcomeCheckInRecord = {
          id: `out-${Date.now()}`,
          traineeId: 'demo-user',
          checkinType: 'SELF_INITIATED',
          status: 'COMPLETED',
          employmentStatus,
          employerName: employerName.trim() || 'Tech Enterprise',
          wageBand,
          roleRelevance,
          notes: notes.trim() || 'Verified career milestone record.',
          scheduledFor: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
        } as any;
        setOutcomeHistory([mockNew, ...outcomeHistory]);
        setSuccessMessage('Milestone outcome recorded securely in Demo Mode!');
        setEmployerName('');
        setNotes('');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
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
        throw new Error(json.error || 'Failed to request verification');
      }

      setVerificationFeedback({
        id: checkInId, type: 'success',
        message: 'Verification request dispatched to employer successfully!', link: json.verificationLink,
      });
      setRequestingVerificationId(null);
      await fetchHistory();
    } catch (err) {
      if (isDemoMode()) {
        setVerificationFeedback({
          id: checkInId, type: 'success',
          message: `Verification link dispatched to ${email} with cryptographic token!`,
        });
        setRequestingVerificationId(null);
      } else {
        setVerificationFeedback({ id: checkInId, type: 'error', message: err instanceof Error ? err.message : 'Failed to send request' });
      }
    } finally {
      setVerifyingSubmitting(false);
    }
  };

  const traineeName = traineeProfile?.trainee?.name || 'Priya Sharma';
  const effectiveHistory = outcomeHistory.length > 0 ? outcomeHistory : (isDemoMode() ? DEFAULT_OUTCOMES : []);

  return (
    <div className="flex-1 bg-[#0A0B0E] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-[#EDEDED]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#121317] border border-white/8 flex items-center justify-center shrink-0 shadow-xs text-[#FF5C1A]">
            <Award size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 font-mono">
                Placement & Corroboration
              </span>
              <span className="text-[11px] font-bold text-[#8B949E] font-mono">• DPDP Audit Ledger</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#EDEDED] tracking-tight">Career Outcomes & Evidence</h1>
            <p className="text-xs text-[#8B949E] font-medium mt-0.5">
              Self-report employment transitions & request employer verification • {traineeName}
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loadingHistory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#121317] border border-white/8 text-[#EDEDED] hover:bg-[#1A1B20] transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin text-[#FF5C1A]' : ''} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Form Card: Self-Report Status */}
      <div className="bg-[#121317] rounded-3xl border border-white/8 shadow-xs p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-[#FF5C1A]" />
            <h2 className="text-xs font-black text-[#EDEDED] tracking-wider uppercase font-mono">
              Record Employment Milestone
            </h2>
          </div>
          <span className="text-[10px] bg-[#0A0B0E] text-[#8B949E] font-mono font-bold px-2.5 py-1 rounded-md border border-white/8">
            DPDP Compliant
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded-xl border border-[#EF4444]/20 font-medium flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-[#22C55E]/10 text-[#22C55E] text-xs rounded-xl border border-[#22C55E]/20 font-bold flex items-center gap-3 font-mono">
            <CheckCircle2 size={16} className="shrink-0 text-[#22C55E]" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] transition-all cursor-pointer"
              >
                <option value="EMPLOYED">Employed</option>
                <option value="SELF_EMPLOYED">Self-Employed / Freelancer</option>
                <option value="SEARCHING">Searching for Opportunities</option>
                <option value="IN_TRAINING">In Training / Education</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {employmentStatus === 'EMPLOYED' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Employer / Company Name *</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="e.g. Razorpay, Swiggy, Google" required
                    className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] placeholder-[#71717A] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5 block font-mono">Monthly Compensation</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <select
                  value={wageBand} onChange={(e) => setWageBand(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] transition-all cursor-pointer font-mono"
                >
                  <option value="0-10k">₹0 – ₹10,000 / month</option>
                  <option value="10-20k">₹10,000 – ₹20,000 / month</option>
                  <option value="20k+">₹20,000+ / month (Senior Band)</option>
                </select>
              </div>
            </div>

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Relevance to Training *</label>
                <div className="relative">
                  <Compass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <select
                    value={roleRelevance} onChange={(e) => setRoleRelevance(e.target.value)} required
                    className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] transition-all cursor-pointer font-mono"
                  >
                    <option value="DIRECTLY_RELATED">Directly Related</option>
                    <option value="SOMEWHAT_RELATED">Somewhat Related</option>
                    <option value="UNRELATED">Unrelated</option>
                  </select>
                </div>
              </div>
            )}

            {employmentStatus === 'SELF_EMPLOYED' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Business Type / Domain</label>
                <input
                  type="text" value={selfEmploymentType} onChange={(e) => setSelfEmploymentType(e.target.value)}
                  placeholder="e.g. Freelance Web Developer"
                  className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] placeholder-[#71717A] transition-all"
                />
              </div>
            )}

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Placement District (Optional)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text" value={placementDistrict} onChange={(e) => setPlacementDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru, Pune, Delhi NCR"
                    className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#EDEDED] font-semibold focus:outline-none focus:border-[#FF5C1A] placeholder-[#71717A] transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider font-mono">Milestone Context & Projects</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details about role level, project scope, or onboarding dates..." rows={3}
              className="w-full bg-[#0A0B0E] border border-white/12 rounded-xl px-4 py-3 text-sm text-[#EDEDED] font-medium focus:outline-none focus:border-[#FF5C1A] placeholder-[#71717A] transition-all resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
        <div className={`p-5 rounded-2xl border text-sm font-medium flex items-start gap-4 shadow-xs ${
          verificationFeedback.type === 'success' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' :
          verificationFeedback.type === 'consent_warning' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' :
          'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
        }`}>
          {verificationFeedback.type === 'success' && <CheckCircle2 size={20} className="text-[#22C55E] shrink-0" />}
          {verificationFeedback.type === 'consent_warning' && <AlertTriangle size={20} className="text-[#F59E0B] shrink-0" />}
          {verificationFeedback.type === 'error' && <AlertCircle size={20} className="text-[#EF4444] shrink-0" />}
          <div className="flex-1">
            <p className="leading-relaxed font-semibold">{verificationFeedback.message}</p>
            {verificationFeedback.link && (
              <a href={verificationFeedback.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-bold text-[#FF5C1A] hover:underline">
                Open Verification Portal <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={() => setVerificationFeedback(null)} className="text-[#8B949E] hover:text-[#EDEDED] p-1 cursor-pointer"><X size={16} /></button>
        </div>
      )}

      {/* Outcome History */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#FF5C1A]" />
            <h2 className="text-xs font-black text-[#EDEDED] uppercase tracking-widest font-mono">
              Outcome Audit History & Corroboration
            </h2>
          </div>
          <span className="text-xs font-bold text-[#8B949E] font-mono">
            {effectiveHistory.length} {effectiveHistory.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {effectiveHistory.length === 0 && !loadingHistory && (
          <div className="bg-[#121317] rounded-3xl border border-white/8 shadow-xs p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[#0A0B0E] border border-white/8">
              <Award size={32} className="text-[#71717A]" />
            </div>
            <h3 className="text-lg font-bold text-[#EDEDED] mb-2">No outcome records yet</h3>
            <p className="text-sm text-[#8B949E] max-w-sm font-medium leading-relaxed">
              Self-report your current transition status above to start your verified track record.
            </p>
          </div>
        )}

        {effectiveHistory.length > 0 && (
          <div className="flex flex-col gap-4">
            {effectiveHistory.map((item) => {
              const badge = getStatusBadgeStyle(item.employmentStatus);
              const respondedDate = item.respondedAt || item.createdAt;
              const verification = item.employerVerification;
              const isEmployed = item.employmentStatus === 'EMPLOYED';

              return (
                <div key={item.id} className="bg-[#121317] rounded-3xl border border-white/8 shadow-xs p-6 flex flex-col gap-4 hover:border-white/16 transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-[#EDEDED] tracking-tight">
                        {formatCheckinType(item.checkinType)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border font-mono ${
                        item.status === 'COMPLETED' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#8B949E] bg-[#0A0B0E] border border-white/8 px-3 py-1.5 rounded-xl font-mono">
                      <Calendar size={13} />
                      {new Date(respondedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border font-mono ${badge.bg} ${badge.text} ${badge.border}`}>
                      <Briefcase size={14} /> {formatEmploymentStatus(item.employmentStatus)}
                    </div>
                    {item.employerName && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A0B0E] border border-white/8 text-[#EDEDED]">
                        <Building size={14} className="text-[#FF5C1A]" /> {item.employerName}
                      </div>
                    )}
                    {item.wageBand && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A0B0E] border border-white/8 text-[#EDEDED] font-mono">
                        <DollarSign size={14} className="text-[#22C55E]" /> ₹{item.wageBand}
                      </div>
                    )}
                    {item.roleRelevance && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border font-mono ${
                        item.roleRelevance === 'DIRECTLY_RELATED' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' :
                        item.roleRelevance === 'SOMEWHAT_RELATED' ? 'bg-[#FF5C1A]/10 text-[#FF5C1A] border-[#FF5C1A]/20' : 'bg-[#0A0B0E] text-[#8B949E] border-white/8'
                      }`}>
                        <Compass size={14} /> {formatRelevanceLabel(item.roleRelevance)}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <div className="p-4 bg-[#0A0B0E] rounded-xl border border-white/6 text-sm text-[#EDEDED] leading-relaxed italic">
                      "{item.notes}"
                    </div>
                  )}

                  {isEmployed && (
                    <div className="pt-4 border-t border-white/8 mt-1">
                      {verification ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A0B0E] rounded-2xl border border-white/8">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border font-mono ${
                              verification.status === 'CONFIRMED' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' :
                              verification.status === 'DENIED' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
                            }`}>
                              {verification.status === 'CONFIRMED' && <ShieldCheck size={15} />}
                              {verification.status === 'DENIED' && <XCircle size={15} />}
                              {verification.status === 'PENDING' && <Clock size={15} />}
                              <span>{verification.status === 'CONFIRMED' ? 'Employer Verified' : verification.status === 'DENIED' ? 'Employer Denied' : 'Verification Pending'}</span>
                            </div>
                            <span className="text-xs text-[#8B949E] font-medium flex items-center gap-1.5">
                              <Mail size={13} className="text-[#71717A]" />
                              <code className="bg-[#121317] px-2 py-0.5 rounded border border-white/8 text-[#EDEDED] font-mono">{verification.employerContactEmail}</code>
                            </span>
                          </div>
                          {verification.status === 'PENDING' && (
                            <a href={`/verify/${verification.verificationToken}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#FF5C1A] hover:underline flex items-center gap-1.5 font-mono">
                              Preview Link <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div>
                          {requestingVerificationId === item.id ? (
                            <div className="p-5 bg-[#0A0B0E] rounded-2xl border border-[#FF5C1A]/30">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
                                  <ShieldCheck size={18} className="text-[#FF5C1A]" /> Request Employer Attestation
                                </span>
                                <button onClick={() => setRequestingVerificationId(null)} className="text-xs text-[#8B949E] hover:text-[#EDEDED] font-bold p-1 cursor-pointer"><X size={16}/></button>
                              </div>
                              <p className="text-xs text-[#8B949E] mb-4">Send an automated, 1-click verification link to your HR or supervisor's work email.</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                                  <input 
                                    type="email" 
                                    placeholder="hr@company.com" 
                                    value={employerEmailInput[item.id] || ''} 
                                    onChange={(e) => setEmployerEmailInput((prev) => ({...prev, [item.id]: e.target.value}))} 
                                    className="w-full bg-[#121317] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#EDEDED] focus:border-[#FF5C1A] outline-none placeholder-[#71717A]" 
                                  />
                                </div>
                                <button 
                                  disabled={verifyingSubmitting} 
                                  onClick={() => handleRequestVerification(item.id)} 
                                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
                                >
                                  {verifyingSubmitting ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Request</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#8B949E] font-medium font-mono">Unverified Self-Reported Claim</span>
                              <button 
                                onClick={() => { setRequestingVerificationId(item.id); setVerificationFeedback(null); }} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5C1A]/10 hover:bg-[#FF5C1A]/20 text-[#FF5C1A] border border-[#FF5C1A]/20 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
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
          <div className="mt-8 pt-8 border-t border-white/8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 flex items-center justify-center text-[#FF5C1A]">
                  <Landmark size={20} />
                </div>
                <div>
                  <h2 className="text-xs font-black text-[#EDEDED] uppercase tracking-widest flex items-center gap-2 font-mono">
                    National Registry Cross-Checks <span className="text-[9px] bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 px-2 py-0.5 rounded-md">BETA</span>
                  </h2>
                  <p className="text-xs text-[#8B949E] mt-0.5">Government-level corroboration telemetry (e-Shram / UDYAM)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {govtChecks.map((item) => (
                <div key={item.id} className="bg-[#121317] rounded-2xl border border-white/8 p-5 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#EDEDED]">{item.source === 'ESHRAM' ? 'e-Shram Registry' : 'UDYAM Portal'}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border font-mono ${
                      item.matchFound ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' : 'bg-[#0A0B0E] text-[#8B949E] border-white/8'
                    }`}>
                      {item.matchFound ? `Match Found (${Math.round((item.matchConfidence || 0.8) * 100)}%)` : 'No Record Found'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B949E] bg-[#0A0B0E] p-3 rounded-xl border border-white/6 leading-relaxed font-medium font-mono">
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
