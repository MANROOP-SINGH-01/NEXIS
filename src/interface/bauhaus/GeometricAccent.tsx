import React from 'react';

// ═══════════════════════════════════════════════════════════════
// GeometricAccent — Bauhaus decorative SVG primitives
// ═══════════════════════════════════════════════════════════════
// Reusable geometric shapes for composition, framing, and rhythm.
// Use to frame sections, establish hierarchy, or add visual interest.

type Shape = 'circle' | 'semicircle' | 'quarterCircle' | 'triangle' | 'square' | 'line' | 'grid' | 'bars';
type BauhausColor = 'red' | 'yellow' | 'blue' | 'black' | 'deepRed' | 'deepBlue';

const COLOR_MAP: Record<BauhausColor, string> = {
  red: '#E53935',
  yellow: '#F4C430',
  blue: '#2457A6',
  black: '#111111',
  deepRed: '#C92C2C',
  deepBlue: '#173F7A',
};

interface GeometricAccentProps {
  shape: Shape;
  color?: BauhausColor;
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const GeometricAccent: React.FC<GeometricAccentProps> = ({
  shape,
  color = 'red',
  size = 48,
  rotate = 0,
  className = '',
  style,
}) => {
  const fill = COLOR_MAP[color];
  const transform = rotate ? `rotate(${rotate})` : undefined;

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="48" fill={fill} transform={transform} style={{ transformOrigin: '50px 50px' }} />
          </svg>
        );
      case 'semicircle':
        return (
          <svg width={size} height={size / 2} viewBox="0 0 100 50" fill="none">
            <path d="M 0 50 A 50 50 0 0 1 100 50 Z" fill={fill} transform={transform} style={{ transformOrigin: '50px 25px' }} />
          </svg>
        );
      case 'quarterCircle':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <path d="M 0 0 L 100 0 A 100 100 0 0 1 0 100 Z" fill={fill} transform={transform} style={{ transformOrigin: '50px 50px' }} />
          </svg>
        );
      case 'triangle':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 95,95 5,95" fill={fill} transform={transform} style={{ transformOrigin: '50px 50px' }} />
          </svg>
        );
      case 'square':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <rect x="4" y="4" width="92" height="92" fill={fill} transform={transform} style={{ transformOrigin: '50px 50px' }} />
          </svg>
        );
      case 'line':
        return (
          <svg width={size} height={4} viewBox={`0 0 ${size} 4`} fill="none">
            <rect width={size} height="3" fill={fill} />
          </svg>
        );
      case 'grid':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {[0, 20, 40, 60, 80].map((y) => (
              <rect key={y} x="0" y={y} width="100" height="3" fill={fill} opacity="0.7" />
            ))}
          </svg>
        );
      case 'bars':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {[0, 14, 28, 42, 56, 70, 84].map((x) => (
              <rect key={x} x={x} y="0" width="6" height="100" fill={fill} opacity="0.8" />
            ))}
          </svg>
        );
      default:
        return null;
    }
  };


  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, ...style }}
      aria-hidden="true"
    >
      {renderShape()}
    </div>
  );
};
