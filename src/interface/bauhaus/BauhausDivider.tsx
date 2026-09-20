import React from 'react';

// BauhausDivider — horizontal rule in Bauhaus style.

interface BauhausDividerProps {
  variant?: 'thin' | 'medium' | 'thick' | 'accent';
  color?: 'black' | 'red' | 'blue' | 'yellow' | 'light';
  width?: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  black: '#111111',
  red: '#E53935',
  blue: '#2457A6',
  yellow: '#F4C430',
  light: '#C8C0B4',
};

const HEIGHT_MAP: Record<string, string> = {
  thin: '1px',
  medium: '2px',
  thick: '3px',
  accent: '3px',
};

export const BauhausDivider: React.FC<BauhausDividerProps> = ({
  variant = 'thin',
  color = 'black',
  width = '100%',
  className = '',
}) => (
  <hr
    className={`border-none shrink-0 ${className}`}
    style={{
      height: HEIGHT_MAP[variant],
      backgroundColor: variant === 'accent' ? '#E53935' : COLOR_MAP[color],
      width: variant === 'accent' ? '48px' : width,
      margin: 0,
    }}
    aria-hidden="true"
  />
);
