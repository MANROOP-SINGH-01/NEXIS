import React from 'react';
import { Briefcase, FileText, GraduationCap, LayoutDashboard, MessageSquare, Target, UploadCloud,  Award,
  Linkedin,
  Github,
  Construction,
  Wrench,
  LucideIcon
} from 'lucide-react';
import { ActiveSidebarTab } from '../types';
import { useUiStore } from '../integration/store/uiStore';
import { USER_COLOR, USER_COLOR_LIGHT, USER_COLOR_SOFT } from '../theme/brand';

interface EmptySectionViewProps {
  tab: ActiveSidebarTab;
}

const SECTION_CONFIG: Record<
  Exclude<ActiveSidebarTab, 'dashboard'>,
  {
    title: string;
    description: string;
    icon: LucideIcon;
    badge: string;
  }
> = {
  'skill-gaps': {
    title: 'Skill Gaps Analysis',
    description: 'Pinpoints exact mismatches between your candidate evidence and target role prerequisites with automated proof-checking.',
    icon: Target,
    badge: 'Skill Matrix',
  },
  'job-matches': {
    title: 'Job Matches (Blue Ocean)',
    description: 'Discovers low-competition direct career listings filtered by verified engineering alignment and niche capability fits.',
    icon: Briefcase,
    badge: 'Nexus-Hunter',
  },
  'recommended-programs': {
    title: 'Recommended Programs & Upskilling',
    description: 'Personalized curriculum pathways to convert unverified skills into production-grade GitHub and certification proof.',
    icon: GraduationCap,
    badge: 'Growth Engine',
  },
  'interview-prep': {
    title: 'Interview Prep & Recursive Simulation',
    description: 'Deep technical, behavioral, and system design mock interview loops powered by dynamic pressure scoring.',
    icon: MessageSquare,
    badge: 'Nexus-Mirror',
  },
  'new-cv': {
    title: 'New CV & Tailored Resume',
    description: 'Role-aligned, single-pass ATS optimized resume generated with quantifiable STAR achievement metrics.',
    icon: FileText,
    badge: 'Nexus-Writer',
  },
  'my-outcome': {
    title: 'Outcome Tracking & Self-Report',
    description: 'Track your employment outcomes, post-training progress, and 3/6/12-month follow-up check-ins.',
    icon: Award,
    badge: 'Outcome Record',
  },
  'linkedin-integration': {
    title: 'LinkedIn Profile Integration',
    description: 'Sync your LinkedIn profile to automatically extract verified skills and quantifiable resume achievements.',
    icon: Linkedin,
    badge: 'API Integration',
  },
  'career-health': {
    title: 'Career Health Dashboard',
    description: 'A holistic view of your career trajectory, skill debt, and earning potential over time.',
    icon: LayoutDashboard,
    badge: 'Career Metrics',
  },
};

export const EmptySectionView: React.FC<EmptySectionViewProps> = ({ tab }) => {
  const { setActiveSidebarTab } = useUiStore();

  if (tab === 'dashboard') return null;

  const config = SECTION_CONFIG[tab];
  const Icon = config.icon;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 text-center flex flex-col items-center">
        {/* Icon & Badge */}
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-transform hover:scale-105"
          style={{ backgroundColor: USER_COLOR_LIGHT }}
        >
          <Icon size={26} strokeWidth={2} style={{ color: USER_COLOR }} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/60 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-darkDelegation">
            {config.badge}
          </span>
        </div>

        <h2 className="text-lg font-black text-darkDelegation mb-2 tracking-tight">
          {config.title}
        </h2>

        {/* Required verbatim empty state prompt */}
        <p className="text-sm font-bold text-zinc-800 mb-2">
          Upload a resume and job description to see this.
        </p>

        <p className="text-xs text-zinc-500 leading-relaxed mb-6 font-medium">
          {config.description}
        </p>

        {/* Action Button */}
        <button
          onClick={() => setActiveSidebarTab('dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-darkDelegation hover:bg-black text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <LayoutDashboard size={14} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default EmptySectionView;
