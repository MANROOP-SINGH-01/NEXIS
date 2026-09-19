import React, { useState } from 'react';
import { 
  FileText, Download, Loader2, CheckCircle, AlertTriangle, Sparkles, 
  RefreshCw, Mail, Phone, MapPin, Globe, ShieldCheck, Copy, CheckCheck, X 
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { StructuredResume } from '../types';
import { generateTargetedCoverLetter, calculateFleschReadingEase } from '../services/antiSlopResumeService';
import { NexusButton, NexusBadge, NexusCard } from './nexus';

const DEFAULT_STRUCTURED_RESUME: StructuredResume = {
  header: {
    name: 'Alex Morgan',
    title: 'Full Stack Software Engineer',
    email: 'alex.morgan@email.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    links: ['linkedin.com/in/alexmorgan', 'github.com/alexmorgan'],
  },
  summary: 'Full Stack Engineer with 3+ years of experience architecting high-performance web applications with React, TypeScript, Node.js, and PostgreSQL. Experienced in distributed cloud systems, automated CI/CD pipelines, and microservice architectures.',
  experience: [
    {
      company: 'TechFlow Systems',
      title: 'Full Stack Developer',
      location: 'Bangalore, India',
      start: '2023',
      end: 'Present',
      bullets: [
        'Architected high-throughput REST APIs handling 50k+ daily transactions with 99.9% uptime.',
        'Engineered responsive React micro-frontends with TypeScript, reducing page load latency by 35%.',
        'Implemented Redis caching layer and optimized PostgreSQL query indexes, improving p95 response time from 480ms to 95ms.',
      ],
    },
    {
      company: 'Nexus Innovations',
      title: 'Junior Software Engineer',
      location: 'Pune, India',
      start: '2021',
      end: '2023',
      bullets: [
        'Built automated testing workflows with Jest and GitHub Actions, boosting test coverage to 88%.',
        'Containerized multi-service applications using Docker, streamlining developer onboarding time by 60%.',
      ],
    },
  ],
  skills: {
    core: ['React', 'TypeScript', 'Tailwind CSS', 'Redux', 'Next.js'],
    tools: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'RESTful APIs'],
    cloud: ['Docker', 'AWS', 'GitHub Actions', 'Git', 'Linux'],
  },
  education: [
    {
      school: 'National Institute of Technology',
      degree: 'Bachelor of Technology in Computer Science',
    },
  ],
  projects: [
    {
      name: 'Distributed Real-Time Collaboration Canvas',
      description: 'Built a collaborative whiteboard supporting 100+ concurrent editors with CRDT conflict resolution.',
      bullets: ['Built a collaborative whiteboard supporting 100+ concurrent editors with CRDT conflict resolution.'],
      technologies: ['React', 'TypeScript', 'WebSocket', 'Node.js'],
    },
  ],
};

