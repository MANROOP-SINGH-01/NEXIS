import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { StructuredResume } from '../types';

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
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 flex flex-col gap-4 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: USER_COLOR_LIGHT }}
          >
            <FileText size={16} strokeWidth={2.5} style={{ color: USER_COLOR }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">New CV</h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              {skillProfile?.jd_role_title
                ? `Target Role: ${skillProfile.jd_role_title}`
                : 'AI-tailored for your target software role'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLiveReTailor}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
            {isRegenerating ? 'Re-Tailoring...' : 'Re-Tailor for JD'}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm disabled:opacity-50"
            style={{ background: USER_COLOR }}
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Review disclaimer */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-100 bg-amber-50">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs font-medium text-amber-800 leading-relaxed">
          Optimized based on role alignment and ATS best practices. All experience bullets and metrics are structured for maximum recruiter clarity and ATS machine parsing.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-bold">
          <CheckCircle size={15} className="text-emerald-600" />
          <span>Professional PDF successfully compiled and downloaded!</span>
        </div>
      )}

      {downloadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {downloadError}
        </div>
      )}

      {/* Interactive Resume Sheet View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {/* CV Header */}
        <div className="border-b border-slate-200 pb-5 text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {effectiveStructuredResume.header?.name || 'Candidate Name'}
          </h2>
          <p className="text-sm font-semibold text-blue-700 mt-0.5">
            {effectiveStructuredResume.header?.title || skillProfile?.jd_role_title || 'Software Engineer'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            {effectiveStructuredResume.header?.email && <span>{effectiveStructuredResume.header.email}</span>}
            {effectiveStructuredResume.header?.phone && <span>? {effectiveStructuredResume.header.phone}</span>}
            {effectiveStructuredResume.header?.location && <span>? {effectiveStructuredResume.header.location}</span>}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Professional Summary</h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            {effectiveStructuredResume.summary}
          </p>
        </div>

        {/* Experience */}
        {effectiveStructuredResume.experience && effectiveStructuredResume.experience.length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Work Experience</h3>
            <div className="flex flex-col gap-4">
              {effectiveStructuredResume.experience.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between flex-wrap gap-1">
                    <span className="text-sm font-bold text-slate-900">{exp.title || 'Software Engineer'}</span>
                    <span className="text-[11px] font-medium text-slate-400">{exp.start} - {exp.end || 'Present'}</span>
                  </div>
                  <div className="text-xs font-semibold text-blue-600 mb-1">
                    {exp.company} {exp.location && `? ${exp.location}`}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 pl-1">
                      {exp.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">{b}</li>
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
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Technical Skills</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {effectiveStructuredResume.skills.core && effectiveStructuredResume.skills.core.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1 text-[11px]">Core Frontend & Languages</span>
                  <p className="text-slate-600 text-[11px]">{effectiveStructuredResume.skills.core.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.tools && effectiveStructuredResume.skills.tools.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1 text-[11px]">Backend & Databases</span>
                  <p className="text-slate-600 text-[11px]">{effectiveStructuredResume.skills.tools.join(', ')}</p>
                </div>
              )}
              {effectiveStructuredResume.skills.cloud && effectiveStructuredResume.skills.cloud.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1 text-[11px]">Cloud & DevOps</span>
                  <p className="text-slate-600 text-[11px]">{effectiveStructuredResume.skills.cloud.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role-aligned Skills Badges */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
          Skills Used & Validated for Target Role
        </p>
        <div className="flex flex-wrap gap-2">
          {candidateSkills.map((s) => (
            <span
              key={s.skill}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold"
              style={
                s.demonstrated
                  ? { background: USER_COLOR_LIGHT, color: USER_COLOR, border: `1px solid ${USER_COLOR}33` }
                  : { background: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7' }
              }
            >
              {s.skill}
              {!s.demonstrated && ' ?'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewCVView;
