import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Briefcase, CheckCircle2, Clock, Building, DollarSign,
  Loader2, PlusCircle, RefreshCw, Send, AlertCircle, Calendar,
  ShieldCheck, Mail, AlertTriangle, HelpCircle, Compass, X,
  XCircle, ExternalLink, Landmark, MapPin, Sparkles
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import { useRouter } from '../router';
import { OutcomeCheckInRecord, GovtCrossCheckRecord } from '../types';
import { isDemoMode } from '../demo/demoData';
import { PageHeader } from './bauhaus/PageHeader';
import { EvidenceBadge } from './common/EvidenceBadge';

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
    case 'EMPLOYED': return { bg: 'bg-[#EBF3FC]', text: 'text-[#2457A6]', border: 'border-[#2457A6]' };
    case 'SELF_EMPLOYED': return { bg: 'bg-[#FEF9E7]', text: 'text-[#B78103]', border: 'border-[#F4C430]' };
    case 'SEARCHING': return { bg: 'bg-[#FDEDEC]', text: 'text-[#E53935]', border: 'border-[#E53935]' };
    case 'IN_TRAINING': return { bg: 'bg-[#EBF3FC]', text: 'text-[#2457A6]', border: 'border-[#2457A6]' };
    default: return { bg: 'bg-[#F5F0E6]', text: 'text-[#555555]', border: 'border-[#111111]' };
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
  const { setActiveSidebarTab } = useUiStore();
  const { navigate } = useRouter();

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
    <div className="flex-1 bg-[#F5F0E6] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-[#111111]">
      
      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="10"
        code="OUTCOMES"
        title="CAREER OUTCOMES & EVIDENCE"
        subtitle={`SELF-REPORT EMPLOYMENT TRANSITIONS & REQUEST EMPLOYER VERIFICATION • ${traineeName.toUpperCase()}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSidebarTab('agent-workspace');
                navigate('/workspace');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold uppercase bg-[#111111] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#E53935] transition-all cursor-pointer"
              title="Return to 3D Agent Simulation (Section 21.1)"
            >
              <Compass size={13} />
              <span>3D Office</span>
            </button>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[#111111] hover:bg-[#EFE7D8] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin text-[#E53935]' : ''} />
              <span>Sync Status</span>
            </button>
          </div>
        }
      />
      {/* Section 25.3 Mandatory Synthetic Demonstration Data Banner */}
      <div className="bg-[#FFFBEB] border-2 border-[#D97706] p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#111111]">
        <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-[#92400E]">
          <span className="font-black uppercase tracking-wider mr-2">[SECTION 25.3 NOTICE]:</span>
          Synthetic demonstration data — not official Maharashtra government statistics.
          Trainee progression and employer records reflect the calibrated SIH 2026 demonstration cohort.
        </div>
      </div>
      {/* Form Card: Self-Report Status */}
      <div className="bg-[#FFFFFF] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-6 md:p-8 relative">
        <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b-2 border-[#111111]">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-[#E53935]" />
            <h2 className="text-xs font-mono font-black text-[#111111] tracking-wider uppercase">
              Record Employment Milestone
            </h2>
          </div>
          <span className="text-[10px] bg-[#FEF9E7] text-[#111111] font-mono font-bold px-2.5 py-1 border border-[#111111] uppercase shadow-[1px_1px_0px_#111111]">
            DPDP Compliant
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FDEDEC] text-[#E53935] text-xs font-mono font-bold border-2 border-[#E53935] shadow-[2px_2px_0px_#111111] flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0 text-[#E53935]" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-[#EBF3FC] text-[#2457A6] text-xs font-mono font-bold border-2 border-[#2457A6] shadow-[2px_2px_0px_#111111] flex items-center gap-3">
            <CheckCircle2 size={16} className="shrink-0 text-[#2457A6]" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-[#F5F0E6] border-2 border-[#111111] px-3.5 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] transition-all cursor-pointer"
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
                <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Employer / Company Name *</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555555]" />
                  <input
                    type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="e.g. Razorpay, Swiggy, Google" required
                    className="w-full bg-[#F5F0E6] border-2 border-[#111111] pl-10 pr-4 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider mb-1.5 block font-mono">Monthly Compensation</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555555]" />
                <select
                  value={wageBand} onChange={(e) => setWageBand(e.target.value)}
                  className="w-full bg-[#F5F0E6] border-2 border-[#111111] pl-10 pr-4 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] transition-all cursor-pointer"
                >
                  <option value="0-10k">₹0 – ₹10,000 / month</option>
                  <option value="10-20k">₹10,000 – ₹20,000 / month</option>
                  <option value="20k+">₹20,000+ / month (Senior Band)</option>
                </select>
              </div>
            </div>

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Relevance to Training *</label>
                <div className="relative">
                  <Compass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555555]" />
                  <select
                    value={roleRelevance} onChange={(e) => setRoleRelevance(e.target.value)} required
                    className="w-full bg-[#F5F0E6] border-2 border-[#111111] pl-10 pr-4 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] transition-all cursor-pointer"
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
                <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Business Type / Domain</label>
                <input
                  type="text" value={selfEmploymentType} onChange={(e) => setSelfEmploymentType(e.target.value)}
                  placeholder="e.g. Freelance Web Developer"
                  className="w-full bg-[#F5F0E6] border-2 border-[#111111] px-4 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777] transition-all"
                />
              </div>
            )}

            {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Placement District (Optional)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555555]" />
                  <input
                    type="text" value={placementDistrict} onChange={(e) => setPlacementDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru, Pune, Delhi NCR"
                    className="w-full bg-[#F5F0E6] border-2 border-[#111111] pl-10 pr-4 py-2.5 text-xs text-[#111111] font-mono font-bold focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777] transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#555555] uppercase tracking-wider font-mono">Milestone Context & Projects</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details about role level, project scope, or onboarding dates..." rows={3}
              className="w-full bg-[#F5F0E6] border-2 border-[#111111] p-3 text-xs text-[#111111] font-mono font-medium focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777] transition-all resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#E53935] hover:bg-[#111111] text-white text-xs font-mono font-black uppercase tracking-wider transition-all border-2 border-[#111111] shadow-[3px_3px_0px_#111111] disabled:opacity-50 cursor-pointer"
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
        <div className={`p-5 border-2 border-[#111111] shadow-[4px_4px_0px_#111111] text-xs font-mono font-bold flex items-start gap-4 ${
          verificationFeedback.type === 'success' ? 'bg-[#EBF3FC] text-[#2457A6]' :
          verificationFeedback.type === 'consent_warning' ? 'bg-[#FEF9E7] text-[#B78103]' :
          'bg-[#FDEDEC] text-[#E53935]'
        }`}>
          {verificationFeedback.type === 'success' && <CheckCircle2 size={18} className="text-[#2457A6] shrink-0" />}
          {verificationFeedback.type === 'consent_warning' && <AlertTriangle size={18} className="text-[#B78103] shrink-0" />}
          {verificationFeedback.type === 'error' && <AlertCircle size={18} className="text-[#E53935] shrink-0" />}
          <div className="flex-1">
            <p className="leading-relaxed">{verificationFeedback.message}</p>
            {verificationFeedback.link && (
              <a href={verificationFeedback.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-bold underline">
                Open Verification Portal <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={() => setVerificationFeedback(null)} className="text-[#111111] hover:text-[#E53935] p-1 cursor-pointer"><X size={16} /></button>
        </div>
      )}

      {/* Outcome History */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#2457A6]" />
            <h2 className="text-xs font-mono font-black text-[#111111] uppercase tracking-widest">
              Outcome Audit History & Corroboration
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[#555555]">
            {effectiveHistory.length} {effectiveHistory.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {effectiveHistory.length === 0 && !loadingHistory && (
          <div className="bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 border-2 border-[#111111] flex items-center justify-center mb-4 bg-[#F5F0E6] shadow-[2px_2px_0px_#111111]">
              <Award size={28} className="text-[#111111]" />
            </div>
            <h3 className="text-base font-mono font-black text-[#111111] uppercase mb-2">No outcome records yet</h3>
            <p className="text-xs font-mono text-[#555555] max-w-sm leading-relaxed">
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
                <div key={item.id} className="bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-6 flex flex-col gap-4 hover:-translate-y-0.5 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-black text-[#111111] uppercase">
                        {formatCheckinType(item.checkinType)}
                      </span>
                      <EvidenceBadge
                        type={verification?.status === 'CONFIRMED' ? 'VERIFIED' : 'SELF_REPORTED'}
                        confidence={verification?.status === 'CONFIRMED' ? 0.95 : undefined}
                        evidenceRef={verification?.verificationToken || undefined}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#555555] bg-[#F5F0E6] border border-[#111111] px-2.5 py-1">
                      <Calendar size={13} />
                      {new Date(respondedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold border-2 ${badge.bg} ${badge.text} ${badge.border}`}>
                      <Briefcase size={14} /> {formatEmploymentStatus(item.employmentStatus)}
                    </div>
                    {item.employerName && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold bg-[#F5F0E6] border border-[#111111] text-[#111111]">
                        <Building size={14} className="text-[#E53935]" /> {item.employerName}
                      </div>
                    )}
                    {item.wageBand && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#F5F0E6] border border-[#111111] text-[#111111]">
                        <DollarSign size={14} className="text-[#2457A6]" /> ₹{item.wageBand}
                      </div>
                    )}
                    {item.roleRelevance && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold border ${
                        item.roleRelevance === 'DIRECTLY_RELATED' ? 'bg-[#EBF3FC] text-[#2457A6] border-[#2457A6]' :
                        item.roleRelevance === 'SOMEWHAT_RELATED' ? 'bg-[#FEF9E7] text-[#B78103] border-[#F4C430]' : 'bg-[#F5F0E6] text-[#555555] border-[#111111]'
                      }`}>
                        <Compass size={14} /> {formatRelevanceLabel(item.roleRelevance)}
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <div className="p-3.5 bg-[#F5F0E6] border border-[#111111] text-xs font-mono text-[#111111] leading-relaxed italic">
                      "{item.notes}"
                    </div>
                  )}

                  {isEmployed && (
                    <div className="pt-3 border-t border-[#EFE7D8] mt-1">
                      {verification ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#F5F0E6] border-2 border-[#111111]">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-bold border-2 ${
                              verification.status === 'CONFIRMED' ? 'bg-[#EBF3FC] text-[#2457A6] border-[#2457A6]' :
                              verification.status === 'DENIED' ? 'bg-[#FDEDEC] text-[#E53935] border-[#E53935]' : 'bg-[#FEF9E7] text-[#B78103] border-[#F4C430]'
                            }`}>
                              {verification.status === 'CONFIRMED' && <ShieldCheck size={15} />}
                              {verification.status === 'DENIED' && <XCircle size={15} />}
                              {verification.status === 'PENDING' && <Clock size={15} />}
                              <span>{verification.status === 'CONFIRMED' ? 'Employer Verified' : verification.status === 'DENIED' ? 'Employer Denied' : 'Verification Pending'}</span>
                            </div>
                            <span className="text-xs font-mono text-[#555555] flex items-center gap-1.5">
                              <Mail size={13} />
                              <code className="bg-[#FFFFFF] px-2 py-0.5 border border-[#111111] text-[#111111]">{verification.employerContactEmail}</code>
                            </span>
                          </div>
                          {verification.status === 'PENDING' && (
                            <a href={`/verify/${verification.verificationToken}`} target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-[#E53935] hover:underline flex items-center gap-1.5">
                              Preview Link <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div>
                          {requestingVerificationId === item.id ? (
                            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono font-bold uppercase text-[#111111] flex items-center gap-2">
                                  <ShieldCheck size={16} className="text-[#E53935]" /> Request Employer Attestation
                                </span>
                                <button onClick={() => setRequestingVerificationId(null)} className="text-xs text-[#555555] hover:text-[#111111] font-bold p-1 cursor-pointer"><X size={16}/></button>
                              </div>
                              <p className="text-xs font-mono text-[#555555] mb-3">Send an automated, 1-click verification link to your HR or supervisor's work email.</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555555]" />
                                  <input 
                                    type="email" 
                                    placeholder="hr@company.com" 
                                    value={employerEmailInput[item.id] || ''} 
                                    onChange={(e) => setEmployerEmailInput((prev) => ({...prev, [item.id]: e.target.value}))} 
                                    className="w-full bg-[#FFFFFF] border-2 border-[#111111] pl-10 pr-4 py-2 text-xs font-mono font-bold text-[#111111] focus:outline-none" 
                                  />
                                </div>
                                <button 
                                  disabled={verifyingSubmitting} 
                                  onClick={() => handleRequestVerification(item.id)} 
                                  className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#E53935] hover:bg-[#111111] text-white text-xs font-mono font-black uppercase transition-all disabled:opacity-50 shrink-0 cursor-pointer border-2 border-[#111111] shadow-[2px_2px_0px_#111111]"
                                >
                                  {verifyingSubmitting ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Request</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-[#555555]">Unverified Self-Reported Claim</span>
                              <button 
                                onClick={() => { setRequestingVerificationId(item.id); setVerificationFeedback(null); }} 
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#EFE7D8] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                              >
                                <ShieldCheck size={14} className="text-[#E53935]" /> Request Verification
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
          <div className="mt-6 pt-6 border-t-2 border-[#111111]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-[#111111] bg-[#F4C430] shadow-[2px_2px_0px_#111111] flex items-center justify-center text-[#111111]">
                  <Landmark size={20} />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-black text-[#111111] uppercase tracking-widest flex items-center gap-2">
                    National Registry Cross-Checks <span className="text-[9px] bg-[#E53935] text-white px-2 py-0.5 border border-[#111111]">BETA</span>
                  </h2>
                  <p className="text-xs font-mono text-[#555555] mt-0.5">Government-level corroboration telemetry (e-Shram / UDYAM)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {govtChecks.map((item) => (
                <div key={item.id} className="bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-[#111111] uppercase">{item.source === 'ESHRAM' ? 'e-Shram Registry' : 'UDYAM Portal'}</span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${
                      item.matchFound ? 'bg-[#EBF3FC] text-[#2457A6] border-[#2457A6]' : 'bg-[#F5F0E6] text-[#555555] border-[#111111]'
                    }`}>
                      {item.matchFound ? `Match Found (${Math.round((item.matchConfidence || 0.8) * 100)}%)` : 'No Record Found'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#555555] bg-[#F5F0E6] p-3 border border-[#111111] leading-relaxed">
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
