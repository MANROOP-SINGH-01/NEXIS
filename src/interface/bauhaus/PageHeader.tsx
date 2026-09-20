import React from 'react';
import { GeometricAccent } from './GeometricAccent';

// ═══════════════════════════════════════════════════════════════
// PageHeader — Editorial page-level header
// ═══════════════════════════════════════════════════════════════
// Every major page uses this: section number + massive headline
// + optional subtitle + geometric accent.

export interface PageHeaderProps {
  sectionCode?: string;     // e.g. "01"
  sectionNumber?: string;   // alias for sectionCode
  sectionLabel?: string;    // e.g. "COMMAND"
  code?: string;            // alias for sectionLabel
  headline?: string;        // e.g. "CAREER\nOPERATING\nSYSTEM"
  title?: string;           // alias for headline
  subtitle?: string;
  action?: React.ReactNode; // optional top-right action block
  accentColor?: 'red' | 'yellow' | 'blue' | 'black';
  accentShape?: 'circle' | 'semicircle' | 'quarterCircle' | 'triangle' | 'square';
  className?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  sectionCode,
  sectionNumber,
  sectionLabel,
  code,
  headline,
  title,
  subtitle,
  action,
  accentColor = 'red',
  accentShape = 'circle',
  className = '',
  children,
}) => {
  const effectiveSectionCode = sectionCode || sectionNumber || '01';
  const effectiveSectionLabel = sectionLabel || code || 'OVERVIEW';
  const effectiveHeadline = headline || title || 'NEXIS';

  return (
    <header className={`relative py-6 md:py-8 ${className}`}>
      {/* Section number + label + optional action */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <span
            className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#7A7A7A]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            [{effectiveSectionCode}] // {effectiveSectionLabel}
          </span>
          <div className="flex-1 h-[1px] bg-[#C8C0B4]" />
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="flex items-start justify-between gap-8">
        {/* Headline block */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-[clamp(26px,4vw,44px)] font-black leading-[1.08] tracking-[-0.02em] text-[#111111] uppercase whitespace-pre-line"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {effectiveHeadline}
          </h1>
          {subtitle && (
            <p
              className="mt-2 text-[14px] font-mono leading-[1.5] text-[#555555] max-w-[680px]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {subtitle}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* Geometric accent — decorative */}
        <div className="hidden md:flex shrink-0 items-start pt-1">
          <GeometricAccent shape={accentShape} color={accentColor} size={64} />
        </div>
      </div>

      {/* Bottom rule */}
      <div className="mt-6 h-[2px] bg-[#111111]" />
    </header>
  );
};

export default PageHeader;
