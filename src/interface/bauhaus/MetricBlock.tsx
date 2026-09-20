import React from 'react';

// MetricBlock — Large number display with label and optional geometric indicator.
// Used for ATS scores, match percentages, skill counts, etc.

interface MetricBlockProps {
  value: string | number;
  label: string;
  suffix?: string;
  color?: 'black' | 'red' | 'yellow' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  black: '#111111',
  red: '#E53935',
  yellow: '#F4C430',
  blue: '#2457A6',
};

const SIZE_MAP: Record<string, string> = {
  sm: '32px',
  md: '48px',
  lg: '72px',
};

export const MetricBlock: React.FC<MetricBlockProps> = ({
  value,
  label,
  suffix,
  color = 'black',
  size = 'md',
  className = '',
}) => (
  <div className={`flex flex-col ${className}`}>
    <span
      className="uppercase tracking-[0.1em] text-[#7A7A7A] mb-2"
      style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '10px', fontWeight: 600 }}
    >
      {label}
    </span>
    <div className="flex items-baseline gap-1">
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: SIZE_MAP[size],
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: COLOR_MAP[color],
        }}
      >
        {value}
      </span>
      {suffix && (
        <span
          className="text-[#7A7A7A]"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 500 }}
        >
          {suffix}
        </span>
      )}
    </div>
    {/* Geometric accent bar */}
    <div
      className="mt-3"
      style={{ width: '32px', height: '3px', backgroundColor: COLOR_MAP[color] }}
      aria-hidden="true"
    />
  </div>
);
