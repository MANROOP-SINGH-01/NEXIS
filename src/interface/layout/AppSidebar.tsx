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
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Layers,
  User,
  Terminal,
  LucideIcon,
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';
import { useRouter } from '../../router';
import { useActiveTeam } from '../../integration/store/teamStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useLocale } from '../../integration/hooks/useLocale';
import { isDemoMode, loadDemoData, clearDemoData } from '../../demo/demoData';

interface NavGroup {
  name: string;
  items: {
    id: ActiveSidebarTab;
    label: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    name: 'COMMAND',
    items: [
      { id: 'dashboard', label: '3D Agent Office', icon: Bot },
      { id: 'profile', label: 'Candidate Profile', icon: User },
      { id: 'career-health', label: 'Career Health', icon: Activity },
    ],
  },
  {
    name: 'DISCOVER',
    items: [
      { id: 'job-matches', label: 'Job Intelligence', icon: Briefcase },
      { id: 'skill-gaps', label: 'Skill Intelligence', icon: Target },
      { id: 'recommended-programs', label: 'Learning Paths', icon: GraduationCap },
    ],
  },
  {
    name: 'BUILD',
    items: [
      { id: 'new-cv', label: 'Resume Forge', icon: FileText },
      { id: 'interview-prep', label: 'Interview Studio', icon: MessageSquare },
    ],
  },
  {
    name: 'TRACK',
    items: [
      { id: 'application-tracker', label: 'Applications', icon: Layers },
    ],
  },
  {
    name: 'VERIFY',
    items: [
      { id: 'career-passport', label: 'Career Passport', icon: ShieldCheck },
      { id: 'my-outcome', label: 'Outcome Proof', icon: Award },
      { id: 'linkedin-integration', label: 'LinkedIn Sync', icon: Linkedin },
    ],
  },
  {
    name: 'SYSTEM',
    items: [
      { id: 'system-logs', label: 'Logs & API Health', icon: Terminal, badge: 'LIVE' },
      { id: 'settings', label: 'Settings & Privacy', icon: Settings },
    ],
  },
];

export const AppSidebar: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    activeSidebarTab, 
    setActiveSidebarTab, 
    setBYOKOpen, 
    setAnalyticsDashboardOpen 
  } = useUiStore();
  const { t } = useLocale();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [demoActive, setDemoActive] = useState(isDemoMode());

  const handleToggleDemo = () => {
    if (demoActive) {
      clearDemoData();
      setDemoActive(false);
    } else {
      loadDemoData();
      setDemoActive(true);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <aside
      className={`h-screen bg-[#FBF8F3] border-r border-[#EADFCF] flex flex-col shrink-0 z-40 transition-all duration-300 select-none shadow-[4px_0_24px_rgba(180,150,120,0.05)] ${
        isCollapsed ? 'w-18' : 'w-[250px]'
      }`}
      role="navigation"
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#EADFCF] shrink-0 bg-[#F8F3EC]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F47B20] text-white flex items-center justify-center shadow-md shadow-[#F47B20]/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-[#181512] font-['Space_Grotesk']">
                NEXIS
              </span>
              <span className="text-[10px] font-medium text-[#999084] tracking-wider uppercase">
                CAREER OS
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-xl bg-[#F47B20] text-white flex items-center justify-center shadow-md shadow-[#F47B20]/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-[#999084] hover:text-[#181512] hover:bg-[#EFE7DC] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Cluster Groups */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#999084]">
                {group.name}
              </span>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSidebarTab(item.id);
                    const tabToPathMap: Record<ActiveSidebarTab, string> = {
                      'dashboard': '/dashboard',
                      'profile': '/profile',
                      'job-matches': '/jobs',
                      'skill-gaps': '/skills',
                      'recommended-programs': '/learning',
                      'interview-prep': '/interview',
                      'new-cv': '/resume',
                      'career-health': '/career-health',
                      'application-tracker': '/tracker',
                      'career-passport': '/passport',
                      'my-outcome': '/outcomes',
                      'linkedin-integration': '/network',
                      'system-logs': '/system-logs',
                      'settings': '/settings',
                    };
                    const targetPath = tabToPathMap[item.id] || `/${item.id}`;
                    navigate(targetPath);
                  }}
                  className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#181512] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[#EADFCF] font-bold'
                      : 'text-[#6A6359] hover:text-[#181512] hover:bg-[#F2ECE2] font-medium border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-[#F47B20]' : 'text-[#6A6359] group-hover:text-[#181512]'
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {!isCollapsed && (
                    <span className="text-xs tracking-tight truncate flex-1">
                      {item.label}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#FFF0E4] text-[#F47B20] border border-[#FDCBA7]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* SYSTEM CLUSTER */}
        <div className="flex flex-col gap-1 pt-2 border-t border-[#F0E6D8]">
          {!isCollapsed && (
            <span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#999084]">
              SYSTEM
            </span>
          )}
          <button
            onClick={() => setAnalyticsDashboardOpen(true)}
            className="group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left text-[#6A6359] hover:text-[#181512] hover:bg-[#F2ECE2] font-medium transition-colors cursor-pointer"
            title={isCollapsed ? 'Government Analytics' : undefined}
          >
            <BarChart3 size={17} className="text-[#6A6359] group-hover:text-[#181512]" />
            {!isCollapsed && (
              <span className="text-xs tracking-tight truncate flex-1">
                Gov & System Analytics
              </span>
            )}
          </button>
          <button
            onClick={() => setBYOKOpen(true)}
            className="group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left text-[#6A6359] hover:text-[#181512] hover:bg-[#F2ECE2] font-medium transition-colors cursor-pointer"
            title={isCollapsed ? 'AI Vault & BYOK' : undefined}
          >
            <KeyRound size={17} className="text-[#6A6359] group-hover:text-[#181512]" />
            {!isCollapsed && (
              <span className="text-xs tracking-tight truncate flex-1">
                AI Vault & BYOK
              </span>
            )}
          </button>
          <button
            onClick={handleToggleDemo}
            className={`group flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left font-medium transition-colors cursor-pointer ${
              demoActive ? 'bg-[#FFF0E4] text-[#F47B20] border border-[#FDCBA7]' : 'text-[#6A6359] hover:text-[#181512] hover:bg-[#F2ECE2]'
            }`}
            title={isCollapsed ? (demoActive ? 'Reset Demo' : 'Load Demo Data') : undefined}
          >
            <Sparkles size={17} className={demoActive ? 'text-[#F47B20]' : 'text-[#6A6359] group-hover:text-[#181512]'} />
            {!isCollapsed && (
              <span className="text-xs tracking-tight truncate flex-1 font-semibold">
                {demoActive ? 'Demo Active (Reset)' : 'Load Demo Dataset'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Profile / Quick Action Footer */}
      <div className="p-3 border-t border-[#EADFCF] bg-[#F8F3EC] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#EFE7DC] transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-full bg-[#FFF0E4] border border-[#FDCBA7] text-[#F47B20] flex items-center justify-center text-xs font-bold shadow-xs">
                NX
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#181512] leading-tight">
                  Trainee OS
                </span>
                <span className="text-[10px] text-[#2E8555] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E8555]" />
                  Verified Ready
                </span>
              </div>
            </button>

            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg text-[#999084] hover:text-[#181512] hover:bg-[#EFE7DC] transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="w-8 h-8 rounded-full bg-[#FFF0E4] border border-[#FDCBA7] text-[#F47B20] flex items-center justify-center text-xs font-bold shadow-xs"
              title="Settings"
            >
              NX
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
