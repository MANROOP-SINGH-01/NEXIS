import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  ArrowUpRight, 
  Sparkles, 
  Briefcase, 
  FileText, 
  Target, 
  ChevronRight,
  TrendingUp,
  Award,
  Layers
} from 'lucide-react';
import { NexusCard, NexusMetric, NexusButton, NexusBadge } from './nexus';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';

export const PulseOverviewView: React.FC = () => {
  const { setActiveSidebarTab } = useUiStore();
  const { discoveredJobs } = useCoreStore();

  const [activeCurveToggle, setActiveCurveToggle] = useState<'tokens' | 'cost' | 'efficiency'>('tokens');

  // Heatmap rows data matching the PulseAI "Model Performance" matrix
  const MATRIX_ROLES = [
    { name: 'Senior Fullstack', scores: [85, 92, 78, 95, 90, 88, 72, 94, 80, 86, 92, 96] },
    { name: 'AI Solutions Eng', scores: [70, 75, 82, 88, 94, 91, 89, 95, 92, 90, 84, 88] },
    { name: 'Platform Architect', scores: [65, 80, 88, 92, 90, 85, 82, 79, 88, 91, 85, 89] },
    { name: 'Distributed Systems', scores: [78, 85, 82, 80, 91, 93, 96, 90, 87, 85, 89, 92] },
    { name: 'Lead Frontend', scores: [90, 94, 88, 92, 96, 95, 91, 93, 89, 94, 96, 98] },
  ];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Color generator for heatmap cell
  const getHeatmapColor = (score: number) => {
    if (score >= 93) return 'bg-[#F47B20] text-white'; // Vivid orange
    if (score >= 88) return 'bg-[#F8A059] text-white'; // Warm orange
    if (score >= 82) return 'bg-[#FBC497] text-[#8C3A04]'; // Soft peach
    if (score >= 75) return 'bg-[#FDE2CB] text-[#8C3A04]'; // Light ivory peach
    return 'bg-[#F5EFE6] text-[#999084]'; // Neutral muted
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#F8F3EC] custom-scrollbar">
      {/* Top Header Row matching PulseAI Reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181512] tracking-tight">
            Analytics Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#6A6359] mt-1 font-normal">
            Real-time insights into your AI infrastructure and career orchestration performance.
          </p>
        </div>

        {/* Date Filter & Export Action Pills */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EADFCF] text-xs font-medium text-[#6A6359] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#999084]" />
            <span>Jan 08 - Feb 08</span>
          </div>

          <button className="nx-btn-dark !py-1.5 !px-4 !text-xs shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: The 3 PulseAI Metric & Trajectory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Card 1: Total Cost / Career Readiness */}
        <div className="md:col-span-3">
          <NexusMetric
            label="Career Velocity"
            sublabel="This week"
            value="+12.5%"
            trend={{ direction: 'up', text: 'Accelerating' }}
            currentChip={{
              label: 'Current',
              variant: 'teal-hatch',
              value: '94.2 Score',
            }}
            previousChip={{
              label: 'Previous',
              variant: 'muted',
              value: '83.7 Score',
            }}
            footerLabel="Projected Floor"
            footerValue="₹28,50,000"
          />
        </div>

        {/* Card 2: Avg Cost / Dealbreaker Tolerance */}
        <div className="md:col-span-3">
          <NexusMetric
            label="Dealbreaker Rate"
            sublabel="This week"
            value="-2.1%"
            trend={{ direction: 'down', text: 'Tighter fit alignment' }}
            currentChip={{
              label: 'Current',
              variant: 'orange-hatch',
              value: '0 Disqualified',
            }}
            previousChip={{
              label: 'Previous',
              variant: 'muted',
              value: '4 Disqualified',
            }}
            footerLabel="High Fit Ratio"
            footerValue="89.4%"
          />
        </div>

        {/* Card 3: Total Requests & Monthly Projection Bar Chart */}
        <div className="md:col-span-6 bg-white rounded-2xl border border-[#EADFCF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(180,150,120,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-semibold text-[#181512] block tracking-tight">
                Total Match Requests
              </span>
              <span className="text-xs text-[#999084] font-medium block mt-0.5">
                During this month
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#999084]">32k Cap</span>
              <div className="w-7 h-7 rounded-full bg-[#FAF6F0] border border-[#EADFCF] flex items-center justify-center text-[#6A6359]">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Bar Chart with highlighted orange bar and spline trajectory */}
          <div className="relative my-4 h-36 flex items-end justify-between gap-1.5 px-2">
            {/* SVG dashed curve overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <path
                d="M 10 110 Q 120 100, 200 85 T 320 40 T 440 15"
                fill="none"
                stroke="#F47B20"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            </svg>

            {/* Bars */}
            {[
              { label: 'Oct', h: '35%', active: false },
              { label: 'Nov', h: '42%', active: false },
              { label: 'Dec', h: '55%', active: false },
              { label: 'Jan', h: '92%', active: true, tooltip: '29k Matches' },
              { label: 'Feb', h: '68%', active: false },
              { label: 'Mar', h: '78%', active: false },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative group">
                {bar.active && (
                  <div className="absolute -top-7 bg-[#181512] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md z-10 whitespace-nowrap">
                    {bar.tooltip}
                  </div>
                )}
                <div
                  style={{ height: bar.h }}
                  className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                    bar.active
                      ? 'bg-[#F47B20] shadow-md shadow-[#F47B20]/30'
                      : 'bg-[#F5E6D8] hover:bg-[#FCD8BE]'
                  }`}
                />
                <span className="text-[10px] font-medium text-[#999084]">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#F5EFE6] text-xs">
            <span className="text-[#999084]">Verified Pipeline</span>
            <span className="text-[#F47B20] font-bold">29,420 Analyzed</span>
          </div>
        </div>
      </div>

      {/* Row 2: Token Usage Curve & Model Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Chart: Token Usage & Skill Growth Splines */}
        <div className="md:col-span-6 bg-white rounded-2xl border border-[#EADFCF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(180,150,120,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-semibold text-[#181512] block tracking-tight">
                Skill Velocity & AI Tokens
              </span>
              <span className="text-xs text-[#999084] font-medium block mt-0.5">
                Tokens processed per hour across agent fleet
              </span>
            </div>
            {/* Legend Toggles */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[#181512] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#F47B20]" />
                Total
              </span>
              <span className="flex items-center gap-1 text-[#999084]">
                <span className="w-2 h-2 rounded-full bg-[#E5DBCF]" />
                Prompt
              </span>
            </div>
          </div>

          {/* Smooth SVG Curves */}
          <div className="relative my-4 h-40">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#F5EFE6" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#F5EFE6" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#F5EFE6" strokeDasharray="3 3" />

              {/* Dotted secondary curve */}
              <path
                d="M 0 110 C 60 120, 100 80, 160 100 C 220 120, 260 90, 320 110 C 380 130, 420 80, 500 95"
                fill="none"
                stroke="#E5DBCF"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Main orange spline */}
              <path
                d="M 0 50 C 40 45, 80 85, 120 65 C 160 40, 200 105, 240 80 C 280 120, 320 40, 360 90 C 400 60, 440 70, 500 55"
                fill="none"
                stroke="#F47B20"
                strokeWidth="2.5"
              />
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] text-[#999084] pt-1">
              <span>0:00</span>
              <span>4:00</span>
              <span>8:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>

          {/* Footer toggle switches */}
          <div className="flex items-center gap-4 pt-3 border-t border-[#F5EFE6] text-xs">
            <button
              onClick={() => setActiveCurveToggle('tokens')}
              className="flex items-center gap-1.5 cursor-pointer text-[#181512] font-semibold"
            >
              <span className={`w-3.5 h-2 rounded-full ${activeCurveToggle === 'tokens' ? 'bg-[#F47B20]' : 'bg-[#E5DBCF]'}`} />
              <span>Tokens</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('cost')}
              className="flex items-center gap-1.5 cursor-pointer text-[#6A6359]"
            >
              <span className={`w-3.5 h-2 rounded-full ${activeCurveToggle === 'cost' ? 'bg-[#F47B20]' : 'bg-[#E5DBCF]'}`} />
              <span>Cost ($)</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('efficiency')}
              className="flex items-center gap-1.5 cursor-pointer text-[#6A6359]"
            >
              <span className={`w-3.5 h-2 rounded-full ${activeCurveToggle === 'efficiency' ? 'bg-[#F47B20]' : 'bg-[#E5DBCF]'}`} />
              <span>Efficiency</span>
            </button>
          </div>
        </div>

        {/* Right Chart: Model Performance / Market Match Heatmap */}
        <div className="md:col-span-6 bg-white rounded-2xl border border-[#EADFCF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(180,150,120,0.08)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-semibold text-[#181512] block tracking-tight">
                Role Match Trajectory
              </span>
              <span className="text-xs text-[#999084] font-medium block mt-0.5">
                Market readiness vs Industry benchmarks
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#FAF6F0] border border-[#EADFCF] text-xs font-semibold text-[#6A6359]">
              Monthly ▾
            </div>
          </div>

          {/* The Matrix Heatmap Grid */}
          <div className="my-3 space-y-2 overflow-x-auto custom-scrollbar">
            {MATRIX_ROLES.map((role) => (
              <div key={role.name} className="flex items-center gap-2 min-w-[380px]">
                <span className="text-xs font-medium text-[#6A6359] w-28 truncate shrink-0">
                  {role.name}
                </span>
                <div className="flex-1 grid grid-cols-12 gap-1.5">
                  {role.scores.map((score, mIdx) => (
                    <div
                      key={mIdx}
                      title={`${role.name} in ${MONTHS[mIdx]}: ${score}% Match`}
                      className={`h-5 rounded-md transition-transform hover:scale-110 cursor-pointer ${getHeatmapColor(score)}`}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Months Header row */}
            <div className="flex items-center gap-2 pt-1 min-w-[380px]">
              <span className="w-28 shrink-0" />
              <div className="flex-1 grid grid-cols-12 gap-1.5 text-[10px] text-[#999084] text-center">
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-[#F5EFE6] text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#6A6359]">
                <span className="w-2.5 h-2.5 rounded bg-[#F47B20]" />
                Top Fit (&gt;90%)
              </span>
              <span className="flex items-center gap-1 text-[#6A6359]">
                <span className="w-2.5 h-2.5 rounded bg-[#FBC497]" />
                Medium Fit
              </span>
              <span className="flex items-center gap-1 text-[#6A6359]">
                <span className="w-2.5 h-2.5 rounded bg-[#F5EFE6]" />
                Stretch
              </span>
            </div>
            <button
              onClick={() => setActiveSidebarTab('job-matches')}
              className="text-xs font-bold text-[#F47B20] hover:text-[#E36D13] flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Roles</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
