import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Synchronizing intelligence...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative flex items-center justify-center w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
      <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className}`} />
  );
};
