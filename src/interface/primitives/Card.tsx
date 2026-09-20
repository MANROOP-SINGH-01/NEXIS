import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'bordered' | 'double-bezel';
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
  const baseStyles =
    'transition-all duration-150 touch-manipulation motion-reduce:transform-none motion-reduce:transition-none';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-[#C8C0B4]',
    elevated: 'bg-white border-2 border-[#111111] shadow-[2px_2px_0px_#111111]',
    glass: 'bg-[#F5F0E6] border border-[#C8C0B4]',
    gradient: 'bg-[#EFE7D8] border border-[#C8C0B4]',
    bordered: 'bg-transparent border-2 border-[#111111]',
    'double-bezel': 'double-bezel',
  };

  const hoverStyles = hoverable
    ? 'hover:border-[#111111] hover:shadow-[3px_3px_0px_#111111] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer'
    : '';

  if (variant === 'double-bezel') {
    return (
      <div
        className={`double-bezel ${baseStyles} ${hoverStyles} ${className}`}
        style={{
          borderRadius: '0px',
          transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
        }}
        {...props}
      >
        <div
          className={`double-bezel-inner ${paddingStyles[padding]}`}
          style={{ borderRadius: '0px' }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      style={{
        borderRadius: '0px',
        transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
      }}
      {...props}
    >
      {children}
    </div>
  );
};
