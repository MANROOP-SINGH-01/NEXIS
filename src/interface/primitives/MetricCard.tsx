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

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
  accentColor = 'indigo',
}) => {
  const accentGlow = {
    indigo: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10',
    cyan: 'hover:border-cyan-500/40 hover:shadow-cyan-500/10',
    mint: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
    amber: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
    coral: 'hover:border-rose-500/40 hover:shadow-rose-500/10',
    purple: 'hover:border-purple-500/40 hover:shadow-purple-500/10',
  };

  const iconBg = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    mint: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    coral: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <Card
      variant="default"
      hoverable
      padding="md"
      className={`border border-zinc-800 transition-all duration-300 ${accentGlow[accentColor]}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {icon && (
          <div className={`p-2 rounded-xl border ${iconBg[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
          {value}
        </span>
        {change && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
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

      {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
    </Card>
  );
};
