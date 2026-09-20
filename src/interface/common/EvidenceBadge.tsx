/**
 * FILE: src/interface/common/EvidenceBadge.tsx
 * PURPOSE: Standardized Evidence Class Badge (Master Spec Section 21.3 HCI Rules).
 * SPECIFICATION: Visually distinguishes VERIFIED, SELF_REPORTED, and INFERRED evidence.
 *                Never communicates trust level by color alone — uses distinct icons,
 *                Devanagari dual-labels, and confidence score indicators.
 */

import React from 'react';
import { ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

export type EvidenceType = 'VERIFIED' | 'SELF_REPORTED' | 'INFERRED';

export interface EvidenceBadgeProps {
  type: EvidenceType;
  confidence?: number; // 0.0 to 1.0 or percentage
  evidenceRef?: string; // e.g., 'EVID-9021', 'EPFO-T30'
  sourceSpan?: string;
  showDevanagari?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  type,
  confidence,
  evidenceRef,
  sourceSpan,
  showDevanagari = true,
  className = '',
  size = 'sm',
}) => {
  const normType = (type || 'SELF_REPORTED').toUpperCase() as EvidenceType;

  // Format confidence display if present
  const confText = typeof confidence === 'number' 
    ? (confidence <= 1 ? `${Math.round(confidence * 100)}%` : `${Math.round(confidence)}%`)
    : null;

  if (normType === 'VERIFIED') {
    return (
      <span
        className={`badge-evidence-verified ${size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'} rounded-none border ${className}`}
        title={`Verified Ground Truth: Supported by external employer or administrative confirmation. ${evidenceRef ? `Ref: ${evidenceRef}` : ''}`}
      >
        <ShieldCheck className={size === 'md' ? 'w-3.5 h-3.5 text-[#15803D]' : 'w-3 h-3 text-[#15803D]'} />
        <span>VERIFIED</span>
        {showDevanagari && <span className="font-normal opacity-75 font-devanagari text-[9px]">सत्यापित</span>}
        {confText && <span className="ml-1 font-mono text-[9px] bg-[#15803D]/20 px-1 py-0.2">95% CI</span>}
      </span>
    );
  }

  if (normType === 'INFERRED') {
    return (
      <span
        className={`badge-evidence-inferred ${size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'} rounded-none border ${className}`}
        title={`AI / Statistical Inference: Derived via taxonomy matching or longitudinal trajectory. ${confText ? `Confidence: ${confText}` : ''}`}
      >
        <Sparkles className={size === 'md' ? 'w-3.5 h-3.5 text-[#1D4ED8]' : 'w-3 h-3 text-[#1D4ED8]'} />
        <span>INFERRED</span>
        {showDevanagari && <span className="font-normal opacity-75 font-devanagari text-[9px]">अनुमानित</span>}
        {confText && <span className="ml-1 font-mono text-[9px] bg-[#1D4ED8]/20 px-1 py-0.2">{confText}</span>}
      </span>
    );
  }

  // Fallback: SELF_REPORTED
  return (
    <span
      className={`badge-evidence-self-reported ${size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'} rounded-none border ${className}`}
      title="Self-Reported: Submitted directly by trainee or provider without third-party confirmation."
    >
      <UserCheck className={size === 'md' ? 'w-3.5 h-3.5 text-[#B45309]' : 'w-3 h-3 text-[#B45309]'} />
      <span>SELF-REPORTED</span>
      {showDevanagari && <span className="font-normal opacity-75 font-devanagari text-[9px]">स्वयं-घोषित</span>}
    </span>
  );
};

export default EvidenceBadge;
