import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  accentColor?: 'indigo' | 'cyan' | 'mint' | 'amber' | 'coral' | 'purple';
}

// Bauhaus color mapping from old neon palette
const ACCENT_MAP: Record<string, string> = {
  indigo: '#2457A6',
  cyan: '#173F7A',
  mint: '#2E7D32',
  amber: '#F4C430',
  coral: '#E53935',
  purple: '#173F7A',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
  accentColor = 'indigo',
}) => {
  const accent = ACCENT_MAP[accentColor] || '#2457A6';

  return (
    <Card
      variant="default"
      hoverable
      padding="md"
    >
      <div className="flex items-start justify-between">
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#7A7A7A',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            className="p-2 flex items-center justify-center"
            style={{
              backgroundColor: `${accent}10`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: '#111111',
          }}
        >
          {value}
        </span>
        {change && (
          <span
            className="inline-flex items-center text-xs font-semibold"
            style={{ color: isPositive ? '#2E7D32' : '#E53935' }}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p
          className="mt-1.5"
          style={{ fontSize: '12px', color: '#7A7A7A', fontFamily: "'Inter', sans-serif" }}
        >
          {subtitle}
        </p>
      )}

      {/* Geometric accent line */}
      <div
        className="mt-4"
        style={{ width: '24px', height: '2px', backgroundColor: accent }}
        aria-hidden="true"
      />
    </Card>
  );
};
