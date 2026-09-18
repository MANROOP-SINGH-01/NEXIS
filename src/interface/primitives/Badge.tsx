import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'cyan' | 'mint' | 'amber' | 'coral' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  pulseDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'indigo',
  size = 'md',
  pulseDot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] font-medium px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    mint: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    coral: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    neutral: 'bg-zinc-800 text-zinc-300 border border-zinc-700/60',
  };

  const dotColors = {
    indigo: 'bg-indigo-400',
    cyan: 'bg-cyan-400',
    mint: 'bg-emerald-400',
    amber: 'bg-amber-400',
    coral: 'bg-rose-400',
    purple: 'bg-purple-400',
    neutral: 'bg-zinc-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {pulseDot && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
};
