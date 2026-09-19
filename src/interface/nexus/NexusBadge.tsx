import React from 'react';

export interface NexusBadgeProps {
  variant?: 'orange' | 'dark' | 'success' | 'warning' | 'danger' | 'neutral' | 'hatched-teal' | 'hatched-orange';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const NexusBadge: React.FC<NexusBadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1 font-semibold',
    sm: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    md: 'px-3 py-1.5 text-xs gap-2 font-semibold',
  }[size];

  const variantClasses = {
    orange: 'bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/25',
    dark: 'bg-[#1A1B20] text-[#EDEDED] border border-white/10',
    success: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25',
    danger: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25',
    neutral: 'bg-[#1A1B20] text-[#8B949E] border border-white/8',
    'hatched-teal': 'bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/25 font-semibold',
    'hatched-orange': 'bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/25 font-semibold',
  }[variant];

  const dotColors = {
    orange: 'bg-[#FF5C1A] shadow-[0_0_8px_rgba(255,92,26,0.6)]',
    dark: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]',
    success: 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    warning: 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    danger: 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    neutral: 'bg-[#8B949E]',
    'hatched-teal': 'bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    'hatched-orange': 'bg-[#FF5C1A] shadow-[0_0_8px_rgba(255,92,26,0.6)]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-tight transition-colors font-mono ${sizeClasses} ${variantClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} flex-shrink-0 animate-pulse`} />}
      {children}
    </span>
  );
};
