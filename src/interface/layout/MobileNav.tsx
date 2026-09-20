import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Briefcase, 
  FileText, 
  Menu, 
  X,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Award,
  Linkedin,
  Activity,
  Settings
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';

export const MobileNav: React.FC = () => {
  const { activeSidebarTab, setActiveSidebarTab } = useUiStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs: { id: ActiveSidebarTab; label: string; code: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'OFFICE', code: '01', icon: <LayoutDashboard size={18} /> },
    { id: 'career-health', label: 'OVERVIEW', code: '02', icon: <Activity size={18} /> },
    { id: 'job-matches', label: 'JOBS', code: '03', icon: <Briefcase size={18} /> },
    { id: 'new-cv', label: 'RESUME', code: '04', icon: <FileText size={18} /> },
  ];

  const secondaryTabs: { id: ActiveSidebarTab; label: string; code: string; icon: React.ReactNode }[] = [
    { id: 'skill-gaps', label: 'SKILL MAP', code: '05', icon: <Target size={16} /> },
    { id: 'recommended-programs', label: 'LEARNING', code: '06', icon: <GraduationCap size={16} /> },
    { id: 'interview-prep', label: 'INTERVIEW', code: '07', icon: <MessageSquare size={16} /> },
    { id: 'application-tracker', label: 'APPLICATIONS', code: '08', icon: <Briefcase size={16} /> },
    { id: 'career-passport', label: 'PASSPORT', code: '09', icon: <ShieldCheck size={16} /> },
    { id: 'my-outcome', label: 'OUTCOMES', code: '10', icon: <Award size={16} /> },
    { id: 'linkedin-integration', label: 'NETWORK', code: '11', icon: <Linkedin size={16} /> },
    { id: 'settings', label: 'SETTINGS', code: '12', icon: <Settings size={16} /> },
  ];

  return (
    <>
      {/* Drawer for extra navigation options */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-[#111111]/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="relative z-10 max-h-[70vh] overflow-y-auto p-5 shadow-[0_-4px_0px_#111111]"
            style={{
              backgroundColor: '#F5F0E6',
              borderTop: '2px solid #111111',
              color: '#111111',
            }}
          >
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid #C8C0B4' }}>
              <span
                className="text-[12px] font-bold uppercase tracking-[0.08em]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ALL MODULES
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 cursor-pointer transition-colors"
                style={{ color: '#7A7A7A' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4">
              {secondaryTabs.map((tab) => {
                const isActive = activeSidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveSidebarTab(tab.id);
                      setDrawerOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 text-left text-[11px] font-semibold transition-all cursor-pointer uppercase tracking-[0.04em]"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: isActive ? '#111111' : '#FFFFFF',
                      color: isActive ? '#F5F0E6' : '#111111',
                      border: isActive ? '2px solid #111111' : '1px solid #C8C0B4',
                    }}
                  >
                    <span
                      className="text-[9px]"
                      style={{ color: isActive ? '#E53935' : '#C8C0B4' }}
                    >
                      {tab.code}
                    </span>
                    <span style={{ color: isActive ? '#F5F0E6' : '#7A7A7A' }}>{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Docked Nav Bar — Bauhaus */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 px-2 flex items-center justify-around z-40"
        style={{
          backgroundColor: '#111111',
          borderTop: '2px solid #111111',
        }}
      >
        {mainTabs.map((tab) => {
          const isActive = activeSidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer"
              style={{
                color: isActive ? '#F5F0E6' : 'rgba(245,240,230,0.4)',
              }}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px]"
                    style={{ backgroundColor: '#E53935' }}
                  />
                )}
              </div>
              <span
                className="mt-1"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '9px',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.08em',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer"
          style={{
            color: drawerOpen ? '#E53935' : 'rgba(245,240,230,0.4)',
          }}
        >
          <Menu size={18} />
          <span
            className="mt-1"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            MORE
          </span>
        </button>
      </nav>
    </>
  );
};
