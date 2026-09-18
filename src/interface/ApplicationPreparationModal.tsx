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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#F0E6D8] bg-[#FAF6F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFF0E4] border border-[#FDCBA7] text-[#F47B20]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#181512] tracking-tight">
                  Two-Phase ATS Application Navigator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E4] text-[#C45709] border border-[#FDCBA7]">
                  {activeProposal.atsType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#6A6359]">
                {activeProposal.role} at <span className="text-[#181512] font-semibold">{activeProposal.company}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setApplicationModalOpen(false)}
            className="p-1.5 rounded-full text-[#999084] hover:text-[#181512] hover:bg-[#F2ECE2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Indicator Steps */}
        <div className="grid grid-cols-2 border-b border-[#F0E6D8] bg-[#FAF6F0]/60 text-xs">
          <div
            className={`px-6 py-3 flex items-center gap-2.5 font-semibold border-r border-[#F0E6D8] ${
              activeProposal.stage === 'field-approval'
                ? 'text-[#F47B20] bg-[#FFF0E4]'
                : 'text-[#999084]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                activeProposal.stage === 'field-approval'
                  ? 'bg-[#F47B20] text-white'
                  : 'bg-[#E5DBCF] text-[#6A6359]'
              }`}
            >
              1
            </span>
            <span>Phase 1: Field Mapping & Screen Review</span>
          </div>

          <div
            className={`px-6 py-3 flex items-center gap-2.5 font-semibold ${
              activeProposal.stage === 'submit-approval' || activeProposal.stage === 'submitted'
                ? 'text-[#2E8555] bg-[#E8F6EE]'
                : 'text-[#999084]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                activeProposal.stage === 'submit-approval' || activeProposal.stage === 'submitted'
                  ? 'bg-[#2E8555] text-white'
                  : 'bg-[#E5DBCF] text-[#6A6359]'
              }`}
            >
              2
            </span>
            <span>Phase 2: Final Verification & Submit Gate</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeProposal.stage === 'field-approval' && (
            <>
              {/* Security Banner */}
              <div className="p-4 rounded-xl bg-[#FFF0E4] border border-[#FDCBA7] flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#F47B20] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#181512]">
                    Application Safety Protocol Active
                  </p>
                  <p className="text-[#6A6359] leading-relaxed">
                    NEXIS never silently submits applications. Review the pre-populated candidate facts, proposed screening answers, and direct ATS destination before proceeding to final authorization.
                  </p>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#EADFCF] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#181512] uppercase tracking-wider">
                    Target Endpoint Architecture
                  </span>
                  {activeProposal.directFormUrl && (
                    <a
                      href={activeProposal.directFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#F47B20] hover:text-[#E36D13] font-semibold transition-colors"
                    >
                      <span>Direct ATS URL</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-[#E5DBCF] shadow-2xs">
                    <span className="text-[#999084] block text-[11px] font-medium">System Type</span>
                    <span className="text-[#181512] font-bold uppercase">{activeProposal.atsType}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#E5DBCF] shadow-2xs">
                    <span className="text-[#999084] block text-[11px] font-medium">Submission Mode</span>
                    <span className="text-[#181512] font-semibold">Direct Form Pre-fill</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#E5DBCF] shadow-2xs">
                    <span className="text-[#999084] block text-[11px] font-medium">Iframe Workaround</span>
                    <span className="text-[#2E8555] font-bold">Bypassed cross-origin</span>
                  </div>
                </div>
              </div>

              {/* Verified Auto-Filled Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#181512] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E8555]" />
                    Verified Facts From Candidate Profile
                  </h3>
                  <span className="text-[11px] text-[#999084]">Grounded in factual career record</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {Object.entries(activeProposal.autoFillFields).map(([label, val]) => (
                    <div key={label} className="p-2.5 rounded-lg bg-white border border-[#E5DBCF] shadow-2xs">
                      <span className="text-[10px] text-[#999084] block font-medium uppercase">{label}</span>
                      <span className="text-[#181512] font-semibold truncate block">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Screening Answers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#181512] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F47B20]" />
                  Proposed Screening Question Responses
                </h3>

                <div className="space-y-2.5 text-xs">
                  {Object.entries(activeProposal.proposedAnswers).map(([question, ans]) => (
                    <div key={question} className="p-3.5 rounded-xl bg-white border border-[#E5DBCF] space-y-1 shadow-2xs">
                      <span className="text-[#181512] font-bold block">{question}</span>
                      <p className="text-[#6A6359] leading-relaxed font-normal">{ans}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fields Needing User Confirmation/Input */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#C98218] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#C98218]" />
                  Fields Requiring Your Input / Customization
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#181512] font-semibold mb-1">
                      Target Compensation Expectation
                    </label>
                    <input
                      type="text"
                      value={formInputs.desired_salary || ''}
                      onChange={(e) => handleInputChange('desired_salary', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7CABB] text-[#181512] focus:outline-none focus:border-[#F47B20] text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[#181512] font-semibold mb-1">
                      Earliest Available Start Date
                    </label>
                    <input
                      type="text"
                      value={formInputs.earliest_start_date || ''}
                      onChange={(e) => handleInputChange('earliest_start_date', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7CABB] text-[#181512] focus:outline-none focus:border-[#F47B20] text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[#181512] font-semibold mb-1">
                      Specific Architectural or Team Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formInputs.custom_question || ''}
                      onChange={(e) => handleInputChange('custom_question', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#D7CABB] text-[#181512] focus:outline-none focus:border-[#F47B20] text-xs"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeProposal.stage === 'submit-approval' && (
            <>
              {/* Phase 2: Final Verification */}
              <div className="p-4 rounded-xl bg-[#E8F6EE] border border-[#BCE4CE] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E8555] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#181512]">
                    Phase 2: Final Pre-Submission Gate
                  </p>
                  <p className="text-[#6A6359] leading-relaxed">
                    Verify the documents and final payload to be packaged for {activeProposal.company}. Once approved, the prepared package will be logged to your durable Application History.
                  </p>
                </div>
              </div>

              {/* Document Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Tailored Resume */}
                <div className="p-4 rounded-xl bg-white border border-[#EADFCF] flex flex-col space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0E6D8]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#F47B20]" />
                      <span className="font-bold text-[#181512]">Tailored Resume</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF0E4] text-[#F47B20] font-bold">
                      STAR Aligned
                    </span>
                  </div>
                  <div className="flex-1 bg-[#FAF6F0] p-3.5 rounded-lg border border-[#EADFCF] text-[11px] text-[#181512] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {currentResume.content || activeProposal.tailoredResumeText || 'Tailored resume generated for target job specifications.'}
                  </div>
                </div>

                {/* Targeted Cover Letter */}
                <div className="p-4 rounded-xl bg-white border border-[#EADFCF] flex flex-col space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0E6D8]">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[#6B2FB5]" />
                      <span className="font-bold text-[#181512]">Targeted Cover Letter</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8F2FC] text-[#6B2FB5] font-bold">
                      ~300 Words
                    </span>
                  </div>
                  <div className="flex-1 bg-[#FAF6F0] p-3.5 rounded-lg border border-[#EADFCF] text-[11px] text-[#181512] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {activeProposal.coverLetterText || 'Targeted cover letter ready for submission.'}
                  </div>
                </div>
              </div>

              {/* Submission Summary Table */}
              <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#EADFCF] space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[#999084] uppercase tracking-wider">
                  Submission Summary
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-[#999084] block text-[10px]">Company</span>
                    <span className="font-bold text-[#181512]">{activeProposal.company}</span>
                  </div>
                  <div>
                    <span className="text-[#999084] block text-[10px]">Position</span>
                    <span className="font-bold text-[#181512]">{activeProposal.role}</span>
                  </div>
                  <div>
                    <span className="text-[#999084] block text-[10px]">Compensation</span>
                    <span className="font-bold text-[#181512]">{formInputs.desired_salary}</span>
                  </div>
                  <div>
                    <span className="text-[#999084] block text-[10px]">Start Date</span>
                    <span className="font-bold text-[#181512]">{formInputs.earliest_start_date}</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-3.5 rounded-xl bg-white border border-[#EADFCF] flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirm-truth"
                  checked={confirmedTruthful}
                  onChange={(e) => setConfirmedTruthful(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D7CABB] text-[#F47B20] focus:ring-[#F47B20] cursor-pointer"
                />
                <label htmlFor="confirm-truth" className="text-xs text-[#181512] font-medium cursor-pointer select-none">
                  I have reviewed all fields and confirm that all representations accurately reflect my genuine experience and profile.
                </label>
              </div>
            </>
          )}

          {activeProposal.stage === 'submitted' && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#E8F6EE] border border-[#BCE4CE] text-[#2E8555] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-[#181512]">
                  Application Package Verified & Logged
                </h3>
                <p className="text-xs text-[#6A6359] max-w-md mx-auto leading-relaxed">
                  Your tailored application package for <span className="text-[#181512] font-semibold">{activeProposal.role}</span> at <span className="text-[#181512] font-semibold">{activeProposal.company}</span> has been confirmed and saved to your durable career operating record.
                </p>
              </div>
              <div className="pt-3 flex justify-center gap-3">
                {activeProposal.directFormUrl && (
                  <a
                    href={activeProposal.directFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nx-btn-primary !py-2 !px-4 !text-xs cursor-pointer"
                  >
                    <span>Open Employer Form Directly</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setApplicationModalOpen(false)}
                  className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer"
                >
                  Close & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {activeProposal.stage !== 'submitted' && (
          <div className="px-6 py-4 border-t border-[#F0E6D8] bg-[#FAF6F0] flex items-center justify-between">
            {activeProposal.stage === 'submit-approval' ? (
              <button
                onClick={handleBackToStage1}
                className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Field Review</span>
              </button>
            ) : (
              <button
                onClick={() => setApplicationModalOpen(false)}
                className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer"
              >
                Cancel
              </button>
            )}

            {activeProposal.stage === 'field-approval' ? (
              <button
                onClick={handleProceedToStage2}
                className="nx-btn-primary !py-2.5 !px-5 !text-xs cursor-pointer"
              >
                <span>Proceed to Stage 2: Final Verification</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled={!confirmedTruthful}
                onClick={handleFinalSubmitConfirmation}
                className={`nx-btn-primary !py-2.5 !px-5 !text-xs ${
                  !confirmedTruthful ? 'opacity-50 cursor-not-allowed !bg-[#E5DBCF] !text-[#999084] shadow-none' : 'cursor-pointer'
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
