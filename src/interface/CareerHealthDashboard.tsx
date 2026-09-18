import React, { useState, useEffect } from 'react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  PlayCircle, 
  Loader2, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  IndianRupee,
  Compass,
  Layers,
  GitFork,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Trash2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Provenance } from '../types';

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

interface CareerPathItem {
  roleId: string;
  onetCode: string;
  title: string;
  family: string;
  overlapPercent: number;
  sharedSkills: string[];
  missingSkills: string[];
  topMissingSkill: string;
  estimatedMonths: number;
  recommendedStep: string;
  progressionType: 'VERTICAL_LADDER' | 'LATERAL_ADJACENT' | 'STRETCH_PIVOT';
}

interface CareerPathingData {
  currentRole: {
    id: string;
    onetCode: string;
    title: string;
    family: string;
    totalSkills: number;
  };
  ladder: CareerPathItem[];
  adjacentRoles: CareerPathItem[];
  stretchRoles: CareerPathItem[];
}

type TabType = 'health' | 'debt' | 'roi' | 'whatif' | 'pathing';

export const CareerHealthDashboard: React.FC = () => {
  const { setActiveSidebarTab } = useUiStore();
  const [activeTab, setActiveTab] = useState<TabType>('health');
  
  const [onetRoles, setOnetRoles] = useState<OnetRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [gapsResult, setGapsResult] = useState<OnetGapsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Career Pathing state (P2.9)
  const [pathingData, setPathingData] = useState<CareerPathingData | null>(null);
  const [pathingLoading, setPathingLoading] = useState<boolean>(false);
  const [selectedPathItem, setSelectedPathItem] = useState<CareerPathItem | null>(null);

  const [hypotheticalSkills, setHypotheticalSkills] = useState<Set<string>>(new Set());

  const handleDeleteData = async () => {
    if (!window.confirm("Are you sure you want to permanently erase your data? This action cannot be undone and complies with the DPDP Act 2023.")) return;
    try {
      const res = await fetch('/api/trainee/profile', {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        localStorage.clear();
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/career-graph/roles');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles) && data.roles.length > 0) {
            setOnetRoles(data.roles);
            const defaultRole = data.roles.find((r: OnetRole) => r.onetCode === '15-1252.00') || data.roles[0];
            if (defaultRole) {
              setSelectedRoleId(defaultRole.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load O*NET roles', err);
      }
    };
    fetchRoles();
  }, []);

  // 2. Fetch gap data when role changes
  useEffect(() => {
    if (!selectedRoleId) return;
    const fetchGaps = async () => {
      setIsLoading(true);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`/api/career-graph/gaps?roleId=${selectedRoleId}`, {
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setGapsResult(data);
        } else {
          // Fallback if not logged in
          const fallbackRes = await fetch(`/api/career-graph/role/${selectedRoleId}/skills`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            setGapsResult({
              role: fallbackData.role,
              gaps: fallbackData.role.requirements.map((r: any) => ({
                skillId: r.skillId,
                skill: r.skillName,
                category: r.category,
                importance: r.importance,
                level: r.level,
                priority: r.importance > 0.8 ? 'CRITICAL' : 'HIGH',
                weight: r.importance
              })),
              matches: [],
              gapSummary: {
                requiredMissing: fallbackData.role.requirements.length,
                preferredMissing: 0,
                totalRequired: fallbackData.role.requirements.length,
                matchedRequired: 0,
                coveragePercent: 0
              },
              recommendations: []
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch skill gaps', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGaps();
  }, [selectedRoleId]);

  // 3. Fetch pathing data when Pathing tab is selected or roleId changes
  useEffect(() => {
    if (activeTab !== 'pathing') return;
    const fetchPathing = async () => {
      setPathingLoading(true);
      try {
        const url = selectedRoleId 
          ? `/api/career-graph/pathing?roleId=${selectedRoleId}`
          : '/api/career-graph/pathing';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPathingData(data);
          if (data.ladder?.length > 0 && !selectedPathItem) {
            setSelectedPathItem(data.ladder[0]);
          } else if (data.adjacentRoles?.length > 0 && !selectedPathItem) {
            setSelectedPathItem(data.adjacentRoles[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch career pathing data', err);
      } finally {
        setPathingLoading(false);
      }
    };
    fetchPathing();
  }, [activeTab, selectedRoleId]);

  // Sub-views
  const renderHealth = () => {
    if (!gapsResult) return null;
    const coverage = gapsResult.gapSummary.coveragePercent || 0;
    const isAtRisk = coverage < 50;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Metric hero */}
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center font-display font-black text-2xl border-4 shrink-0 shadow-lg ${
            isAtRisk 
              ? 'border-amber-500/60 text-amber-400 bg-amber-500/10 shadow-amber-500/10' 
              : 'border-emerald-500/60 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/10'
          }`}>
            <span>{coverage}%</span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Match</span>
          </div>

          <div className="flex-1 text-center sm:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border bg-white/5 border-white/10 text-zinc-300">
              <Activity size={13} className={isAtRisk ? 'text-amber-400' : 'text-emerald-400'} />
              <span>{isAtRisk ? 'Risk Zone — Interventions Required' : 'Healthy Trajectory — On Track'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Target Role Alignment: {gapsResult.role?.title || 'Target Role'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed max-w-2xl">
              Your verified skills map to <span className="text-white font-semibold">{coverage}%</span> of the core requirements. 
              {isAtRisk ? ' High critical gaps detected. Resolve priority skills below to unlock high-confidence job matching.' : ' Strong alignment with current market expectations.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Strengths */}
          <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                Verified Strengths
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {gapsResult.matches.length} Mapped
              </span>
            </div>

            {gapsResult.matches.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-white/5 rounded-xl">
                No verified skills mapped to this target role yet.
              </div>
            ) : (
              <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {gapsResult.matches.map((m, idx) => {
                  const prov = m.provenance || 'DECLARED';
                  const provClass = 
                    prov === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    prov === 'DECLARED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    prov === 'INFERRED' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20';

                  return (
                    <li key={idx} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                      <span className="font-medium text-zinc-200">{m.skill}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-md uppercase font-black tracking-wider border ${provClass}`}>
                        {prov}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Vulnerabilities / Top Gaps */}
          <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                Key Vulnerabilities
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                {gapsResult.gaps.length} Total Gaps
              </span>
            </div>

            <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {gapsResult.gaps.slice(0, 8).map((g, idx) => (
                <li key={idx} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <div>
                    <span className="font-medium text-zinc-200">{g.skill}</span>
                    <span className="text-[11px] text-zinc-500 ml-2">({g.category})</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                    g.priority === 'CRITICAL' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {g.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* DPDP Compliance Card */}
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Trash2 size={16} className="text-rose-400" /> DPDP Compliance & Privacy Control
            </h3>
            <p className="text-xs text-rose-200/70 max-w-xl leading-relaxed">
              Under India’s Digital Personal Data Protection (DPDP) Act 2023, you retain absolute authority to permanently purge your profile, skill credentials, and telemetry records at any time.
            </p>
          </div>
          <button 
            onClick={handleDeleteData}
            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-lg shadow-rose-600/20"
          >
            Permanently Erase My Data
          </button>
        </div>
      </div>
    );
  };

  const renderDebt = () => {
    if (!gapsResult) return null;
    const criticalGaps = gapsResult.gaps.filter(g => g.priority === 'CRITICAL');
    const highGaps = gapsResult.gaps.filter(g => g.priority === 'HIGH');

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertTriangle size={20} className="text-amber-400" />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Career Debt Index</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed max-w-2xl">
            Career debt represents unverified capabilities or critical market standards blocking your transition. 
            Clearing critical debt provides the highest marginal boost to interview callback probability.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
              <div className="text-xs text-rose-300 font-bold uppercase tracking-wider">Critical Gaps</div>
              <div className="text-3xl font-display font-black text-rose-400 mt-1">{criticalGaps.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">High Priority Gaps</div>
              <div className="text-3xl font-display font-black text-amber-400 mt-1">{highGaps.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Estimated Resolution</div>
              <div className="text-3xl font-display font-black text-indigo-400 mt-1">~{gapsResult.gaps.length * 15} hrs</div>
            </div>
          </div>
        </div>

        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-display font-bold text-white mb-4">Actionable Debt Ledger</h3>
          <div className="space-y-3">
            {gapsResult.gaps.map((gap, i) => (
              <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <div>
                  <div className="text-sm font-bold text-zinc-100">{gap.skill}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Category: {gap.category} • Importance: {(gap.importance * 100).toFixed(0)}%</div>
                </div>
                <button 
                  onClick={() => setActiveSidebarTab('skill-gaps')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  Clear Debt <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderROI = () => {
    if (!gapsResult) return null;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <TrendingUp size={20} className="text-emerald-400" />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Upskilling ROI & Accreditation</h2>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            Curated high-return programs aligned with PMKVY 4.0, SWAYAM, and top open certification tracks that resolve multiple critical gaps simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gapsResult.recommendations.map((rec) => (
            <div key={rec.courseId} className="bg-[#12131C] border border-white/10 rounded-2xl p-5 shadow-xl hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                    {rec.provider}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-1">
                      <IndianRupee size={13}/> {rec.isFree ? 'Free' : 'Paid'}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-end gap-1 font-mono">
                      <Clock size={11}/> {rec.duration}
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-display font-bold text-white mt-2">{rec.title}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                  <span>Level: {rec.level}</span>
                  {rec.isGovt && <span className="text-emerald-400 font-bold flex items-center gap-1">• Govt Recognized</span>}
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 mt-4">
                <div className="text-[11px] text-zinc-400 mb-2 font-bold uppercase tracking-wider">Closes Key Gaps:</div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.addressesGaps.map(gap => (
                    <span key={gap} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-xs text-zinc-300 font-medium">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {gapsResult.recommendations.length === 0 && (
            <div className="col-span-2 py-12 text-center text-zinc-500 text-xs bg-[#12131C] rounded-2xl border border-white/10">
              No direct subsidized course recommendations found for this role.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWhatIf = () => {
    if (!gapsResult) return null;
    
    const baseCoverage = gapsResult.gapSummary.coveragePercent || 0;
    const totalRequired = gapsResult.gapSummary.totalRequired || 1;
    const additionalMatches = hypotheticalSkills.size;
    const simulatedCoverage = Math.min(100, Math.round(((gapsResult.matches.length + additionalMatches) / totalRequired) * 100));
    const isAtRisk = simulatedCoverage < 50;
    
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <PlayCircle size={20} className="text-indigo-400" />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">What-If Skill Simulator</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed max-w-2xl">
            Simulate your qualification index against different target roles. Toggle missing skills to project how acquiring them boosts your match score.
          </p>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Select Target Benchmark Role</label>
            <select 
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value);
                setHypotheticalSkills(new Set());
              }}
              className="w-full p-3 bg-[#1A1B26] border border-white/10 rounded-xl text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium"
            >
              {onetRoles.map(r => (
                <option key={r.id} value={r.id} className="bg-[#12131C] text-zinc-200">
                  {r.title} ({r.onetCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950/40 to-[#12131C] border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-display font-black text-2xl border-4 shrink-0 shadow-lg ${
                isAtRisk 
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10' 
                  : 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              }`}>
                <span>{simulatedCoverage}%</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-400" /> Projected Match Rate
                </h3>
                <p className="text-zinc-300 text-sm mt-1 leading-relaxed">
                  Base match is <span className="font-bold text-white">{baseCoverage}%</span>. By adding {hypotheticalSkills.size} simulated skill{hypotheticalSkills.size === 1 ? '' : 's'}, your projected score increases to <span className="font-bold text-indigo-400">{simulatedCoverage}%</span>.
                </p>
              </div>
            </div>

            <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Toggle Missing Skills to Simulate Upskilling
              </h3>
              
              <ul className="space-y-2.5 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {gapsResult.gaps.map((g, idx) => {
                  const isSimulated = hypotheticalSkills.has(g.skillId);
                  return (
                    <li 
                      key={idx} 
                      className={`flex justify-between items-center text-sm border p-3 rounded-xl transition-all cursor-pointer select-none ${
                        isSimulated 
                          ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                      onClick={() => {
                        const next = new Set(hypotheticalSkills);
                        if (next.has(g.skillId)) next.delete(g.skillId);
                        else next.add(g.skillId);
                        setHypotheticalSkills(next);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSimulated ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20 bg-black/20'
                        }`}>
                          {isSimulated && <CheckCircle2 size={13} />}
                        </div>
                        <span className={`font-medium ${isSimulated ? 'text-indigo-200 font-bold' : 'text-zinc-300'}`}>
                          {g.skill}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                        g.priority === 'CRITICAL' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {g.priority}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Career Pathing (Job Ladder, Adjacent Roles & Path Simulator)
  const renderPathing = () => {
    if (pathingLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      );
    }

    if (!pathingData) {
      return (
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-8 text-center text-zinc-500 shadow-xl">
          No career pathing data available. Please ensure O*NET taxonomy is loaded.
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Anchor Card */}
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Current Benchmark Base
                </span>
                <span className="text-xs text-zinc-500 font-mono">O*NET {pathingData.currentRole.onetCode}</span>
              </div>
              <h2 className="text-2xl font-display font-black text-white mt-1.5">{pathingData.currentRole.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Deterministic skill-graph distance mapping vertical promotions, lateral transitions, and stretch pivots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Switch Base:</label>
              <select 
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="p-2.5 bg-[#1A1B26] border border-white/10 rounded-xl text-xs font-semibold text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {onetRoles.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#12131C]">{r.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 1. Job Ladder (Vertical Progression) */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">Job Ladder (Vertical Promotion Steps)</h3>
              <p className="text-xs text-zinc-400">Seniority steps within your current technical domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.ladder.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                    : 'bg-[#12131C] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Vertical Step
                      </span>
                      <span className="text-xs font-mono text-zinc-500">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-display font-bold text-white mt-1.5">{item.title}</h4>
                    <p className="text-xs text-zinc-400">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-display font-black text-emerald-400">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Skill Overlap</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="text-zinc-300 truncate max-w-[240px]">
                    <span className="text-zinc-500 font-semibold">Key Bridge:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-zinc-400 flex items-center gap-1 font-mono">
                    ~{item.estimatedMonths} mos <ArrowUpRight size={14} className="text-emerald-400" />
                  </span>
                </div>
              </div>
            ))}
            {pathingData.ladder.length === 0 && (
              <div className="col-span-2 p-6 bg-[#12131C] border border-white/10 rounded-2xl text-center text-xs text-zinc-500">
                You are currently at the peak seniority band for this specific technical track.
              </div>
            )}
          </div>
        </div>

        {/* 2. Adjacent Roles (Lateral Pivots) */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GitFork size={16} />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">Adjacent Roles (Lateral Pivots)</h3>
              <p className="text-xs text-zinc-400">High-transferability opportunities sharing 40%+ core skills</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.adjacentRoles.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' 
                    : 'bg-[#12131C] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Lateral Pivot
                      </span>
                      <span className="text-xs font-mono text-zinc-500">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-display font-bold text-white mt-1.5">{item.title}</h4>
                    <p className="text-xs text-zinc-400">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-display font-black text-indigo-400">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Transferable</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="text-zinc-300 truncate max-w-[240px]">
                    <span className="text-zinc-500 font-semibold">Key Bridge:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-zinc-400 flex items-center gap-1 font-mono">
                    ~{item.estimatedMonths} mos <ArrowUpRight size={14} className="text-indigo-400" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Career Path Simulator Stepping Stones */}
        {selectedPathItem && (
          <div className="bg-[#12131C] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Career Transition Blueprint
                </span>
                <h3 className="text-2xl font-display font-black text-white mt-1">
                  {pathingData.currentRole.title} → {selectedPathItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoleId(selectedPathItem.roleId)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-display font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Set as Target Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Step 1 */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">STEP 1: FOUNDATION</div>
                <div className="text-lg font-display font-bold text-white mb-2">{selectedPathItem.sharedSkills.length} Shared Skills</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.sharedSkills.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      ✓ {s}
                    </span>
                  ))}
                  {selectedPathItem.sharedSkills.length > 5 && (
                    <span className="text-[10px] text-zinc-500">+{selectedPathItem.sharedSkills.length - 5} more</span>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">STEP 2: BRIDGE GAPS</div>
                <div className="text-lg font-display font-bold text-white mb-2">{selectedPathItem.missingSkills.length} Skills Needed</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.missingSkills.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      • {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">STEP 3: EXECUTION</div>
                <div className="text-sm font-semibold text-zinc-200 mt-1 leading-relaxed">
                  {selectedPathItem.recommendedStep}
                </div>
                <div className="text-xs text-zinc-500 mt-3 font-mono">
                  Estimated Timeline: ~{selectedPathItem.estimatedMonths} Months
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#090A0F] min-h-screen overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-6 py-8 md:px-12 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Trajectory Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white">Career Health & Mobility</h1>
          <p className="text-zinc-400 mt-1.5 text-sm">Quantify market resilience, simulate strategic pivots, and clear unverified skill debt.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#12131C] border border-white/10 p-1.5 rounded-2xl mb-8 w-max">
          <button 
            onClick={() => setActiveTab('health')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'health' 
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2"><Activity size={14}/> Health Index</div>
          </button>
          <button 
            onClick={() => setActiveTab('debt')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'debt' 
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2"><AlertTriangle size={14}/> Skill Debt</div>
          </button>
          <button 
            onClick={() => setActiveTab('roi')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'roi' 
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2"><TrendingUp size={14}/> Learning ROI</div>
          </button>
          <button 
            onClick={() => setActiveTab('whatif')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'whatif' 
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2"><PlayCircle size={14}/> What-If Simulator</div>
          </button>
          <button 
            onClick={() => setActiveTab('pathing')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pathing' 
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2"><Compass size={14}/> Career Pathing</div>
          </button>
        </div>

        <div className="min-h-[400px]">
          {isLoading && activeTab !== 'whatif' && activeTab !== 'pathing' ? (
            <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
          ) : (
            <>
              {activeTab === 'health' && renderHealth()}
              {activeTab === 'debt' && renderDebt()}
              {activeTab === 'roi' && renderROI()}
              {activeTab === 'whatif' && renderWhatIf()}
              {activeTab === 'pathing' && renderPathing()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerHealthDashboard;
