import React, { useState, useEffect } from 'react';
import {
  Search,
  Command,
  Briefcase,
  FileText,
  Target,
  GraduationCap,
  Bot,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  Activity,
  Settings,
  Layers,
  Award,
  AlertTriangle,
  Linkedin,
  Terminal,
  ScanSearch,
  Database,
  CheckSquare
} from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { ActiveSidebarTab } from '../../types';
import { useRouter, TAB_TO_PATH } from '../../router';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Agents' | 'Governance';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandBar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { navigate } = useRouter();
  const {
    setActiveSidebarTab,
    setBYOKOpen,
    setAnalyticsDashboardOpen,
    setAgentReviewQueueOpen,
    setDedupReviewOpen,
  } = useUiStore();
  const { setResumeForgeOpen, setNexusMirrorOpen } = useCoreStore();

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
    navigate(TAB_TO_PATH[tab] || '/dashboard');
    onClose();
  };

  const commandItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Career Overview & Real Indicators',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4 text-[#E53935]" />,
      action: () => navigateTo('dashboard'),
    },
    {
      id: 'nav-workspace',
      title: '3D Agent Office Simulation (Spatial Workers)',
      category: 'Navigation',
      icon: <Bot className="w-4 h-4 text-[#111111]" />,
      action: () => navigateTo('agent-workspace'),
    },
    {
      id: 'nav-jobs',
      title: 'Job Intelligence & Match Radar',
      category: 'Navigation',
      icon: <Briefcase className="w-4 h-4 text-[#2457A6]" />,
      action: () => navigateTo('job-matches'),
    },
    {
      id: 'nav-cv',
      title: 'Resume Forge & ATS Optimizer',
      category: 'Navigation',
      icon: <FileText className="w-4 h-4 text-[#2457A6]" />,
      action: () => navigateTo('new-cv'),
    },
    {
      id: 'nav-skills',
      title: 'Analyze Skill Gaps (O*NET Benchmark)',
      category: 'Navigation',
      icon: <Target className="w-4 h-4 text-[#2E7D32]" />,
      action: () => navigateTo('skill-gaps'),
    },
    {
      id: 'nav-programs',
      title: 'Learning Paths (SWAYAM & NPTEL)',
      category: 'Navigation',
      icon: <GraduationCap className="w-4 h-4 text-[#F4C430]" />,
      action: () => navigateTo('recommended-programs'),
    },
    {
      id: 'nav-interview',
      title: 'Interview Studio & Cognitive Prep',
      category: 'Navigation',
      icon: <Target className="w-4 h-4 text-[#E53935]" />,
      action: () => navigateTo('interview-prep'),
    },
    {
      id: 'nav-passport',
      title: 'Career Passport (AST Code Proof)',
      category: 'Navigation',
      icon: <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />,
      action: () => navigateTo('career-passport'),
    },
    {
      id: 'nav-outcomes',
      title: 'Longitudinal Outcomes & Milestone Timeline',
      category: 'Navigation',
      icon: <Award className="w-4 h-4 text-[#2E7D32]" />,
      action: () => navigateTo('my-outcome'),
    },
    {
      id: 'nav-interventions',
      title: 'Remedial Interventions & Officer Review Gate',
      category: 'Governance',
      icon: <AlertTriangle className="w-4 h-4 text-[#E53935]" />,
      action: () => navigateTo('interventions'),
    },
    {
      id: 'nav-tracker',
      title: 'Application Tracker & Pipelines',
      category: 'Navigation',
      icon: <Layers className="w-4 h-4 text-[#555555]" />,
      action: () => navigateTo('application-tracker'),
    },
    {
      id: 'nav-network',
      title: 'Professional Network & LinkedIn Matching',
      category: 'Navigation',
      icon: <Linkedin className="w-4 h-4 text-[#2457A6]" />,
      action: () => navigateTo('linkedin-integration'),
    },
    {
      id: 'nav-overview',
      title: 'Analytics Overview & Career Health',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4 text-[#E53935]" />,
      action: () => navigateTo('career-health'),
    },
    {
      id: 'nav-logs',
      title: 'System Audit Logs & Security Trace',
      category: 'Governance',
      icon: <Terminal className="w-4 h-4 text-[#111111]" />,
      action: () => navigateTo('system-logs'),
    },
    {
      id: 'nav-settings',
      title: 'System Settings & DPDP Privacy',
      category: 'Governance',
      icon: <Settings className="w-4 h-4 text-[#555555]" />,
      action: () => navigateTo('settings'),
    },
    {
      id: 'action-agent-review-queue',
      title: 'Agent Review Queue (Section 15.5 Kanban)',
      category: 'Governance',
      icon: <CheckSquare className="w-4 h-4 text-[#D97706]" />,
      action: () => {
        setAgentReviewQueueOpen(true);
        onClose();
      },
    },
    {
      id: 'action-dedup',
      title: 'Trainee Deduplication Console (Splink Fellegi-Sunter)',
      category: 'Governance',
      icon: <ScanSearch className="w-4 h-4 text-[#2457A6]" />,
      action: () => {
        setDedupReviewOpen(true);
        onClose();
      },
    },
    {
      id: 'action-data-quality',
      title: 'Data Quality & Anomaly Detection Console',
      category: 'Governance',
      icon: <Database className="w-4 h-4 text-[#E53935]" />,
      action: () => {
        navigate('/data-quality');
        onClose();
      },
    },
    {
      id: 'action-resume-forge',
      title: 'Launch Resume Forge Modal',
      category: 'Actions',
      icon: <Sparkles className="w-4 h-4 text-[#E53935]" />,
      action: () => {
        setResumeForgeOpen(true);
        onClose();
      },
    },
    {
      id: 'action-nexus-mirror',
      title: 'Launch Nexus Mirror Verbal Simulator',
      category: 'Agents',
      icon: <Target className="w-4 h-4 text-[#E53935]" />,
      action: () => {
        setNexusMirrorOpen(true);
        onClose();
      },
    },
    {
      id: 'action-byok',
      title: 'Configure AI Provider API Keys (BYOK)',
      category: 'Actions',
      icon: <Command className="w-4 h-4 text-[#111111]" />,
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111111]/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div
        className="relative w-full max-w-xl shadow-[8px_8px_0px_#111111] overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col"
        style={{
          backgroundColor: '#F5F0E6',
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        {/* Search header */}
        <div
          className="flex items-center px-4 py-3.5 bg-[#FFFFFF]"
          style={{ borderBottom: '2px solid #111111' }}
        >
          <Search className="w-5 h-5 text-[#E53935] mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search commands, navigate modules, launch agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-[#111111] font-medium placeholder-[#888888] focus:outline-none"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
          <div className="flex items-center gap-2 ml-2">
            <span
              className="text-[10px] font-mono px-2 py-0.5"
              style={{
                backgroundColor: '#F5F0E6',
                border: '1px solid #111111',
                color: '#111111',
                fontWeight: 600,
              }}
            >
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[#555555] hover:text-[#111111] hover:bg-[#EFE7D8] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div
          className="max-h-80 overflow-y-auto p-2 divide-y divide-[#D5CFC5] custom-scrollbar"
          style={{ backgroundColor: '#F5F0E6' }}
        >
          {filteredItems.length === 0 ? (
            <div
              className="py-8 text-center text-xs text-[#7A7A7A] uppercase tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="group w-full flex items-center justify-between p-3 text-left transition-all duration-100 cursor-pointer hover:bg-[#FFFFFF]"
                style={{ borderRadius: '0px' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 shrink-0 transition-colors"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #111111',
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold text-[#111111] group-hover:text-[#E53935] transition-colors"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {item.title}
                    </p>
                    <span
                      className="text-[9px] uppercase tracking-wider font-semibold"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: '#7A7A7A',
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#7A7A7A] group-hover:text-[#E53935] group-hover:translate-x-1 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          className="px-4 py-2.5 flex items-center justify-between text-[11px] bg-[#EFE7D8]"
          style={{ borderTop: '2px solid #111111' }}
        >
          <div className="flex items-center gap-3 font-medium text-[#555555]">
            <span>
              <kbd
                className="px-1.5 py-0.5 font-mono text-[10px]"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #111111', color: '#111111' }}
              >
                ↵
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd
                className="px-1.5 py-0.5 font-mono text-[10px]"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #111111', color: '#111111' }}
              >
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#E53935' }}
          >
            NEXIS Command Center
          </span>
        </div>
      </div>
    </div>
  );
};
