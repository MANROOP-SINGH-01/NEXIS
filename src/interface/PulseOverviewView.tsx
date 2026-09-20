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
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { PageHeader } from './bauhaus/PageHeader';

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

  // Bauhaus color generator for heatmap cell
  const getHeatmapColor = (score: number) => {
    if (score >= 93) return 'bg-[#E53935] text-white border-2 border-[#111111]'; // Bauhaus red
    if (score >= 88) return 'bg-[#F4C430] text-[#111111] border-2 border-[#111111]'; // Bauhaus yellow
    if (score >= 82) return 'bg-[#2457A6] text-white border-2 border-[#111111]'; // Bauhaus blue
    if (score >= 75) return 'bg-[#EFE7D8] text-[#111111] border-2 border-[#111111]'; // Warm paper
    return 'bg-[#FFFFFF] text-[#777777] border border-[#CCCCCC]'; // Neutral base
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#F5F0E6] text-[#111111] custom-scrollbar">
      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="12"
        code="ANALYTICS"
        title="ANALYTICS & PULSE OVERVIEW"
        subtitle="REAL-TIME INSIGHTS INTO AI ORCHESTRATION & CAREER MATCH PERFORMANCE"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#FFFFFF] border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] shadow-[2px_2px_0px_#111111]">
              <Calendar className="w-3.5 h-3.5 text-[#E53935]" />
              <span>Jan 08 - Feb 08</span>
            </div>

            <button className="px-4 py-2 bg-[#111111] hover:bg-[#E53935] text-white border-2 border-[#111111] text-xs font-mono font-black uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_#E53935] cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        }
      />

      {/* Row 1: The 3 Metric & Trajectory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Card 1: Career Velocity */}
        <div className="md:col-span-3 bg-[#FFFFFF] border-2 border-[#111111] p-5 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111] mb-3">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#111111]">Career Velocity</span>
              <span className="text-[10px] font-mono font-bold text-[#555555]">This week</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-[#111111]">+12.5%</span>
              <span className="text-xs font-mono font-bold text-[#2457A6]">Accelerating</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between items-center bg-[#F5F0E6] p-2 border border-[#111111]">
                <span className="text-[10px] font-mono font-bold uppercase text-[#555555]">Current</span>
                <span className="text-xs font-mono font-black text-[#111111]">94.2 Score</span>
              </div>
              <div className="flex justify-between items-center bg-[#FDFBF7] p-2 border border-[#CCCCCC]">
                <span className="text-[10px] font-mono font-bold uppercase text-[#777777]">Previous</span>
                <span className="text-xs font-mono font-bold text-[#777777]">83.7 Score</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t-2 border-[#111111] mt-4 flex justify-between items-center text-xs font-mono">
            <span className="text-[#555555]">Projected Floor</span>
            <span className="font-black text-[#E53935]">₹28,50,000</span>
          </div>
        </div>

        {/* Card 2: Dealbreaker Rate */}
        <div className="md:col-span-3 bg-[#FFFFFF] border-2 border-[#111111] p-5 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111] mb-3">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#111111]">Dealbreaker Rate</span>
              <span className="text-[10px] font-mono font-bold text-[#555555]">This week</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-[#111111]">-2.1%</span>
              <span className="text-xs font-mono font-bold text-[#2457A6]">Tighter Fit</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between items-center bg-[#FEF9E7] p-2 border border-[#F4C430]">
                <span className="text-[10px] font-mono font-bold uppercase text-[#B78103]">Current</span>
                <span className="text-xs font-mono font-black text-[#111111]">0 Disqualified</span>
              </div>
              <div className="flex justify-between items-center bg-[#FDFBF7] p-2 border border-[#CCCCCC]">
                <span className="text-[10px] font-mono font-bold uppercase text-[#777777]">Previous</span>
                <span className="text-xs font-mono font-bold text-[#777777]">4 Disqualified</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t-2 border-[#111111] mt-4 flex justify-between items-center text-xs font-mono">
            <span className="text-[#555555]">High Fit Ratio</span>
            <span className="font-black text-[#2457A6]">89.4%</span>
          </div>
        </div>

        {/* Card 3: Total Requests & Monthly Projection Bar Chart */}
        <div className="md:col-span-6 bg-[#FFFFFF] border-2 border-[#111111] p-5 sm:p-6 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
          <div className="flex items-start justify-between pb-2 border-b-2 border-[#111111]">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-wider block text-[#111111]">
                Total Match Requests
              </span>
              <span className="text-[11px] font-mono text-[#555555] block mt-0.5">
                During this active cycle
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#555555]">32k Cap</span>
              <div className="w-7 h-7 bg-[#EBF3FC] border border-[#2457A6] flex items-center justify-center text-[#2457A6]">
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
                stroke="#E53935"
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
                  <div className="absolute -top-7 bg-[#111111] text-white text-[10px] font-mono font-bold px-2 py-0.5 shadow-md z-10 whitespace-nowrap">
                    {bar.tooltip}
                  </div>
                )}
                <div
                  style={{ height: bar.h }}
                  className={`w-full max-w-[36px] border-2 border-[#111111] transition-all duration-300 ${
                    bar.active
                      ? 'bg-[#E53935] shadow-[2px_2px_0px_#111111]'
                      : 'bg-[#F5F0E6] hover:bg-[#EFE7D8]'
                  }`}
                />
                <span className="text-[10px] font-mono font-bold text-[#555555]">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t-2 border-[#111111] text-xs font-mono">
            <span className="text-[#555555]">Verified Pipeline</span>
            <span className="text-[#E53935] font-black">29,420 Analyzed</span>
          </div>
        </div>
      </div>

      {/* Row 2: Token Usage Curve & Model Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Chart: Token Usage & Skill Growth Splines */}
        <div className="md:col-span-6 bg-[#FFFFFF] border-2 border-[#111111] p-5 sm:p-6 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
          <div className="flex items-start justify-between pb-2 border-b-2 border-[#111111]">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-wider block text-[#111111]">
                Skill Velocity & AI Tokens
              </span>
              <span className="text-[11px] font-mono text-[#555555] block mt-0.5">
                Tokens processed per hour across agent fleet
              </span>
            </div>
            {/* Legend Toggles */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#111111] font-bold">
                <span className="w-2.5 h-2.5 bg-[#E53935] border border-[#111111]" />
                Total
              </span>
              <span className="flex items-center gap-1.5 text-[#555555]">
                <span className="w-2.5 h-2.5 bg-[#2457A6] border border-[#111111]" />
                Prompt
              </span>
            </div>
          </div>

          {/* Smooth SVG Curves */}
          <div className="relative my-4 h-40">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#EFE7D8" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#EFE7D8" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#EFE7D8" strokeWidth="2" strokeDasharray="3 3" />

              {/* Dotted secondary curve */}
              <path
                d="M 0 110 C 60 120, 100 80, 160 100 C 220 120, 260 90, 320 110 C 380 130, 420 80, 500 95"
                fill="none"
                stroke="#2457A6"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Main red spline */}
              <path
                d="M 0 50 C 40 45, 80 85, 120 65 C 160 40, 200 105, 240 80 C 280 120, 320 40, 360 90 C 400 60, 440 70, 500 55"
                fill="none"
                stroke="#E53935"
                strokeWidth="3"
              />
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] font-mono text-[#555555] pt-1">
              <span>0:00</span>
              <span>4:00</span>
              <span>8:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>

          {/* Footer toggle switches */}
          <div className="flex items-center gap-4 pt-3 border-t-2 border-[#111111] text-xs font-mono">
            <button
              onClick={() => setActiveCurveToggle('tokens')}
              className={`flex items-center gap-1.5 cursor-pointer font-bold ${activeCurveToggle === 'tokens' ? 'text-[#E53935]' : 'text-[#555555]'}`}
            >
              <span className={`w-3 h-3 border border-[#111111] ${activeCurveToggle === 'tokens' ? 'bg-[#E53935]' : 'bg-[#FFFFFF]'}`} />
              <span>Tokens</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('cost')}
              className={`flex items-center gap-1.5 cursor-pointer font-bold ${activeCurveToggle === 'cost' ? 'text-[#E53935]' : 'text-[#555555]'}`}
            >
              <span className={`w-3 h-3 border border-[#111111] ${activeCurveToggle === 'cost' ? 'bg-[#E53935]' : 'bg-[#FFFFFF]'}`} />
              <span>Cost ($)</span>
            </button>
            <button
              onClick={() => setActiveCurveToggle('efficiency')}
              className={`flex items-center gap-1.5 cursor-pointer font-bold ${activeCurveToggle === 'efficiency' ? 'text-[#E53935]' : 'text-[#555555]'}`}
            >
              <span className={`w-3 h-3 border border-[#111111] ${activeCurveToggle === 'efficiency' ? 'bg-[#E53935]' : 'bg-[#FFFFFF]'}`} />
              <span>Efficiency</span>
            </button>
          </div>
        </div>

        {/* Right Chart: Model Performance / Market Match Heatmap */}
        <div className="md:col-span-6 bg-[#FFFFFF] border-2 border-[#111111] p-5 sm:p-6 shadow-[4px_4px_0px_#111111] flex flex-col justify-between">
          <div className="flex items-start justify-between pb-2 border-b-2 border-[#111111]">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-wider block text-[#111111]">
                Role Match Trajectory
              </span>
              <span className="text-[11px] font-mono text-[#555555] block mt-0.5">
                Market readiness vs Industry benchmarks
              </span>
            </div>
            <div className="px-2.5 py-1 bg-[#F5F0E6] border border-[#111111] text-xs font-mono font-bold text-[#111111]">
              Monthly ▾
            </div>
          </div>

          {/* The Matrix Heatmap Grid */}
          <div className="my-3 space-y-2 overflow-x-auto custom-scrollbar">
            {MATRIX_ROLES.map((role) => (
              <div key={role.name} className="flex items-center gap-2 min-w-[380px]">
                <span className="text-xs font-mono font-bold text-[#111111] w-28 truncate shrink-0">
                  {role.name}
                </span>
                <div className="flex-1 grid grid-cols-12 gap-1.5">
                  {role.scores.map((score, mIdx) => (
                    <div
                      key={mIdx}
                      title={`${role.name} in ${MONTHS[mIdx]}: ${score}% Match`}
                      className={`h-5 transition-transform hover:scale-110 cursor-pointer ${getHeatmapColor(score)}`}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Months Header row */}
            <div className="flex items-center gap-2 pt-1 min-w-[380px]">
              <span className="w-28 shrink-0" />
              <div className="flex-1 grid grid-cols-12 gap-1.5 text-[10px] font-mono font-bold text-[#555555] text-center">
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-[#111111] text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#111111] font-bold">
                <span className="w-2.5 h-2.5 bg-[#E53935] border border-[#111111]" />
                Top (&gt;90%)
              </span>
              <span className="flex items-center gap-1.5 text-[#111111] font-bold">
                <span className="w-2.5 h-2.5 bg-[#F4C430] border border-[#111111]" />
                Med
              </span>
              <span className="flex items-center gap-1.5 text-[#555555]">
                <span className="w-2.5 h-2.5 bg-[#EFE7D8] border border-[#111111]" />
                Base
              </span>
            </div>
            <button
              onClick={() => setActiveSidebarTab('job-matches')}
              className="text-xs font-bold text-[#E53935] hover:underline flex items-center gap-1 cursor-pointer font-mono"
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

export default PulseOverviewView;
