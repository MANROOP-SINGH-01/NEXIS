import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'bordered';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-[#12131c] border border-zinc-800/80 shadow-md',
    elevated: 'bg-[#1a1b28] border border-zinc-700/60 shadow-xl shadow-black/40',
    glass: 'bg-[#12131c]/70 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30',
    gradient: 'bg-gradient-to-br from-indigo-950/40 via-[#12131c] to-[#12131c] border border-indigo-500/20 shadow-lg',
    bordered: 'bg-transparent border border-zinc-800 hover:border-zinc-700',
  };

  const hoverStyles = hoverable
    ? 'hover:-translate-y-0.5 hover:shadow-indigo-500/10 hover:border-zinc-700/80 cursor-pointer'
    : '';

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
