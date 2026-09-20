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
  code: string;
  items: {
    id: ActiveSidebarTab;
    label: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    name: 'PRIMARY',
    code: '01',
    items: [
      { id: 'dashboard', label: 'OFFICE', icon: Bot },
      { id: 'career-health', label: 'OVERVIEW', icon: Activity },
      { id: 'job-matches', label: 'JOBS', icon: Briefcase },
      { id: 'new-cv', label: 'RESUME', icon: FileText },
      { id: 'skill-gaps', label: 'SKILLS', icon: Target },
      { id: 'application-tracker', label: 'TRACKER', icon: Layers },
    ],
  },
  {
    name: 'BUILD',
    code: '02',
    items: [
      { id: 'interview-prep', label: 'INTERVIEW', icon: MessageSquare },
      { id: 'recommended-programs', label: 'LEARNING', icon: GraduationCap },
      { id: 'profile', label: 'PROFILE', icon: User },
    ],
  },
  {
    name: 'VERIFY',
    code: '03',
    items: [
      { id: 'career-passport', label: 'PASSPORT', icon: Award },
      { id: 'my-outcome', label: 'OUTCOMES', icon: ShieldCheck },
      { id: 'linkedin-integration', label: 'NETWORK', icon: Linkedin },
    ],
  },
  {
    name: 'SYSTEM',
    code: '04',
    items: [
      { id: 'system-logs', label: 'LOGS', icon: Terminal, badge: 'LIVE' },
      { id: 'settings', label: 'SETTINGS', icon: Settings },
    ],
  },
];