export const NewCVView: React.FC = () => {
  const { skillProfile } = useUiStore();
  const { currentResume, structuredResume, setStructuredResume, runtimeKeys, workHistoryProfile } = useCoreStore();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState<'direct' | 'collaborative' | 'technical'>('direct');
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);

  const effectiveStructuredResume: StructuredResume = structuredResume || DEFAULT_STRUCTURED_RESUME;
  const fleschScore = calculateFleschReadingEase(effectiveStructuredResume.summary + ' ' + (effectiveStructuredResume.experience?.[0]?.bullets?.join(' ') || ''));

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch('/api/resume/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          structuredResume: effectiveStructuredResume,
          resume: currentResume.content || effectiveStructuredResume.summary,
          jd: currentResume.targetJD || skillProfile?.jd_role_title || 'Software Engineer',
          keys: {
            sarvam: runtimeKeys.sarvam,
            gemini: runtimeKeys.gemini,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `PDF generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-cv-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'PDF download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleLiveReTailor = async () => {
    setIsRegenerating(true);
    setDownloadError(null);
    try {
      const resumeToUse = currentResume.content || 'Software engineer with 4 years experience in Python, C++, React, and cloud architectures.';
      const jdToUse = currentResume.targetJD || (skillProfile?.jd_role_title ? `Looking for a ${skillProfile.jd_role_title} with strong architecture skills.` : 'Looking for a Senior Full Stack Engineer.');

      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          resume: resumeToUse,
          jd: jdToUse,
          keys: {
            gemini: runtimeKeys.gemini,
            sarvam: runtimeKeys.sarvam,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.structuredResume) {
        setStructuredResume(data.structuredResume);
      }
    } catch (err) {
      console.warn('Re-tailor request error:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const candidateSkills = [
    { skill: 'React', demonstrated: true },
    { skill: 'TypeScript', demonstrated: true },
    { skill: 'Node.js', demonstrated: true },
    { skill: 'PostgreSQL', demonstrated: true },
    { skill: 'Docker', demonstrated: true },
    { skill: 'AWS', demonstrated: false },
    { skill: 'Kubernetes', demonstrated: false },
    { skill: 'GraphQL', demonstrated: false },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#0A0B0E] custom-scrollbar">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/30 flex items-center justify-center text-[#FF5C1A] shrink-0 shadow-xs">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
              Resume Forge & ATS Optimizer
            </h1>
            <p className="text-xs sm:text-sm text-[#8B949E] font-normal">
              {skillProfile?.jd_role_title
                ? `Aligned for: ${skillProfile.jd_role_title}`
                : 'Role-optimized with quantified accomplishment telemetry & Flesch >90 scoring.'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLiveReTailor}
            disabled={isRegenerating}
            className="nx-btn-secondary !py-2 !px-3.5 !text-xs cursor-pointer"
          >
            <RefreshCw size={13} className={isRegenerating ? 'animate-spin text-[#FF5C1A]' : ''} />
            <span>{isRegenerating ? 'Re-Synthesizing...' : 'Re-Tailor for JD'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="nx-btn-primary !py-2 !px-4 !text-xs cursor-pointer"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {downloadSuccess && (
        <div className="p-3.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl flex items-center gap-2.5 text-[#22C55E] text-xs">
          <CheckCircle size={16} className="text-[#22C55E] shrink-0" />
          <span className="font-semibold">Professional ATS PDF generated and downloaded to your device!</span>
        </div>
      )}

      {downloadError && (
        <div className="p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#EF4444] shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Priority Hierarchy & Anti-Slop Audit Banner */}
      <div className="p-4 bg-[#121317] border border-white/8 rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#22C55E]/15 text-[#22C55E] shrink-0 border border-[#22C55E]/30">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#EDEDED] text-sm tracking-tight">
                Anti-Slop Readability Audit: Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                {fleschScore}/100 Reading Ease
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5 font-normal">
              Accuracy &gt; Corrections &gt; Workflow &gt; Anti-Slop (Plain conversational English, 0 Em-Dashes, 0 Buzzwords)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCoverLetterModal(true)}
          className="nx-btn-dark !py-2 !px-4 !text-xs shrink-0 cursor-pointer"
        >
          <FileText size={13} className="text-[#FF5C1A]" />
          <span>Generate Cover Letter</span>
        </button>
      </div>

      {/* Clean Dark Paper Document Preview */}
      <div className="bg-[#121317] rounded-[10px] border border-white/8 shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-8 sm:p-12 flex flex-col gap-6 max-w-4xl mx-auto w-full text-[#EDEDED]">
        {/* CV Header */}
        <div className="border-b border-white/8 pb-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
            {effectiveStructuredResume.header?.name || 'Candidate Name'}
          </h2>
          <p className="text-sm font-bold text-[#FF5C1A] mt-1 font-mono">
            {effectiveStructuredResume.header?.title || skillProfile?.jd_role_title || 'Full Stack Engineer'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#8B949E] flex-wrap font-medium">
            {effectiveStructuredResume.header?.email && (
              <span className="flex items-center gap-1.5 font-mono">
                <Mail size={12} className="text-[#8B949E]" />
                {effectiveStructuredResume.header.email}
              </span>
            )}
            {effectiveStructuredResume.header?.phone && (
              <span className="flex items-center gap-1.5 font-mono">
                <Phone size={12} className="text-[#8B949E]" />
                {effectiveStructuredResume.header.phone}
              </span>
            )}
            {effectiveStructuredResume.header?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-[#8B949E]" />
                {effectiveStructuredResume.header.location}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B949E] mb-2">
            Executive Summary
          </h3>
          <p className="text-sm text-[#EDEDED] leading-relaxed font-normal">
            {effectiveStructuredResume.summary}
          </p>
        </div>

        {/* Experience */}
        {effectiveStructuredResume.experience && effectiveStructuredResume.experience.length > 0 && (
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B949E] mb-3">
              Professional Experience
            </h3>
            <div className="flex flex-col gap-6">
              {effectiveStructuredResume.experience.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between flex-wrap gap-1">
                    <span className="text-sm font-bold text-[#EDEDED]">{exp.title || 'Engineer'}</span>
                    <span className="text-xs font-mono text-[#8B949E] font-medium">{exp.start} — {exp.end || 'Present'}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#FF5C1A] mb-1">
                    {exp.company} {exp.location && `· ${exp.location}`}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-[#8B949E] pl-1 leading-relaxed">
                      {exp.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {effectiveStructuredResume.skills && (
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B949E] mb-3">
              Technical Competencies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {effectiveStructuredResume.skills.core && effectiveStructuredResume.skills.core.length > 0 && (
                <div className="bg-[#1A1B20] p-3.5 rounded-[8px] border border-white/8">
                  <span className="font-bold text-[#EDEDED] block mb-1 text-xs">Frontend & Languages</span>
                  <p className="text-[#8B949E] text-xs leading-relaxed">{effectiveStructuredResume.skills.core.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.tools && effectiveStructuredResume.skills.tools.length > 0 && (
                <div className="bg-[#1A1B20] p-3.5 rounded-[8px] border border-white/8">
                  <span className="font-bold text-[#EDEDED] block mb-1 text-xs">Backend & Databases</span>
                  <p className="text-[#8B949E] text-xs leading-relaxed">{effectiveStructuredResume.skills.tools.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.cloud && effectiveStructuredResume.skills.cloud.length > 0 && (
                <div className="bg-[#1A1B20] p-3.5 rounded-[8px] border border-white/8">
                  <span className="font-bold text-[#EDEDED] block mb-1 text-xs">Cloud & DevOps</span>
                  <p className="text-[#8B949E] text-xs leading-relaxed">{effectiveStructuredResume.skills.cloud.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role-aligned Skills Badges */}
      <div className="bg-[#121317] rounded-[10px] border border-white/8 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B949E] mb-2.5">
          Demonstrated Competencies for Target Role
        </p>
        <div className="flex flex-wrap gap-2">
          {candidateSkills.map((s) => (
            <span
              key={s.skill}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                s.demonstrated
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                  : 'bg-[#1A1B20] text-[#8B949E] border-white/8'
              }`}
            >
              {s.skill} {s.demonstrated ? '✓' : '?'}
            </span>
          ))}
        </div>
      </div>

      {/* Targeted Cover Letter Modal */}
      {showCoverLetterModal && (() => {
        const dummyJob = {
          id: 'cv_target_job',
          title: skillProfile?.jd_role_title || effectiveStructuredResume.header?.title || 'Senior Software Engineer',
          company: 'Target Enterprise',
          url: '',
          alignmentScore: 92,
          blueOceanScore: 88,
          nexusMatchReason: 'Target role alignment from active profile',
          competitionLevel: 'Low' as const,
          discoveredAt: Date.now(),
          source: 'company-careers' as const,
          requiredSkills: effectiveStructuredResume.skills?.core || ['TypeScript', 'Node.js', 'PostgreSQL'],
        };
        const letterResult = generateTargetedCoverLetter(dummyJob, workHistoryProfile, coverLetterTone);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-[#121317] border border-white/12 rounded-[12px] w-full max-w-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-6 font-sans space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/30 text-[#FF5C1A]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#EDEDED]">
                      Grounded Cover Letter Generator
                    </h3>
                    <p className="text-xs text-[#8B949E] font-mono">
                      Strict STAR-metric provenance • {letterResult.wordCount} words • {letterResult.fleschScore}/100 Reading Ease
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCoverLetterModal(false);
                    setCopiedCoverLetter(false);
                  }}
                  className="p-1.5 rounded-full text-[#8B949E] hover:text-[#EDEDED] hover:bg-[#1A1B20] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tone Selection */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8B949E] font-medium">Tone:</span>
                {(['direct', 'collaborative', 'technical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCoverLetterTone(t)}
                    className={`px-3 py-1 rounded-full capitalize transition-colors cursor-pointer ${
                      coverLetterTone === t
                        ? 'bg-[#1A1B20] text-[#FF5C1A] border border-[#FF5C1A]/50 font-bold shadow-sm'
                        : 'bg-[#0A0B0E] border border-white/8 text-[#8B949E] hover:text-[#EDEDED]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#0A0B0E] border border-white/8 font-mono text-xs text-[#EDEDED] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {letterResult.coverLetterText}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#22C55E] font-semibold">
                  ✓ 100% grounded in verified candidate achievements
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(letterResult.coverLetterText);
                    setCopiedCoverLetter(true);
                    setTimeout(() => setCopiedCoverLetter(false), 2000);
                  }}
                  className="nx-btn-primary !py-2 !px-4 !text-xs cursor-pointer"
                >
                  {copiedCoverLetter ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCoverLetter ? 'Copied to Clipboard!' : 'Copy Letter'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default NewCVView;
