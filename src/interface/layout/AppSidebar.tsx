import React, { useState } from 'react';
import {
  Briefcase,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Target,
  Award,
  Linkedin,
  KeyRound,
  Maximize2,
  Settings,
  BarChart3,
  Play,
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';
import { useActiveTeam } from '../../integration/store/teamStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useIsAdmin } from '../admin/useIsAdmin';
import { useLocale } from '../../integration/hooks/useLocale';
import { type StringKey } from '../../i18n';
import { loadDemoData, clearDemoData, isDemoMode } from '../../demo/demoData';
import {
  activateFailureSimulation,
  deactivateFailureSimulation,
  getActiveScenario,
  getScenarioLabels,
  type FailureScenario,
} from '../../demo/failureSimulation';

interface NavItem {
  id: ActiveSidebarTab;
  labelKey: StringKey;
  icon: LucideIcon;
  section: 'core' | 'development' | 'verification';
  badge?: string;
  accent?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, section: 'core', accent: 'text-indigo-400' },
  { id: 'career-health', labelKey: 'careerHealth', icon: Activity, section: 'core', accent: 'text-rose-400' },
  { id: 'skill-gaps', labelKey: 'skillGaps', icon: Target, section: 'core', accent: 'text-emerald-400' },
  { id: 'job-matches', labelKey: 'jobMatches', icon: Briefcase, section: 'core', accent: 'text-cyan-400' },
  
  { id: 'recommended-programs', labelKey: 'recommendedPrograms', icon: GraduationCap, section: 'development', accent: 'text-amber-400' },
  { id: 'new-cv', labelKey: 'newCv', icon: FileText, section: 'development', accent: 'text-purple-400' },
  { id: 'interview-prep', labelKey: 'interviewPrep', icon: MessageSquare, section: 'development', accent: 'text-blue-400' },
  { id: 'application-tracker', labelKey: 'applicationTracker', icon: Briefcase, section: 'development', accent: 'text-teal-400' },
  
  { id: 'career-passport', labelKey: 'careerPassport', icon: ShieldCheck, section: 'verification', accent: 'text-indigo-400' },
  { id: 'my-outcome', labelKey: 'myOutcome', icon: Award, section: 'verification', accent: 'text-amber-400' },
  { id: 'linkedin-integration', labelKey: 'linkedinIntegration', icon: Linkedin, section: 'verification', accent: 'text-sky-400' },
];

