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
    orange: 'bg-[#FFF0E4] text-[#C45709] border border-[#FDCBA7]',
    dark: 'bg-[#181512] text-white border border-[#2B2621]',
    success: 'bg-[#E8F6EE] text-[#246B44] border border-[#BCE4CE]',
    warning: 'bg-[#FEF6E9] text-[#A6690E] border border-[#F8DFAC]',
    danger: 'bg-[#FDEEED] text-[#B83128] border border-[#F7BEBA]',
    neutral: 'bg-[#F4EDE3] text-[#575047] border border-[#E5DBCF]',
    'hatched-teal': 'nx-hatch-teal text-[#1E6B61] font-semibold',
    'hatched-orange': 'nx-hatch-orange text-[#B3471D] font-semibold',
  }[variant];

  const dotColors = {
    orange: 'bg-[#F47B20]',
    dark: 'bg-white',
    success: 'bg-[#2E8555]',
    warning: 'bg-[#C98218]',
    danger: 'bg-[#D9453B]',
    neutral: 'bg-[#999084]',
    'hatched-teal': 'bg-[#1E6B61]',
    'hatched-orange': 'bg-[#B3471D]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-tight transition-colors ${sizeClasses} ${variantClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} flex-shrink-0 animate-pulse`} />}
      {children}
    </span>
  );
};
