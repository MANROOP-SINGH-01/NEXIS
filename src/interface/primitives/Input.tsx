import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: '#4A4A4A',
          }}
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none" style={{ color: '#7A7A7A' }}>
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full text-sm transition-all duration-150 ${leftIcon ? 'pl-10' : 'pl-3.5'} ${rightIcon ? 'pr-10' : 'pr-3.5'} ${className}`}
          style={{
            fontFamily: "'Inter', sans-serif",
            backgroundColor: '#FFFFFF',
            color: '#111111',
            padding: leftIcon ? undefined : '10px 14px',
            paddingTop: '10px',
            paddingBottom: '10px',
            border: error ? '2px solid #E53935' : '1px solid #C8C0B4',
            borderRadius: '0px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? '#E53935' : '#111111';
            e.target.style.borderWidth = '2px';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#E53935' : '#C8C0B4';
            e.target.style.borderWidth = error ? '2px' : '1px';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center" style={{ color: '#7A7A7A' }}>
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p style={{ fontSize: '12px', color: '#E53935', fontFamily: "'Inter', sans-serif" }}>{error}</p>
      ) : helperText ? (
        <p style={{ fontSize: '12px', color: '#7A7A7A', fontFamily: "'Inter', sans-serif" }}>{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