export const AppSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { 
    activeSidebarTab, 
    setActiveSidebarTab, 
    setBYOKOpen, 
    setAnalyticsDashboardOpen,
    skillProfile,
    setSkillProfile,
  } = useUiStore();
  const { navigate } = useRouter();
  const [demoActive, setDemoActive] = useState(isDemoMode());

  const handleToggleDemo = () => {
    if (demoActive) {
      clearDemoData();
      setDemoActive(false);
    } else {
      loadDemoData();
      setDemoActive(true);
      // Ensure local state reflects demo profile
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('trainee_profile_data');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.skills) {
              const skills: string[] = Array.isArray(parsed.skills) ? parsed.skills : [];
              setSkillProfile({
                jd_role_title: 'Full Stack Engineer',
                jd_seniority: 'Senior',
                jd_required_skills: skills.slice(0, 6),
                jd_nice_to_have_skills: skills.slice(6, 10),
                candidate_skills: skills.map((s: string) => ({ skill: s, demonstrated: true })),
                candidate_experience_summary: {
                  level: 'Senior',
                  years: 4,
                  domains: ['Full Stack Development', 'Distributed Systems'],
                },
                match_pct: 94,
                matched_required: skills.slice(0, 5),
              });
            }
          } catch {}
        }
      }
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Item numbering across all groups
  let itemCounter = 0;

  return (
    <aside
      className={`h-screen flex flex-col shrink-0 z-40 transition-all duration-200 select-none ${
        isCollapsed ? 'w-18' : 'w-[240px]'
      }`}
      style={{
        backgroundColor: '#EFE7D8',
        borderRight: '2px solid #111111',
      }}
      role="navigation"
      aria-label="Main Navigation"
    >
      {/* ── Brand / Toggle Header ─────────────────────────────── */}
      <div
        className="h-16 px-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '2px solid #111111' }}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            {/* Bauhaus geometric logo mark */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" fill="#E53935" />
                <polygon points="14,6 22,22 6,22" fill="#F4C430" />
                <rect x="10" y="10" width="8" height="8" fill="#2457A6" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span
                className="text-[14px] font-bold tracking-[0.06em] uppercase"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#111111' }}
              >
                NEXIS
              </span>
              <span
                className="text-[9px] tracking-[0.12em] uppercase font-mono font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#7A7A7A' }}
              >
                CAREER INTELLIGENCE
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="#E53935" />
              <polygon points="14,6 22,22 6,22" fill="#F4C430" />
              <rect x="10" y="10" width="8" height="8" fill="#2457A6" />
            </svg>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 flex items-center justify-center transition-all hover:bg-white border border-transparent hover:border-[#111111] cursor-pointer"
          style={{ color: '#111111' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Navigation Groups ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col mt-4 first:mt-2">
            {/* Group header */}
            {!isCollapsed && (
              <div
                className="px-4 mb-1 flex items-center gap-2"
              >
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: '#7A7A7A',
                  }}
                >
                  {group.code}
                </span>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: '#7A7A7A',
                  }}
                >
                  {group.name}
                </span>
                <div className="flex-1 h-[1px]" style={{ backgroundColor: '#C8C0B4' }} />
              </div>
            )}

            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                itemCounter++;
                const num = String(itemCounter).padStart(2, '0');
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
                    className={`relative flex items-center h-10 w-full text-left transition-all duration-100 cursor-pointer overflow-hidden ${
                      isActive ? 'border-2 border-[#111111] shadow-[2px_2px_0px_#111111]' : 'border border-transparent hover:border-[#111111] hover:bg-[#FFFFFF]'
                    }`}
                    style={{
                      backgroundColor: isActive ? '#111111' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#111111',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      borderRadius: '0px',
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Active Bauhaus Red geometric marker */}
                    {isActive && (
                      <span
                        className="w-2 h-2 shrink-0 mr-2.5"
                        style={{ backgroundColor: '#E53935' }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Number */}
                    {!isCollapsed && (
                      <span
                        className="shrink-0 w-6"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isActive ? '#E53935' : '#7A7A7A',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {num}
                      </span>
                    )}

                    <div className="shrink-0" style={{ color: isActive ? '#FFFFFF' : '#111111' }}>
                      <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                    </div>

                    {!isCollapsed && (
                      <span
                        className="ml-2.5 truncate flex-1"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 600,
                          letterSpacing: '0.06em',
                          color: isActive ? '#FFFFFF' : '#111111',
                        }}
                      >
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className="px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.08em] uppercase"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          backgroundColor: '#E53935',
                          color: '#FFFFFF',
                          border: '1px solid #111111',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Utilities ─────────────────────────────────────────── */}
        <div className="flex flex-col mt-6 pt-3 px-2" style={{ borderTop: '2px solid #111111' }}>
          {!isCollapsed && (
            <span
              className="px-3 mb-2"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#7A7A7A',
              }}
            >
              UTILITIES
            </span>
          )}
          <div className="space-y-0.5">
            <button
              onClick={() => setAnalyticsDashboardOpen(true)}
              className="flex items-center h-9 w-full text-left transition-all cursor-pointer hover:bg-white border-2 border-transparent hover:border-[#111111]"
              style={{
                paddingLeft: '10px',
                paddingRight: '10px',
                color: '#111111',
              }}
              title={isCollapsed ? 'System Analytics' : undefined}
            >
              <BarChart3 size={16} strokeWidth={1.8} style={{ color: '#2457A6' }} />
              {!isCollapsed && (
                <span
                  className="ml-2.5 truncate flex-1"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}
                >
                  ANALYTICS
                </span>
              )}
            </button>
            <button
              onClick={() => setBYOKOpen(true)}
              className="flex items-center h-9 w-full text-left transition-all cursor-pointer hover:bg-white border-2 border-transparent hover:border-[#111111]"
              style={{
                paddingLeft: '10px',
                paddingRight: '10px',
                color: '#111111',
              }}
              title={isCollapsed ? 'AI Vault & BYOK' : undefined}
            >
              <KeyRound size={16} strokeWidth={1.8} style={{ color: '#E53935' }} />
              {!isCollapsed && (
                <span
                  className="ml-2.5 truncate flex-1"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}
                >
                  AI VAULT
                </span>
              )}
            </button>
            <button
              onClick={handleToggleDemo}
              className="flex items-center h-9 w-full text-left transition-all cursor-pointer border-2"
              style={{
                paddingLeft: '10px',
                paddingRight: '10px',
                color: '#111111',
                backgroundColor: demoActive ? '#F4C430' : 'transparent',
                borderColor: demoActive ? '#111111' : 'transparent',
                boxShadow: demoActive ? '2px 2px 0px #111111' : 'none',
              }}
              title={isCollapsed ? (demoActive ? 'Reset Demo' : 'Load Demo Data') : undefined}
            >
              <Sparkles size={16} strokeWidth={1.8} style={{ color: '#111111' }} />
              {!isCollapsed && (
                <span
                  className="ml-2.5 truncate flex-1"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  {demoActive ? 'DEMO ACTIVE' : 'LOAD DEMO'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom User Card ──────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderTop: '2px solid #111111' }}>
        {!isCollapsed ? (
          <div
            className="p-2.5 flex items-center justify-between bg-white border-2 border-[#111111] shadow-[3px_3px_0px_#111111]"
          >
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer text-left min-w-0"
            >
              <div
                className="w-8 h-8 flex items-center justify-center text-[11px] font-bold shrink-0 border border-[#111111]"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundColor: '#E53935',
                  color: '#FFFFFF',
                }}
              >
                NX
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="truncate"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#111111',
                    letterSpacing: '0.04em',
                  }}
                >
                  TRAINEE OS
                </span>
                <span
                  className="flex items-center gap-1.5"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#2457A6',
                    letterSpacing: '0.08em',
                  }}
                >
                  <span className="w-1.5 h-1.5 bg-[#2457A6]" style={{ borderRadius: '0' }} />
                  VERIFIED
                </span>
              </div>
            </button>

            <button
              onClick={handleFullscreen}
              className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#F5F0E6] border border-transparent hover:border-[#111111] cursor-pointer"
              style={{ color: '#111111' }}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className="w-8 h-8 flex items-center justify-center text-[11px] font-bold border-2 border-[#111111] shadow-[2px_2px_0px_#111111]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: '#E53935',
                color: '#FFFFFF',
              }}
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

export default AppSidebar;
