import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, Sparkles, RefreshCw, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { StructuredResume } from '../types';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';

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
  const { currentResume, structuredResume, setStructuredResume, runtimeKeys } = useCoreStore();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const effectiveStructuredResume: StructuredResume = structuredResume || DEFAULT_STRUCTURED_RESUME;

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
      if (res.ok && data?.structuredResume) {
        setStructuredResume(data.structuredResume);
      }
    } catch (err) {
      console.warn('Re-tailor failover:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const candidateSkills = skillProfile?.candidate_skills || [
    { skill: 'React', demonstrated: true },
    { skill: 'TypeScript', demonstrated: true },
    { skill: 'Node.js', demonstrated: true },
    { skill: 'PostgreSQL', demonstrated: true },
    { skill: 'Docker', demonstrated: false },
    { skill: 'AWS', demonstrated: false },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-5 max-w-6xl w-full mx-auto custom-scrollbar">
      {/* View Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              AI Tailored Resume
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              {skillProfile?.jd_role_title
                ? `Aligned for: ${skillProfile.jd_role_title}`
                : 'Role-optimized with quantified accomplishment telemetry'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLiveReTailor}
            disabled={isRegenerating}
            leftIcon={<RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />}
          >
            {isRegenerating ? 'Re-Synthesizing...' : 'Re-Tailor for JD'}
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            isLoading={downloading}
            leftIcon={<Download size={14} />}
          >
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {downloadSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-mono">
          <CheckCircle size={15} className="text-emerald-400 shrink-0" />
          <span>Professional ATS PDF generated and downloaded to your device!</span>
        </div>
      )}

      {downloadError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Interactive Resume Canvas Preview */}
      <div className="bg-[#12131c] rounded-2xl border border-zinc-800 shadow-2xl p-6 sm:p-10 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {/* CV Header */}
        <div className="border-b border-zinc-800 pb-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
            {effectiveStructuredResume.header?.name || 'Candidate Name'}
          </h2>
          <p className="text-sm font-semibold text-indigo-400 mt-1 font-['Space_Grotesk']">
            {effectiveStructuredResume.header?.title || skillProfile?.jd_role_title || 'Full Stack Engineer'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-400 flex-wrap font-mono">
            {effectiveStructuredResume.header?.email && (
              <span className="flex items-center gap-1.5">
                <Mail size={12} className="text-zinc-500" />
                {effectiveStructuredResume.header.email}
              </span>
            )}
            {effectiveStructuredResume.header?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={12} className="text-zinc-500" />
                {effectiveStructuredResume.header.phone}
              </span>
            )}
            {effectiveStructuredResume.header?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-zinc-500" />
                {effectiveStructuredResume.header.location}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold mb-2">
            Executive Summary
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed font-normal">
            {effectiveStructuredResume.summary}
          </p>
        </div>

        {/* Experience */}
        {effectiveStructuredResume.experience && effectiveStructuredResume.experience.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold mb-3">
              Professional Experience
            </h3>
            <div className="flex flex-col gap-5">
              {effectiveStructuredResume.experience.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between flex-wrap gap-1">
                    <span className="text-sm font-bold text-zinc-100 font-['Space_Grotesk']">{exp.title || 'Engineer'}</span>
                    <span className="text-xs font-mono text-zinc-500">{exp.start} — {exp.end || 'Present'}</span>
                  </div>
                  <div className="text-xs font-semibold text-cyan-400 mb-1">
                    {exp.company} {exp.location && `· ${exp.location}`}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400 pl-1 leading-relaxed">
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
            <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold mb-3">
              Technical Competencies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {effectiveStructuredResume.skills.core && effectiveStructuredResume.skills.core.length > 0 && (
                <div className="bg-[#1a1b28] p-3 rounded-xl border border-zinc-800">
                  <span className="font-semibold text-zinc-200 block mb-1 text-xs">Frontend & Languages</span>
                  <p className="text-zinc-400 text-xs leading-relaxed">{effectiveStructuredResume.skills.core.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.tools && effectiveStructuredResume.skills.tools.length > 0 && (
                <div className="bg-[#1a1b28] p-3 rounded-xl border border-zinc-800">
                  <span className="font-semibold text-zinc-200 block mb-1 text-xs">Backend & Databases</span>
                  <p className="text-zinc-400 text-xs leading-relaxed">{effectiveStructuredResume.skills.tools.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.cloud && effectiveStructuredResume.skills.cloud.length > 0 && (
                <div className="bg-[#1a1b28] p-3 rounded-xl border border-zinc-800">
                  <span className="font-semibold text-zinc-200 block mb-1 text-xs">Cloud & DevOps</span>
                  <p className="text-zinc-400 text-xs leading-relaxed">{effectiveStructuredResume.skills.cloud.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role-aligned Skills Badges */}
      <Card variant="glass" padding="md" className="border-zinc-800">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
          Demonstrated Competencies for Target Role
        </p>
        <div className="flex flex-wrap gap-2">
          {candidateSkills.map((s) => (
            <span
              key={s.skill}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                s.demonstrated
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {s.skill} {s.demonstrated ? '✓' : '?'}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default NewCVView;
