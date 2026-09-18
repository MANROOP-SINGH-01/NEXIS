import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, ArrowRight, CheckCircle2, Lock, X } from 'lucide-react';
import { ConsentScope } from '../../types';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { useLocale } from '../../integration/hooks/useLocale';

interface ConsentScreenProps {
  onConsentsSaved: (scopes: Record<ConsentScope, boolean>) => Promise<boolean>;
  onDismiss?: () => void;
}

interface ScopeDefinition {
  scope: ConsentScope;
  title: string;
  description: string;
  dataAccess: string;
  defaultGranted: boolean;
}

const SCOPES_CONFIG: ScopeDefinition[] = [
  {
    scope: 'JOB_SEARCH_DATA',
    title: 'Job Search & Opportunity Matching',
    description: 'Allows processing your verified skills, course history, and career telemetry to surface high-fit blue-ocean job openings.',
    dataAccess: 'Visible to: Nexus-Hunter & AI job matching engines',
    defaultGranted: true,
  },
  {
    scope: 'EMPLOYER_SHARING',
    title: 'Employer Profile Sharing',
    description: 'Allows sharing your verified candidate summary and competencies with vetted hiring partners for direct interview scheduling.',
    dataAccess: 'Visible to: Verified corporate and hiring partners',
    defaultGranted: true,
  },
  {
    scope: 'ANALYTICS',
    title: 'Skill Analytics & Feedback Loop',
    description: 'Allows using aggregated, de-identified training metrics to evaluate course efficacy and improve curriculum roadmaps.',
    dataAccess: 'Visible to: Vocational program directors & training institutes',
    defaultGranted: true,
  },
  {
    scope: 'GOVT_CROSS_CHECK',
    title: 'Government Registry & Certificate Verification',
    description: 'Allows authorities to verify your training certification and enrolment credentials against national registries.',
    dataAccess: 'Visible to: Ministry auditing bodies (PMKVY / NCVET / DDU-GKY)',
    defaultGranted: false,
  },
];

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onConsentsSaved, onDismiss }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [consents, setConsents] = useState<Record<ConsentScope, boolean>>({
    JOB_SEARCH_DATA: true,
    EMPLOYER_SHARING: true,
    ANALYTICS: true,
    GOVT_CROSS_CHECK: false,
  });

  const { t } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleToggle = (scope: ConsentScope) => {
    setConsents((prev) => ({
      ...prev,
      [scope]: !prev[scope],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasAnyGranted = Object.values(consents).some((val) => val === true);
    if (!hasAnyGranted) {
      setError('Please grant at least one consent scope to proceed with career services.');
      return;
    }

    setSubmitting(true);
    try {
      await onConsentsSaved(consents);
      setIsDismissed(true);
      onDismiss?.();
    } catch (err) {
      setIsDismissed(true);
      onDismiss?.();
    } finally {
      setSubmitting(false);
    }
  };

  const grantedCount = Object.values(consents).filter(Boolean).length;

  if (isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 pointer-events-auto overflow-hidden">
      {/* Frosted Glass Backdrop */}
      <div 
        onClick={handleDismiss}
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#12131c] rounded-2xl shadow-2xl shadow-black/80 p-6 md:p-8 border border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono mb-2">
              <ShieldCheck size={13} />
              <span>DPDP ACT 2023 COMPLIANT</span>
            </div>
            <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight leading-tight">
              {t('consentTitle') || 'Candidate Data Privacy & Consent'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {t('consentSubtitle') || 'Configure how your telemetry, skill records, and career data are processed.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-semibold underline text-rose-300 hover:text-white cursor-pointer shrink-0"
            >
              Continue Anyway
            </button>
          </div>
        )}

        {/* Scopes List */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {SCOPES_CONFIG.map((item) => {
              const isChecked = !!consents[item.scope];
              return (
                <div
                  key={item.scope}
                  onClick={() => handleToggle(item.scope)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-zinc-900/90 border-indigo-500/40 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-zinc-100">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60">
                          {item.scope}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                        {item.description}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{item.dataAccess}</span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pt-0.5">
                      <div
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                          isChecked ? 'bg-indigo-600' : 'bg-zinc-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>
                {grantedCount} of {SCOPES_CONFIG.length} scopes granted
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
              <Button
                type="submit"
                variant="glow"
                size="sm"
                isLoading={submitting}
                rightIcon={<ArrowRight size={14} />}
              >
                Confirm & Continue
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
