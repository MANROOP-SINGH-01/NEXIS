import React, { useState } from 'react';
import {
  Briefcase,
  FileText,
  GraduationCap,
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
      className={`h-screen bg-[#0A0B0E] border-r border-[rgba(255,255,255,0.08)] flex flex-col shrink-0 z-40 transition-all duration-200 select-none ${
        isCollapsed ? 'w-18' : 'w-[240px]'
      }`}
      role="navigation"
      aria-label="Main Navigation"
    >
      {/* Brand / Toggle Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] shrink-0 bg-[#0A0B0E]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF5C1A] text-white flex items-center justify-center shadow-md shadow-[#FF5C1A]/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">
                NEXIS
              </span>
              <span className="text-[10px] font-mono text-[#6B7280] tracking-wider uppercase">
                COMMAND CENTER
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-[#FF5C1A] text-white flex items-center justify-center shadow-md shadow-[#FF5C1A]/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#121317] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Cluster Groups */}
      <div className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col mt-6 first:mt-3">
            {!isCollapsed && (
              <span className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                {group.name}
              </span>
            )}
            <div className="space-y-1">
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
                    className={`relative flex items-center h-10 w-full rounded-xl pl-3 pr-2.5 text-left transition-all duration-150 cursor-pointer overflow-hidden ${
                      isActive
                        ? 'bg-[#1A1B20] text-white font-semibold shadow-xs'
                        : 'text-[#9CA3AF] hover:text-[#EDEDED] hover:bg-[#121317]'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Active Left 2px Orange Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF5C1A]" />
                    )}

                    <div
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-[#FF5C1A]' : 'text-[#6B7280] group-hover:text-white'
                      }`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                    </div>

                    {!isCollapsed && (
                      <span className="ml-3 text-xs tracking-tight truncate flex-1">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#FF5C1A]/15 text-[#FF5C1A] border border-[#FF5C1A]/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* SYSTEM UTILITIES QUICK SHORTCUTS */}
        <div className="flex flex-col mt-6 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          {!isCollapsed && (
            <span className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
              UTILITIES
            </span>
          )}
          <div className="space-y-1">
            <button
              onClick={() => setAnalyticsDashboardOpen(true)}
              className="flex items-center h-10 w-full rounded-xl pl-3 pr-2.5 text-left text-[#9CA3AF] hover:text-[#EDEDED] hover:bg-[#121317] transition-all cursor-pointer"
              title={isCollapsed ? 'System Analytics' : undefined}
            >
              <BarChart3 size={20} strokeWidth={1.75} className="text-[#6B7280]" />
              {!isCollapsed && (
                <span className="ml-3 text-xs tracking-tight truncate flex-1">
                  System Analytics
                </span>
              )}
            </button>
            <button
              onClick={() => setBYOKOpen(true)}
              className="flex items-center h-10 w-full rounded-xl pl-3 pr-2.5 text-left text-[#9CA3AF] hover:text-[#EDEDED] hover:bg-[#121317] transition-all cursor-pointer"
              title={isCollapsed ? 'AI Vault & BYOK' : undefined}
            >
              <KeyRound size={20} strokeWidth={1.75} className="text-[#6B7280]" />
              {!isCollapsed && (
                <span className="ml-3 text-xs tracking-tight truncate flex-1">
                  AI Vault & BYOK
                </span>
              )}
            </button>
            <button
              onClick={handleToggleDemo}
              className={`flex items-center h-10 w-full rounded-xl pl-3 pr-2.5 text-left transition-all cursor-pointer ${
                demoActive ? 'bg-[#FF5C1A]/15 text-[#FF5C1A] border border-[#FF5C1A]/30 font-semibold' : 'text-[#9CA3AF] hover:text-[#EDEDED] hover:bg-[#121317]'
              }`}
              title={isCollapsed ? (demoActive ? 'Reset Demo' : 'Load Demo Data') : undefined}
            >
              <Sparkles size={20} strokeWidth={1.75} className={demoActive ? 'text-[#FF5C1A]' : 'text-[#6B7280]'} />
              {!isCollapsed && (
                <span className="ml-3 text-xs tracking-tight truncate flex-1">
                  {demoActive ? 'Demo Active (Reset)' : 'Load Demo Dataset'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Card in its own bordered container */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#0A0B0E] shrink-0">
        {!isCollapsed ? (
          <div className="p-2 rounded-xl bg-[#121317] border border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer text-left min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1A1B20] border border-[rgba(255,255,255,0.12)] ring-1 ring-white/5 text-[#EDEDED] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                NX
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  Trainee OS
                </span>
                <span className="text-[10px] text-[#22C55E] font-medium flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
                  Verified Ready
                </span>
              </div>
            </button>

            <button
              onClick={handleFullscreen}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#1A1B20] transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="w-8 h-8 rounded-lg bg-[#121317] border border-[rgba(255,255,255,0.08)] text-[#EDEDED] flex items-center justify-center text-xs font-mono font-bold"
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
