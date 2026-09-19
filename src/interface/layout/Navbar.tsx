import React from 'react';
import { 
  Sparkles, 
  Search,
  Settings,
  LogOut,
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

  // Segmented Pill Navigation Tabs
  const TOP_NAV_TABS: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '3D Office', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'career-health', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'job-matches', label: 'Jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'new-cv', label: 'Resume', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'skill-gaps', label: 'Skills', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'application-tracker', label: 'Applications', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-16 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0B0E]/85 backdrop-blur-[20px] pl-6 pr-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* 1. Left Zone: Brand Identity Only (No crowding) */}
      <div className="flex items-center">
        <div 
          onClick={() => setActiveSidebarTab('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Brand Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#FF5C1A] text-white flex items-center justify-center shadow-md shadow-[#FF5C1A]/20 group-hover:scale-105 transition-all">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-base tracking-tight text-white">
              NEXIS
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/30 font-semibold tracking-wider">
              AI OS
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center Zone: Single Segmented Pill Control */}
      <div className="hidden md:flex items-center justify-center">
        <div className="bg-[#121317] border border-[rgba(255,255,255,0.08)] p-1 rounded-full inline-flex items-center gap-2 shadow-xs">
          {TOP_NAV_TABS.map((tab) => {
            const isActive = activeSidebarTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSidebarTab(tab.id);
                  const tabToPathMap: Partial<Record<ActiveSidebarTab, string>> = {
                    'dashboard': '/dashboard',
                    'career-health': '/career-health',
                    'job-matches': '/jobs',
                    'new-cv': '/resume',
                    'skill-gaps': '/skills',
                    'application-tracker': '/tracker',
                  };
                  const targetPath = tabToPathMap[tab.id] || `/${tab.id}`;
                  navigate(targetPath);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1A1B20] text-white font-semibold border-b-2 border-[#FF5C1A] shadow-xs'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1B20]/50 border-b-2 border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Right Zone: Grouped Sub-clusters with 16-20px Gaps and Dividers */}
      <div className="flex items-center gap-4">
        {/* Cluster A: Fixed Width Search Bar (240px) */}
        <button
          onClick={onOpenCommandBar}
          className="hidden sm:flex items-center justify-between w-[240px] h-9 px-3.5 rounded-lg bg-[#121317] hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-xs text-[#9CA3AF] hover:text-white transition-all cursor-pointer shadow-2xs"
          title="Search or jump to command (Ctrl+K)"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[#6B7280]">Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#0A0B0E] text-[#9CA3AF] rounded border border-[rgba(255,255,255,0.1)] opacity-70">
            Ctrl+K
          </kbd>
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

        {/* Cluster B: Agent Count Pill & Utility Icons */}
        <div className="flex items-center gap-2">
          {/* Compact Agent Telemetry Pill */}
          <div 
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-[#121317] border border-[rgba(255,255,255,0.08)] cursor-pointer"
            title={workingAgentsCount > 0 ? `${workingAgentsCount} Agents Orchestrating Pipeline` : "8 Agents Ready in Active Mesh"}
          >
            <span className={`w-2 h-2 rounded-full ${workingAgentsCount > 0 ? 'bg-[#FF5C1A] animate-pulse' : 'bg-[#22C55E]'}`} />
            <span className="text-xs font-mono font-bold text-white">
              {workingAgentsCount > 0 ? workingAgentsCount : 8}
            </span>
            <span className="text-[10px] font-mono text-[#6B7280] hidden lg:inline">
              AGENTS
            </span>
          </div>

          {/* Analytics Button */}
          <button
            onClick={() => setAnalyticsDashboardOpen(true)}
            className="w-9 h-9 rounded-lg bg-[#121317] hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Analytics Telemetry Dashboard"
            aria-label="Analytics Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Settings / BYOK Button */}
          <button
            onClick={() => setBYOKOpen(true)}
            className="w-9 h-9 rounded-lg bg-[#121317] hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="AI Vault & BYOK Settings"
            aria-label="AI Keys & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-white/10 hidden lg:block" />

        {/* Cluster C: Action Tier (Resume Forge + Sign In / User) */}
        <div className="flex items-center gap-3">
          {/* Secondary: Resume Forge Button */}
          {onOpenResumeForge && (
            <button
              onClick={onOpenResumeForge}
              className="h-9 px-4 rounded-lg bg-[#121317] hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] text-xs font-medium text-white hidden lg:inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF5C1A]" />
              <span>Resume Forge</span>
            </button>
          )}

          {/* Primary: Sign In / User Profile */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <button
                onClick={() => setActiveSidebarTab('profile')}
                className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-[#121317] hover:bg-[#1A1B20] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer"
                title="Candidate Profile"
              >
                <div className="w-6 h-6 rounded-full bg-[#FF5C1A]/15 border border-[#FF5C1A]/40 text-[#FF5C1A] flex items-center justify-center text-[10px] font-bold font-mono">
                  {user.profile?.name ? user.profile.name.slice(0, 2).toUpperCase() : 'PS'}
                </div>
                <span className="text-xs font-medium text-[#EDEDED] hidden xl:inline">
                  {user.profile?.name || 'Priya Sharma'}
                </span>
              </button>
              <button
                onClick={() => clearAuth()}
                className="w-9 h-9 rounded-lg bg-[#121317] hover:bg-[#EF4444]/15 border border-[rgba(255,255,255,0.08)] hover:border-[#EF4444]/30 text-[#6B7280] hover:text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="h-9 px-4 rounded-lg bg-[#FF5C1A] hover:bg-[#E04006] text-white text-xs font-semibold shadow-md shadow-[#FF5C1A]/20 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
