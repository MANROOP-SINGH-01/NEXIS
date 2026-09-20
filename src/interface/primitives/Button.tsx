import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'info' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  nestedIcon?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  nestedIcon = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'group inline-flex items-center justify-center font-bold tracking-wider select-none cursor-pointer touch-manipulation transition-all duration-120 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none motion-reduce:transform-none motion-reduce:transition-none';

  const sizeStyles = {
    sm: 'text-[11px] px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-[12px] px-5 py-2.5 min-h-[40px] sm:min-h-[38px] gap-2',
    lg: 'text-[13px] px-7 py-3 min-h-[44px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#E53935] hover:bg-[#C92C2C] text-white border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[4px_4px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#111111] uppercase',
    secondary:
      'bg-[#F5F0E6] hover:bg-[#FFFFFF] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111111] uppercase',
    outline:
      'bg-transparent hover:bg-[#FAF8F5] text-[#111111] border-2 border-[#111111] hover:-translate-y-0.5 active:translate-y-0.5 uppercase',
    ghost:
      'bg-transparent hover:bg-[#EFE7D8] text-[#111111] hover:text-[#111111] border border-transparent hover:border-[#111111] uppercase',
    danger:
      'bg-[#E53935] hover:bg-[#C92C2C] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 uppercase',
    success:
      'bg-[#F4C430] hover:bg-[#E0B020] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 uppercase',
    info:
      'bg-[#2457A6] hover:bg-[#1A4280] text-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 uppercase',
    glow:
      'bg-[#F4C430] hover:bg-[#E0B020] text-[#111111] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:shadow-[4px_4px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0.5 uppercase',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        borderRadius: '0px',
        transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
      }}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon ? (
        nestedIcon ? (
          <span
            className="shrink-0 ml-1 flex items-center justify-center w-5 h-5 transition-transform duration-120 group-hover:translate-x-0.5 motion-reduce:transform-none"
            style={{
              backgroundColor: variant === 'secondary' || variant === 'outline' ? '#111111' : '#FFFFFF',
              color: variant === 'secondary' || variant === 'outline' ? '#F5F0E6' : '#111111',
              border: '1px solid #111111',
            }}
          >
            {rightIcon}
          </span>
        ) : (
          <span className="shrink-0 transition-transform duration-120 group-hover:translate-x-1 motion-reduce:transform-none">
            {rightIcon}
          </span>
        )
      ) : null}
    </button>
  );
};
