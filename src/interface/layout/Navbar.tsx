import React from 'react';
import { 
  Sparkles, 
  Search,
  Bell,
  Settings,
  LogOut,
  LayoutDashboard,
  Briefcase,
  FileText,
  Target,
  BarChart3,
  Bot,
  Activity,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../../integration/store/authStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useUiStore } from '../../integration/store/uiStore';
import { useRouter } from '../../router';
import { ActiveSidebarTab } from '../../types';

interface NavbarProps {
  onOpenCommandBar: () => void;
  onOpenResumeForge?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandBar, onOpenResumeForge }) => {
  const { navigate } = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { activeSidebarTab, setActiveSidebarTab, setBYOKOpen, setAnalyticsDashboardOpen } = useUiStore();
  const { agentStatuses } = useCoreStore();

  const workingAgentsCount = Object.values(agentStatuses || {}).filter(
    (s) => s === 'working' || s === 'talking'
  ).length;

  // PulseAI Horizontal Top Pill Tabs
  const TOP_NAV_TABS: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '3D Office', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'career-health', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'job-matches', label: 'Jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'new-cv', label: 'Resume', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'skill-gaps', label: 'Skills', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'application-tracker', label: 'Applications', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-16 border-b border-[#EADFCF] bg-[#F8F3EC]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setActiveSidebarTab('dashboard')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* PulseAI Orange Rounded Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#F47B20] text-white flex items-center justify-center shadow-md shadow-[#F47B20]/25 group-hover:bg-[#E36D13] transition-all">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-['Space_Grotesk'] font-extrabold text-base tracking-tight text-[#181512] flex items-center gap-1.5">
              NEXIS
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FFF0E4] text-[#F47B20] border border-[#FDCBA7] font-semibold">
                AI OS
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#E5DBCF] mx-1 hidden lg:block" />

        {/* Live Active Agents Pill */}
        <div className="hidden xl:flex items-center">
          {workingAgentsCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF0E4] text-[#C45709] border border-[#FDCBA7]">
              <span className="w-2 h-2 rounded-full bg-[#F47B20] animate-pulse" />
              {workingAgentsCount} AGENTS ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F6EE] text-[#246B44] border border-[#BCE4CE]">
              <span className="w-2 h-2 rounded-full bg-[#2E8555]" />
              8 AGENTS READY
            </span>
          )}
        </div>
      </div>

      {/* Center: PulseAI Capsule Navigation Tabs */}
      <div className="hidden md:flex items-center justify-center">
        <div className="nx-nav-capsule">
          {TOP_NAV_TABS.map((tab) => {
            const isActive = activeSidebarTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSidebarTab(tab.id)}
                className={`nx-nav-tab flex items-center gap-1.5 cursor-pointer ${
                  isActive ? 'active' : ''
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Search Pill, Modals & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Soft Search Input Pill (Matching PulseAI "Q Search...") */}
        <button
          onClick={onOpenCommandBar}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#EFE7DC] hover:bg-[#E8DFC0] border border-[#E4D9CC] text-xs text-[#6A6359] hover:text-[#181512] transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[#999084]" />
          <span>Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-[#6A6359] rounded border border-[#E0D5C7] shadow-xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Mobile Search Icon Button */}
        <button
          onClick={onOpenCommandBar}
          className="sm:hidden p-2 rounded-full text-[#6A6359] hover:text-[#181512] hover:bg-[#EFE7DC]"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Government / Analytics Quick Launcher */}
        <button
          onClick={() => setAnalyticsDashboardOpen(true)}
          className="p-2 rounded-full text-[#6A6359] hover:text-[#181512] hover:bg-[#EFE7DC] transition-colors"
          title="Analytics Dashboard"
          aria-label="Analytics Dashboard"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setBYOKOpen(true)}
          className="p-2 rounded-full text-[#6A6359] hover:text-[#181512] hover:bg-[#EFE7DC] transition-colors"
          title="AI Keys & Settings"
          aria-label="AI Keys & Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Resume Forge Button */}
        {onOpenResumeForge && (
          <button
            onClick={onOpenResumeForge}
            className="nx-btn-dark !py-1.5 !px-3.5 !text-xs hidden lg:inline-flex"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F47B20]" />
            <span>Resume Forge</span>
          </button>
        )}

        {/* User Account / Profile */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#E5DBCF]">
            <button
              onClick={() => setActiveSidebarTab('profile')}
              className="flex items-center gap-2 hover:bg-[#EFE7DC] px-2 py-1 rounded-xl transition-colors cursor-pointer"
              title="View Candidate Profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#FFF0E4] border border-[#FDCBA7] text-[#F47B20] flex items-center justify-center text-xs font-bold uppercase shadow-2xs">
                {user.profile?.name ? user.profile.name.slice(0, 2) : 'PS'}
              </div>
              <span className="text-xs font-semibold text-[#181512] hidden xl:inline">
                {user.profile?.name || 'Priya Sharma'}
              </span>
            </button>
            <button
              onClick={() => clearAuth()}
              className="p-1.5 text-[#999084] hover:text-[#D9453B] hover:bg-[#FDEEED] rounded-full transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-[#E5DBCF]">
            <button
              onClick={() => navigate('/login')}
              className="nx-btn-primary !py-1.5 !px-3.5 !text-xs cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
