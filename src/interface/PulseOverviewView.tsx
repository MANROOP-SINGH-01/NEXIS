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
    if (score >= 93) return 'bg-[#FF5C1A] text-white shadow-[0_0_8px_rgba(255,92,26,0.4)]'; // Vivid brand orange
    if (score >= 88) return 'bg-[#FF5C1A]/70 text-white'; // Warm orange
    if (score >= 82) return 'bg-[#FF5C1A]/35 text-[#EDEDED]'; // Soft orange
    if (score >= 75) return 'bg-[#3B82F6]/25 text-[#60A5FA]'; // Telemetry cyan
    return 'bg-[#1A1B20] text-[#6E7681]'; // Neutral muted surface
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#0A0B0E] text-[#EDEDED] custom-scrollbar">
      {/* Top Header Row matching PulseAI Reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
            Analytics Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#8B949E] mt-1 font-normal">
            Real-time insights into your AI infrastructure and career orchestration performance.
          </p>
        </div>

        {/* Date Filter & Export Action Pills */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121317] border border-white/8 text-xs font-mono text-[#8B949E] shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-[#6E7681]" />
            <span>Jan 08 - Feb 08</span>
          </div>

          <button className="h-[36px] px-4 rounded-[8px] bg-[#1A1B20] hover:bg-[#22242B] border border-white/10 text-xs font-semibold text-[#EDEDED] flex items-center gap-2 transition-all shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: The 3 Metric & Trajectory Cards */}
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
        <div className="md:col-span-6 bg-[#121317] rounded-[10px] border border-white/8 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider block font-mono">
                Total Match Requests
              </span>
              <span className="text-[11px] text-[#6E7681] font-medium block mt-0.5">
                During this month
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#6E7681]">32k Cap</span>
              <div className="w-7 h-7 rounded-full bg-[#1A1B20] border border-white/8 flex items-center justify-center text-[#8B949E]">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
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
                stroke="#FF5C1A"
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
                  <div className="absolute -top-7 bg-[#0A0B0E] border border-white/10 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-md z-10 whitespace-nowrap">
                    {bar.tooltip}
                  </div>
                )}
                <div
                  style={{ height: bar.h }}
                  className={`w-full max-w-[36px] rounded-t-md transition-all duration-300 ${
                    bar.active
                      ? 'bg-gradient-to-t from-[#E04006] to-[#FF5C1A] shadow-[0_0_16px_rgba(255,92,26,0.35)]'
                      : 'bg-[#1A1B20] hover:bg-[#22242B]'
                  }`}
                />
                <span className="text-[10px] font-mono text-[#6E7681]">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/8 text-xs font-mono">
            <span className="text-[#6E7681]">Verified Pipeline</span>
            <span className="text-[#FF5C1A] font-bold">29,420 Analyzed</span>
          </div>
        </div>
      </div>

      {/* Row 2: Token Usage Curve & Model Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Chart: Token Usage & Skill Growth Splines */}
        <div className="md:col-span-6 bg-[#121317] rounded-[10px] border border-white/8 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider block font-mono">
                Skill Velocity & AI Tokens
              </span>
              <span className="text-[11px] text-[#6E7681] font-medium block mt-0.5">
                Tokens processed per hour across agent fleet
              </span>
            </div>
            {/* Legend Toggles */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#EDEDED] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#FF5C1A] shadow-[0_0_6px_rgba(255,92,26,0.6)]" />
                Total
              </span>
              <span className="flex items-center gap-1.5 text-[#6E7681]">
                <span className="w-2 h-2 rounded-full bg-white/20" />
                Prompt
              </span>
            </div>
          </div>

          {/* Smooth SVG Curves */}
          <div className="relative my-4 h-40">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {/* Dotted secondary curve */}
              <path
                d="M 0 110 C 60 120, 100 80, 160 100 C 220 120, 260 90, 320 110 C 380 130, 420 80, 500 95"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Main orange spline */}
              <path
                d="M 0 50 C 40 45, 80 85, 120 65 C 160 40, 200 105, 240 80 C 280 120, 320 40, 360 90 C 400 60, 440 70, 500 55"
                fill="none"
                stroke="#FF5C1A"
                strokeWidth="2.5"
              />
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] font-mono text-[#6E7681] pt-1">
              <span>0:00</span>
              <span>4:00</span>
              <span>8:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>

          {/* Footer toggle switches */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/8 text-xs font-mono">
            <button
              onClick={() => setActiveCurveToggle('tokens')}
              className="flex items-center gap-1.5 cursor-pointer text-[#EDEDED] font-semibold"
            >
              <span className={`w-3.5 h-2 rounded-full transition-colors ${activeCurveToggle === 'tokens' ? 'bg-[#FF5C1A]' : 'bg-white/20'}`} />
              <span>Tokens</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('cost')}
              className="flex items-center gap-1.5 cursor-pointer text-[#8B949E] hover:text-[#EDEDED]"
            >
              <span className={`w-3.5 h-2 rounded-full transition-colors ${activeCurveToggle === 'cost' ? 'bg-[#FF5C1A]' : 'bg-white/20'}`} />
              <span>Cost ($)</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('efficiency')}
              className="flex items-center gap-1.5 cursor-pointer text-[#8B949E] hover:text-[#EDEDED]"
            >
              <span className={`w-3.5 h-2 rounded-full transition-colors ${activeCurveToggle === 'efficiency' ? 'bg-[#FF5C1A]' : 'bg-white/20'}`} />
              <span>Efficiency</span>
            </button>
          </div>
        </div>

        {/* Right Chart: Model Performance / Market Match Heatmap */}
        <div className="md:col-span-6 bg-[#121317] rounded-[10px] border border-white/8 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider block font-mono">
                Role Match Trajectory
              </span>
              <span className="text-[11px] text-[#6E7681] font-medium block mt-0.5">
                Market readiness vs Industry benchmarks
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#1A1B20] border border-white/8 text-xs font-mono font-semibold text-[#8B949E]">
              Monthly ▾
            </div>
          </div>

          {/* The Matrix Heatmap Grid */}
          <div className="my-3 space-y-2 overflow-x-auto custom-scrollbar">
            {MATRIX_ROLES.map((role) => (
              <div key={role.name} className="flex items-center gap-2 min-w-[380px]">
                <span className="text-xs font-mono text-[#8B949E] w-28 truncate shrink-0">
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
              <div className="flex-1 grid grid-cols-12 gap-1.5 text-[10px] font-mono text-[#6E7681] text-center">
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-white/8 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#8B949E]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C1A]" />
                Top Fit (&gt;90%)
              </span>
              <span className="flex items-center gap-1.5 text-[#8B949E]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C1A]/40" />
                Medium Fit
              </span>
              <span className="flex items-center gap-1.5 text-[#6E7681]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1A1B20]" />
                Stretch
              </span>
            </div>
            <button
              onClick={() => setActiveSidebarTab('job-matches')}
              className="text-xs font-bold text-[#FF5C1A] hover:underline flex items-center gap-1 cursor-pointer font-mono"
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
