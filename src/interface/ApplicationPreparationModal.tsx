import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
  Lock,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { ApplicationFormField } from '../types';

export const ApplicationPreparationModal: React.FC = () => {
  const {
    isApplicationModalOpen,
    activeProposal,
    setApplicationModalOpen,
    updateApplicationProposalStage,
    workHistoryProfile,
    currentResume
  } = useCoreStore();

  const [formInputs, setFormInputs] = useState<Record<string, string>>({
    desired_salary: 'Competitive Market Rate (130k+)',
    earliest_start_date: 'Within 2-3 weeks',
    custom_question: 'Focus on distributed systems resilience and developer tooling performance.',
  });

  const [confirmedTruthful, setConfirmedTruthful] = useState<boolean>(false);

  if (!isApplicationModalOpen || !activeProposal) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleProceedToStage2 = () => {
    updateApplicationProposalStage('submit-approval', formInputs);
  };

  const handleBackToStage1 = () => {
    updateApplicationProposalStage('field-approval');
  };

  const handleFinalSubmitConfirmation = () => {
    updateApplicationProposalStage('submitted', formInputs);
    // Add activity log
    useCoreStore.getState().addNexusActivityEntry({
      agentType: 'hunter',
      action: `Prepared verified application package for ${activeProposal.role} at ${activeProposal.company}`,
      result: { ats: activeProposal.atsType, stage: 'submitted' },
      impact: 'positive',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#121317] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans text-[#EDEDED]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/8 bg-[#121317] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 text-[#FF5C1A]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#EDEDED] tracking-tight">
                  Two-Phase ATS Application Navigator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20">
                  {activeProposal.atsType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#8B949E]">
                {activeProposal.role} at <span className="text-[#EDEDED] font-semibold">{activeProposal.company}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setApplicationModalOpen(false)}
            className="p-1.5 rounded-full text-[#8B949E] hover:text-[#EDEDED] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Indicator Steps */}
        <div className="grid grid-cols-2 border-b border-white/8 bg-[#0D0E13] text-xs font-mono">
          <div
            className={`px-6 py-3 flex items-center gap-2.5 font-semibold border-r border-white/8 transition-colors ${
              activeProposal.stage === 'field-approval'
                ? 'text-[#FF5C1A] bg-[#FF5C1A]/10'
                : 'text-[#8B949E]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                activeProposal.stage === 'field-approval'
                  ? 'bg-[#FF5C1A] text-white'
                  : 'bg-white/10 text-[#8B949E]'
              }`}
            >
              1
            </span>
            <span>Phase 1: Field Mapping & Screen Review</span>
          </div>

          <div
            className={`px-6 py-3 flex items-center gap-2.5 font-semibold transition-colors ${
              activeProposal.stage === 'submit-approval' || activeProposal.stage === 'submitted'
                ? 'text-[#10B981] bg-[#10B981]/10'
                : 'text-[#8B949E]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                activeProposal.stage === 'submit-approval' || activeProposal.stage === 'submitted'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-white/10 text-[#8B949E]'
              }`}
            >
              2
            </span>
            <span>Phase 2: Final Verification & Submit Gate</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#F5F0E6]">
          {activeProposal.stage === 'field-approval' && (
            <>
              {/* Security Banner */}
              <div className="p-4 rounded-xl bg-[#121317] border border-white/8 flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#FF5C1A] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#EDEDED]">
                    Application Safety Protocol Active
                  </p>
                  <p className="text-[#8B949E] leading-relaxed">
                    NEXIS never silently submits applications. Review the pre-populated candidate facts, proposed screening answers, and direct ATS destination before proceeding to final authorization.
                  </p>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="p-4 rounded-xl bg-[#121317] border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#EDEDED] uppercase tracking-wider">
                    Target Endpoint Architecture
                  </span>
                  {activeProposal.directFormUrl && (
                    <a
                      href={activeProposal.directFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#FF5C1A] hover:text-[#FF7235] font-semibold transition-colors"
                    >
                      <span>Direct ATS URL</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#1A1B20] border border-white/8 shadow-2xs">
                    <span className="text-[#8B949E] block text-[11px] font-mono">System Type</span>
                    <span className="text-[#EDEDED] font-bold uppercase">{activeProposal.atsType}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1A1B20] border border-white/8 shadow-2xs">
                    <span className="text-[#8B949E] block text-[11px] font-mono">Submission Mode</span>
                    <span className="text-[#EDEDED] font-semibold">Direct Form Pre-fill</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1A1B20] border border-white/8 shadow-2xs">
                    <span className="text-[#8B949E] block text-[11px] font-mono">Iframe Workaround</span>
                    <span className="text-[#10B981] font-bold">Bypassed cross-origin</span>
                  </div>
                </div>
              </div>

              {/* Verified Auto-Filled Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-[#EDEDED] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    Verified Facts From Candidate Profile
                  </h3>
                  <span className="text-[11px] font-mono text-[#8B949E]">Grounded in factual career record</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {Object.entries(activeProposal.autoFillFields).map(([label, val]) => (
                    <div key={label} className="p-2.5 rounded-lg bg-[#121317] border border-white/8 shadow-2xs">
                      <span className="text-[10px] font-mono text-[#8B949E] block font-medium uppercase">{label}</span>
                      <span className="text-[#EDEDED] font-medium truncate block">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Screening Answers */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-[#EDEDED] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF5C1A]" />
                  Proposed Screening Question Responses
                </h3>

                <div className="space-y-2.5 text-xs">
                  {Object.entries(activeProposal.proposedAnswers).map(([question, ans]) => (
                    <div key={question} className="p-3.5 rounded-xl bg-[#121317] border border-white/8 space-y-1 shadow-2xs">
                      <span className="text-[#EDEDED] font-bold block">{question}</span>
                      <p className="text-[#8B949E] leading-relaxed font-normal">{ans}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fields Needing User Confirmation/Input */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  Fields Requiring Your Input / Customization
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#EDEDED] font-medium mb-1">
                      Target Compensation Expectation
                    </label>
                    <input
                      type="text"
                      value={formInputs.desired_salary || ''}
                      onChange={(e) => handleInputChange('desired_salary', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#121317] border border-white/10 text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] text-xs font-medium transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[#EDEDED] font-medium mb-1">
                      Earliest Available Start Date
                    </label>
                    <input
                      type="text"
                      value={formInputs.earliest_start_date || ''}
                      onChange={(e) => handleInputChange('earliest_start_date', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#121317] border border-white/10 text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] text-xs font-medium transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[#EDEDED] font-medium mb-1">
                      Specific Architectural or Team Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formInputs.custom_question || ''}
                      onChange={(e) => handleInputChange('custom_question', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#121317] border border-white/10 text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] text-xs transition-colors"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeProposal.stage === 'submit-approval' && (
            <>
              {/* Phase 2: Final Verification */}
              <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#EDEDED]">
                    Phase 2: Final Pre-Submission Gate
                  </p>
                  <p className="text-[#8B949E] leading-relaxed">
                    Verify the documents and final payload to be packaged for {activeProposal.company}. Once approved, the prepared package will be logged to your durable Application History.
                  </p>
                </div>
              </div>

              {/* Document Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Tailored Resume */}
                <div className="p-4 rounded-xl bg-[#121317] border border-white/8 flex flex-col space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#FF5C1A]" />
                      <span className="font-bold text-[#EDEDED]">Tailored Resume</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 font-bold">
                      STAR Aligned
                    </span>
                  </div>
                  <div className="flex-1 bg-[#F5F0E6] p-3.5 rounded-lg border border-white/8 text-[11px] text-[#EDEDED] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {currentResume.content || activeProposal.tailoredResumeText || 'Tailored resume generated for target job specifications.'}
                  </div>
                </div>

                {/* Targeted Cover Letter */}
                <div className="p-4 rounded-xl bg-[#121317] border border-white/8 flex flex-col space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[#A855F7]" />
                      <span className="font-bold text-[#EDEDED]">Targeted Cover Letter</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 font-bold">
                      ~300 Words
                    </span>
                  </div>
                  <div className="flex-1 bg-[#F5F0E6] p-3.5 rounded-lg border border-white/8 text-[11px] text-[#EDEDED] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {activeProposal.coverLetterText || 'Targeted cover letter ready for submission.'}
                  </div>
                </div>
              </div>

              {/* Submission Summary Table */}
              <div className="p-4 rounded-xl bg-[#121317] border border-white/8 space-y-2 text-xs">
                <span className="text-[11px] font-mono font-bold text-[#8B949E] uppercase tracking-wider">
                  Submission Summary
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-[#8B949E] block text-[10px] font-mono">Company</span>
                    <span className="font-bold text-[#EDEDED]">{activeProposal.company}</span>
                  </div>
                  <div>
                    <span className="text-[#8B949E] block text-[10px] font-mono">Position</span>
                    <span className="font-bold text-[#EDEDED]">{activeProposal.role}</span>
                  </div>
                  <div>
                    <span className="text-[#8B949E] block text-[10px] font-mono">Compensation</span>
                    <span className="font-bold text-[#EDEDED]">{formInputs.desired_salary}</span>
                  </div>
                  <div>
                    <span className="text-[#8B949E] block text-[10px] font-mono">Start Date</span>
                    <span className="font-bold text-[#EDEDED]">{formInputs.earliest_start_date}</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-3.5 rounded-xl bg-[#121317] border border-white/8 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirm-truth"
                  checked={confirmedTruthful}
                  onChange={(e) => setConfirmedTruthful(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#F5F0E6] border-white/20 text-[#FF5C1A] focus:ring-[#FF5C1A] cursor-pointer"
                />
                <label htmlFor="confirm-truth" className="text-xs text-[#EDEDED] font-medium cursor-pointer select-none">
                  I have reviewed all fields and confirm that all representations accurately reflect my genuine experience and profile.
                </label>
              </div>
            </>
          )}

          {activeProposal.stage === 'submitted' && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-[#EDEDED]">
                  Application Package Verified & Logged
                </h3>
                <p className="text-xs text-[#8B949E] max-w-md mx-auto leading-relaxed">
                  Your tailored application package for <span className="text-[#EDEDED] font-semibold">{activeProposal.role}</span> at <span className="text-[#EDEDED] font-semibold">{activeProposal.company}</span> has been confirmed and saved to your durable career operating record.
                </p>
              </div>
              <div className="pt-3 flex justify-center gap-3">
                {activeProposal.directFormUrl && (
                  <a
                    href={activeProposal.directFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5C1A] hover:bg-[#FF7235] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <span>Open Employer Form Directly</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setApplicationModalOpen(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#121317] hover:bg-white/5 border border-white/10 text-[#EDEDED] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Close & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {activeProposal.stage !== 'submitted' && (
          <div className="px-6 py-4 border-t border-white/8 bg-[#121317] flex items-center justify-between">
            {activeProposal.stage === 'submit-approval' ? (
              <button
                onClick={handleBackToStage1}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1B20] hover:bg-white/5 border border-white/10 text-[#EDEDED] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Field Review</span>
              </button>
            ) : (
              <button
                onClick={() => setApplicationModalOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1B20] hover:bg-white/5 border border-white/10 text-[#EDEDED] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            {activeProposal.stage === 'field-approval' ? (
              <button
                onClick={handleProceedToStage2}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5C1A] hover:bg-[#FF7235] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Proceed to Stage 2: Final Verification</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled={!confirmedTruthful}
                onClick={handleFinalSubmitConfirmation}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  !confirmedTruthful 
                    ? 'opacity-50 cursor-not-allowed bg-white/5 text-[#8B949E] border border-white/5' 
                    : 'bg-[#FF5C1A] hover:bg-[#FF7235] text-white shadow-xs cursor-pointer'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Confirm & Authorize Application</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
