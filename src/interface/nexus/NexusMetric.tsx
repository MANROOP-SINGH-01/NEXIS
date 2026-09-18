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
      className={`bg-white rounded-2xl border border-[#EADFCF] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(180,150,120,0.08),0_1px_4px_rgba(160,130,100,0.04)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(180,150,120,0.12)] ${className}`}
    >
      {/* Top row: Label, sublabel, and trend arrow */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-semibold text-[#181512] block tracking-tight">{label}</span>
          {sublabel && <span className="text-xs text-[#999084] font-medium block mt-0.5">{sublabel}</span>}
        </div>
        <div className="w-7 h-7 rounded-full bg-[#FAF6F0] border border-[#EADFCF] flex items-center justify-center text-[#6A6359] group-hover:text-[#181512]">
          {trend?.direction === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : trend?.direction === 'down' ? (
            <ArrowDownRight className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* Center value: Giant bold typography */}
      <div className="my-4">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#181512] tracking-tight">
          {value}
        </div>
        {trend?.text && (
          <span className="text-xs text-[#6A6359] mt-1 inline-block font-medium">
            {trend.text}
          </span>
        )}
      </div>

      {/* Pattern chips row: PulseAI Hatch texture comparison */}
      {(currentChip || previousChip) && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F5EFE6] my-2">
          {currentChip && (
            <div>
              <span className="text-[11px] font-semibold text-[#6A6359] block mb-1">
                {currentChip.label || 'Current'}
              </span>
              <div
                className={`h-7 rounded-lg flex items-center px-2.5 text-xs font-semibold ${
                  currentChip.variant === 'teal-hatch'
                    ? 'nx-hatch-teal text-[#1E6B61]'
                    : currentChip.variant === 'orange-hatch'
                    ? 'nx-hatch-orange text-[#B3471D]'
                    : 'nx-hatch-muted text-[#575047]'
                }`}
              >
                {currentChip.value || ''}
              </div>
            </div>
          )}

          {previousChip && (
            <div>
              <span className="text-[11px] font-semibold text-[#999084] block mb-1">
                {previousChip.label || 'Previous'}
              </span>
              <div
                className={`h-7 rounded-lg flex items-center px-2.5 text-xs font-semibold ${
                  previousChip.variant === 'orange-hatch'
                    ? 'nx-hatch-orange text-[#B3471D]'
                    : previousChip.variant === 'teal-hatch'
                    ? 'nx-hatch-teal text-[#1E6B61]'
                    : 'nx-hatch-muted text-[#575047]'
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
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#F5EFE6] text-xs">
          <span className="text-[#999084] font-medium">{footerLabel}</span>
          <span className="text-[#181512] font-bold">{footerValue}</span>
        </div>
      )}
    </div>
  );
};
