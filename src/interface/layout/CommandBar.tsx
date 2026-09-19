import React, { useState, useEffect } from 'react';
import { Search, Command, Briefcase, FileText, Target, GraduationCap, Bot, Sparkles, X, ArrowRight, ShieldCheck, Activity, Award, Settings } from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { ActiveSidebarTab } from '../../types';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Agents' | 'Governance';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandBar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { setActiveSidebarTab, setBYOKOpen, setAnalyticsDashboardOpen } = useUiStore();
  const { setResumeForgeOpen, setNexusHunterOpen, setNexusMirrorOpen } = useCoreStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (tab: ActiveSidebarTab) => {
    setActiveSidebarTab(tab);
    onClose();
  };

  const commandItems: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Analytics Overview & Career Health',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => navigateTo('career-health'),
    },
    {
      id: 'nav-jobs',
      title: 'Job Intelligence & Match Radar',
      category: 'Navigation',
      icon: <Briefcase className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => navigateTo('job-matches'),
    },
    {
      id: 'nav-skills',
      title: 'Analyze Skill Gaps (O*NET Benchmark)',
      category: 'Navigation',
      icon: <Target className="w-4 h-4 text-[#10B981]" />,
      action: () => navigateTo('skill-gaps'),
    },
    {
      id: 'nav-programs',
      title: 'Learning Paths (SWAYAM & NPTEL)',
      category: 'Navigation',
      icon: <GraduationCap className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => navigateTo('recommended-programs'),
    },
    {
      id: 'nav-cv',
      title: 'Resume Forge & ATS Optimizer',
      category: 'Navigation',
      icon: <FileText className="w-4 h-4 text-[#3B82F6]" />,
      action: () => navigateTo('new-cv'),
    },
    {
      id: 'nav-interview',
      title: 'Interview Studio & Cognitive Prep',
      category: 'Navigation',
      icon: <Target className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => navigateTo('interview-prep'),
    },
    {
      id: 'nav-passport',
      title: 'Career Passport (AST Code Proof)',
      category: 'Navigation',
      icon: <ShieldCheck className="w-4 h-4 text-[#10B981]" />,
      action: () => navigateTo('career-passport'),
    },
    {
      id: 'nav-dashboard',
      title: '3D Agent Office Simulation',
      category: 'Navigation',
      icon: <Bot className="w-4 h-4 text-[#8B949E]" />,
      action: () => navigateTo('dashboard'),
    },
    {
      id: 'nav-settings',
      title: 'System Settings & DPDP Privacy',
      category: 'Governance',
      icon: <Settings className="w-4 h-4 text-[#8B949E]" />,
      action: () => navigateTo('settings'),
    },
    {
      id: 'action-resume-forge',
      title: 'Launch Resume Forge Modal',
      category: 'Actions',
      icon: <Sparkles className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => {
        setResumeForgeOpen(true);
        onClose();
      },
    },
    {
      id: 'action-nexus-mirror',
      title: 'Launch Nexus Mirror Verbal Simulator',
      category: 'Agents',
      icon: <Target className="w-4 h-4 text-[#FF5C1A]" />,
      action: () => {
        setNexusMirrorOpen(true);
        onClose();
      },
    },
    {
      id: 'action-byok',
      title: 'Configure AI Provider API Keys (BYOK)',
      category: 'Actions',
      icon: <Command className="w-4 h-4 text-[#8B949E]" />,
      action: () => {
        setBYOKOpen(true);
        onClose();
      },
    },
  ];

  const filteredItems = commandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-xl bg-[#121317] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col text-[#EDEDED]">
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/8 bg-[#121317]">
          <Search className="w-5 h-5 text-[#FF5C1A] mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search commands, navigate modules, launch agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-[#EDEDED] font-medium placeholder-[#8B949E]/60 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] font-mono bg-[#1A1B20] text-[#8B949E] px-1.5 py-0.5 rounded border border-white/10 shadow-xs">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[#8B949E] hover:text-[#EDEDED] rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5 custom-scrollbar bg-[#0A0B0E]">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8B949E]">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="group w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#121317] border border-white/8 group-hover:border-[#FF5C1A]/40 group-hover:bg-[#FF5C1A]/10 shrink-0 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#EDEDED] group-hover:text-[#FF5C1A] transition-colors">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8B949E]/40 group-hover:text-[#FF5C1A] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#121317] border-t border-white/8 flex items-center justify-between text-[11px] text-[#8B949E]">
          <div className="flex items-center gap-3 font-medium">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1A1B20] border border-white/10 text-[#EDEDED] font-mono text-[10px] shadow-xs">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1A1B20] border border-white/10 text-[#EDEDED] font-mono text-[10px] shadow-xs">↑↓</kbd> Navigate
            </span>
          </div>
          <span className="text-[#FF5C1A] font-mono font-bold">NEXIS Command Center</span>
        </div>
      </div>
    </div>
  );
};
