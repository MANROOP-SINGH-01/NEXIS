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
  ChevronRight
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
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl border-4 ${isAtRisk ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-emerald-500 text-emerald-600 bg-emerald-50'}`}>
            {coverage}%
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Career Health: {isAtRisk ? 'At Risk' : 'Healthy Trajectory'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Your verified skills map to {coverage}% of the core requirements for a {gapsResult.role?.title || 'Target Role'}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Strengths */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Verified Strengths
            </h3>
            {gapsResult.matches.length === 0 ? (
              <p className="text-xs text-zinc-400">No verified skills mapped to this target role yet.</p>
            ) : (
              <ul className="space-y-3">
                {gapsResult.matches.map((m, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm border-b border-zinc-100 pb-2">
                    <span className="font-medium text-zinc-700">{m.skill}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      {m.provenance || 'Verified'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Vulnerabilities / Top Gaps */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Key Vulnerabilities
            </h3>
            <ul className="space-y-3">
              {gapsResult.gaps.slice(0, 5).map((g, idx) => (
                <li key={idx} className="flex justify-between items-center text-sm border-b border-zinc-100 pb-2">
                  <span className="font-medium text-zinc-700">{g.skill}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${g.priority === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {g.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Career Debt Index</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Identifies unverified skills claimed or critical gaps blocking role transition. 
            Debt accumulates when key industry standards are not backed by evidence.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-100 pt-4">
            <div>
              <div className="text-xs text-zinc-400 font-medium">Critical Gaps</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{criticalGaps.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">High Gaps</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{highGaps.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Resolution Cost</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">~{gapsResult.gaps.length * 15} hrs</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">Unresolved Debt Items</h3>
          <div className="space-y-3">
            {gapsResult.gaps.map((gap, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                <div>
                  <div className="text-sm font-semibold text-zinc-800">{gap.skill}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Category: {gap.category} • Importance: {(gap.importance * 100).toFixed(0)}%</div>
                </div>
                <button 
                  onClick={() => setActiveSidebarTab('skill-gaps')}
                  className="text-xs text-zinc-900 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Clear Debt <ArrowRight size={12}/>
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
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Government & Subsidized Upskilling ROI</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Curated high-return programs aligned with PMKVY 4.0, Swayam, and top open learning tracks that clear multiple critical gaps simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gapsResult.recommendations.map((rec) => (
            <div key={rec.courseId} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:border-zinc-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                    {rec.provider}
                  </span>
                  <h4 className="text-base font-bold text-zinc-900 mt-2">{rec.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span>Level: {rec.level}</span>
                    {rec.isGovt && <span className="text-emerald-600 font-semibold">• Govt Recognized</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600 flex items-center justify-end gap-1">
                    <IndianRupee size={14}/> {rec.isFree ? 'Free' : 'Paid'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center justify-end gap-1">
                    <Clock size={12}/> {rec.duration}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-100 pt-3 mt-3">
                <div className="text-xs text-zinc-500 mb-2 font-medium">Closes Gaps:</div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.addressesGaps.map(gap => (
                    <span key={gap} className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-xs text-zinc-700">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {gapsResult.recommendations.length === 0 && (
             <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-500 shadow-sm col-span-2">
               No course recommendations available for these gaps right now.
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderWhatIf = () => {
    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">What-If Simulator</h2>
        <p className="text-zinc-500 mb-6 text-sm">Simulate your career health against a completely different role to see what it would take to pivot.</p>
        
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm mb-6">
          <label className="block text-sm font-semibold text-zinc-900 mb-2">Select Target Role</label>
          <select 
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-shadow"
          >
            {onetRoles.map(r => (
              <option key={r.id} value={r.id}>{r.title} ({r.onetCode})</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : (
          <div className="opacity-75">
            {renderHealth()}
          </div>
        )}
      </div>
    );
  };

  // Phase 5 P2.9: Career Pathing (Job Ladder, Adjacent Roles & Path Simulator)
  const renderPathing = () => {
    if (pathingLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      );
    }

    if (!pathingData) {
      return (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-500 shadow-sm">
          No career pathing data available. Please ensure O*NET taxonomy is loaded.
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Anchor Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Current Benchmark Base
                </span>
                <span className="text-xs text-zinc-400 font-mono">O*NET {pathingData.currentRole.onetCode}</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mt-1">{pathingData.currentRole.title}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Deterministic skill-graph distance mapping vertical promotions, lateral transitions, and stretch leaps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-zinc-600">Switch Base Role:</label>
              <select 
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="p-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:ring-2 focus:ring-zinc-900 outline-none"
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Job Ladder (Vertical Promotion Steps)</h3>
              <p className="text-xs text-zinc-500">Hierarchical seniority steps within your skill domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.ladder.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 rounded-xl border transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-sm' 
                    : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Vertical Step
                      </span>
                      <span className="text-xs font-mono text-zinc-400">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-bold text-zinc-900 mt-1.5">{item.title}</h4>
                    <p className="text-xs text-zinc-500">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-emerald-600">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Skill Overlap</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <div className="text-zinc-600">
                    <span className="font-semibold text-zinc-800">Bridge Leap:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-zinc-500 flex items-center gap-1">
                    ~{item.estimatedMonths} months <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            ))}
            {pathingData.ladder.length === 0 && (
              <div className="col-span-2 p-6 bg-white border border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                You are currently at the peak seniority band for this specific technical track.
              </div>
            )}
          </div>
        </div>

        {/* 2. Adjacent Roles (Lateral Pivots) */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <GitFork size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Adjacent Roles (Lateral Pivots)</h3>
              <p className="text-xs text-zinc-500">High-transferability roles sharing 40%+ common foundation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathingData.adjacentRoles.map((item) => (
              <div 
                key={item.roleId}
                onClick={() => setSelectedPathItem(item)}
                className={`p-5 rounded-xl border transition-all cursor-pointer ${
                  selectedPathItem?.roleId === item.roleId 
                    ? 'bg-indigo-50/50 border-indigo-300 shadow-sm' 
                    : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        Lateral Pivot
                      </span>
                      <span className="text-xs font-mono text-zinc-400">{item.onetCode}</span>
                    </div>
                    <h4 className="text-base font-bold text-zinc-900 mt-1.5">{item.title}</h4>
                    <p className="text-xs text-zinc-500">{item.family}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-indigo-600">{item.overlapPercent}%</div>
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Transferable</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <div className="text-zinc-600">
                    <span className="font-semibold text-zinc-800">Bridge Leap:</span> {item.topMissingSkill}
                  </div>
                  <span className="font-bold text-zinc-500 flex items-center gap-1">
                    ~{item.estimatedMonths} months <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Career Path Simulator Drawer / Detail Card */}
        {selectedPathItem && (
          <div className="bg-zinc-900 text-white rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Career Path Simulator Stepping Stones
                </span>
                <h3 className="text-2xl font-black mt-1">
                  Transition from {pathingData.currentRole.title} → {selectedPathItem.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedRoleId(selectedPathItem.roleId)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Set as Target Role
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Step 1 */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4">
                <div className="text-xs font-bold text-emerald-400 mb-1">STEP 1: FOUNDATION OVERLAP</div>
                <div className="text-xl font-black mb-2">{selectedPathItem.sharedSkills.length} Skills Shared</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.sharedSkills.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                      ✓ {s}
                    </span>
                  ))}
                  {selectedPathItem.sharedSkills.length > 5 && (
                    <span className="text-[10px] text-zinc-400">+{selectedPathItem.sharedSkills.length - 5} more</span>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4">
                <div className="text-xs font-bold text-amber-400 mb-1">STEP 2: BRIDGE SKILL GAPS</div>
                <div className="text-xl font-black mb-2">{selectedPathItem.missingSkills.length} Skills Needed</div>
                <div className="flex flex-wrap gap-1">
                  {selectedPathItem.missingSkills.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                      • {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4">
                <div className="text-xs font-bold text-blue-400 mb-1">STEP 3: ACTIONABLE MILESTONE</div>
                <div className="text-sm font-semibold text-zinc-200 mt-1 leading-relaxed">
                  {selectedPathItem.recommendedStep}
                </div>
                <div className="text-xs text-zinc-400 mt-3 font-mono">
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
    <div className="flex-1 bg-zinc-50/50 min-h-screen overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 md:px-12 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-950">Career Health Dashboard</h1>
          <p className="text-zinc-500 mt-2">Manage your career trajectory, track unverified debt, and simulate pivots.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-zinc-200/50 p-1 rounded-xl mb-8 w-max">
          <button onClick={() => setActiveTab('health')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'health' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
            <div className="flex items-center gap-2"><Activity size={16}/> Health</div>
          </button>
          <button onClick={() => setActiveTab('debt')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'debt' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
            <div className="flex items-center gap-2"><AlertTriangle size={16}/> Debt</div>
          </button>
          <button onClick={() => setActiveTab('roi')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'roi' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
            <div className="flex items-center gap-2"><TrendingUp size={16}/> ROI</div>
          </button>
          <button onClick={() => setActiveTab('whatif')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'whatif' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
            <div className="flex items-center gap-2"><PlayCircle size={16}/> What-If Simulator</div>
          </button>
          <button onClick={() => setActiveTab('pathing')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pathing' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
            <div className="flex items-center gap-2"><Compass size={16}/> Career Pathing</div>
          </button>
        </div>

        <div className="min-h-[400px]">
          {isLoading && activeTab !== 'whatif' && activeTab !== 'pathing' ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
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
