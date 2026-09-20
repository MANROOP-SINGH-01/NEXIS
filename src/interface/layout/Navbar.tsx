import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  User,
  ChevronDown,
  CheckCircle2,
  Sliders
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
  const { agentStatuses, workHistoryProfile } = useCoreStore();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileDropdownOpen]);

  const workingAgentsCount = Object.values(agentStatuses || {}).filter(
    (s) => s === 'working' || s === 'talking'
  ).length;

  // Segmented Pill Navigation Tabs — Bauhaus numbered
  const TOP_NAV_TABS: { id: ActiveSidebarTab; label: string; code: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'OFFICE', code: '01', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'career-health', label: 'OVERVIEW', code: '02', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'job-matches', label: 'JOBS', code: '03', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'new-cv', label: 'RESUME', code: '04', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'skill-gaps', label: 'SKILLS', code: '05', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'application-tracker', label: 'TRACKER', code: '06', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <header
      className="h-14 px-3 sm:px-6 flex items-center justify-between z-40 shrink-0 select-none overflow-visible min-w-0 max-w-full gap-2 relative"
      style={{
        backgroundColor: '#F5F0E6',
        borderBottom: '2px solid #111111',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* 1. Left Zone: Brand Identity */}
      <div className="flex items-center shrink-0">
        <div 
          onClick={() => setActiveSidebarTab('dashboard')} 
          className="flex items-center gap-2.5 cursor-pointer group"
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
              <span
                className="text-[9px] px-1.5 py-0.5 font-bold tracking-[0.1em] uppercase"
                style={{
                  backgroundColor: '#111111',
                  color: '#F5F0E6',
                }}
              >
                01 / OFFICE
              </span>
            </div>
            <span className="text-[9px] font-bold tracking-[0.12em] text-[#7A7A7A] uppercase leading-none mt-1">
              CAREER INTELLIGENCE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center Zone: Bauhaus segmented navigation */}
      <div className="hidden 2xl:flex items-center justify-center min-w-0 mx-4">
        <div
          className="inline-flex items-center gap-0"
          style={{ border: '2px solid #111111' }}
        >
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
                title={tab.label}
                className="flex items-center gap-1.5 cursor-pointer transition-all duration-100 whitespace-nowrap shrink-0"
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.06em',
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundColor: isActive ? '#111111' : 'transparent',
                  color: isActive ? '#F5F0E6' : '#7A7A7A',
                  borderRight: '1px solid #111111',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: isActive ? '#E53935' : '#C8C0B4',
                    fontWeight: 500,
                  }}
                >
                  {tab.code}
                </span>
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Right Zone */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search */}
        <button
          onClick={onOpenCommandBar}
          className="hidden sm:flex items-center justify-between h-8 px-3 transition-all cursor-pointer"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #C8C0B4',
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            color: '#7A7A7A',
            minWidth: '140px',
          }}
          title="Search or jump to command (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#C8C0B4' }} />
            <span className="truncate hidden md:inline">Search...</span>
          </div>
          <kbd
            className="px-1.5 py-0.5 text-[9px] font-mono shrink-0"
            style={{
              backgroundColor: '#F5F0E6',
              color: '#7A7A7A',
              border: '1px solid #C8C0B4',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Divider */}
        <div className="h-5 w-[2px] bg-[#111111] hidden sm:block" />

        {/* Agent status */}
        <div 
          className="flex items-center gap-2 px-3 h-8 cursor-pointer bg-[#FFFFFF]"
          style={{ border: '1px solid #111111' }}
          title={workingAgentsCount > 0 ? `${workingAgentsCount} Agents Active` : '6 Agents Ready'}
        >
          <span
            className="w-2 h-2 shrink-0"
            style={{
              backgroundColor: workingAgentsCount > 0 ? '#E53935' : '#2E7D32',
            }}
          />
          <span className="text-[11px] font-bold text-[#111111]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AGENTS 06
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: workingAgentsCount > 0 ? '#E53935' : '#2E7D32' }}
          >
            STATUS ●
          </span>
        </div>

        {/* Settings */}
        <button
          onClick={() => setBYOKOpen(true)}
          className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer bg-[#FFFFFF] hover:bg-[#EFE7D8]"
          style={{ border: '1px solid #111111', color: '#111111' }}
          title="AI Vault & Settings"
          aria-label="AI Keys & Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-[2px] bg-[#111111] hidden xl:block" />

        {/* Resume Forge + User */}
        <div className="flex items-center gap-2">
          {onOpenResumeForge && (
            <button
              onClick={onOpenResumeForge}
              className="h-8 px-3.5 text-[11px] font-bold hidden xl:inline-flex items-center gap-2 transition-all cursor-pointer uppercase tracking-[0.06em]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: '#FFFFFF',
                color: '#111111',
                border: '2px solid #111111',
                boxShadow: '2px 2px 0px #111111',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E53935]" />
              <span>FORGE</span>
            </button>
          )}

          {/* Interactive Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {user ? (
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 h-8 px-2.5 transition-all cursor-pointer bg-white hover:bg-[#EFE7D8]"
                style={{
                  border: '2px solid #111111',
                  boxShadow: isProfileDropdownOpen ? 'none' : '2px 2px 0px #111111',
                  transform: isProfileDropdownOpen ? 'translate(1px, 1px)' : 'none',
                }}
                title="Account & Profile Menu"
              >
                <div
                  className="w-5 h-5 flex items-center justify-center text-[9px] font-black text-white"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: '#E53935',
                  }}
                >
                  {user.profile?.name
                    ? user.profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : (workHistoryProfile.candidateName || 'Manroop Singh').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-[#111111] hidden sm:inline uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {user.profile?.name || workHistoryProfile.candidateName || 'Manroop Singh'}
                </span>
                <ChevronDown className={`w-3 h-3 text-[#111111] transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 h-8 px-2.5 transition-all cursor-pointer bg-white hover:bg-[#EFE7D8]"
                  style={{
                    border: '2px solid #111111',
                    boxShadow: isProfileDropdownOpen ? 'none' : '2px 2px 0px #111111',
                  }}
                  title="Profile Menu"
                >
                  <div className="w-5 h-5 bg-[#E53935] flex items-center justify-center text-[9px] font-black text-white">
                    {(workHistoryProfile.candidateName || 'Manroop Singh').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold text-[#111111] hidden sm:inline uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {workHistoryProfile.candidateName || 'Manroop Singh'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-[#111111] transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}

            {/* Dropdown Menu Panel */}
            {isProfileDropdownOpen && (
              <div
                className="absolute right-0 top-10 w-72 bg-white border-2 border-[#111111] shadow-[6px_6px_0px_#111111] z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col font-sans"
              >
                {/* Profile Summary Card */}
                <div className="p-4 bg-[#F5F0E6] border-b-2 border-[#111111]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E53935] border-2 border-[#111111] flex items-center justify-center font-['Space_Grotesk'] font-black text-sm text-white shadow-[2px_2px_0px_#111111]">
                      {((user?.profile?.name || workHistoryProfile.candidateName || 'Manroop Singh').split(' ').map(n => n[0]).join('').slice(0, 2)).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black uppercase text-[#111111] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {user?.profile?.name || workHistoryProfile.candidateName || 'Manroop Singh'}
                      </h4>
                      <p className="text-[10px] font-mono text-[#555555] truncate">
                        {user?.email || 'candidate@nexis.gov.in'}
                      </p>
                      <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-[#2E7D32]/10 border border-[#2E7D32] text-[#2E7D32] text-[9px] font-mono font-bold uppercase">
                        <CheckCircle2 size={10} />
                        <span>VERIFIED • 94% COMPLETE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1 flex flex-col">
                  <button
                    onClick={() => {
                      setActiveSidebarTab('profile');
                      navigate('/profile');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <User size={14} className="text-[#2457A6]" />
                    <span>Candidate Profile & Preferences</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('new-cv');
                      navigate('/resume');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="text-[#E53935]" />
                    <span>Resume Forge & Tailoring</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('job-matches');
                      navigate('/jobs');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Briefcase size={14} className="text-[#F4C430]" />
                    <span>Live Job Radar & Signals</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('application-tracker');
                      navigate('/tracker');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Layers size={14} className="text-[#2457A6]" />
                    <span>Application Pipeline Tracker</span>
                  </button>

                  <button
                    onClick={() => {
                      setBYOKOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Sliders size={14} className="text-[#111111]" />
                    <span>AI Model Vault & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('system-logs');
                      navigate('/system-logs');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Activity size={14} className="text-[#2E7D32]" />
                    <span>System Telemetry & Logs</span>
                  </button>
                </div>

                {/* Footer / Sign Out */}
                <div className="p-2 border-t-2 border-[#111111] bg-[#F5F0E6]">
                  <button
                    onClick={() => {
                      clearAuth();
                      setIsProfileDropdownOpen(false);
                      navigate('/');
                    }}
                    className="w-full py-2 px-3 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-[#111111] flex items-center justify-center gap-2 shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out & Return Home</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
