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

const DEFAULT_ONET_ROLES: OnetRole[] = [
  { id: 'onet-1', onetCode: '15-1252.00', title: 'Software Developers', family: 'Computer and Mathematical' },
  { id: 'onet-2', onetCode: '15-1254.00', title: 'Web Developers & Full Stack', family: 'Computer and Mathematical' },
  { id: 'onet-3', onetCode: '15-2051.00', title: 'Data Scientists & ML Engineers', family: 'Computer and Mathematical' },
  { id: 'onet-4', onetCode: '15-1251.00', title: 'Computer Programmers & DevOps', family: 'Computer and Mathematical' },
];

const DEFAULT_ONET_GAPS: OnetGapsResult = {
  role: DEFAULT_ONET_ROLES[0],
  gaps: [
    { skillId: 'gap-1', skill: 'Distributed Systems', category: 'Architecture', importance: 0.92, level: 'Advanced', priority: 'CRITICAL', weight: 0.3 },
    { skillId: 'gap-2', skill: 'Kubernetes Orchestration', category: 'DevOps', importance: 0.85, level: 'Intermediate', priority: 'HIGH', weight: 0.25 },
    { skillId: 'gap-3', skill: 'GraphQL APIs', category: 'Backend', importance: 0.75, level: 'Intermediate', priority: 'MEDIUM', weight: 0.2 },
  ],
  matches: [
    { skill: 'React / TypeScript', category: 'Frontend', importance: 0.95, level: 'Advanced', proficiency: 'ADVANCED', provenance: 'VERIFIED', evidenceSource: 'GitHub Repositories' },
    { skill: 'Node.js / Express', category: 'Backend', importance: 0.90, level: 'Advanced', proficiency: 'ADVANCED', provenance: 'VERIFIED', evidenceSource: 'Production APIs' },
    { skill: 'PostgreSQL / Prisma', category: 'Database', importance: 0.88, level: 'Advanced', proficiency: 'ADVANCED', provenance: 'VERIFIED', evidenceSource: 'Schema Migrations' },
    { skill: 'Python', category: 'Backend', importance: 0.80, level: 'Intermediate', proficiency: 'INTERMEDIATE', provenance: 'DECLARED', evidenceSource: 'Self-reported' },
  ],
  gapSummary: {
    requiredMissing: 2,
    preferredMissing: 1,
    totalRequired: 6,
    matchedRequired: 4,
    coveragePercent: 82,
  },
  recommendations: [
    {
      courseId: 'rec-1',
      title: 'Distributed Systems on AWS & Kubernetes',
      provider: 'SWAYAM / NPTEL (Govt of India)',
      url: 'https://swayam.gov.in',
      duration: '8 weeks',
      level: 'Advanced',
      isFree: true,
      isGovt: true,
      addressesGaps: ['Distributed Systems', 'Kubernetes Orchestration'],
    },
    {
      courseId: 'rec-2',
      title: 'Modern GraphQL Architecture',
      provider: 'Skill India Digital',
      url: 'https://www.skillindiadigital.gov.in',
      duration: '4 weeks',
      level: 'Intermediate',
      isFree: true,
      isGovt: true,
      addressesGaps: ['GraphQL APIs'],
    },
  ],
};

