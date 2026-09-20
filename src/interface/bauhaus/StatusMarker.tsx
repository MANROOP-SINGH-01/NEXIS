import React from 'react';

// StatusMarker — Geometric agent/task status indicators.
// ● active  ■ processing  ▲ waiting  ━ idle  ✕ error

type Status = 'active' | 'working' | 'processing' | 'waiting' | 'idle' | 'error' | 'talking' | 'standby';

interface StatusMarkerProps {
  status: Status;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<Status, { shape: string; color: string; label: string }> = {
  active:     { shape: 'circle',   color: '#2E7D32', label: 'ACTIVE' },
  working:    { shape: 'circle',   color: '#2457A6', label: 'WORKING' },
  processing: { shape: 'square',   color: '#2457A6', label: 'PROCESSING' },
  talking:    { shape: 'circle',   color: '#F4C430', label: 'CONSULTING' },
  waiting:    { shape: 'triangle', color: '#F4C430', label: 'WAITING' },
  idle:       { shape: 'line',     color: '#C8C0B4', label: 'STANDBY' },
  standby:    { shape: 'line',     color: '#C8C0B4', label: 'STANDBY' },
  error:      { shape: 'cross',    color: '#E53935', label: 'ERROR' },
};

export const StatusMarker: React.FC<StatusMarkerProps> = ({
  status,
  size = 10,
  showLabel = false,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  const renderShape = () => {
    switch (config.shape) {
      case 'circle':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4.5" fill={config.color} />
          </svg>
        );
      case 'square':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10">
            <rect x="1" y="1" width="8" height="8" fill={config.color} />
          </svg>
        );
      case 'triangle':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10">
            <polygon points="5,1 9,9 1,9" fill={config.color} />
          </svg>
        );
      case 'line':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10">
            <rect x="1" y="4" width="8" height="2" fill={config.color} />
          </svg>
        );
      case 'cross':
        return (
          <svg width={size} height={size} viewBox="0 0 10 10">
            <line x1="2" y1="2" x2="8" y2="8" stroke={config.color} strokeWidth="2" />
            <line x1="8" y1="2" x2="2" y2="8" stroke={config.color} strokeWidth="2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="shrink-0" aria-hidden="true">{renderShape()}</span>
      {showLabel && (
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: config.color,
          }}
        >
          {config.label}
        </span>
      )}
    </span>
  );
};
