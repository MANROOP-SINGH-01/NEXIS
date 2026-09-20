/**
 * FILE: src/interface/primitives/AdzunaAttributionBadge.tsx
 * PURPOSE: Official "Jobs by Adzuna" Attribution Badge complying with Adzuna Developer ToS.
 * SPEC: Master Implementation Spec Section 4.2, Section 18.1, and Phase 7 (Defect #2 Fix).
 * SIZING: >= 116x23 pixels, hyperlinked to https://www.adzuna.in.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface AdzunaAttributionBadgeProps {
  country?: string;
  className?: string;
  variant?: 'standard' | 'compact' | 'dark';
}

export const AdzunaAttributionBadge: React.FC<AdzunaAttributionBadgeProps> = ({
  country = 'in',
  className = '',
  variant = 'standard',
}) => {
  const targetUrl = country === 'in' ? 'https://www.adzuna.in' : 'https://www.adzuna.com';

  const isDark = variant === 'dark';

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Job listings powered by the official Adzuna India API"
      className={`inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition-transform hover:-translate-y-0.5 select-none ${
        isDark ? 'bg-[#111111] text-white' : 'bg-[#FFFFFF] text-[#111111]'
      } ${className}`}
      style={{ minWidth: 120, minHeight: 28 }}
    >
      {/* Official Adzuna Brand Textmark / Logotype */}
      <span className="text-[11px] font-mono font-bold tracking-tight text-[#555555]">
        Jobs by
      </span>
      <span className="text-xs font-mono font-black tracking-tight text-[#2457A6]">
        Adzuna
      </span>
      <span className="text-[10px] font-mono font-bold bg-[#EBF3FC] text-[#2457A6] border border-[#2457A6] px-1 py-0.2">
        {country.toUpperCase()}
      </span>
      <ExternalLink size={11} className="text-[#555555]" />
    </a>
  );
};

export default AdzunaAttributionBadge;
