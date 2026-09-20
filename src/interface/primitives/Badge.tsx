import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'cyan' | 'mint' | 'amber' | 'coral' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  pulseDot?: boolean;
}

// Bauhaus-mapped badge colors
const variantMap = {
  indigo:  { bg: 'rgba(36,87,166,0.1)',  text: '#2457A6', border: 'rgba(36,87,166,0.3)',  dot: '#2457A6' },
  cyan:    { bg: 'rgba(36,87,166,0.08)', text: '#173F7A', border: 'rgba(23,63,122,0.25)', dot: '#173F7A' },
  mint:    { bg: 'rgba(46,125,50,0.1)',  text: '#2E7D32', border: 'rgba(46,125,50,0.3)',  dot: '#2E7D32' },
  amber:   { bg: 'rgba(244,196,48,0.15)', text: '#8B6914', border: 'rgba(244,196,48,0.3)', dot: '#F4C430' },
  coral:   { bg: 'rgba(229,57,53,0.1)',  text: '#E53935', border: 'rgba(229,57,53,0.3)',  dot: '#E53935' },
  purple:  { bg: 'rgba(23,63,122,0.1)', text: '#173F7A', border: 'rgba(23,63,122,0.3)', dot: '#173F7A' },
  neutral: { bg: 'rgba(17,17,17,0.06)', text: '#4A4A4A', border: 'rgba(17,17,17,0.15)',  dot: '#7A7A7A' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'indigo',
  size = 'md',
  pulseDot = false,
  className = '',
  ...props
}) => {
  const v = variantMap[variant];

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase ${className}`}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: size === 'sm' ? '9px' : '10px',
        letterSpacing: '0.08em',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        gap: '6px',
        backgroundColor: v.bg,
        color: v.text,
        border: `1px solid ${v.border}`,
        borderRadius: '0px',
      }}
      {...props}
    >
      {pulseDot && (
        <span className="relative flex" style={{ width: '6px', height: '6px' }}>
          <span
            className="animate-ping absolute inline-flex"
            style={{ width: '100%', height: '100%', backgroundColor: v.dot, opacity: 0.6 }}
          />
          <span
            className="relative inline-flex"
            style={{ width: '6px', height: '6px', backgroundColor: v.dot }}
          />
        </span>
      )}
      {children}
    </span>
  );
};
