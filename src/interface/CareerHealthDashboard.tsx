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
import { PageHeader } from './bauhaus/PageHeader';

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
  };
  ladder: CareerPathItem[];
  adjacentRoles: CareerPathItem[];
}

export const CareerHealthDashboard: React.FC = () => {
  const { setActiveSidebarTab } = useUiStore();
  const { traineeProfile } = useCoreStore();

  const [activeTab, setActiveTab] = useState<'health' | 'debt' | 'roi' | 'whatif' | 'pathing'>('health');
  const [onetRoles, setOnetRoles] = useState<OnetRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [gapsResult, setGapsResult] = useState<OnetGapsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // What-if simulator hypothetical additions
  const [hypotheticalSkills, setHypotheticalSkills] = useState<Set<string>>(new Set());

  // Career Pathing Data State
  const [pathingData, setPathingData] = useState<CareerPathingData | null>(null);
  const [pathingLoading, setPathingLoading] = useState(false);
  const [selectedPathItem, setSelectedPathItem] = useState<CareerPathItem | null>(null);

  // 1. Fetch available O*NET benchmark roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/onet/roles');
        if (res.ok) {
          const roles = await res.json();
          setOnetRoles(roles);
          if (roles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(roles[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load O*NET roles', err);
      }
    };
    fetchRoles();
  }, []);

  // 2. Fetch gaps when selected role changes
  useEffect(() => {
    if (!selectedRoleId) return;
    const fetchGaps = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/onet/gaps?roleId=${selectedRoleId}`);
        if (res.ok) {
          const data = await res.json();
          setGapsResult(data);
        } else {
          // Fallback if backend returns non-200
          const roleRes = await fetch(`/api/onet/roles/${selectedRoleId}`);
          if (roleRes.ok) {
            const fallbackData = await roleRes.json();
            setGapsResult({
              role: fallbackData.role,
              gaps: fallbackData.role.requirements.map((r: any) => ({
                skillId: r.skillId,
                skill: r.skill?.name || 'Required Skill',
                category: r.category || 'TECHNICAL',
                importance: r.importance || 0.8,
                level: r.level || 'MID',
                priority: r.priority || 'HIGH',
                weight: r.weight || 1
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

  const handleDeleteData = async () => {
    if (!window.confirm("WARNING: Are you sure you want to permanently erase all records? Under the DPDP Act 2023, all personal identity, telemetry, and verified skills will be irreversibly deleted.")) {
      return;
    }
    try {
      await fetch('/api/trainee/profile', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      console.error(e);
    }
  };

  // Sub-views
  const renderHealth = () => {
    if (!gapsResult) return null;
    const coverage = gapsResult.gapSummary.coveragePercent || 0;
    const isAtRisk = coverage < 50;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Metric hero */}
        <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111] flex flex-col sm:flex-row items-center gap-6 relative">
          <div className={`w-24 h-24 flex flex-col items-center justify-center font-['Space_Grotesk'] font-black text-2xl border-4 border-[#111111] shrink-0 shadow-[3px_3px_0px_#111111] ${
            isAtRisk 
              ? 'text-[#111111] bg-[#F4C430]' 
              : 'text-white bg-[#2457A6]'
          }`}>
            <span>{coverage}%</span>
            <span className="text-[9px] uppercase tracking-wider font-mono font-bold">MATCH</span>
          </div>

          <div className="flex-1 text-center sm:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider mb-2 border-2 border-[#111111] bg-[#F5F0E6] text-[#111111]">
              <Activity size={13} className={isAtRisk ? 'text-[#E53935]' : 'text-[#2457A6]'} />
              <span>{isAtRisk ? 'Risk Zone — Interventions Required' : 'Healthy Trajectory — On Track'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-['Space_Grotesk'] font-black text-[#111111] uppercase tracking-tight">
              Target Role Alignment: {gapsResult.role?.title || 'Target Role'}
            </h2>
            <p className="text-[#555555] font-mono text-xs mt-1 leading-relaxed max-w-2xl">
              Your verified skills map to <span className="text-[#111111] font-bold">{coverage}%</span> of the core requirements. 
              {isAtRisk ? ' High critical gaps detected. Resolve priority skills below to unlock high-confidence job matching.' : ' Strong alignment with current market expectations.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Strengths */}
          <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-5">
              <h3 className="text-sm font-['Space_Grotesk'] font-black uppercase text-[#111111] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#2457A6] border border-[#111111]" />
                Verified Strengths
              </h3>
              <span className="text-xs font-mono font-bold text-white bg-[#2457A6] border-2 border-[#111111] px-2.5 py-0.5 shadow-[2px_2px_0px_#111111]">
                {gapsResult.matches.length} Mapped
              </span>
            </div>

            {gapsResult.matches.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[#7A7A7A] border-2 border-dashed border-[#111111] bg-[#F5F0E6]">
                No verified skills mapped to this target role yet.
              </div>
            ) : (
              <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {gapsResult.matches.map((m, idx) => {
                  const prov = m.provenance || 'DECLARED';
                  const provClass = 
                    prov === 'VERIFIED' ? 'bg-[#2457A6] text-white border-[#111111]' :
                    prov === 'DECLARED' ? 'bg-[#F4C430] text-[#111111] border-[#111111]' :
                    prov === 'INFERRED' ? 'bg-[#EFE7D8] text-[#111111] border-[#111111]' :
                    'bg-[#E53935] text-white border-[#111111]';

                  return (
                    <li key={idx} className="flex justify-between items-center text-xs font-mono p-3 bg-[#F5F0E6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
                      <span className="font-bold text-[#111111]">{m.skill}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 uppercase font-bold tracking-wider border ${provClass}`}>
                        {prov}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Vulnerabilities / Top Gaps */}
          <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-5">
              <h3 className="text-sm font-['Space_Grotesk'] font-black uppercase text-[#111111] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#E53935] border border-[#111111]" />
                Key Vulnerabilities
              </h3>
              <span className="text-xs font-mono font-bold text-white bg-[#E53935] border-2 border-[#111111] px-2.5 py-0.5 shadow-[2px_2px_0px_#111111]">
                {gapsResult.gaps.length} Total Gaps
              </span>
            </div>

            <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {gapsResult.gaps.slice(0, 8).map((g, idx) => (
                <li key={idx} className="flex justify-between items-center text-xs font-mono p-3 bg-[#F5F0E6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
                  <div>
                    <span className="font-bold text-[#111111]">{g.skill}</span>
                    <span className="text-[11px] text-[#555555] ml-2">({g.category})</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider border ${
                    g.priority === 'CRITICAL' 
                      ? 'bg-[#E53935] text-white border-[#111111]' 
                      : 'bg-[#F4C430] text-[#111111] border-[#111111]'
                  }`}>
                    {g.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* DPDP Compliance Card */}
        <div className="bg-[#F5F0E6] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-['Space_Grotesk'] font-black uppercase text-[#111111] flex items-center gap-2">
              <Trash2 size={16} className="text-[#E53935]" /> DPDP Compliance & Privacy Control
            </h3>
            <p className="text-xs font-mono text-[#555555] max-w-xl leading-relaxed">
              Under India’s Digital Personal Data Protection (DPDP) Act 2023, you retain absolute authority to permanently purge your profile, skill credentials, and telemetry records at any time.
            </p>
          </div>
          <button 
            onClick={handleDeleteData}
            className="px-4 py-2 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all shrink-0 cursor-pointer"
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
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertTriangle size={20} className="text-[#E53935]" />
            <h2 className="text-xl font-['Space_Grotesk'] font-black uppercase text-[#111111] tracking-tight">Career Debt Index</h2>
          </div>
          <p className="text-[#555555] font-mono text-xs mb-6 leading-relaxed max-w-2xl">
            Career debt represents unverified capabilities or critical market standards blocking your transition. 
            Clearing critical debt provides the highest marginal boost to interview callback probability.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t-2 border-[#111111] pt-6">
            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="text-[10px] text-[#111111] font-mono font-bold uppercase tracking-wider">Critical Gaps</div>
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#E53935] mt-1">{criticalGaps.length}</div>
            </div>
            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="text-[10px] text-[#111111] font-mono font-bold uppercase tracking-wider">High Priority Gaps</div>
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#F4C430] mt-1">{highGaps.length}</div>
            </div>
            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="text-[10px] text-[#111111] font-mono font-bold uppercase tracking-wider">Estimated Resolution</div>
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#2457A6] mt-1">~{gapsResult.gaps.length * 15} hrs</div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
          <h3 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mb-4 border-b-2 border-[#111111] pb-3">Actionable Debt Ledger</h3>
          <div className="space-y-3">
            {gapsResult.gaps.map((gap, i) => (
              <div key={i} className="flex justify-between items-center p-4 border-2 border-[#111111] bg-[#F5F0E6] shadow-[2px_2px_0px_#111111]">
                <div>
                  <div className="text-xs font-mono font-bold text-[#111111]">{gap.skill}</div>
                  <div className="text-[11px] font-mono text-[#555555] mt-0.5">Category: {gap.category} • Importance: {(gap.importance * 100).toFixed(0)}%</div>
                </div>
                <button 
                  onClick={() => setActiveSidebarTab('skill-gaps')}
                  className="px-3 py-1.5 text-xs font-mono font-bold text-white bg-[#2457A6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-1.5 transition-all cursor-pointer"
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
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
          <div className="flex items-center gap-2.5 mb-2">
            <TrendingUp size={20} className="text-[#2457A6]" />
            <h2 className="text-xl font-['Space_Grotesk'] font-black uppercase text-[#111111] tracking-tight">Upskilling ROI & Accreditation</h2>
          </div>
          <p className="text-[#555555] font-mono text-xs leading-relaxed max-w-2xl">
            Curated high-return programs aligned with PMKVY 4.0, SWAYAM, and top open certification tracks that resolve multiple critical gaps simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gapsResult.recommendations.map((rec) => (
            <div key={rec.courseId} className="bg-white border-2 border-[#111111] p-5 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 bg-[#2457A6] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
                    {rec.provider}
                  </span>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-[#111111] flex items-center justify-end gap-1">
                      <IndianRupee size={13}/> {rec.isFree ? 'Free' : 'Paid'}
                    </div>
                    <div className="text-[11px] text-[#555555] mt-0.5 flex items-center justify-end gap-1 font-mono">
                      <Clock size={11}/> {rec.duration}
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mt-2">{rec.title}</h4>
                <div className="flex items-center gap-3 text-xs font-mono text-[#555555] mt-1">
                  <span>Level: {rec.level}</span>
                  {rec.isGovt && <span className="text-[#2457A6] font-bold flex items-center gap-1">• Govt Recognized</span>}
                </div>
              </div>

              <div className="border-t-2 border-[#111111] pt-3 mt-4">
                <div className="text-[11px] text-[#111111] mb-2 font-mono font-bold uppercase tracking-wider">Closes Key Gaps:</div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.addressesGaps.map(gap => (
                    <span key={gap} className="px-2 py-0.5 bg-[#F5F0E6] border border-[#111111] text-xs font-mono text-[#111111] font-medium">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {gapsResult.recommendations.length === 0 && (
            <div className="col-span-2 py-12 text-center text-[#7A7A7A] font-mono text-xs bg-white border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
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
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
          <div className="flex items-center gap-2.5 mb-2">
            <PlayCircle size={20} className="text-[#2457A6]" />
            <h2 className="text-xl font-['Space_Grotesk'] font-black uppercase text-[#111111] tracking-tight">What-If Skill Simulator</h2>
          </div>
          <p className="text-[#555555] font-mono text-xs mb-6 leading-relaxed max-w-2xl">
            Simulate your qualification index against different target roles. Toggle missing skills to project how acquiring them boosts your match score.
          </p>
          
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-2">Select Target Benchmark Role</label>
            <select 
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value);
                setHypotheticalSkills(new Set());
              }}
              className="w-full p-3 bg-white border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] outline-none shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              {onetRoles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.onetCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#2457A6]" /></div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] flex flex-col sm:flex-row items-center gap-6">
              <div className={`w-20 h-20 flex flex-col items-center justify-center font-['Space_Grotesk'] font-black text-2xl border-4 border-[#111111] shrink-0 shadow-[3px_3px_0px_#111111] ${
                isAtRisk 
                  ? 'border-[#111111] text-[#111111] bg-[#F4C430]' 
                  : 'border-[#111111] text-white bg-[#2457A6]'
              }`}>
                <span>{simulatedCoverage}%</span>
              </div>
              <div>
                <h3 className="text-lg font-['Space_Grotesk'] font-black uppercase text-[#111111] flex items-center gap-2">
                  <Sparkles size={18} className="text-[#2457A6]" /> Projected Match Rate
                </h3>
                <p className="text-[#555555] font-mono text-xs mt-1 leading-relaxed">
                  Base match is <span className="font-bold text-[#111111]">{baseCoverage}%</span>. By adding {hypotheticalSkills.size} simulated skill{hypotheticalSkills.size === 1 ? '' : 's'}, your projected score increases to <span className="font-bold text-[#2457A6]">{simulatedCoverage}%</span>.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
              <h3 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mb-4 flex items-center gap-2 border-b-2 border-[#111111] pb-3">
                <span className="w-2.5 h-2.5 bg-[#2457A6] border border-[#111111]" />
                Toggle Missing Skills to Simulate Upskilling
              </h3>
              
              <ul className="space-y-2.5 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {gapsResult.gaps.map((g, idx) => {
                  const isSimulated = hypotheticalSkills.has(g.skillId);
                  return (
                    <li 
                      key={idx} 
                      className={`flex justify-between items-center text-xs font-mono border-2 border-[#111111] p-3 transition-all cursor-pointer select-none ${
                        isSimulated 
                          ? 'bg-[#EFE7D8] shadow-[3px_3px_0px_#2457A6]' 
                          : 'bg-[#F5F0E6] shadow-[2px_2px_0px_#111111] hover:bg-white'
                      }`}
                      onClick={() => {
                        const next = new Set(hypotheticalSkills);
                        if (next.has(g.skillId)) next.delete(g.skillId);
                        else next.add(g.skillId);
                        setHypotheticalSkills(next);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 border-[#111111] flex items-center justify-center transition-all ${
                          isSimulated ? 'bg-[#2457A6] text-white' : 'bg-white'
                        }`}>
                          {isSimulated && <CheckCircle2 size={13} />}
                        </div>
                        <span className={`font-bold ${isSimulated ? 'text-[#2457A6]' : 'text-[#111111]'}`}>
                          {g.skill}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider border ${
                        g.priority === 'CRITICAL' 
                          ? 'bg-[#E53935] text-white border-[#111111]' 
                          : 'bg-[#F4C430] text-[#111111] border-[#111111]'
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
          <Loader2 className="w-8 h-8 animate-spin text-[#2457A6]" />
        </div>
      );
    }

    if (!pathingData) {
      return (
        <div className="bg-white border-2 border-[#111111] p-8 text-center text-[#7A7A7A] font-mono text-xs shadow-[4px_4px_0px_#111111]">
          No career pathing data available. Please ensure O*NET taxonomy is loaded.
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* Anchor Card */}
        <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#2457A6] text-white border border-[#111111]">
                  Current Benchmark Base
                </span>
                <span className="text-xs text-[#555555] font-mono">O*NET {pathingData.currentRole.onetCode}</span>
              </div>
              <h2 className="text-2xl font-['Space_Grotesk'] font-black uppercase text-[#111111] mt-1.5">{pathingData.currentRole.title}</h2>
              <p className="text-xs text-[#555555] font-mono mt-1">
                Deterministic skill-graph distance mapping vertical promotions, lateral transitions, and stretch pivots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">Switch Base:</label>
              <select 
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="p-2.5 bg-white border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] shadow-[2px_2px_0px_#111111] outline-none"
              >
                {onetRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 1. Job Ladder (Vertical Progression) */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-white border-2 border-[#111111] flex items-center justify-center text-[#2457A6] shadow-[2px_2px_0px_#111111]">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111]">Job Ladder (Vertical Promotion Steps)</h3>
              <p className="text-xs text-[#555555] font-mono">Seniority steps within your current technical domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.ladder.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 border-2 border-[#111111] transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-[#EFE7D8] shadow-[5px_5px_0px_#2457A6]' 
                    : 'bg-white shadow-[3px_3px_0px_#111111] hover:bg-[#F5F0E6]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#2457A6] text-white border border-[#111111]">
                        Vertical Step
                      </span>
                      <span className="text-xs font-mono text-[#555555]">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mt-1.5">{item.title}</h4>
                    <p className="text-xs text-[#555555] font-mono">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-['Space_Grotesk'] font-black text-[#2457A6]">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-[#555555] font-mono uppercase font-bold tracking-wider">Skill Overlap</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#111111] flex items-center justify-between text-xs font-mono">
                  <div className="text-[#111111] truncate max-w-[240px]">
                    <span className="text-[#555555] font-bold">Key Bridge:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-[#111111] flex items-center gap-1 font-mono">
                    ~{item.estimatedMonths} mos <ArrowUpRight size={14} className="text-[#2457A6]" />
                  </span>
                </div>
              </div>
            ))}
            {pathingData.ladder.length === 0 && (
              <div className="col-span-2 p-6 bg-white border-2 border-[#111111] text-center text-xs font-mono text-[#7A7A7A] shadow-[4px_4px_0px_#111111]">
                You are currently at the peak seniority band for this specific technical track.
              </div>
            )}
          </div>
        </div>

        {/* 2. Adjacent Roles (Lateral Pivots) */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-white border-2 border-[#111111] flex items-center justify-center text-[#2457A6] shadow-[2px_2px_0px_#111111]">
              <GitFork size={16} />
            </div>
            <div>
              <h3 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111]">Adjacent Roles (Lateral Pivots)</h3>
              <p className="text-xs text-[#555555] font-mono">High-transferability opportunities sharing 40%+ core skills</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.adjacentRoles.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 border-2 border-[#111111] transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-[#EFE7D8] shadow-[5px_5px_0px_#2457A6]' 
                    : 'bg-white shadow-[3px_3px_0px_#111111] hover:bg-[#F5F0E6]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F4C430] text-[#111111] border border-[#111111]">
                        Lateral Pivot
                      </span>
                      <span className="text-xs font-mono text-[#555555]">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mt-1.5">{item.title}</h4>
                    <p className="text-xs text-[#555555] font-mono">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-['Space_Grotesk'] font-black text-[#2457A6]">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-[#555555] font-mono uppercase font-bold tracking-wider">Transferable</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#111111] flex items-center justify-between text-xs font-mono">
                  <div className="text-[#111111] truncate max-w-[240px]">
                    <span className="text-[#555555] font-bold">Key Bridge:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-[#111111] flex items-center gap-1 font-mono">
                    ~{item.estimatedMonths} mos <ArrowUpRight size={14} className="text-[#2457A6]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Career Path Simulator Stepping Stones */}
        {selectedPathItem && (
          <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[6px_6px_0px_#111111] relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#111111] pb-5">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#2457A6]">
                  CAREER TRANSITION BLUEPRINT
                </span>
                <h3 className="text-2xl font-['Space_Grotesk'] font-black uppercase text-[#111111] mt-1">
                  {pathingData.currentRole.title} → {selectedPathItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoleId(selectedPathItem.roleId)}
                className="px-4 py-2.5 bg-[#2457A6] hover:bg-[#1C4587] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
              >
                Set as Target Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Step 1 */}
              <div className="bg-[#F5F0E6] border-2 border-[#111111] p-5 shadow-[3px_3px_0px_#111111]">
                <div className="text-[10px] font-mono font-bold text-[#2457A6] uppercase tracking-widest mb-1">STEP 1: FOUNDATION</div>
                <div className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mb-2">{selectedPathItem.sharedSkills.length} Shared Skills</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.sharedSkills.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] font-mono px-2 py-0.5 bg-white text-[#111111] border border-[#111111]">
                      ✓ {s}
                    </span>
                  ))}
                  {selectedPathItem.sharedSkills.length > 5 && (
                    <span className="text-[10px] font-mono text-[#555555]">+{selectedPathItem.sharedSkills.length - 5} more</span>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#F5F0E6] border-2 border-[#111111] p-5 shadow-[3px_3px_0px_#111111]">
                <div className="text-[10px] font-mono font-bold text-[#E53935] uppercase tracking-widest mb-1">STEP 2: BRIDGE GAPS</div>
                <div className="text-base font-['Space_Grotesk'] font-black uppercase text-[#111111] mb-2">{selectedPathItem.missingSkills.length} Skills Needed</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.missingSkills.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] font-mono px-2 py-0.5 bg-[#E53935] text-white border border-[#111111]">
                      • {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#F5F0E6] border-2 border-[#111111] p-5 shadow-[3px_3px_0px_#111111]">
                <div className="text-[10px] font-mono font-bold text-[#111111] uppercase tracking-widest mb-1">STEP 3: EXECUTION</div>
                <div className="text-xs font-mono font-bold text-[#111111] mt-1 leading-relaxed">
                  {selectedPathItem.recommendedStep}
                </div>
                <div className="text-xs text-[#555555] mt-3 font-mono">
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
    <div className="flex-1 bg-[#F5F0E6] min-h-screen overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-6 py-8 md:px-12 md:py-10">
        <PageHeader
          sectionNumber="16"
          sectionLabel="MOBILITY"
          headline={"CAREER HEALTH\n& MOBILITY"}
          subtitle="Quantify market resilience, simulate strategic pivots, and clear unverified skill debt."
          accentColor="blue"
          accentShape="triangle"
          action={
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#2457A6]/10 text-[#2457A6] border-2 border-[#2457A6]">
                TRAJECTORY INTELLIGENCE
              </span>
            </div>
          }
        />

        {/* Bauhaus Segmented Tabs */}
        <div className="flex flex-wrap gap-2 bg-[#EFE7D8] border-2 border-[#111111] p-1.5 shadow-[3px_3px_0px_#111111] mb-8 w-max">
          <button 
            onClick={() => setActiveTab('health')} 
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
              activeTab === 'health' 
                ? 'bg-[#2457A6] text-white border-[#111111] shadow-[2px_2px_0px_#111111]' 
                : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
            }`}
          >
            <div className="flex items-center gap-2"><Activity size={14}/> Health Index</div>
          </button>
          <button 
            onClick={() => setActiveTab('debt')} 
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
              activeTab === 'debt' 
                ? 'bg-[#2457A6] text-white border-[#111111] shadow-[2px_2px_0px_#111111]' 
                : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
            }`}
          >
            <div className="flex items-center gap-2"><AlertTriangle size={14}/> Skill Debt</div>
          </button>
          <button 
            onClick={() => setActiveTab('roi')} 
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
              activeTab === 'roi' 
                ? 'bg-[#2457A6] text-white border-[#111111] shadow-[2px_2px_0px_#111111]' 
                : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
            }`}
          >
            <div className="flex items-center gap-2"><TrendingUp size={14}/> Learning ROI</div>
          </button>
          <button 
            onClick={() => setActiveTab('whatif')} 
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
              activeTab === 'whatif' 
                ? 'bg-[#2457A6] text-white border-[#111111] shadow-[2px_2px_0px_#111111]' 
                : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
            }`}
          >
            <div className="flex items-center gap-2"><PlayCircle size={14}/> What-If Simulator</div>
          </button>
          <button 
            onClick={() => setActiveTab('pathing')} 
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
              activeTab === 'pathing' 
                ? 'bg-[#2457A6] text-white border-[#111111] shadow-[2px_2px_0px_#111111]' 
                : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
            }`}
          >
            <div className="flex items-center gap-2"><Compass size={14}/> Career Pathing</div>
          </button>
        </div>

        <div className="min-h-[400px]">
          {isLoading && activeTab !== 'whatif' && activeTab !== 'pathing' ? (
            <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#2457A6]" /></div>
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
