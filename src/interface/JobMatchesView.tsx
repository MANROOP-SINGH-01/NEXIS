import React, { useState, useEffect } from 'react';
import {
  Target, ExternalLink, Loader2, Sparkles, Briefcase, MapPin,
  Building, Activity, AlertTriangle, ShieldCheck, CheckCircle2,
  Clock, Flame, Check, BookmarkPlus, ArrowUpRight, Repeat
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { DiscoveredJob, JobBucket } from '../types';

export const JobMatchesView: React.FC = () => {
  const { skillProfile, jobMatchesCurrent, jobMatchesReachable, setJobMatches, setActiveSidebarTab } = useUiStore();
  const { currentResume, runtimeKeys, userCareerProfile, setStructuredResume } = useCoreStore();

  const [mode, setMode] = useState<'current' | 'reachable'>('current');
  const [selectedBucket, setSelectedBucket] = useState<'ALL' | JobBucket>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Application Tracking State
  const [trackedJobIds, setTrackedJobIds] = useState<Set<string>>(new Set());
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [trackFeedback, setTrackFeedback] = useState<string | null>(null);

  const currentJobs = mode === 'current' ? jobMatchesCurrent : jobMatchesReachable;
  const targetRole = currentResume.targetJD.trim().split('\n')[0]?.slice(0, 120) || userCareerProfile.targetRole || 'Full Stack Engineer';
  const lastFetchedRef = React.useRef<{ role: string; mode: string } | null>(null);

  useEffect(() => {
    const shouldFetch = !lastFetchedRef.current || 
                        lastFetchedRef.current.role !== targetRole || 
                        lastFetchedRef.current.mode !== mode ||
                        currentJobs.length === 0;

    if (!shouldFetch) return;

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      lastFetchedRef.current = { role: targetRole, mode };

      try {
        const res = await fetch('/api/jobs/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            resume: currentResume.content || 'Experienced technical candidate with proficiency in modern web architecture, frontend interfaces, and full stack systems.',
            targetRole,
            key: runtimeKeys.gemini,
            serperKey: runtimeKeys.sarvam,
            mode,
            skillProfile,
          }),
        });

        const raw = await res.text();
        let json: any = null;
        try { json = JSON.parse(raw); } catch { }

        if (res.ok && json && Array.isArray(json.items) && json.items.length > 0) {
          const mapped: DiscoveredJob[] = json.items.map((item: any, idx: number) => ({
            id: `job_${Date.now()}_${idx}`,
            title: String(item.job_title || `${targetRole} Specialist`),
            company: String(item.company_name || 'Hiring Partner Network'),
            url: String(item.application_link || `https://www.adzuna.com/search?q=${encodeURIComponent(targetRole)}`),
            alignmentScore: Number(item.alignment_score || 85),
            blueOceanScore: Number(item.blue_ocean_score || 80),
            nexusMatchReason: String(item.nexus_match_reason || 'Verified match for target career pathway.'),
            competitionLevel: (String(item.competition_level || 'Low') as 'Low' | 'Medium' | 'High'),
            discoveredAt: Date.now(),
            source: (String(item.source || 'adzuna') as 'linkedin' | 'company-careers' | 'hidden' | 'adzuna'),
            ai_suggested: Boolean(item.ai_suggested),
            // P1.9 Job Trust Score
            trustScore: item.trustScore ?? 0.85,
            trustPercent: item.trustPercent ?? 85,
            trustLevel: item.trustLevel || 'HIGH',
            isLikelyGhost: Boolean(item.isLikelyGhost),
            isDirectAts: Boolean(item.isDirectAts),
            // P1.5 Multi-Signal Scoring & Buckets
            skillScore: item.skillScore ?? Math.round(item.alignment_score || 85),
            experienceScore: item.experienceScore ?? 80,
            titleScore: item.titleScore ?? 75,
            projectScore: item.projectScore ?? 70,
            overallScore: item.overallScore ?? Math.round(item.alignment_score || 85),
            bucket: (item.bucket as JobBucket) || (Number(item.alignment_score || 85) >= 75 ? 'APPLY_NOW' : 'LEARN_THEN_APPLY'),
          }));
          setJobMatches(mode, mapped);
          setLoading(false);
          return;
        }

        const msg = json?.message || json?.warning || json?.error || (json?.degraded ? 'Job discovery is temporarily degraded.' : null);
        if (msg) {
          setError(msg);
        }
      } catch (err) {
        console.warn('Nexus-Hunter server call error:', err);
        setError('Unable to reach job discovery service. Please verify your connection or API keys.');
      }

      setJobMatches(mode, []);
      setLoading(false);
    };

    fetchJobs();
  }, [mode, currentJobs.length, currentResume, runtimeKeys, userCareerProfile.targetRole, setJobMatches, skillProfile]);

  // 1-Click Track Application
  const handleTrackApplication = async (job: DiscoveredJob) => {
    if (trackedJobIds.has(job.id) || trackingJobId) return;

    setTrackingJobId(job.id);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          jobTitle: job.title,
          companyName: job.company,
          applicationLink: job.url,
          status: 'SAVED',
        }),
      });

      if (res.ok) {
        setTrackedJobIds(prev => new Set(prev).add(job.id));
        setTrackFeedback(`Saved "${job.title}" to your Application Pipeline!`);
        setTimeout(() => setTrackFeedback(null), 3500);
      }
    } catch (err) {
      console.warn('Failed to track application:', err);
    } finally {
      setTrackingJobId(null);
    }
  };

  // Filter jobs by bucket
  const filteredJobs = currentJobs.filter(job => {
    if (selectedBucket === 'ALL') return true;
    return job.bucket === selectedBucket;
  });

  // Bucket counts
  const bucketCounts = {
    ALL: currentJobs.length,
    APPLY_NOW: currentJobs.filter(j => j.bucket === 'APPLY_NOW').length,
    LEARN_THEN_APPLY: currentJobs.filter(j => j.bucket === 'LEARN_THEN_APPLY').length,
    STRETCH: currentJobs.filter(j => j.bucket === 'STRETCH').length,
    IGNORE: currentJobs.filter(j => j.bucket === 'IGNORE').length,
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <Briefcase size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Job Matches</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Multi-signal matching with Job Trust Score & anti-ghosting verification
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-zinc-200/50 p-1 rounded-xl shadow-inner border border-zinc-200">
          <button
            onClick={() => setMode('current')}
            className={`flex-1 min-w-[120px] px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
              mode === 'current' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            Current Fit
          </button>
          <button
            onClick={() => setMode('reachable')}
            className={`flex-1 min-w-[120px] px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
              mode === 'reachable' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            <Sparkles size={14} className={mode === 'reachable' ? 'text-amber-300' : 'text-zinc-400'} />
            Reachable
          </button>
        </div>
      </div>

      {trackFeedback && (
        <div className="p-4 bg-zinc-950 text-white rounded-2xl text-xs font-medium shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{trackFeedback}</span>
          </div>
          <button
            onClick={() => setActiveSidebarTab('my-outcome')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all"
          >
            View Outcomes
          </button>
        </div>
      )}

      {/* Bucket Filter Tabs */}
      {currentJobs.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedBucket('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedBucket === 'ALL'
                ? 'bg-zinc-950 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All Matches ({bucketCounts.ALL})
          </button>
          <button
            onClick={() => setSelectedBucket('APPLY_NOW')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'APPLY_NOW'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Flame size={13} />
            Apply Now ({bucketCounts.APPLY_NOW})
          </button>
          <button
            onClick={() => setSelectedBucket('LEARN_THEN_APPLY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'LEARN_THEN_APPLY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Sparkles size={13} />
            Learn Then Apply ({bucketCounts.LEARN_THEN_APPLY})
          </button>
          <button
            onClick={() => setSelectedBucket('STRETCH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'STRETCH'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Target size={13} />
            Stretch ({bucketCounts.STRETCH})
          </button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-zinc-950 mb-4" />
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Running Nexus-Hunter Multi-Signal Engine...</p>
          <p className="text-xs text-zinc-500 mt-2">Computing Job Trust Scores and bucket alignments</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50/80 text-red-700 text-sm rounded-2xl border border-red-200 font-medium flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && currentJobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] min-h-[400px]">
          <Target size={36} className="text-zinc-300 mb-4" />
          <p className="text-sm font-bold text-zinc-950 tracking-tight">No Prime Targets Found</p>
          <p className="text-xs text-zinc-500 mt-2">Adjust your resume or try a different role.</p>
        </div>
      )}

      {!loading && !error && currentJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const isTracked = trackedJobIds.has(job.id);
            const isSaving = trackingJobId === job.id;

            return (
              <div
                key={job.id}
                className="bg-white rounded-3xl border border-zinc-200/70 p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges: Trust Score, Bucket, Direct ATS */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                    {/* Bucket Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      job.bucket === 'APPLY_NOW'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : job.bucket === 'LEARN_THEN_APPLY'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : job.bucket === 'STRETCH'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}>
                      {job.bucket === 'APPLY_NOW' ? '🔥 Apply Now' : job.bucket === 'LEARN_THEN_APPLY' ? '⚡ Learn Then Apply' : job.bucket === 'STRETCH' ? '🎯 Stretch' : 'Low Match'}
                    </span>

                    {/* Job Trust Score Badge */}
                    <div className="flex items-center gap-1.5">
                      {job.isLikelyGhost && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <Clock size={10} />
                          Stale (&gt;45d)
                        </span>
                      )}
                      {job.isDirectAts && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Direct ATS
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          (job.trustPercent ?? 85) >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (job.trustPercent ?? 85) >= 55
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                        title={`Job Trust Score: ${job.trustPercent}%`}
                      >
                        <ShieldCheck size={12} />
                        <span>{job.trustPercent ?? 85}% Trust</span>
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Company */}
                  <div className="mb-4">
                    <h2 className="text-base font-display font-bold text-zinc-950 group-hover:text-blue-600 transition-colors leading-snug">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium mt-1">
                      <Building size={14} className="text-zinc-400" />
                      <span>{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="capitalize">{job.source}</span>
                    </div>
                  </div>

                  {/* Multi-Signal Breakdown */}
                  <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-100 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Multi-Signal Fit</span>
                      <span className="text-xs font-bold text-zinc-900">{job.overallScore ?? job.alignmentScore}% Composite</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Skills</p>
                        <p className="text-xs font-bold text-emerald-600">{job.skillScore ?? 85}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Exp</p>
                        <p className="text-xs font-bold text-blue-600">{job.experienceScore ?? 80}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Title</p>
                        <p className="text-xs font-bold text-purple-600">{job.titleScore ?? 75}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Project</p>
                        <p className="text-xs font-bold text-amber-600">{job.projectScore ?? 70}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Nexus Match Reason */}
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed mb-5 line-clamp-3">
                    {job.nexusMatchReason}
                  </p>
                </div>

                {/* Card Actions: Track in Pipeline + Apply */}
                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => handleTrackApplication(job)}
                    disabled={isTracked || isSaving}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isTracked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 size={13} className="animate-spin text-zinc-600" />
                    ) : isTracked ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <BookmarkPlus size={13} />
                    )}
                    <span>{isTracked ? 'Tracked in Pipeline' : 'Track Application'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setStructuredResume({ targetJD: `${job.title} at ${job.company}\n\nNexus Match Reason: ${job.nexusMatchReason}` });
                      setActiveSidebarTab('skill-gaps');
                    }}
                    className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-sm"
                    title="Generate Reverse Resume"
                  >
                    <Repeat size={13} />
                  </button>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Apply</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobMatchesView;
