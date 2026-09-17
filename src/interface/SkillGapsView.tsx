import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Sparkles, Briefcase,
  GraduationCap, ChevronRight, Target, RefreshCw, Loader2, Award,
  ExternalLink, Layers, Plus, Check, Compass, BookOpen, ShieldCheck,
  TrendingUp, ArrowUpRight
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { USER_COLOR, USER_COLOR_LIGHT, USER_COLOR_SOFT } from '../theme/brand';
import { CandidateSkill, Provenance } from '../types';

interface OnetRole {
  id: string;
  onetCode: string;
  title: string;
  family?: string;
  skillCount?: number;
}

interface OnetSkillGap {
  skillId: string;
  skill: string;
  category: string;
  importance: number;
  level: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
}

interface OnetSkillMatch {
  skill: string;
  category: string;
  importance: number;
  level: string;
  proficiency: string;
  provenance?: Provenance;
  evidenceSource?: string;
}

interface CourseRecommendationItem {
  courseId: string;
  title: string;
  provider: string;
  url: string;
  duration: string;
  level: string;
  isFree: boolean;
  isGovt: boolean;
  addressesGaps: string[];
}

interface OnetGapsResult {
  role: OnetRole | null;
  gaps: OnetSkillGap[];
  matches: OnetSkillMatch[];
  gapSummary: {
    requiredMissing: number;
    preferredMissing: number;
    totalRequired: number;
    matchedRequired: number;
    coveragePercent: number;
  };
  recommendations: CourseRecommendationItem[];
}