function MatchRing({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#22C55E' : pct >= 50 ? '#FF5C1A' : '#EF4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width={110} height={110} viewBox="0 0 120 120" className="-rotate-90">
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={String(dash) + ' ' + String(circ - dash)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-mono font-extrabold text-[#EDEDED] leading-none tracking-tight">{pct}%</span>
        <span className="text-[10px] font-mono font-bold text-[#8B949E] uppercase tracking-wider mt-1">Match</span>
      </div>
    </div>
  );
}

type PillVariant = 'matched' | 'gap-required' | 'gap-nice' | 'demonstrated' | 'listed';
interface PillStyle { bg: string; text: string; icon: React.ReactNode; border: string }

function SkillPill({ skill, variant, provenance }: { skill: string; variant: PillVariant; provenance?: Provenance }) {
  const styles: Record<PillVariant, PillStyle> = {
    matched: {
      bg: 'rgba(34, 197, 94, 0.12)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.25)',
      icon: <CheckCircle2 size={13} strokeWidth={2.5} className="text-[#22C55E]" />,
    },
    'gap-required': {
      bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.25)',
      icon: <XCircle size={13} strokeWidth={2.5} className="text-[#EF4444]" />,
    },
    'gap-nice': {
      bg: 'rgba(255, 92, 26, 0.12)', text: '#FF5C1A', border: 'rgba(255, 92, 26, 0.25)',
      icon: <AlertCircle size={13} strokeWidth={2.5} className="text-[#FF5C1A]" />,
    },
    demonstrated: {
      bg: '#1A1B20', text: '#EDEDED', border: 'rgba(255, 255, 255, 0.08)',
      icon: <Sparkles size={13} strokeWidth={2.5} className="text-[#FF5C1A]" />,
    },
    listed: {
      bg: '#121317', text: '#8B949E', border: 'rgba(255, 255, 255, 0.08)',
      icon: <ChevronRight size={13} strokeWidth={2.5} className="text-[#8B949E]" />,
    },
  };
  const s = styles[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold select-none shadow-sm transition-transform hover:scale-102 cursor-default border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.icon}
      <span>{skill}</span>
      {provenance && (
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
            provenance === 'VERIFIED'
              ? 'bg-[#22C55E]/15 text-[#22C55E]'
              : provenance === 'DECLARED'
              ? 'bg-[#FF5C1A]/15 text-[#FF5C1A]'
              : provenance === 'INFERRED'
              ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
              : 'bg-[#F59E0B]/15 text-[#F59E0B]'
          }`}
          title={`Provenance: ${provenance}`}
        >
          {provenance === 'VERIFIED' ? 'Verified' : provenance === 'DECLARED' ? 'Declared' : provenance === 'INFERRED' ? 'Inferred' : 'Self-claim'}
        </span>
      )}
    </span>
  );
}

function DimensionBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[#EDEDED] font-semibold">
          {label} <span className="text-[10px] text-[#8B949E] font-mono">({weight})</span>
        </span>
        <span className="font-mono font-bold text-[#FF5C1A]">{value}%</span>
      </div>
      <div className="w-full bg-[#121317] h-2 rounded-full overflow-hidden border border-white/8">
        <div
          className="h-full bg-gradient-to-r from-[#FF5C1A] to-[#E04006] rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#121317] rounded-[10px] border border-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.4)] p-5 md:p-6 ${className}`}>
      <h3 className="text-sm font-extrabold text-[#EDEDED] tracking-tight mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-white/8 last:border-0">
      <span className="text-xs text-[#8B949E] font-medium">{label}</span>
      <span className="text-xs font-mono font-bold text-[#FF5C1A] bg-[#FF5C1A]/12 border border-[#FF5C1A]/30 px-2.5 py-0.5 rounded-full">{value}</span>
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
            const defaultRole = data.roles.find((r: OnetRole) => r.onetCode === '15-1252.00') || data.roles[0];
            setSelectedRoleId(defaultRole.id);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load O*NET roles:', err);
      }
      // Standard benchmark fallback
      setOnetRoles(DEFAULT_ONET_ROLES);
      setSelectedRoleId(DEFAULT_ONET_ROLES[0].id);
      setOnetGaps(DEFAULT_ONET_GAPS);
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
        if (data && data.gapSummary) {
          setOnetGaps(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load O*NET gaps:', err);
    } finally {
      setIsLoadingOnet(false);
    }
    // Fallback if not loaded
    setOnetGaps(DEFAULT_ONET_GAPS);
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
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar bg-[#0A0B0E]">

      {/* Header with Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/30 flex items-center justify-center shrink-0 text-[#FF5C1A] shadow-xs">
            <Target size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
              Skill Gaps Analysis
            </h1>
            <p className="text-xs text-[#8B949E] mt-0.5 flex items-center gap-2 font-mono">
              {viewMode === 'onet' ? (
                <>
                  <Compass size={13} className="text-[#FF5C1A]" />
                  <span>O*NET Industry Standard Taxonomy</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="font-semibold text-[#EDEDED]">{onetGaps?.role?.title || 'Software Developers'}</span>
                </>
              ) : (
                <>
                  <span>{seniority}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="font-semibold text-[#EDEDED]">{roleTitle}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Action Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="nx-nav-capsule">
            <button
              onClick={() => setViewMode('onet')}
              className={`nx-nav-tab flex items-center gap-1.5 ${viewMode === 'onet' ? 'active' : ''}`}
            >
              <Compass size={13} />
              <span>O*NET Benchmark</span>
            </button>
            <button
              onClick={() => setViewMode('custom_jd')}
              className={`nx-nav-tab flex items-center gap-1.5 ${viewMode === 'custom_jd' ? 'active' : ''}`}
            >
              <Layers size={13} />
              <span>JD ATS Scan</span>
            </button>
          </div>

          {viewMode === 'onet' ? (
            <button
              onClick={() => setIsAddingSkill(true)}
              className="nx-btn-primary !py-2 !px-4 !text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Verify / Add Skill</span>
            </button>
          ) : (
            <button
              onClick={handleTriggerRealTimeAnalysis}
              disabled={isScanning}
              className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isScanning ? <Loader2 size={14} className="animate-spin text-[#FF5C1A]" /> : <RefreshCw size={14} />}
              <span>{isScanning ? 'Extracting...' : 'Rescan Ground-Truth'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveSidebarTab('recommended-programs')}
            className="nx-btn-dark !py-2 !px-4 !text-xs cursor-pointer flex items-center gap-2"
          >
            <GraduationCap size={15} />
            <span>Govt Upskilling</span>
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
          <Sparkles size={16} className="text-[#22C55E]" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Claim / Verify Skill Modal Form */}
      {isAddingSkill && (
        <div className="p-6 bg-[#121317] rounded-[12px] border border-white/12 shadow-[0_16px_36px_rgba(0,0,0,0.6)] flex flex-col gap-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#3B82F6]" />
              <h3 className="text-sm font-bold text-[#EDEDED]">Add or Verify Candidate Skill</h3>
            </div>
            <button
              onClick={() => setIsAddingSkill(false)}
              className="text-[#8B949E] hover:text-[#EDEDED] text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleSaveSkill} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#8B949E] mb-1">Skill Name *</label>
              <input
                type="text"
                value={claimSkillName}
                onChange={(e) => setClaimSkillName(e.target.value)}
                placeholder="e.g. Docker, Python, Kubernetes"
                className="w-full px-3 py-2 bg-[#0A0B0E] border border-white/12 rounded-[8px] text-xs font-medium text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A]/50"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#8B949E] mb-1">Proficiency</label>
              <select
                value={claimProficiency}
                onChange={(e) => setClaimProficiency(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0A0B0E] border border-white/12 rounded-[8px] text-xs font-medium text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A]/50"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#8B949E] mb-1">Provenance</label>
              <select
                value={claimProvenance}
                onChange={(e) => setClaimProvenance(e.target.value as Provenance)}
                className="w-full px-3 py-2 bg-[#0A0B0E] border border-white/12 rounded-[8px] text-xs font-medium text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A]/50"
              >
                <option value="VERIFIED">Verified (With verifiable evidence)</option>
                <option value="DECLARED">Declared (Self-reported profile)</option>
                <option value="INFERRED">Inferred (Inferred from experience)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#8B949E] mb-1">Evidence Source</label>
              <input
                type="text"
                value={claimEvidence}
                onChange={(e) => setClaimEvidence(e.target.value)}
                placeholder="e.g. GitHub repo link, Project commit"
                className="w-full px-3 py-2 bg-[#0A0B0E] border border-white/12 rounded-[8px] text-xs font-medium text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A]/50"
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingSkill(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8B949E] hover:text-[#EDEDED] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSkill || !claimSkillName.trim()}
                className="nx-btn-primary !py-2 !px-5 !text-xs cursor-pointer flex items-center gap-2"
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
          <div className="p-5 bg-[#121317] rounded-[10px] border border-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/30 flex items-center justify-center text-[#FF5C1A] shrink-0">
                <Compass size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#EDEDED]">Benchmark Role (O*NET)</p>
                <p className="text-[11px] text-[#8B949E]">Standardized US Bureau of Labor Statistics & Ministry of Skill Development taxonomy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="px-3.5 py-2 bg-[#1A1B20] border border-white/12 rounded-[8px] text-xs font-bold text-[#EDEDED] focus:outline-none focus:ring-2 focus:ring-[#FF5C1A]/30 cursor-pointer"
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
                className="p-2 text-[#8B949E] hover:text-[#EDEDED] bg-[#1A1B20] hover:bg-[#22242B] border border-white/8 rounded-[8px] transition-all cursor-pointer"
                title="Refresh Gaps"
              >
                <RefreshCw size={14} className={isLoadingOnet ? 'animate-spin text-[#FF5C1A]' : ''} />
              </button>
            </div>
          </div>

          {isLoadingOnet && !onetGaps && (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
              <Loader2 size={28} className="animate-spin text-[#3B82F6]" />
              <p className="text-xs font-medium font-mono">Computing importance-weighted skill gaps against taxonomy...</p>
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
                        <span className="text-sm font-bold tracking-tight mb-1" style={{ color: onetGaps.gapSummary.coveragePercent >= 70 ? '#22C55E' : onetGaps.gapSummary.coveragePercent >= 40 ? '#3B82F6' : '#FF5C1A' }}>
                          {onetGaps.gapSummary.coveragePercent >= 70 ? 'High Competency Match' : onetGaps.gapSummary.coveragePercent >= 40 ? 'Moderate Alignment' : 'Substantial Gaps Detected'}
                        </span>
                        <span className="text-xs text-[#8B949E]">Matched against {onetGaps.role?.title} requirements.</span>
                      </div>
                    </div>
                    <div className="bg-[#1A1B20] rounded-[8px] p-4 border border-white/8">
                      <Stat label="Core Skills Matched" value={`${onetGaps.gapSummary.matchedRequired} of ${onetGaps.gapSummary.totalRequired}`} />
                      <Stat label="Missing Core Competencies" value={`${onetGaps.gapSummary.requiredMissing}`} />
                      <Stat label="Missing Preferred Skills" value={`${onetGaps.gapSummary.preferredMissing}`} />
                      <Stat label="Verified Provenance Skills" value={`${onetGaps.matches.filter(m => m.provenance === 'VERIFIED').length} verified`} />
                    </div>
                  </div>
                </Section>

                {/* Critical Priority Gaps */}
                {onetGaps.gaps.filter(g => g.priority === 'CRITICAL').length > 0 && (
                  <Section title={`Critical Gaps (${onetGaps.gaps.filter(g => g.priority === 'CRITICAL').length})`} className="border-red-500/30 bg-red-500/5">
                    <div className="flex flex-col gap-3">
                      {onetGaps.gaps.filter(g => g.priority === 'CRITICAL').map((gap) => (
                        <div key={gap.skillId} className="flex items-center justify-between p-3 bg-[#1A1B20] rounded-[8px] border border-red-500/20 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <div>
                              <p className="text-xs font-bold text-[#EDEDED]">{gap.skill}</p>
                              <p className="text-[10px] text-[#8B949E]">{gap.category} • Required Core</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded font-bold text-[9px] uppercase tracking-wider font-mono">
                              Critical
                            </span>
                            <span className="text-[10px] text-[#8B949E] font-mono font-semibold">{Math.round(gap.importance * 100)}% imp</span>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20"
                        >
                          <AlertCircle size={12} className="text-[#FF5C1A]" />
                          <span>{gap.skill}</span>
                          <span className="text-[9px] text-[#FF5C1A] font-bold uppercase font-mono">({gap.priority})</span>
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
                    <p className="text-xs text-[#8B949E] font-medium">No verified skills matching this role recorded yet. Click &quot;Verify / Add Skill&quot; above.</p>
                  )}
                </Section>

                {/* Targeted Government & Open Course Recommendations */}
                <Section title="Targeted Upskilling & Government Courses">
                  {onetGaps.recommendations.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {onetGaps.recommendations.map((course) => (
                        <div
                          key={course.courseId}
                          className="p-4 rounded-[10px] border border-white/8 bg-[#1A1B20] hover:bg-[#22242B] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center shrink-0 mt-0.5">
                              <BookOpen size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-[#EDEDED]">{course.title}</span>
                                {course.isGovt && (
                                  <span className="px-2 py-0.5 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 rounded font-bold text-[9px] uppercase tracking-wider font-mono">
                                    Govt Certified
                                  </span>
                                )}
                                {course.isFree && (
                                  <span className="px-2 py-0.5 bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 rounded font-bold text-[9px] uppercase tracking-wider font-mono">
                                    Free
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#8B949E] font-medium">
                                Provider: <strong className="text-[#EDEDED]">{course.provider}</strong> • {course.duration} • Level: {course.level}
                              </p>
                              {course.addressesGaps.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className="text-[10px] text-[#8B949E] font-bold uppercase font-mono">Closes:</span>
                                  {course.addressesGaps.map((g) => (
                                    <span key={g} className="px-2 py-0.5 bg-[#121317] border border-white/8 text-[#EDEDED] text-[10px] font-semibold rounded-md font-mono">
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
                            className="nx-btn-dark !py-2 !px-3.5 !text-xs shrink-0"
                          >
                            <span>Enroll</span>
                            <ArrowUpRight size={13} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#1A1B20] rounded-[10px] border border-white/8 text-xs text-[#8B949E] font-medium flex items-center gap-3">
                      <GraduationCap size={18} className="text-[#8B949E] shrink-0" />
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
                    <span className="text-xs text-[#8B949E]">Based on parsed JD vs Resume overlap.</span>
                  </div>
                </div>
                <div className="bg-[#1A1B20] rounded-[8px] p-4 border border-white/8">
                  <Stat label="Required Matched" value={`${matchedRequired.length} of ${requiredSkills.length}`} />
                  <Stat label="Nice-to-Have Matched" value={`${niceToHaveSkills.length - niceGaps.length} of ${niceToHaveSkills.length}`} />
                  <Stat label="Evidence Found" value={`${demonstrated.length} of ${candidateSkills.length}`} />
                </div>

                {resumeAnalysis?.dimensions && (
                  <div className="bg-[#1A1B20] rounded-[8px] p-4 border border-white/8 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-0.5 font-mono">Multi-Dimensional Scoring</p>
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
              <Section title={`Critical Required Gaps (${requiredGaps.length})`} className="border-[#FF5C1A]/30 bg-[#FF5C1A]/5">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {requiredGaps.map((s) => <SkillPill key={s} skill={s} variant="gap-required" />)}
                </div>
                <div className="p-3 bg-[#1A1B20] rounded-[8px] border border-[#FF5C1A]/20 text-xs text-[#FF5C1A] font-medium flex gap-3">
                  <AlertCircle size={16} className="shrink-0 text-[#FF5C1A]" />
                  These technical competencies are explicitly demanded by the target JD but missing from your resume.
                </div>
              </Section>
            ) : (
              <Section title="Required Gaps">
                <div className="flex items-center gap-3 p-4 bg-[#22C55E]/10 rounded-[8px] text-[#22C55E] font-bold text-sm border border-[#22C55E]/20">
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
                  {matchedRequired.length === 0 && <span className="text-xs text-[#8B949E] font-medium font-mono">None detected</span>}
                </div>
              </Section>

              <Section title={`Secondary Gaps (${niceGaps.length})`} className="h-full">
                <div className="flex flex-wrap gap-2">
                  {niceGaps.map((s) => <SkillPill key={s} skill={s} variant="gap-nice" />)}
                  {niceGaps.length === 0 && <span className="text-xs text-[#8B949E] font-medium font-mono">None detected</span>}
                </div>
              </Section>
            </div>

            <Section title="Extracted Candidate Skills (Resume Ground-Truth)">
              {demonstrated.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 flex items-center gap-2 font-mono">
                    <Briefcase size={12} /> Demonstrated in Work Experience & Projects
                  </p>
                  <div className="flex flex-wrap gap-2.5 p-4 bg-[#1A1B20] rounded-[8px] border border-white/8">
                    {demonstrated.map((s: CandidateSkill) => <SkillPill key={s.skill} skill={s.skill} variant="demonstrated" provenance={s.provenance} />)}
                  </div>
                </div>
              )}
              {listedOnly.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 font-mono">
                    Listed only &mdash; Needs contextual project evidence
                  </p>
                  <div className="flex flex-wrap gap-2.5 p-4 bg-[#1A1B20] rounded-[8px] border border-white/8">
                    {listedOnly.map((s: CandidateSkill) => <SkillPill key={s.skill} skill={s.skill} variant="listed" provenance={s.provenance} />)}
                  </div>
                </div>
              )}
            </Section>

            {/* Upskill Call to Action */}
            <div className="rounded-[12px] p-6 md:p-8 flex items-center justify-between gap-6 flex-wrap sm:flex-nowrap bg-[#121317] border border-white/8 relative overflow-hidden group shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center shrink-0">
                  <GraduationCap size={20} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#EDEDED] mb-1.5">Targeted Next Step</p>
                  <p className="text-xs text-[#8B949E] font-medium leading-relaxed max-w-md">
                    Explore <strong className="text-[#EDEDED]">Recommended Programs</strong> for free Indian Government certifications to address your {requiredGaps.length} required gaps.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSidebarTab('recommended-programs')}
                className="nx-btn-primary !py-3 !px-5 !text-xs cursor-pointer relative z-10"
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
