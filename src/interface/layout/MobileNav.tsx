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
  Activity
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';

export const MobileNav: React.FC = () => {
  const { activeSidebarTab, setActiveSidebarTab } = useUiStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Command', icon: <LayoutDashboard size={20} /> },
    { id: 'skill-gaps', label: 'Skills', icon: <Target size={20} /> },
    { id: 'job-matches', label: 'Jobs', icon: <Briefcase size={20} /> },
    { id: 'new-cv', label: 'Resume', icon: <FileText size={20} /> },
  ];

  const secondaryTabs: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'career-health', label: 'Career Health', icon: <Activity size={18} /> },
    { id: 'recommended-programs', label: 'Roadmap Programs', icon: <GraduationCap size={18} /> },
    { id: 'interview-prep', label: 'Interview Prep', icon: <MessageSquare size={18} /> },
    { id: 'application-tracker', label: 'Application Tracker', icon: <Briefcase size={18} /> },
    { id: 'career-passport', label: 'Career Passport', icon: <ShieldCheck size={18} /> },
    { id: 'my-outcome', label: 'My Outcome', icon: <Award size={18} /> },
    { id: 'linkedin-integration', label: 'LinkedIn Sync', icon: <Linkedin size={18} /> },
  ];

  return (
    <>
      {/* Drawer for extra navigation options */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-[#12131c] border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <span className="text-sm font-semibold text-zinc-100 font-['Space_Grotesk']">
                All Capabilities
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
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
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-indigo-400">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating/Docked Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0c0d14]/95 backdrop-blur-2xl border-t border-zinc-800/80 px-2 flex items-center justify-around z-40">
        {mainTabs.map((tab) => {
          const isActive = activeSidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.id === 'dashboard' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            drawerOpen ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Menu size={20} />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