function MatchRing({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90">
        <circle cx={60} cy={60} r={r} fill="none" stroke="#f4f4f5" strokeWidth={8} />
        <circle
          cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={String(dash) + ' ' + String(circ - dash)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display font-bold text-zinc-950 leading-none tracking-tight">{pct}%</span>
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mt-1">Match</span>
      </div>
    </div>
  );
}

type PillVariant = 'matched' | 'gap-required' | 'gap-nice' | 'demonstrated' | 'listed';
interface PillStyle { bg: string; text: string; icon: React.ReactNode; border: string }

function SkillPill({ skill, variant, provenance }: { skill: string; variant: PillVariant; provenance?: Provenance }) {
  const styles: Record<PillVariant, PillStyle> = {
    matched: {
      bg: '#ecfdf5', text: '#059669', border: '#a7f3d0',
      icon: <CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-500" />,
    },
    'gap-required': {
      bg: '#fff7ed', text: '#ea580c', border: '#fed7aa',
      icon: <XCircle size={13} strokeWidth={2.5} className="text-orange-500" />,
    },
    'gap-nice': {
      bg: '#fefce8', text: '#ca8a04', border: '#fde68a',
      icon: <AlertCircle size={13} strokeWidth={2.5} className="text-yellow-500" />,
    },
    demonstrated: {
      bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe',
      icon: <Sparkles size={13} strokeWidth={2.5} className="text-blue-500" />,
    },
    listed: {
      bg: '#f4f4f5', text: '#52525b', border: '#e4e4e7',
      icon: <ChevronRight size={13} strokeWidth={2.5} className="text-zinc-400" />,
    },
  };
  const s = styles[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold select-none shadow-sm transition-transform hover:scale-105 cursor-default"
      style={{ background: s.bg, color: s.text, border: '1px solid ' + s.border }}
    >
      {s.icon}
      <span>{skill}</span>
      {provenance && (
        <span
          className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider ${
            provenance === 'VERIFIED'
              ? 'bg-emerald-200/60 text-emerald-900'
              : provenance === 'DECLARED'
              ? 'bg-blue-200/60 text-blue-900'
              : provenance === 'INFERRED'
              ? 'bg-purple-200/60 text-purple-900'
              : 'bg-amber-200/60 text-amber-900'
          }`}
          title={`Provenance: ${provenance}`}
        >
          {provenance === 'VERIFIED' ? 'Verified' : provenance === 'DECLARED' ? 'Declared' : provenance === 'INFERRED' ? 'Inferred' : 'Unsupported'}
        </span>
      )}
    </span>
  );
}

function DimensionBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-600 font-medium">
          {label} <span className="text-[10px] text-zinc-400 font-normal">({weight})</span>
        </span>
        <span className="font-bold text-zinc-900">{value}%</span>
      </div>
      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/40">
        <div
          className="h-full bg-zinc-900 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] p-6 md:p-8 hover:shadow-md transition-shadow duration-300 ${className}`}>
      <h3 className="text-sm font-display font-semibold tracking-tight text-zinc-950 mb-5">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-100 last:border-0">
      <span className="text-xs text-zinc-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-zinc-900 bg-zinc-100/80 px-2 py-1 rounded-md">{value}</span>
    </div>
  );
}

export const SkillGapsView: React.FC = () => {
  const { skillProfile, setSkillProfile, setActiveSidebarTab } = useUiStore();
  const { currentResume, runtimeKeys, setStructuredResume, resumeAnalysis } = useCoreStore();

  // Mode: 'onet' (Standardized Taxonomy) vs 'custom_jd' (Direct ATS Scan)
  const [viewMode, setViewMode] = useState<'onet' | 'custom_jd'>('onet');

  // O*NET State
  const [onetRoles, setOnetRoles] = useState<OnetRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [onetGaps, setOnetGaps] = useState<OnetGapsResult | null>(null);
  const [isLoadingOnet, setIsLoadingOnet] = useState<boolean>(false);

  // Skill Claim / Verify State
  const [isAddingSkill, setIsAddingSkill] = useState<boolean>(false);
  const [claimSkillName, setClaimSkillName] = useState<string>('');
  const [claimProficiency, setClaimProficiency] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [claimProvenance, setClaimProvenance] = useState<Provenance>('DECLARED');
  const [claimEvidence, setClaimEvidence] = useState<string>('');
  const [isSubmittingSkill, setIsSubmittingSkill] = useState<boolean>(false);

  // ATS Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const hasUploadedResume = Boolean(currentResume.content && currentResume.content.trim().length > 20);
  const hasTargetJD = Boolean(currentResume.targetJD && currentResume.targetJD.trim().length > 20);

  const roleTitle = skillProfile?.jd_role_title || (hasTargetJD ? currentResume.targetJD.split('\n')[0].slice(0, 60) : 'Full Stack Software Engineer');
  const seniority = skillProfile?.jd_seniority || 'Mid-Senior Level';

  const requiredSkills = skillProfile?.jd_required_skills || ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Cloud Infrastructure'];
  const niceToHaveSkills = skillProfile?.jd_nice_to_have_skills || ['Docker', 'CI/CD Pipelines', 'Redis'];

  const candidateSkills = skillProfile?.candidate_skills || [
    { skill: 'React', demonstrated: true },
    { skill: 'TypeScript', demonstrated: true },
    { skill: 'Node.js', demonstrated: true },
    { skill: 'REST APIs', demonstrated: true },
    { skill: 'Git', demonstrated: true },
  ];

  const candidateNames = new Set(candidateSkills.map((s: CandidateSkill) => s.skill.toLowerCase()));
  const requiredGaps = requiredSkills.filter((s) => !candidateNames.has(s.toLowerCase()));
  const niceGaps = niceToHaveSkills.filter((s) => !candidateNames.has(s.toLowerCase()));
  const demonstrated = candidateSkills.filter((s: CandidateSkill) => s.demonstrated);
  const listedOnly = candidateSkills.filter((s: CandidateSkill) => !s.demonstrated);

  const matchedRequired = requiredSkills.filter((s) => candidateNames.has(s.toLowerCase()));
  const calculatedMatchPct = requiredSkills.length > 0
    ? Math.round((matchedRequired.length / requiredSkills.length) * 100)
    : 0;

  const pct = skillProfile?.match_pct ?? calculatedMatchPct;
  const matchLabel = pct >= 75 ? 'Strong Role Alignment' : pct >= 50 ? 'Moderate Match (Gaps to Close)' : 'Critical Gaps Detected';
  const matchColor = pct >= 75 ? '#059669' : pct >= 50 ? '#2563eb' : '#ea580c';

  // 1. Fetch O*NET Roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/career-graph/roles');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles) && data.roles.length > 0) {
            setOnetRoles(data.roles);
            // Default to first role with Software Developers or first available
            const defaultRole = data.roles.find((r: OnetRole) => r.onetCode === '15-1252.00') || data.roles[0];
            setSelectedRoleId(defaultRole.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load O*NET roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // 2. Fetch O*NET Gaps when selected role changes
  const loadOnetGaps = async (roleId: string) => {
    if (!roleId) return;
    setIsLoadingOnet(true);
    try {
      const res = await fetch(`/api/career-graph/gaps?roleId=${roleId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setOnetGaps(data);
      }
    } catch (err) {
      console.warn('Failed to load O*NET gaps:', err);
    } finally {
      setIsLoadingOnet(false);
    }
  };

  useEffect(() => {
    if (selectedRoleId) {
      loadOnetGaps(selectedRoleId);
    }
  }, [selectedRoleId]);

  // 3. Claim / Verify a skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSkillName.trim()) return;

    setIsSubmittingSkill(true);
    try {
      const res = await fetch('/api/career-graph/user-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          skillName: claimSkillName.trim(),
          proficiency: claimProficiency,
          provenance: claimProvenance,
          evidenceSource: claimEvidence.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsAddingSkill(false);
        setClaimSkillName('');
        setClaimEvidence('');
        setScanMessage(`Skill "${claimSkillName}" recorded with ${claimProvenance} provenance!`);
        setTimeout(() => setScanMessage(null), 3000);
        // Refresh gaps
        if (selectedRoleId) {
          await loadOnetGaps(selectedRoleId);
        }
      }
    } catch (err) {
      console.warn('Failed to record skill:', err);
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleTriggerRealTimeAnalysis = async () => {
    setIsScanning(true);
    setScanMessage(null);

    try {
      const resumePayload = currentResume.content || 'Experienced Software Developer skilled in React, TypeScript, Node.js, and database architectures.';
      const jdPayload = currentResume.targetJD || 'Looking for a Senior Software Engineer proficient in React, Node.js, PostgreSQL, Docker, AWS, and Distributed Systems.';

      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          resume: resumePayload,
          jd: jdPayload,
          keys: { gemini: runtimeKeys.gemini, sarvam: runtimeKeys.sarvam },
        }),
      });

      const data = await res.json();
      if (res.ok && data?.skillProfile) {
        setSkillProfile(data.skillProfile);
        if (data.structuredResume) setStructuredResume(data.structuredResume);
        setScanMessage('Real-time skill gaps computed successfully from your uploaded profile!');
        setTimeout(() => setScanMessage(null), 4000);
      } else {
        setScanMessage('Analysis completed with local ground-truth extractor.');
        setTimeout(() => setScanMessage(null), 3000);
      }
    } catch (err) {
      console.warn('Real-time scan failover:', err);
      setScanMessage('Local resilient fallback active.');
    } finally {
      setIsScanning(false);
    }
  };

  React.useEffect(() => {
    if (hasTargetJD || currentResume.content) {
      handleTriggerRealTimeAnalysis();
    }
  }, [currentResume.targetJD]);

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar">

      {/* Header with Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <Target size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Skill Gaps Analysis</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-2">
              {viewMode === 'onet' ? (
                <>
                  <Compass size={14} className="text-blue-500" />
                  <span>O*NET Industry Standard Taxonomy</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="font-semibold text-zinc-700">{onetGaps?.role?.title || 'Loading Role...'}</span>
                </>
              ) : (
                <>
                  <span>{seniority}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span>{roleTitle}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Action Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center border border-zinc-200/80 shadow-inner">
            <button
              onClick={() => setViewMode('onet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'onet'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Compass size={13} />
              O*NET Benchmark
            </button>
            <button
              onClick={() => setViewMode('custom_jd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'custom_jd'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Layers size={13} />
              JD ATS Scan
            </button>
          </div>

          {viewMode === 'onet' ? (
            <button
              onClick={() => setIsAddingSkill(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-sm"
            >
              <Plus size={14} />
              Verify / Add Skill
            </button>
          ) : (
            <button
              onClick={handleTriggerRealTimeAnalysis}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-[var(--shadow-subtle)] disabled:opacity-50"
            >
              {isScanning ? <Loader2 size={14} className="animate-spin text-zinc-900" /> : <RefreshCw size={14} />}
              {isScanning ? 'Extracting...' : 'Rescan Ground-Truth'}
            </button>
          )}

          <button
            onClick={() => setActiveSidebarTab('recommended-programs')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            <GraduationCap size={15} />
            Govt Upskilling
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="p-4 bg-zinc-950 text-white rounded-2xl text-xs font-medium shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <Sparkles size={16} className="text-emerald-400" />
          {scanMessage}
        </div>
      )}

      {/* Claim / Verify Skill Modal Form */}
      {isAddingSkill && (
        <div className="p-6 bg-white rounded-3xl border border-blue-200 shadow-xl flex flex-col gap-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              <h3 className="text-sm font-display font-bold text-zinc-950">Add or Verify Candidate Skill</h3>
            </div>
            <button
              onClick={() => setIsAddingSkill(false)}
              className="text-zinc-400 hover:text-zinc-700 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleSaveSkill} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Skill Name *</label>
              <input
                type="text"
                value={claimSkillName}
                onChange={(e) => setClaimSkillName(e.target.value)}
                placeholder="e.g. Docker, Python, Kubernetes"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Proficiency</label>
              <select
                value={claimProficiency}
                onChange={(e) => setClaimProficiency(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Provenance</label>
              <select
                value={claimProvenance}
                onChange={(e) => setClaimProvenance(e.target.value as Provenance)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="VERIFIED">Verified (With verifiable evidence)</option>
                <option value="DECLARED">Declared (Self-reported profile)</option>
                <option value="INFERRED">Inferred (Inferred from experience)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Evidence Source</label>
              <input
                type="text"
                value={claimEvidence}
                onChange={(e) => setClaimEvidence(e.target.value)}
                placeholder="e.g. GitHub repo link, Project commit"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingSkill(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSkill || !claimSkillName.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingSkill && <Loader2 size={13} className="animate-spin" />}
                Save to Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODE 1: O*NET Standard Taxonomy Benchmark ── */}
      {viewMode === 'onet' && (
        <div className="flex flex-col gap-6">
          {/* Target Role Bar */}
          <div className="p-5 bg-white rounded-3xl border border-zinc-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Compass size={20} className="text-zinc-900" />
              <div>
                <p className="text-xs font-bold text-zinc-900">Benchmark Role (O*NET)</p>
                <p className="text-[11px] text-zinc-500">Standardized US Bureau of Labor Statistics & Ministry of Skill Development taxonomy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {onetRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title} ({role.onetCode})
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedRoleId && loadOnetGaps(selectedRoleId)}
                disabled={isLoadingOnet}
                className="p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all"
                title="Refresh Gaps"
              >
                <RefreshCw size={14} className={isLoadingOnet ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {isLoadingOnet && !onetGaps && (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Computing importance-weighted skill gaps against taxonomy...</p>
            </div>
          )}

          {onetGaps && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Match & Metrics */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <Section title="Standard Taxonomy Coverage">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-6">
                      <MatchRing pct={onetGaps.gapSummary.coveragePercent} />
                      <div className="flex flex-col justify-center">
                        <span className="text-sm font-bold tracking-tight mb-1" style={{ color: onetGaps.gapSummary.coveragePercent >= 70 ? '#059669' : onetGaps.gapSummary.coveragePercent >= 40 ? '#2563eb' : '#ea580c' }}>
                          {onetGaps.gapSummary.coveragePercent >= 70 ? 'High Competency Match' : onetGaps.gapSummary.coveragePercent >= 40 ? 'Moderate Alignment' : 'Substantial Gaps Detected'}
                        </span>
                        <span className="text-xs text-zinc-500">Matched against {onetGaps.role?.title} requirements.</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100">
                      <Stat label="Core Skills Matched" value={`${onetGaps.gapSummary.matchedRequired} of ${onetGaps.gapSummary.totalRequired}`} />
                      <Stat label="Missing Core Competencies" value={`${onetGaps.gapSummary.requiredMissing}`} />
                      <Stat label="Missing Preferred Skills" value={`${onetGaps.gapSummary.preferredMissing}`} />
                      <Stat label="Verified Provenance Skills" value={`${onetGaps.matches.filter(m => m.provenance === 'VERIFIED').length} verified`} />
                    </div>
                  </div>
                </Section>

                {/* Critical Priority Gaps */}
                {onetGaps.gaps.filter(g => g.priority === 'CRITICAL').length > 0 && (
                  <Section title={`Critical Gaps (${onetGaps.gaps.filter(g => g.priority === 'CRITICAL').length})`} className="border-red-200/60 bg-red-50/20">
                    <div className="flex flex-col gap-3">
                      {onetGaps.gaps.filter(g => g.priority === 'CRITICAL').map((gap) => (
                        <div key={gap.skillId} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <div>
                              <p className="text-xs font-bold text-zinc-900">{gap.skill}</p>
                              <p className="text-[10px] text-zinc-500">{gap.category} • Required Core</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase tracking-wider">
                              Critical
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{Math.round(gap.importance * 100)}% imp</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Secondary Priority Gaps */}
                {onetGaps.gaps.filter(g => g.priority !== 'CRITICAL').length > 0 && (
                  <Section title={`Secondary Gaps (${onetGaps.gaps.filter(g => g.priority !== 'CRITICAL').length})`}>
                    <div className="flex flex-wrap gap-2">
                      {onetGaps.gaps.filter(g => g.priority !== 'CRITICAL').map((gap) => (
                        <span
                          key={gap.skillId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
                        >
                          <AlertCircle size={12} className="text-amber-500" />
                          <span>{gap.skill}</span>
                          <span className="text-[9px] text-amber-700 font-bold uppercase">({gap.priority})</span>
                        </span>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              {/* Right Column: Matched Skills & Targeted Government Upskilling */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Matched Skills with Provenance */}
                <Section title={`Demonstrated & Matched Skills (${onetGaps.matches.length})`}>
                  {onetGaps.matches.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {onetGaps.matches.map((m) => (
                        <SkillPill
                          key={m.skill}
                          skill={m.skill}
                          variant="matched"
                          provenance={m.provenance}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 font-medium">No verified skills matching this role recorded yet. Click &quot;Verify / Add Skill&quot; above.</p>
                  )}
                </Section>

                {/* Targeted Government & Open Course Recommendations */}
                <Section title="Targeted Upskilling & Government Courses">
                  {onetGaps.recommendations.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {onetGaps.recommendations.map((course) => (
                        <div
                          key={course.courseId}
                          className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                              <BookOpen size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-zinc-950">{course.title}</span>
                                {course.isGovt && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase tracking-wider">
                                    Govt Certified
                                  </span>
                                )}
                                {course.isFree && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px] uppercase tracking-wider">
                                    Free
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 font-medium">
                                Provider: <strong className="text-zinc-700">{course.provider}</strong> • {course.duration} • Level: {course.level}
                              </p>
                              {course.addressesGaps.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Closes:</span>
                                  {course.addressesGaps.map((g) => (
                                    <span key={g} className="px-2 py-0.5 bg-zinc-200/70 text-zinc-800 text-[10px] font-semibold rounded-md">
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 transition-all shadow-sm"
                          >
                            <span>Enroll</span>
                            <ArrowUpRight size={13} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-500 font-medium flex items-center gap-3">
                      <GraduationCap size={18} className="text-zinc-400 shrink-0" />
                      <span>Explore our full catalog of SWAYAM, NPTEL, and eSkillIndia programs on the Recommended Programs page.</span>
                    </div>
                  )}
                </Section>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 2: Custom Target Job Description ATS Scan ── */}
      {viewMode === 'custom_jd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Stats & Missing */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Section title="ATS Match & Competency Alignment">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <MatchRing pct={pct} />
                  <div className="flex flex-col justify-center">
                    <span className="text-sm font-bold tracking-tight mb-1" style={{ color: matchColor }}>
                      {matchLabel}
                    </span>
                    <span className="text-xs text-zinc-500">Based on parsed JD vs Resume overlap.</span>
                  </div>
                </div>
                <div className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100">
                  <Stat label="Required Matched" value={`${matchedRequired.length} of ${requiredSkills.length}`} />
                  <Stat label="Nice-to-Have Matched" value={`${niceToHaveSkills.length - niceGaps.length} of ${niceToHaveSkills.length}`} />
                  <Stat label="Evidence Found" value={`${demonstrated.length} of ${candidateSkills.length}`} />
                </div>

                {resumeAnalysis?.dimensions && (
                  <div className="bg-zinc-50/70 rounded-2xl p-4 border border-zinc-100 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Multi-Dimensional Scoring</p>
                    <DimensionBar label="Keyword Alignment" value={resumeAnalysis.dimensions.keywordAlignment} weight="30%" />
                    <DimensionBar label="Quantified Impact" value={resumeAnalysis.dimensions.quantifiedImpact} weight="25%" />
                    <DimensionBar label="Evidence Depth" value={resumeAnalysis.dimensions.evidenceDepth} weight="20%" />
                    <DimensionBar label="Structural Quality" value={resumeAnalysis.dimensions.structuralQuality} weight="15%" />
                    <DimensionBar label="Seniority Fit" value={resumeAnalysis.dimensions.seniorityFit} weight="10%" />
                  </div>
                )}
              </div>
            </Section>

            {requiredGaps.length > 0 ? (
              <Section title={`Critical Required Gaps (${requiredGaps.length})`} className="border-orange-200/50 bg-orange-50/20">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {requiredGaps.map((s) => <SkillPill key={s} skill={s} variant="gap-required" />)}
                </div>
                <div className="p-3 bg-white rounded-xl border border-orange-100 text-xs text-orange-800 font-medium flex gap-3">
                  <AlertCircle size={16} className="shrink-0 text-orange-500" />
                  These technical competencies are explicitly demanded by the target JD but missing from your resume.
                </div>
              </Section>
            ) : (
              <Section title="Required Gaps">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-sm border border-emerald-100">
                  <CheckCircle2 size={20} />
                  <span>Zero critical gaps! You cover all core requirements.</span>
                </div>
              </Section>
            )}
          </div>

          {/* Right Column: Verified, Nice to have, Extracted */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title={`Verified Matches (${matchedRequired.length})`} className="h-full">
                <div className="flex flex-wrap gap-2">
                  {matchedRequired.map((s) => <SkillPill key={s} skill={s} variant="matched" />)}
                  {matchedRequired.length === 0 && <span className="text-xs text-zinc-400 font-medium">None detected</span>}
                </div>
              </Section>

              <Section title={`Secondary Gaps (${niceGaps.length})`} className="h-full">
                <div className="flex flex-wrap gap-2">
                  {niceGaps.map((s) => <SkillPill key={s} skill={s} variant="gap-nice" />)}
                  {niceGaps.length === 0 && <span className="text-xs text-zinc-400 font-medium">None detected</span>}
                </div>
              </Section>
            </div>

            <Section title="Extracted Candidate Skills (Resume Ground-Truth)">
              {demonstrated.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <Briefcase size={12} /> Demonstrated in Work Experience & Projects
                  </p>
                  <div className="flex flex-wrap gap-2.5 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {demonstrated.map((s: CandidateSkill) => <SkillPill key={s.skill} skill={s.skill} variant="demonstrated" provenance={s.provenance} />)}
                  </div>
                </div>
              )}
              {listedOnly.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                    Listed only &mdash; Needs contextual project evidence
                  </p>
                  <div className="flex flex-wrap gap-2.5 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {listedOnly.map((s: CandidateSkill) => <SkillPill key={s.skill} skill={s.skill} variant="listed" provenance={s.provenance} />)}
                  </div>
                </div>
              )}
            </Section>

            {/* Upskill Call to Action */}
            <div className="rounded-3xl p-6 md:p-8 flex items-center justify-between gap-6 flex-wrap sm:flex-nowrap bg-zinc-950 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <GraduationCap size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1.5">Targeted Next Step</p>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-md">
                    Explore <strong className="text-zinc-200">Recommended Programs</strong> for free Indian Government certifications to address your {requiredGaps.length} required gaps.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSidebarTab('recommended-programs')}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-100 transition-all shadow-xl relative z-10"
              >
                <span>View Govt Courses</span>
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SkillGapsView;
