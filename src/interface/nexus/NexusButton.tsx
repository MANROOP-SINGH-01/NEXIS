import React from 'react';
import { Loader2 } from 'lucide-react';

export interface NexusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const NexusButton: React.FC<NexusButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pill = true,
  loading = false,
  icon,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-[30px] px-3 text-xs gap-1.5',
    md: 'h-[36px] px-4 text-xs gap-2',
    lg: 'h-[44px] px-6 text-sm gap-2.5',
  }[size];

  const roundedClass = pill ? 'rounded-full' : 'rounded-[8px]';

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#FF5C1A] to-[#E04006] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(255,92,26,0.35)] border border-transparent font-semibold',
    dark:
      'bg-[#121317] text-[#EDEDED] hover:bg-[#1A1B20] active:bg-[#22242B] border border-white/10 hover:border-white/20 font-medium',
    secondary:
      'bg-[#1A1B20] text-[#EDEDED] border border-white/10 hover:border-white/20 hover:bg-[#22242B] active:bg-[#282A33] font-medium shadow-sm',
    ghost:
      'bg-transparent text-[#8B949E] hover:text-[#EDEDED] hover:bg-[#1A1B20] active:bg-[#22242B] border border-transparent font-medium',
    danger:
      'bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 active:bg-[#EF4444]/30 border border-[#EF4444]/30 font-medium shadow-sm',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${roundedClass} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
