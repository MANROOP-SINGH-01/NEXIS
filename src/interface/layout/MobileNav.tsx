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

  const mainTabs: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Command', icon: <LayoutDashboard size={20} /> },
    { id: 'career-health', label: 'Overview', icon: <Activity size={20} /> },
    { id: 'job-matches', label: 'Jobs', icon: <Briefcase size={20} /> },
    { id: 'new-cv', label: 'Resume', icon: <FileText size={20} /> },
  ];

  const secondaryTabs: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'skill-gaps', label: 'Skill Intelligence', icon: <Target size={18} /> },
    { id: 'recommended-programs', label: 'Learning Paths', icon: <GraduationCap size={18} /> },
    { id: 'interview-prep', label: 'Interview Studio', icon: <MessageSquare size={18} /> },
    { id: 'application-tracker', label: 'Applications', icon: <Briefcase size={18} /> },
    { id: 'career-passport', label: 'Career Passport', icon: <ShieldCheck size={18} /> },
    { id: 'my-outcome', label: 'Outcome Proof', icon: <Award size={18} /> },
    { id: 'linkedin-integration', label: 'LinkedIn Sync', icon: <Linkedin size={18} /> },
    { id: 'settings', label: 'Settings & Privacy', icon: <Settings size={18} /> },
  ];

  return (
    <>
      {/* Drawer for extra navigation options */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-[#121317] border-t border-white/10 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[70vh] overflow-y-auto custom-scrollbar text-[#EDEDED]">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <span className="text-sm font-bold text-[#EDEDED]">
                All Modules & Capabilities
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-[#8B949E] hover:text-[#EDEDED] cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-4">
              {secondaryTabs.map((tab) => {
                const isActive = activeSidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveSidebarTab(tab.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#FF5C1A]/15 border-[#FF5C1A]/30 text-[#FF5C1A]'
                        : 'bg-[#1A1B20] border-white/8 text-[#EDEDED] hover:bg-white/5'
                    }`}
                  >
                    <span className={isActive ? 'text-[#FF5C1A]' : 'text-[#8B949E]'}>{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating/Docked Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0D0E13]/95 backdrop-blur-xl border-t border-white/8 px-2 flex items-center justify-around z-40">
        {mainTabs.map((tab) => {
          const isActive = activeSidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
                isActive ? 'text-[#FF5C1A] font-semibold' : 'text-[#8B949E] hover:text-[#EDEDED]'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF5C1A] rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            drawerOpen ? 'text-[#FF5C1A]' : 'text-[#8B949E] hover:text-[#EDEDED]'
          }`}
        >
          <Menu size={20} />
          <span className="text-[10px] tracking-tight mt-1 font-semibold">More</span>
        </button>
      </nav>
    </>
  );
};
