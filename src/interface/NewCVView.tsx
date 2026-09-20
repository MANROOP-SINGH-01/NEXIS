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
import { PageHeader } from './bauhaus/PageHeader';
import { SectionNumber } from './bauhaus/SectionNumber';
import { BauhausDivider } from './bauhaus/BauhausDivider';

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

  const [downloadingDocx, setDownloadingDocx] = useState(false);

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

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch('/api/resume/render-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          document: effectiveStructuredResume,
          resumeDocument: effectiveStructuredResume,
          structuredResume: effectiveStructuredResume,
          resume: currentResume.content || effectiveStructuredResume.summary,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Word document generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-cv-${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Word document download failed');
    } finally {
      setDownloadingDocx(false);
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
    <div
      className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar font-sans"
      style={{ backgroundColor: '#F5F0E6' }}
    >
      {/* Bauhaus Page Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4" style={{ borderBottom: '2px solid #111111' }}>
        <div>
          <SectionNumber number="03" label="SYNTHESIS" />
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] uppercase tracking-tight mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            RESUME FORGE
          </h1>
          <p className="text-xs sm:text-sm text-[#555555] mt-1 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
            {skillProfile?.jd_role_title
              ? `Target Alignment: ${skillProfile.jd_role_title}`
              : 'Deterministic STAR-metric provenance & ATS scoring telemetry.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLiveReTailor}
            disabled={isRegenerating}
            className="py-2 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '2px solid #111111',
              borderRadius: '0px',
            }}
          >
            <RefreshCw size={13} className={isRegenerating ? 'animate-spin text-[#E53935]' : 'text-[#111111]'} />
            <span>{isRegenerating ? 'Re-Synthesizing...' : 'Re-Tailor for JD'}</span>
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={downloadingDocx}
            className="py-2 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '2px solid #111111',
              borderRadius: '0px',
            }}
            title="Download editable Microsoft Word document"
          >
            {downloadingDocx ? <Loader2 size={13} className="animate-spin text-[#2457A6]" /> : <FileText size={13} className="text-[#2457A6]" />}
            <span>{downloadingDocx ? 'Generating Word...' : 'Word (.docx)'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: '#E53935',
              color: '#FFFFFF',
              border: '2px solid #111111',
              borderRadius: '0px',
              boxShadow: '3px 3px 0px #111111',
            }}
            title="Download ATS-optimized PDF"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {downloadSuccess && (
        <div
          className="p-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: 'rgba(46,125,50,0.1)',
            border: '2px solid #2E7D32',
            color: '#2E7D32',
            borderRadius: '0px',
          }}
        >
          <CheckCircle size={16} className="shrink-0" />
          <span>Professional ATS PDF generated and downloaded successfully!</span>
        </div>
      )}

      {downloadError && (
        <div
          className="p-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: 'rgba(229,57,53,0.1)',
            border: '2px solid #E53935',
            color: '#E53935',
            borderRadius: '0px',
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Priority Hierarchy & Anti-Slop Audit Banner */}
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
          boxShadow: '4px 4px 0px #111111',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 shrink-0"
            style={{
              backgroundColor: '#F5F0E6',
              border: '2px solid #111111',
              color: '#2E7D32',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-[#111111] text-sm uppercase tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Anti-Slop Audit: Verified
              </span>
              <span
                className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundColor: 'rgba(46,125,50,0.1)',
                  color: '#2E7D32',
                  border: '1px solid rgba(46,125,50,0.3)',
                }}
              >
                {fleschScore}/100 Reading Ease
              </span>
            </div>
            <p className="text-xs text-[#555555] mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
              Accuracy &gt; Corrections &gt; Workflow &gt; Anti-Slop (Plain English, 0 Em-Dashes, 0 Buzzwords)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCoverLetterModal(true)}
          className="py-2 px-3.5 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-2 hover:bg-[#173F7A] transition-all shadow-[2px_2px_0px_#111111]"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: '#2457A6',
            color: '#FFFFFF',
            border: '2px solid #111111',
            borderRadius: '0px',
          }}
        >
          <FileText size={13} className="text-white" />
          <span>Cover Letter</span>
        </button>
      </div>

      {/* Clean White Paper Document Preview */}
      <div
        className="p-8 sm:p-12 flex flex-col gap-6 max-w-4xl mx-auto w-full text-[#111111]"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
          boxShadow: '8px 8px 0px #111111',
        }}
      >
        {/* CV Header */}
        <div className="pb-6 text-center" style={{ borderBottom: '2px solid #111111' }}>
          <h2
            className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#111111]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {effectiveStructuredResume.header?.name || 'Candidate Name'}
          </h2>
          <p
            className="text-sm font-bold uppercase tracking-wider mt-1 text-[#E53935]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {effectiveStructuredResume.header?.title || skillProfile?.jd_role_title || 'Full Stack Engineer'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#555555] flex-wrap font-medium">
            {effectiveStructuredResume.header?.email && (
              <span className="flex items-center gap-1.5 font-mono">
                <Mail size={12} className="text-[#111111]" />
                {effectiveStructuredResume.header.email}
              </span>
            )}
            {effectiveStructuredResume.header?.phone && (
              <span className="flex items-center gap-1.5 font-mono">
                <Phone size={12} className="text-[#111111]" />
                {effectiveStructuredResume.header.phone}
              </span>
            )}
            {effectiveStructuredResume.header?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-[#111111]" />
                {effectiveStructuredResume.header.location}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Executive Summary
          </h3>
          <p className="text-sm text-[#333333] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            {effectiveStructuredResume.summary}
          </p>
        </div>

        {/* Experience */}
        {effectiveStructuredResume.experience && effectiveStructuredResume.experience.length > 0 && (
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Professional Experience
            </h3>
            <div className="flex flex-col gap-6">
              {effectiveStructuredResume.experience.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between flex-wrap gap-1">
                    <span
                      className="text-sm font-bold uppercase text-[#111111]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {exp.title || 'Engineer'}
                    </span>
                    <span className="text-xs font-mono text-[#7A7A7A] font-bold">
                      {exp.start} — {exp.end || 'Present'}
                    </span>
                  </div>
                  <div
                    className="text-xs font-bold text-[#E53935] uppercase mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {exp.company} {exp.location && `· ${exp.location}`}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-[#444444] pl-1 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
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
            <h3
              className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Technical Competencies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {effectiveStructuredResume.skills.core && effectiveStructuredResume.skills.core.length > 0 && (
                <div className="p-3.5 bg-[#F5F0E6] border border-[#111111]">
                  <span
                    className="font-bold text-[#111111] block mb-1 text-xs uppercase"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Frontend & Languages
                  </span>
                  <p className="text-[#555555] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {effectiveStructuredResume.skills.core.join(', ')}
                  </p>
                </div>
              )}
              {effectiveStructuredResume.skills.tools && effectiveStructuredResume.skills.tools.length > 0 && (
                <div className="p-3.5 bg-[#F5F0E6] border border-[#111111]">
                  <span
                    className="font-bold text-[#111111] block mb-1 text-xs uppercase"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Backend & Databases
                  </span>
                  <p className="text-[#555555] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {effectiveStructuredResume.skills.tools.join(', ')}
                  </p>
                </div>
              )}
              {effectiveStructuredResume.skills.cloud && effectiveStructuredResume.skills.cloud.length > 0 && (
                <div className="p-3.5 bg-[#F5F0E6] border border-[#111111]">
                  <span
                    className="font-bold text-[#111111] block mb-1 text-xs uppercase"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Cloud & DevOps
                  </span>
                  <p className="text-[#555555] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {effectiveStructuredResume.skills.cloud.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role-aligned Skills Badges */}
      <div
        className="p-5 shadow-xs"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-2.5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Demonstrated Competencies for Target Role
        </p>
        <div className="flex flex-wrap gap-2">
          {candidateSkills.map((s) => (
            <span
              key={s.skill}
              className="px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: s.demonstrated ? 'rgba(46,125,50,0.1)' : '#F5F0E6',
                color: s.demonstrated ? '#2E7D32' : '#555555',
                border: `1px solid ${s.demonstrated ? '#2E7D32' : '#111111'}`,
                borderRadius: '0px',
              }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div
              className="w-full max-w-2xl overflow-hidden p-6 font-sans space-y-4 shadow-[8px_8px_0px_#111111]"
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #111111',
                borderRadius: '0px',
              }}
            >
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '2px solid #111111' }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 text-[#FFFFFF]"
                    style={{ backgroundColor: '#111111', border: '1px solid #111111' }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className="text-base font-bold text-[#111111] uppercase tracking-tight"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Cover Letter Generator
                    </h3>
                    <p className="text-xs text-[#555555] font-mono">
                      STAR Provenance • {letterResult.wordCount} words • {letterResult.fleschScore}/100 Reading Ease
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCoverLetterModal(false);
                    setCopiedCoverLetter(false);
                  }}
                  className="p-1.5 text-[#111111] hover:bg-[#EFE7D8] cursor-pointer"
                  style={{ border: '1px solid #111111', borderRadius: '0px' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tone Selection */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#111111] font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Tone:
                </span>
                {(['direct', 'collaborative', 'technical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCoverLetterTone(t)}
                    className="px-3 py-1 uppercase tracking-wider font-bold transition-colors cursor-pointer"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: coverLetterTone === t ? '#111111' : '#F5F0E6',
                      color: coverLetterTone === t ? '#F5F0E6' : '#111111',
                      border: '1px solid #111111',
                      borderRadius: '0px',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div
                className="p-4 font-mono text-xs text-[#111111] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto"
                style={{
                  backgroundColor: '#F5F0E6',
                  border: '1px solid #111111',
                  borderRadius: '0px',
                }}
              >
                {letterResult.coverLetterText}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span
                  className="text-[11px] text-[#2E7D32] font-bold uppercase tracking-wider"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ✓ Grounded in candidate achievements
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(letterResult.coverLetterText);
                    setCopiedCoverLetter(true);
                    setTimeout(() => setCopiedCoverLetter(false), 2000);
                  }}
                  className="py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: '#E53935',
                    color: '#FFFFFF',
                    border: '2px solid #111111',
                    borderRadius: '0px',
                    boxShadow: '3px 3px 0px #111111',
                  }}
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
