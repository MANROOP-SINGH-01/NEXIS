/**
 * FILE: src/interface/simulation/WorkQueueNavigator.tsx
 * PURPOSE: Bidirectional navigation bridge from 3D scene into conventional work queues.
 * SPECIFICATION: Master Spec Section 21.1 & 27 (Phase 16).
 * INVARIANT: Never trap a critical workflow inside the 3D scene.
 */

import React from 'react';
import {
  X,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Users,
  BarChart3,
  Search,
  Target,
  FileCode2,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Database,
} from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useRouter } from '../../router';
import { ActiveSidebarTab } from '../../types';

interface WorkQueueNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WorkQueueItem {
  id: string;
  tab: ActiveSidebarTab;
  title: string;
  code: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  badge?: string;
  isModalTrigger?: boolean;
}

export const WorkQueueNavigator: React.FC<WorkQueueNavigatorProps> = ({ isOpen, onClose }) => {
  const {
    setActiveSidebarTab,
    setDedupReviewOpen,
    setAnalyticsDashboardOpen,
  } = useUiStore();

  if (!isOpen) return null;

  const queues: WorkQueueItem[] = [
    {
      id: 'outcomes',
      tab: 'my-outcome',
      code: 'Q-01',
      title: 'Outcome Milestone Tracking',
      description: 'Event-sourced trainee employment, apprenticeship & self-employment longitudinal ledger (T0-T365).',
      icon: TrendingUp,
      accentColor: '#2457A6',
      badge: 'Section 19.1',
    },
    {
      id: 'interventions',
      tab: 'interventions',
      code: 'Q-02',
      title: 'Intervention Approval Gate',
      description: 'Human-in-the-loop review queue for 10-cause root-cause diagnostic interventions.',
      icon: ShieldCheck,
      accentColor: '#E53935',
      badge: 'Section 15.3 Mandatory',
    },
    {
      id: 'dedup',
      tab: 'dashboard',
      code: 'Q-03',
      title: 'Identity Deduplication Review',
      description: 'Splink Fellegi-Sunter probabilistic identity linkage and duplicate cluster resolution panel.',
      icon: Users,
      accentColor: '#7C3AED',
      badge: 'Phase 17 Dedup',
      isModalTrigger: true,
    },
    {
      id: 'analytics',
      tab: 'dashboard',
      code: 'Q-04',
      title: 'District & Provider Analytics',
      description: 'Cohort-adjusted analytics with confidence bands, sample sizes, and non-placement root causes.',
      icon: BarChart3,
      accentColor: '#15803D',
      badge: 'Section 20',
      isModalTrigger: true,
    },
    {
      id: 'jobs',
      tab: 'job-matches',
      code: 'Q-05',
      title: 'Job Market Radar (Adzuna)',
      description: 'Attributed live vacancy radar with 6-weight matching formula and local cluster indexing.',
      icon: Search,
      accentColor: '#C2410C',
      badge: 'Section 18.2',
    },
    {
      id: 'skills',
      tab: 'skill-gaps',
      code: 'Q-06',
      title: 'Skill Gap Intelligence',
      description: 'Traceable gap mining with evidence-strength grounding and stated market denominators.',
      icon: Target,
      accentColor: '#0891B2',
      badge: 'Defect #3 Resolved',
    },
    {
      id: 'logs',
      tab: 'system-logs',
      code: 'Q-07',
      title: 'Audit Logs & Telemetry',
      description: 'Append-only immutable system event log, actor provenance, and platform telemetry.',
      icon: FileCode2,
      accentColor: '#111111',
      badge: 'Section 22.4',
    },
    {
      id: 'data-quality',
      tab: 'dashboard',
      code: 'Q-08',
      title: 'Data Quality & Anomaly Radar',
      description: 'Section 20 anomaly detection for chronological violations, batch fabrication, and stale checkpoints.',
      icon: Database,
      accentColor: '#4F46E5',
      badge: 'Phase 18 Quality',
      isModalTrigger: true,
    },
  ];

  const { navigate } = useRouter();

  const handleSelectQueue = (item: WorkQueueItem) => {
    onClose();
    if (item.id === 'dedup') {
      setDedupReviewOpen(true);
    } else if (item.id === 'analytics') {
      setAnalyticsDashboardOpen(true);
    } else if (item.id === 'data-quality') {
      navigate('/data-quality');
    } else {
      setActiveSidebarTab(item.tab);
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
        'interventions': '/interventions',
        'my-outcome': '/outcomes',
        'linkedin-integration': '/network',
        'system-logs': '/system-logs',
        'settings': '/settings',
      };
      navigate(tabToPathMap[item.tab] || `/${item.tab}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-navigator-title"
    >
      <div
        className="w-full max-w-3xl bg-white border-2 border-[#111111] shadow-[8px_8px_0px_#111111] flex flex-col max-h-[90vh] overflow-hidden text-[#111111]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F5F0E6] border-b-2 border-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 bg-[#111111] shrink-0" />
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#7A7A7A] uppercase block">
                SECTION 21.1 WORKSPACE CONVENTIONAL QUEUES
              </span>
              <h2
                id="queue-navigator-title"
                className="text-base sm:text-lg font-black uppercase text-[#111111]"
              >
                CONVENTIONAL WORK QUEUE NAVIGATOR
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-white border border-[#111111] hover:bg-[#E53935] hover:text-white transition-colors cursor-pointer"
            title="Close Navigator"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Guidance Notice Bar */}
        <div className="px-4 sm:px-6 py-2 bg-[#FAF8F5] border-b border-[#111111] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#555555]">
            Bidirectional routing active: Navigate directly from 3D orchestration into operational queues.
          </span>
          <span className="text-[10px] font-mono font-bold text-[#15803D]">
            NON-BLOCKING WORKFLOWS
          </span>
        </div>

        {/* Queue Grid List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5 custom-scrollbar">
          {queues.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectQueue(item)}
                className="group p-4 bg-white border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#111111] transition-all text-left flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 flex items-center justify-center text-white text-xs border border-[#111111]"
                        style={{ backgroundColor: item.accentColor }}
                      >
                        <Icon size={13} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#7A7A7A]">
                        {item.code}
                      </span>
                    </div>

                    {item.badge && (
                      <span className="px-2 py-0.5 bg-[#F5F0E6] text-[#111111] border border-[#111111] text-[9px] font-bold uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-[#111111] uppercase group-hover:text-[#E53935] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#555555] font-normal leading-relaxed mt-1 font-sans">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#111111]/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#111111]">
                  <span className="text-[10px] text-[#7A7A7A]">OPEN WORK QUEUE</span>
                  <div className="w-5 h-5 bg-[#111111] text-white flex items-center justify-center group-hover:bg-[#E53935] transition-colors">
                    <ChevronRight size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#F5F0E6] border-t-2 border-[#111111] flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-[#7A7A7A]">
            MAHARASHTRA SKILLING PLATFORM // SIH26135
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111111] hover:bg-[#E53935] text-white text-xs font-bold uppercase tracking-wider transition-colors border border-[#111111] shadow-[2px_2px_0px_#111111] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkQueueNavigator;
