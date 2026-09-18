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
  LucideIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { ActiveSidebarTab } from '../types';
import { useUiStore } from '../integration/store/uiStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { useCoreStore } from '../integration/store/coreStore';
import { USER_COLOR } from '../theme/brand';
import { useIsAdmin } from './admin/useIsAdmin';
import { useLocale } from '../integration/hooks/useLocale';
import { type StringKey } from '../i18n';
import { loadDemoData, clearDemoData, isDemoMode } from '../demo/demoData';
import {
  activateFailureSimulation,
  deactivateFailureSimulation,
  getActiveScenario,
  getScenarioLabels,
  type FailureScenario,
} from '../demo/failureSimulation';

interface NavItem {
  id: ActiveSidebarTab;
  labelKey: StringKey;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'career-health', labelKey: 'careerHealth', icon: Activity },
  { id: 'skill-gaps', labelKey: 'skillGaps', icon: Target },
  { id: 'job-matches', labelKey: 'jobMatches', icon: Briefcase },
  { id: 'recommended-programs', labelKey: 'recommendedPrograms', icon: GraduationCap },
  { id: 'interview-prep', labelKey: 'interviewPrep', icon: MessageSquare },
  { id: 'new-cv', labelKey: 'newCv', icon: FileText },
  { id: 'application-tracker', labelKey: 'applicationTracker', icon: Briefcase },
  { id: 'career-passport', labelKey: 'careerPassport', icon: ShieldCheck },
  { id: 'my-outcome', labelKey: 'myOutcome', icon: Award },
  { id: 'linkedin-integration', labelKey: 'linkedinIntegration', icon: Linkedin },
];

export const Sidebar: React.FC = () => {
  const { activeSidebarTab, setActiveSidebarTab, llmConfig, setBYOKOpen, setDedupReviewOpen, setAnalyticsDashboardOpen } = useUiStore();
  const { isAdmin } = useIsAdmin();
  const { setViewMode } = useCoreStore();
  const activeTeam = useActiveTeam();
  const hasKey = Boolean(llmConfig.apiKey);
  const { locale, setLocale, t } = useLocale();
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const [failSim, setFailSim] = useState<FailureScenario | ''>(getActiveScenario() || '');

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <aside className="w-[260px] h-screen bg-white/70 backdrop-blur-3xl border-r border-zinc-200/50 flex flex-col shrink-0 z-40 transition-all duration-300 shadow-[var(--shadow-subtle)]" role="navigation" aria-label={t('mainNavigation')}>
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-md shadow-zinc-900/20 shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V3l14 18V3" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-[0.1em] text-zinc-950 leading-none">
              NEXIS
            </span>
            <span className="text-[9px] font-medium text-zinc-500 tracking-wider uppercase mt-1">
              Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Main Menu
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSidebarTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative ${
                isActive
                  ? 'bg-zinc-950 text-white shadow-md shadow-zinc-900/10'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 font-medium'
              }`}
            >
              <div className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-sm tracking-tight truncate flex-1 ${isActive ? 'font-semibold' : ''}`}>
                {t(item.labelKey)}
              </span>

              {item.id === 'dashboard' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-2 ring-emerald-500/20" title="3D Simulation Live" />
              )}
            </button>
          );
        })}

        {isAdmin && (
          <div className="pt-6 mt-2 flex flex-col gap-1.5">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Admin Console
            </div>
            <button
              onClick={() => setAnalyticsDashboardOpen(true)}
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-zinc-100/80 text-zinc-600 transition-all cursor-pointer text-sm font-medium"
            >
              <div className="shrink-0 text-zinc-400 group-hover:text-zinc-900">
                <BarChart3 size={18} strokeWidth={2} />
              </div>
              <span className="truncate group-hover:text-zinc-900">Analytics</span>
            </button>
            <button
              onClick={() => setDedupReviewOpen(true)}
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-zinc-100/80 text-zinc-600 transition-all cursor-pointer text-sm font-medium"
            >
              <div className="shrink-0 text-zinc-400 group-hover:text-zinc-900">
                <Settings size={18} strokeWidth={2} />
              </div>
              <span className="truncate group-hover:text-zinc-900">Dedup</span>
            </button>
            <button
              onClick={() => {
                if (demoActive) { clearDemoData(); setDemoActive(false); }
                else { loadDemoData(); setDemoActive(true); }
              }}
              className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer text-sm font-medium ${
                demoActive ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'hover:bg-zinc-100/80 text-zinc-600'
              }`}
              aria-label="Demo Mode"
            >
              <div className={`shrink-0 ${demoActive ? 'text-amber-500' : 'text-zinc-400 group-hover:text-zinc-900'}`}>
                <Play size={18} strokeWidth={2} />
              </div>
              <span className="truncate">Demo Mode</span>
              {demoActive && <span className="ml-auto text-[9px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">ON</span>}
            </button>
            {/* Demo Failure Simulation */}
            <div className="px-3 pt-1">
              <select
                value={failSim}
                onChange={(e) => {
                  const v = e.target.value as FailureScenario | '';
                  if (v) { activateFailureSimulation(v); setFailSim(v); }
                  else { deactivateFailureSimulation(); setFailSim(''); }
                }}
                className={`w-full text-[10px] font-semibold rounded-lg px-2 py-1.5 border cursor-pointer transition-colors ${
                  failSim ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-400'
                }`}
                aria-label="Failure Simulation"
              >
                <option value="">Failure Sim: OFF</option>
                {Object.entries(getScenarioLabels()).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer Profile & Utilities */}
      <div className="p-4 border-t border-zinc-200/50 bg-white/40 space-y-3">
        <div
          onClick={() => setViewMode('design')}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group"
          title="Open Nexus Teams Designer"
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm"
            style={{ backgroundColor: activeTeam.color || USER_COLOR }}
          >
            {activeTeam.teamName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-900 truncate group-hover:text-zinc-950">
              {activeTeam.teamName}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium truncate">
              {activeTeam.teamType}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-zinc-400">
          <button
            onClick={() => setBYOKOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-zinc-100"
            title="Configure API Keys (BYOK)"
            aria-label="Configure API Keys"
          >
            <KeyRound size={14} className={hasKey ? 'text-emerald-500' : ''} />
            <span>{hasKey ? 'API Active' : 'Setup API'}</span>
          </button>

          {/* ponytail: inline lang picker, no modal */}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="text-[10px] font-semibold text-zinc-500 bg-transparent border border-zinc-200 rounded px-1 py-0.5 cursor-pointer hover:border-zinc-400 transition-colors"
            aria-label="Select language"
          >
            <option value="en">EN</option>
            <option value="hi">हिं</option>
            <option value="ta">தமி</option>
          </select>

          <button
            onClick={handleFullscreen}
            className="p-1.5 hover:bg-zinc-100 hover:text-zinc-900 transition-colors rounded-lg"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
