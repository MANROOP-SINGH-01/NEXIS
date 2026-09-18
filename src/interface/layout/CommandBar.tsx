import React, { useState, useEffect } from 'react';
import { Search, Command, Briefcase, FileText, Target, GraduationCap, Bot, Sparkles, X, ArrowRight } from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { ActiveSidebarTab } from '../../types';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Agents';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandBar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { setActiveSidebarTab, setBYOKOpen } = useUiStore();
  const { setResumeForgeOpen, setNexusHunterOpen, setNexusMirrorOpen } = useCoreStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // If parent is listening, could toggle; here we respect onClose
        }
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
      id: 'nav-dashboard',
      title: 'Go to 3D Agent Command Center',
      category: 'Navigation',
      icon: <Bot className="w-4 h-4 text-indigo-400" />,
      action: () => navigateTo('dashboard'),
    },
    {
      id: 'nav-skills',
      title: 'Analyze Skill Gaps & Radar',
      category: 'Navigation',
      icon: <Target className="w-4 h-4 text-emerald-400" />,
      action: () => navigateTo('skill-gaps'),
    },
    {
      id: 'nav-jobs',
      title: 'View Matched Opportunities & Radar',
      category: 'Navigation',
      icon: <Briefcase className="w-4 h-4 text-cyan-400" />,
      action: () => navigateTo('job-matches'),
    },
    {
      id: 'nav-programs',
      title: 'Recommended Up-skilling Roadmaps',
      category: 'Navigation',
      icon: <GraduationCap className="w-4 h-4 text-amber-400" />,
      action: () => navigateTo('recommended-programs'),
    },
    {
      id: 'nav-cv',
      title: 'Open Real-time Resume Builder',
      category: 'Navigation',
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      action: () => navigateTo('new-cv'),
    },
    {
      id: 'action-resume-forge',
      title: 'Launch Resume Forge Optimization Modal',
      category: 'Actions',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setResumeForgeOpen(true);
        onClose();
      },
    },
    {
      id: 'action-nexus-hunter',
      title: 'Launch Nexus Job Hunter Agent',
      category: 'Agents',
      icon: <Briefcase className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setNexusHunterOpen(true);
        onClose();
      },
    },
    {
      id: 'action-nexus-mirror',
      title: 'Launch Nexus Mirror Self-Audit',
      category: 'Agents',
      icon: <Target className="w-4 h-4 text-rose-400" />,
      action: () => {
        setNexusMirrorOpen(true);
        onClose();
      },
    },
    {
      id: 'action-byok',
      title: 'Configure AI Provider API Keys (BYOK)',
      category: 'Actions',
      icon: <Command className="w-4 h-4 text-zinc-400" />,
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
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-xl bg-[#12131c] border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-900/40">
          <Search className="w-5 h-5 text-indigo-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search commands, navigate sections, trigger agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-zinc-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="group w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-600/10 hover:border-indigo-500/20 text-left transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 group-hover:border-indigo-500/30 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">↑↓</kbd> Navigate
            </span>
          </div>
          <span className="text-indigo-400/80 font-mono font-medium">NEXIS Command Center</span>
        </div>
      </div>
    </div>
  );
};
