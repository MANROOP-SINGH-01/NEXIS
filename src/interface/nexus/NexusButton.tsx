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
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  }[size];

  const roundedClass = pill ? 'rounded-full' : 'rounded-xl';

  const variantClasses = {
    primary:
      'bg-[#F47B20] text-white hover:bg-[#E36D13] active:bg-[#CC5D08] shadow-[0_2px_8px_rgba(244,123,32,0.28)] border border-transparent font-semibold',
    dark:
      'bg-[#181512] text-white hover:bg-[#2B2621] active:bg-[#100E0C] shadow-[0_2px_6px_rgba(24,21,18,0.2)] border border-transparent font-semibold',
    secondary:
      'bg-white text-[#181512] border border-[#EADFCF] hover:bg-[#F7F2EA] active:bg-[#EFE7DC] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
    ghost:
      'bg-transparent text-[#6A6359] hover:text-[#181512] hover:bg-[#F2ECE2] active:bg-[#E8DFC0] border border-transparent font-medium',
    danger:
      'bg-[#D9453B] text-white hover:bg-[#C2382F] active:bg-[#A92E26] shadow-[0_2px_8px_rgba(217,69,59,0.25)] border border-transparent font-semibold',
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
