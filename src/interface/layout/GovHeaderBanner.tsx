/**
 * FILE: src/interface/layout/GovHeaderBanner.tsx
 * PURPOSE: Government-Credible Header & Section 25.3 Mandatory Synthetic Data Trust Banner.
 * SPECIFICATION: Master Spec Section 5.3 (Defect #5), Section 21.4, Section 25.3 & Section 27 (Phase 15).
 * INVARIANTS:
 *   1. Displays exact binding disclaimer: "Synthetic demonstration data — not official Maharashtra government statistics".
 *   2. Incorporates Devanagari typography and official state header accents without falsely impersonating an official seal.
 *   3. Preserves 3D Office and surrounding layouts without overlapping critical interactive controls.
 */

import React, { useState } from 'react';
import { AlertTriangle, Info, Shield, ExternalLink, X, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useLocale } from '../../i18n';

export const GovHeaderBanner: React.FC = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const { locale, setLocale } = useLocale();

  return (
    <div className="w-full flex flex-col shrink-0 select-none z-[130] relative">
      {/* 1. Official National Tri-Color Accent Strip */}
      <div className="gov-tricolor-strip" />

      {/* 2. Official Maharashtra Government Civic Header Bar */}
      <div className="gov-portal-bar px-3 sm:px-6 py-1.5 flex items-center justify-between gap-3 text-[11px]">
        {/* Left: State Portal Identification */}
        <div className="flex items-center gap-2.5 truncate">
          {/* Stylized State Innovation Insignia (Prototype Seal — respects Section 21.4) */}
          <div 
            className="w-6 h-6 rounded-full bg-[#1E293B] border border-amber-400/40 flex items-center justify-center shrink-0 shadow-sm"
            title="State Innovation Sandbox Prototype — SIH 2026"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold tracking-wide text-slate-200">
              महाराष्ट्र शासन • Government of Maharashtra
            </span>
            <span className="hidden lg:inline text-slate-400">|</span>
            <span className="hidden lg:inline text-slate-300 truncate">
              कौशल्य विकास, रोजगार व उद्योजकता विभाग (Skill Development & Entrepreneurship)
            </span>
          </div>
        </div>

        {/* Right: Sandbox Label, Language & Compliance Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
            SIH 2026 PROTOTYPE
          </span>

          <div className="flex items-center text-[10px] font-mono text-slate-300 gap-1 bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            <Globe className="w-3 h-3 text-slate-400" />
            <button 
              onClick={() => setLocale(locale === 'mr' ? 'en' : 'mr')}
              className="hover:text-amber-300 cursor-pointer font-bold"
              title="Toggle Language Display"
            >
              {locale === 'mr' ? 'English' : 'मराठी'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Section 25.3 Mandatory Synthetic Demonstration Data Trust Banner */}
      {!isBannerCollapsed ? (
        <div 
          className="gov-disclaimer-banner px-3 sm:px-6 py-1 flex items-center justify-between gap-2 text-[11px] sm:text-[12px] border-b"
          role="region"
          aria-label="Synthetic Data Notice"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <div className="truncate flex items-center gap-2">
              <span className="font-bold text-amber-950 tracking-tight">
                Synthetic demonstration data — not official Maharashtra government statistics
              </span>
              <span className="hidden md:inline text-amber-800 text-[11px] opacity-80 font-devanagari">
                (प्रात्यक्षिक डेटा — अधिकृत शासन आकडेवारी नाही)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
            >
              <Info className="w-3 h-3" />
              <span>Section 25.3 Disclosure</span>
            </button>
            <button
              onClick={() => setIsBannerCollapsed(true)}
              className="text-amber-800 hover:text-amber-950 p-0.5 rounded cursor-pointer"
              title="Collapse banner to compact status ribbon"
              aria-label="Collapse banner"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Compact State */
        <div className="bg-amber-100/90 border-b border-amber-300 px-3 sm:px-6 py-0.5 flex items-center justify-between text-[10px] text-amber-900 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold">DEMO DATASET (SEC 25.3)</span>
            <span className="hidden sm:inline opacity-75">— 500 Calibrated Synthetic Trainees</span>
          </div>
          <button
            onClick={() => setIsBannerCollapsed(false)}
            className="flex items-center gap-1 text-amber-900 hover:text-amber-950 font-bold uppercase underline cursor-pointer"
          >
            <span>Show Notice</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 4. Section 25.3 Detailed Disclosure Modal */}
      {isDetailsOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div 
            className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#0F172A] max-w-lg w-full p-6 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#15803D]" />
                <h3 className="text-base font-black uppercase tracking-tight font-heading">
                  Section 25.3 Public Trust Disclosure
                </h3>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 hover:bg-slate-100 border border-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">
                In strict adherence to SIH26135 Master Specification Section 25.3:
              </p>
              <div className="bg-amber-50 border border-amber-300 p-3 text-amber-900 font-mono text-[11px] space-y-1">
                <p className="font-bold">
                  "Synthetic demonstration data — not official Maharashtra government statistics"
                </p>
                <p className="opacity-80">
                  प्रात्यक्षिक डेटा संच — अधिकृत महाराष्ट्र शासन आकडेवारी नाही.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-1.5 text-slate-800">
                <li>
                  <strong>Demonstration Boundary:</strong> Includes ~500 synthetic trainees, 12 vocational training providers, 36 Maharashtra districts, and 25 participating employers calibrated against real industrial corridors (Pune, Nagpur, Chhatrapati Sambhajinagar).
                </li>
                <li>
                  <strong>Anti-Overranking Guarantee (Section 20):</strong> Training providers are evaluated on coverage-adjusted 90-day retention with 95% Wilson confidence intervals, rather than unweighted vanity placement percentages.
                </li>
                <li>
                  <strong>Privacy & DPDP Act 2025:</strong> Synthetic records safeguard genuine citizens. All live telemetry and consent revocations strictly enforce the DPDP Phase-1 &amp; Phase-2 consent manager standards.
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-800 border border-slate-900 cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovHeaderBanner;
