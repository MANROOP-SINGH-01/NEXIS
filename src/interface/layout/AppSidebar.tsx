/**
 * FILE: src/interface/layout/AppSidebar.tsx
 * PURPOSE: Bauhaus architectural navigation sidebar for NEXIS with bottom-left user profile & popover menu.
 * SPEC: Master Implementation Spec Section 22, 42, 68, 78.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  Target,
  Layers,
  Bot,
  Activity,
  User,
  Settings,
  KeyRound,
  LogOut,
  ChevronUp,
  Maximize2,
  LucideIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';
import { useAuthStore } from '../../integration/store/authStore';
import { useLocale } from '../../i18n';
import { useRouter, TAB_TO_PATH } from '../../router';

interface NavGroup {
  name: string;
  items: {
    id: ActiveSidebarTab;
    labelKey: string;
    fallbackLabel: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

export const AppSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { navigate } = useRouter();
  const { activeSidebarTab, setActiveSidebarTab, setBYOKOpen } = useUiStore();
  const { user, clearAuth } = useAuthStore();
  const { t } = useLocale();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const NAV_GROUPS: NavGroup[] = [
    {
      name: 'OVERVIEW',
      items: [
        { id: 'dashboard', labelKey: 'dashboard', fallbackLabel: 'Career Overview', icon: Activity },
      ],
    },
    {
      name: 'OPPORTUNITIES',
      items: [
        { id: 'job-matches', labelKey: 'jobs', fallbackLabel: 'Live Jobs', icon: Briefcase },
      ],
    },
    {
      name: 'RESUME',
      items: [
        { id: 'new-cv', labelKey: 'resume', fallbackLabel: 'My Resume', icon: FileText },
      ],
    },
    {
      name: 'CAREER',
      items: [
        { id: 'skill-gaps', labelKey: 'skillGaps', fallbackLabel: 'Skill Gaps', icon: Target },
        { id: 'profile', labelKey: 'careerProfile', fallbackLabel: 'Career Profile', icon: User },
      ],
    },
    {
      name: 'APPLICATIONS',
      items: [
        { id: 'application-tracker', labelKey: 'applications', fallbackLabel: 'Applications', icon: Layers },
      ],
    },
    {
      name: 'WORKSPACE',
      items: [
        { id: 'agent-workspace', labelKey: 'agentWorkspace', fallbackLabel: 'Agent Workspace', icon: Bot, badge: '3D' },
      ],
    },
  ];

  const handleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  const candidateName = user?.profile?.name || 'Candidate';
  const candidateInitials = candidateName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } h-screen bg-[#FBF9F5] text-[#111111] flex flex-col shrink-0 select-none border-r-2 border-[#111111] transition-all duration-200 relative z-30 font-sans shadow-[2px_0px_0px_#111111]`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ── 1. Top Brand Header ────────────────────────────────────────── */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b-2 border-[#111111] bg-white shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" fill="#E53935" />
                <polygon points="14,6 22,22 6,22" fill="#FFE600" />
                <rect x="10" y="10" width="8" height="8" fill="#2457A6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] font-black text-sm tracking-widest uppercase leading-none text-[#111111]">
                NEXIS
              </span>
              <span className="text-[9px] font-mono font-bold text-[#666666] uppercase tracking-wider mt-0.5">
                Architecture
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 bg-[#F5F0E6] hover:bg-[#EFE7D8] text-[#111111] border border-[#111111] shadow-[1px_1px_0px_#111111] transition-colors mx-auto cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── 2. Navigation Items ────────────────────────────────────────── */}
      <div className="flex-1 py-3 px-2.5 flex flex-col gap-3.5 overflow-y-auto custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-2 text-[9px] font-mono font-black tracking-widest text-[#777777] uppercase">
                {group.name}
              </span>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeSidebarTab === item.id ||
                (item.id === 'dashboard' && activeSidebarTab === 'career-health');

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSidebarTab(item.id);
                    navigate(TAB_TO_PATH[item.id] || '/dashboard');
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono font-bold uppercase transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#E53935] text-white border-2 border-[#111111] shadow-[3px_3px_0px_#111111] -translate-x-[1px] -translate-y-[1px]'
                      : 'text-[#333333] hover:text-[#111111] hover:bg-white hover:border-2 hover:border-[#111111] hover:shadow-[2px_2px_0px_#111111] border-2 border-transparent'
                  }`}
                  title={isCollapsed ? t(item.labelKey, item.fallbackLabel) : undefined}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 ${
                      isActive ? 'text-white' : 'text-[#444444]'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">
                      {t(item.labelKey, item.fallbackLabel)}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 font-mono font-black border ${
                        isActive
                          ? 'bg-[#FFE600] text-[#111111] border-[#111111]'
                          : 'bg-[#FFE600] text-[#111111] border-[#111111] shadow-[1px_1px_0px_#111111]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── 3. Bottom-Left User Profile & Popover Menu ──────────────────── */}
      <div className="p-2.5 border-t-2 border-[#111111] bg-white relative" ref={profileMenuRef}>
        {/* User Card Button */}
        {!isCollapsed ? (
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center justify-between p-2 bg-[#F5F0E6] hover:bg-[#EFE7D8] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-[#2457A6] border-2 border-[#111111] flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-[1px_1px_0px_#111111]">
                {candidateInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono font-black text-[#111111] truncate leading-tight">
                  {candidateName}
                </p>
                <p className="text-[10px] font-mono text-[#666666] truncate">
                  {user?.phone || '+91 98765 43210'}
                </p>
              </div>
            </div>
            <ChevronUp
              size={14}
              className={`text-[#111111] transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-8 h-8 mx-auto bg-[#2457A6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center font-bold text-xs text-white cursor-pointer"
            title={candidateName}
          >
            {candidateInitials}
          </button>
        )}

        {/* Profile Popover Menu */}
        {isProfileOpen && (
          <div className="absolute bottom-16 left-2.5 w-60 bg-white border-3 border-[#111111] shadow-[6px_6px_0px_#111111] text-[#111111] z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col font-sans">
            <div className="p-3 bg-[#FFE600] border-b-2 border-[#111111] flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-black uppercase truncate text-[#111111]">
                  {candidateName}
                </p>
                <p className="text-[10px] font-mono font-bold text-[#333333] truncate">
                  {user?.phone || 'Candidate Account'}
                </p>
              </div>
              <div className="w-2.5 h-2.5 bg-[#2E7D32] border border-[#111111] shrink-0" title="Active" />
            </div>

            <div className="p-1 flex flex-col text-xs font-mono font-bold">
              <button
                onClick={() => {
                  setActiveSidebarTab('profile');
                  navigate('/profile');
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F0E6] transition-colors text-left cursor-pointer"
              >
                <User size={14} className="text-[#111111]" />
                <span>{t('careerProfile')}</span>
              </button>

              <button
                onClick={() => {
                  setActiveSidebarTab('settings');
                  navigate('/settings');
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F0E6] transition-colors text-left cursor-pointer"
              >
                <Settings size={14} className="text-[#111111]" />
                <span>{t('settings')}</span>
              </button>

              <button
                onClick={() => {
                  setBYOKOpen(true);
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F0E6] transition-colors text-left cursor-pointer"
              >
                <KeyRound size={14} className="text-[#2E7D32]" />
                <span>{t('aiProviders')} (BYOK)</span>
              </button>

              <button
                onClick={() => {
                  handleFullscreen();
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F0E6] transition-colors text-left cursor-pointer border-t border-[#111111]/10"
              >
                <Maximize2 size={14} className="text-[#111111]" />
                <span>Toggle Fullscreen</span>
              </button>

              <button
                onClick={() => {
                  clearAuth();
                  setIsProfileOpen(false);
                  navigate('/login');
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#E53935] hover:text-white transition-colors text-left cursor-pointer text-[#E53935] border-t-2 border-[#111111]"
              >
                <LogOut size={14} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
