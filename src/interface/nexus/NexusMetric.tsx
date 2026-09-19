import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface NexusMetricProps {
  label: string;
  sublabel?: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text?: string;
  };
  currentChip?: {
    label?: string;
    variant?: 'teal-hatch' | 'orange-hatch' | 'muted';
    value?: string;
  };
  previousChip?: {
    label?: string;
    variant?: 'muted' | 'orange-hatch' | 'teal-hatch';
    value?: string;
  };
  footerLabel?: string;
  footerValue?: string;
  className?: string;
  onClick?: () => void;
}

export const NexusMetric: React.FC<NexusMetricProps> = ({
  label,
  sublabel = 'This week',
  value,
  trend,
  currentChip,
  previousChip,
  footerLabel,
  footerValue,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#121317] rounded-[10px] border border-white/8 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* Top row: Label, sublabel, and trend arrow */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider block font-mono">{label}</span>
          {sublabel && <span className="text-[11px] text-[#6E7681] font-medium block mt-0.5">{sublabel}</span>}
        </div>
        <div className="w-7 h-7 rounded-full bg-[#1A1B20] border border-white/8 flex items-center justify-center text-[#8B949E]">
          {trend?.direction === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
          ) : trend?.direction === 'down' ? (
            <ArrowDownRight className="w-3.5 h-3.5 text-[#3B82F6]" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* Center value: Giant bold typography */}
      <div className="my-4">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#EDEDED] font-mono tracking-tight">
          {value}
        </div>
        {trend?.text && (
          <span className="text-xs text-[#8B949E] mt-1 inline-block font-medium">
            {trend.text}
          </span>
        )}
      </div>

      {/* Pattern chips row */}
      {(currentChip || previousChip) && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/8 my-2">
          {currentChip && (
            <div>
              <span className="text-[10px] uppercase font-mono text-[#6E7681] block mb-1">
                {currentChip.label || 'Current'}
              </span>
              <div
                className={`h-7 rounded-md flex items-center px-2.5 text-xs font-mono font-semibold border ${
                  currentChip.variant === 'teal-hatch'
                    ? 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30'
                    : currentChip.variant === 'orange-hatch'
                    ? 'bg-[#FF5C1A]/10 text-[#FF5C1A] border-[#FF5C1A]/30'
                    : 'bg-[#1A1B20] text-[#8B949E] border-white/8'
                }`}
              >
                {currentChip.value || ''}
              </div>
            </div>
          )}

          {previousChip && (
            <div>
              <span className="text-[10px] uppercase font-mono text-[#6E7681] block mb-1">
                {previousChip.label || 'Previous'}
              </span>
              <div
                className={`h-7 rounded-md flex items-center px-2.5 text-xs font-mono font-semibold border ${
                  previousChip.variant === 'orange-hatch'
                    ? 'bg-[#FF5C1A]/10 text-[#FF5C1A] border-[#FF5C1A]/30'
                    : previousChip.variant === 'teal-hatch'
                    ? 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30'
                    : 'bg-[#1A1B20] text-[#8B949E] border-white/8'
                }`}
              >
                {previousChip.value || ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer line */}
      {(footerLabel || footerValue) && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/8 text-xs font-mono">
          <span className="text-[#6E7681]">{footerLabel}</span>
          <span className="text-[#EDEDED] font-bold">{footerValue}</span>
        </div>
      )}
    </div>
  );
};
