import React from 'react';
import { AlertCircle, UserCheck, FileCheck, ShieldCheck, CheckCircle2, ShieldAlert, Info } from 'lucide-react';

export type EvidenceLevelCode =
  | 'UNVERIFIED'
  | 'SELF_REPORTED'
  | 'PARTIALLY_VERIFIED'
  | 'HIGHLY_VERIFIED'
  | 'FULLY_VERIFIED'
  | 'CONFLICTING';

interface EvidenceBadgeProps {
  score?: number;
  levelCode?: EvidenceLevelCode | string;
  label?: string;
  isDisputed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showFormulaScore?: boolean;
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  score = 25,
  levelCode = 'SELF_REPORTED',
  label,
  isDisputed = false,
  size = 'md',
  showFormulaScore = true,
  className = '',
}) => {
  const activeLevel = isDisputed ? 'CONFLICTING' : (levelCode as EvidenceLevelCode);

  const config = {
    UNVERIFIED: {
      bg: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
      icon: <AlertCircle className="shrink-0 text-zinc-400" />,
      defaultLabel: 'Unverified',
      tier: 'Level 0',
    },
    SELF_REPORTED: {
      bg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
      icon: <UserCheck className="shrink-0 text-amber-400" />,
      defaultLabel: 'Self-reported',
      tier: 'Level 1',
    },
    PARTIALLY_VERIFIED: {
      bg: 'bg-blue-950/40 border-blue-800/60 text-blue-300',
      icon: <FileCheck className="shrink-0 text-blue-400" />,
      defaultLabel: 'Partially verified',
      tier: 'Level 2',
    },
    HIGHLY_VERIFIED: {
      bg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
      icon: <ShieldCheck className="shrink-0 text-emerald-400" />,
      defaultLabel: 'Highly verified',
      tier: 'Level 3',
    },
    FULLY_VERIFIED: {
      bg: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300',
      icon: <CheckCircle2 className="shrink-0 text-indigo-400" />,
      defaultLabel: 'Fully verified',
      tier: 'Level 4',
    },
    CONFLICTING: {
      bg: 'bg-rose-950/50 border-rose-800/80 text-rose-300',
      icon: <ShieldAlert className="shrink-0 text-rose-400 animate-pulse" />,
      defaultLabel: 'Conflicting evidence',
      tier: 'Disputed',
    },
  }[activeLevel] || {
    bg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
    icon: <AlertCircle className="shrink-0 text-zinc-400" />,
    defaultLabel: 'Unverified',
    tier: 'Level 0',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const displayLabel = label || config.defaultLabel;

  return (
    <div
      className={`inline-flex items-center rounded-full border font-mono tracking-tight font-medium ${config.bg} ${sizeClasses} ${className}`}
      title={`Evidence Status: ${displayLabel} (${config.tier}) — Formula: C = min(100, 25S + 25E + 20D + 15T + 15X)`}
    >
      {React.cloneElement(config.icon, { className: `${iconSizes} shrink-0` })}
      <span>{displayLabel}</span>
      {showFormulaScore && !isDisputed && (
        <span className="opacity-75 font-semibold bg-black/40 px-1.5 py-0.2 rounded-full text-[10px]">
          {score}%
        </span>
      )}
      {isDisputed && (
        <span className="bg-rose-900/60 text-rose-200 uppercase font-bold text-[9px] px-1 rounded">
          Dispute
        </span>
      )}
    </div>
  );
};

export default EvidenceBadge;
