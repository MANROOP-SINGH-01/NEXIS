import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'SYNCHRONIZING...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative flex items-center justify-center w-12 h-12 mb-4">
        <div
          className="absolute inset-0 border animate-ping"
          style={{ borderColor: 'rgba(229,57,53,0.3)', borderRadius: '0' }}
        />
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#E53935' }} />
      </div>
      <p
        className="animate-pulse"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: '#111111',
        }}
      >
        {message}
      </p>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: 'rgba(17,17,17,0.06)' }}
    />
  );
};