export const AppSidebar: React.FC = () => {
  const { 
    activeSidebarTab, 
    setActiveSidebarTab, 
    llmConfig, 
    setBYOKOpen, 
    setDedupReviewOpen, 
    setAnalyticsDashboardOpen 
  } = useUiStore();
  const { isAdmin } = useIsAdmin();
  const { setViewMode } = useCoreStore();
  const activeTeam = useActiveTeam();
  const hasKey = Boolean(llmConfig.apiKey);
  const { locale, setLocale, t } = useLocale();
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const [failSim, setFailSim] = useState<FailureScenario | ''>(getActiveScenario() || '');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <aside
      className={`h-screen bg-[#0c0d14]/95 backdrop-blur-2xl border-r border-zinc-800/80 flex flex-col shrink-0 z-40 transition-all duration-300 select-none shadow-2xl ${
        isCollapsed ? 'w-18' : 'w-[250px]'
      }`}
      role="navigation"
      aria-label={t('mainNavigation')}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/30">
              NX
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest text-zinc-100 uppercase font-['Space_Grotesk']">
                NEXIS
              </span>
              <span className="text-[9px] font-mono text-zinc-400 tracking-wider">
                ORCHESTRATOR
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              NX
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2.5 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {/* Render Core Section */}
        {!isCollapsed && (
          <span className="px-2.5 pt-1 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            INTELLIGENCE
          </span>
        )}
        {NAV_ITEMS.filter((i) => i.section === 'core').map((item) => {
          const Icon = item.icon;
          const isActive = activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left transition-all duration-200 relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 font-medium'
              }`}
              title={isCollapsed ? t(item.labelKey) : undefined}
            >
              <div className={`shrink-0 transition-colors ${isActive ? 'text-white' : item.accent}`}>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {!isCollapsed && (
                <span className="text-xs tracking-tight truncate flex-1">
                  {t(item.labelKey)}
                </span>
              )}
              {item.id === 'dashboard' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              )}
            </button>
          );
        })}

        {/* Development Section */}
        {!isCollapsed && (
          <span className="px-2.5 pt-3 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            ACCELERATION
          </span>
        )}
        {NAV_ITEMS.filter((i) => i.section === 'development').map((item) => {
          const Icon = item.icon;
          const isActive = activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left transition-all duration-200 relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 font-medium'
              }`}
              title={isCollapsed ? t(item.labelKey) : undefined}
            >
              <div className={`shrink-0 transition-colors ${isActive ? 'text-white' : item.accent}`}>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {!isCollapsed && (
                <span className="text-xs tracking-tight truncate flex-1">
                  {t(item.labelKey)}
                </span>
              )}
            </button>
          );
        })}

        {/* Verification Section */}
        {!isCollapsed && (
          <span className="px-2.5 pt-3 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            VALIDATION
          </span>
        )}
        {NAV_ITEMS.filter((i) => i.section === 'verification').map((item) => {
          const Icon = item.icon;
          const isActive = activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left transition-all duration-200 relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 font-medium'
              }`}
              title={isCollapsed ? t(item.labelKey) : undefined}
            >
              <div className={`shrink-0 transition-colors ${isActive ? 'text-white' : item.accent}`}>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {!isCollapsed && (
                <span className="text-xs tracking-tight truncate flex-1">
                  {t(item.labelKey)}
                </span>
              )}
            </button>
          );
        })}

        {/* Admin Controls */}
        {isAdmin && (
          <div className="pt-3 mt-1 border-t border-zinc-800/60 flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                ADMIN
              </span>
            )}
            <button
              onClick={() => setAnalyticsDashboardOpen(true)}
              className="flex items-center gap-3 w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 text-xs"
              title="Analytics Dashboard"
            >
              <BarChart3 size={16} className="text-indigo-400 shrink-0" />
              {!isCollapsed && <span>Analytics</span>}
            </button>
            <button
              onClick={() => setDedupReviewOpen(true)}
              className="flex items-center gap-3 w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 text-xs"
              title="Deduplication"
            >
              <Settings size={16} className="text-zinc-400 shrink-0" />
              {!isCollapsed && <span>Dedup</span>}
            </button>
            <button
              onClick={() => {
                if (demoActive) { clearDemoData(); setDemoActive(false); }
                else { loadDemoData(); setDemoActive(true); }
              }}
              className={`flex items-center gap-3 w-full px-2.5 py-1.5 rounded-lg text-left text-xs ${
                demoActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
              title="Demo Mode"
            >
              <Play size={16} className={demoActive ? 'text-amber-400' : 'text-zinc-400'} />
              {!isCollapsed && <span>Demo Data {demoActive ? 'ON' : ''}</span>}
            </button>
          </div>
        )}
      </div>

      {/* Footer Profile & Utilities */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40 space-y-2">
        {/* Team Designer Trigger */}
        <div
          onClick={() => setViewMode('design')}
          className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-800/60 transition-all cursor-pointer group"
          title="Open Nexus Teams Designer"
        >
          <div
            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: activeTeam.color || '#6366f1' }}
          >
            {activeTeam.teamName.substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">
                {activeTeam.teamName}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono truncate">
                {activeTeam.teamType}
              </p>
            </div>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className={`flex items-center text-zinc-400 ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          <button
            onClick={() => setBYOKOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 py-1 px-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            title="Configure API Keys (BYOK)"
          >
            <KeyRound size={13} className={hasKey ? 'text-emerald-400' : 'text-zinc-400'} />
            {!isCollapsed && <span>{hasKey ? 'BYOK Ready' : 'BYOK'}</span>}
          </button>

          {!isCollapsed && (
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 cursor-pointer hover:border-zinc-700"
              aria-label="Select language"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="ta">TA</option>
            </select>
          )}

          <button
            onClick={() => setActiveSidebarTab('settings')}
            className={`p-1 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors ${activeSidebarTab === 'settings' ? 'text-indigo-400 bg-indigo-500/10' : ''}`}
            title="Settings & Privacy"
          >
            <Settings size={13} />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
};
