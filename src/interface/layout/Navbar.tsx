/**
 * FILE: src/interface/layout/Navbar.tsx
 * PURPOSE: Clean, distraction-free top header for NEXIS.
 * SPEC: Master Implementation Spec Section 19, 21, 22, 68, 78.
 * RULES:
 * - NO user name in top right (belongs in bottom-left sidebar).
 * - NO duplicate settings button.
 * - NO meaningless "Nexus Connected" status pill.
 * - Global language selector in header.
 */

import React from 'react';
import { 
  Search,
  Activity,
  Briefcase,
  FileText,
  Target,
  Layers,
  Bot,
  Globe
} from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useLocale, Locale } from '../../i18n';
import { ActiveSidebarTab } from '../../types';
import { useRouter, TAB_TO_PATH } from '../../router';

interface NavbarProps {
  onOpenCommandBar: () => void;
  onOpenResumeForge?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandBar }) => {
  const { navigate } = useRouter();
  const { activeSidebarTab, setActiveSidebarTab } = useUiStore();
  const { locale, setLocale, t } = useLocale();

  // Primary Navigation Tabs
  const NAV_TABS: { id: ActiveSidebarTab; label: string; code: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('overview'), code: '01', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'job-matches', label: t('jobs'), code: '02', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'new-cv', label: t('resume'), code: '03', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'skill-gaps', label: t('skills'), code: '04', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'application-tracker', label: t('applications'), code: '05', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'agent-workspace', label: t('agentWorkspace'), code: '06', icon: <Bot className="w-3.5 h-3.5" /> },
  ];

  return (
    <header
      className="h-14 px-3 sm:px-6 flex items-center justify-between z-40 shrink-0 select-none overflow-visible min-w-0 max-w-full gap-2 relative bg-[#F5F0E6] border-b-2 border-[#111111]"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ── 1. Left Zone: Brand Identity ─────────────────────────────────── */}
      <div className="flex items-center shrink-0">
        <div 
          onClick={() => {
            setActiveSidebarTab('dashboard');
            navigate('/dashboard');
          }} 
          className="flex items-center gap-2.5 cursor-pointer group"
          title="NEXIS Career Intelligence"
        >
          {/* Bauhaus geometric mark */}
          <div className="w-7 h-7 flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" fill="#E53935" />
              <polygon points="14,6 22,22 6,22" fill="#F4C430" />
              <rect x="10" y="10" width="8" height="8" fill="#2457A6" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-[14px] tracking-[0.08em] text-[#111111] uppercase leading-none">
                NEXIS
              </span>
              <span className="text-[9px] px-1.5 py-0.5 font-bold tracking-[0.1em] uppercase bg-[#111111] text-[#F5F0E6]">
                Career Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Center Zone: Section Navigation ───────────────────────────── */}
      <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 px-2">
        <div className="flex items-center bg-[#EFE7D8] p-1 border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
          {NAV_TABS.map((tab) => {
            const isActive = activeSidebarTab === tab.id || (tab.id === 'dashboard' && activeSidebarTab === 'career-health');

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSidebarTab(tab.id);
                  navigate(TAB_TO_PATH[tab.id] || '/dashboard');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-[1px_1px_0px_#E53935]'
                    : 'text-[#111111] hover:bg-[#F5F0E6]'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] text-[#888888] font-mono">{tab.code}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Right Zone: Search & Global Language Selector ─────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Command Search (⌘K) */}
        <button
          onClick={onOpenCommandBar}
          className="hidden sm:flex items-center justify-between h-8 px-3 bg-white border border-[#C8C0B4] text-[11px] text-[#7A7A7A] hover:border-[#111111] transition-all cursor-pointer min-w-[140px]"
          title="Search or jump to command (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-[#7A7A7A]" />
            <span className="truncate hidden md:inline">Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#F5F0E6] text-[#7A7A7A] border border-[#C8C0B4]">
            ⌘K
          </kbd>
        </button>

        <div className="h-5 w-[2px] bg-[#111111] hidden sm:block" />

        {/* Global Language Selector */}
        <div className="flex items-center bg-white border border-[#111111] px-2 py-1 shadow-[2px_2px_0px_#111111]">
          <Globe className="w-3.5 h-3.5 text-[#111111] mr-1.5 shrink-0" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="text-xs font-mono font-black text-[#111111] bg-transparent outline-none cursor-pointer"
            aria-label="Change language"
          >
            <option value="en">English (EN)</option>
            <option value="hi">हिन्दी (HI)</option>
            <option value="mr">मराठी (MR)</option>
          </select>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
