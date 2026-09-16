import React, { useState, useEffect } from 'react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { Activity, TrendingUp, AlertTriangle, PlayCircle, Loader2, ArrowRight, BookOpen, Clock, IndianRupee } from 'lucide-react';
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

type TabType = 'health' | 'debt' | 'roi' | 'whatif';

export const CareerHealthDashboard: React.FC = () => {
  const { setActiveSidebarTab } = useUiStore();
  const [activeTab, setActiveTab] = useState<TabType>('health');
  
  const [onetRoles, setOnetRoles] = useState<OnetRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [gapsResult, setGapsResult] = useState<OnetGapsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        const res = await fetch(`/api/career-graph/gaps?roleId=${selectedRoleId}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setGapsResult(data);
        }
      } catch (err) {
        console.error('Failed to load gaps', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGaps();
  }, [selectedRoleId]);

  const renderHealth = () => {
    if (!gapsResult) return null;
    const { coveragePercent } = gapsResult.gapSummary;
    const healthStatus = coveragePercent >= 80 ? 'Excellent' : coveragePercent >= 50 ? 'Fair' : 'At Risk';
    const healthColor = coveragePercent >= 80 ? 'text-emerald-500' : coveragePercent >= 50 ? 'text-blue-500' : 'text-orange-500';

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative flex items-center justify-center w-32 h-32">
            <svg width={128} height={128} viewBox="0 0 120 120" className="-rotate-90">
              <circle cx={60} cy={60} r={54} fill="none" stroke="#f4f4f5" strokeWidth={10} />
              <circle
                cx={60} cy={60} r={54} fill="none" stroke={coveragePercent >= 80 ? '#10b981' : coveragePercent >= 50 ? '#3b82f6' : '#f59e0b'} strokeWidth={10}
                strokeDasharray={`${(coveragePercent / 100) * 339} 339`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-bold text-zinc-950">{coveragePercent}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Career Health: <span className={healthColor}>{healthStatus}</span></h2>
            <p className="text-zinc-500 mt-2 max-w-lg">
              Your verified skills map to {coveragePercent}% of the core requirements for a {gapsResult.role?.title}.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-emerald-500"/> Verified Strengths
            </h3>
            <ul className="space-y-3">
              {gapsResult.matches.filter(m => m.provenance === 'VERIFIED').slice(0, 5).map(m => (
                <li key={m.skill} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-zinc-800">{m.skill}</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">Verified</span>
                </li>
              ))}
              {gapsResult.matches.filter(m => m.provenance === 'VERIFIED').length === 0 && (
                <li className="text-sm text-zinc-500 italic">No independently verified skills found.</li>
              )}
            </ul>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500"/> Key Vulnerabilities
            </h3>
            <ul className="space-y-3">
              {gapsResult.gaps.filter(g => g.priority === 'CRITICAL' || g.priority === 'HIGH').slice(0, 5).map(g => (
                <li key={g.skillId} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-zinc-800">{g.skill}</span>
                  <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-semibold">{g.priority}</span>
                </li>
              ))}
              {gapsResult.gaps.length === 0 && (
                <li className="text-sm text-zinc-500 italic">No major vulnerabilities detected.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderDebt = () => {
    if (!gapsResult) return null;
    const unverified = gapsResult.matches.filter(m => m.provenance === 'DECLARED' || m.provenance === 'UNSUPPORTED');
    
    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Career Debt</h2>
        <p className="text-zinc-500 mb-6 text-sm">Unverified claims act as "debt" that slows down your career progression.</p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">Unverified Claims</h3>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              {unverified.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Skill Claim</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {unverified.map(m => (
                      <tr key={m.skill}>
                        <td className="px-4 py-3 font-medium text-zinc-900">{m.skill}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            {m.provenance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Verify Now</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-sm text-zinc-500">No unverified claims found. Great job!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderROI = () => {
    if (!gapsResult) return null;
    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Career ROI</h2>
        <p className="text-zinc-500 mb-6 text-sm">High-impact government courses recommended to close your exact skill gaps.</p>
        
        <div className="grid grid-cols-1 gap-4">
          {gapsResult.recommendations.map(rec => (
            <div key={rec.courseId} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">{rec.title}</h3>
                  <div className="text-sm font-medium text-blue-600 mt-1 flex items-center gap-1">
                    <BookOpen size={14}/> {rec.provider} {rec.isGovt && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded ml-1 uppercase">Govt Verified</span>}
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
             <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-500 shadow-sm">
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
            {/* Re-use the health view as the result of the simulation */}
            {renderHealth()}
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
        <div className="flex space-x-1 bg-zinc-200/50 p-1 rounded-xl mb-8 w-max">
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
        </div>

        <div className="min-h-[400px]">
          {isLoading && activeTab !== 'whatif' ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
          ) : (
            <>
              {activeTab === 'health' && renderHealth()}
              {activeTab === 'debt' && renderDebt()}
              {activeTab === 'roi' && renderROI()}
              {activeTab === 'whatif' && renderWhatIf()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
