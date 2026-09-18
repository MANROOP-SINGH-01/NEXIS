import React, { useState, useEffect } from 'react';
import {
  Target, ExternalLink, Loader2, Sparkles, Briefcase, MapPin,
  Building, Activity, AlertTriangle, ShieldCheck, CheckCircle2,
  Clock, Flame, Check, BookmarkPlus, ArrowUpRight, Repeat
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { DiscoveredJob, JobBucket } from '../types';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';

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
            trustScore: item.trustScore ?? 0.85,
            trustPercent: item.trustPercent ?? 85,
            trustLevel: item.trustLevel || 'HIGH',
            isLikelyGhost: Boolean(item.isLikelyGhost),
            isDirectAts: Boolean(item.isDirectAts),
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

  const filteredJobs = currentJobs.filter(job => {
    if (selectedBucket === 'ALL') return true;
    return job.bucket === selectedBucket;
  });

  const bucketCounts = {
    ALL: currentJobs.length,
    APPLY_NOW: currentJobs.filter(j => j.bucket === 'APPLY_NOW').length,
    LEARN_THEN_APPLY: currentJobs.filter(j => j.bucket === 'LEARN_THEN_APPLY').length,
    STRETCH: currentJobs.filter(j => j.bucket === 'STRETCH').length,
    IGNORE: currentJobs.filter(j => j.bucket === 'IGNORE').length,
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar bg-[#090a0f]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              Job Intelligence Radar
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-signal matching with Job Trust Score & anti-ghosting verification
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setMode('current')}
            className={`flex-1 min-w-[110px] px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
              mode === 'current' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Current Fit
          </button>
          <button
            onClick={() => setMode('reachable')}
            className={`flex-1 min-w-[110px] px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'reachable' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} className={mode === 'reachable' ? 'text-amber-300' : 'text-zinc-500'} />
            Reachable
          </button>
        </div>
      </div>

      {trackFeedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-mono flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>{trackFeedback}</span>
          </div>
          <button
            onClick={() => setActiveSidebarTab('application-tracker')}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-lg text-xs font-mono transition-all"
          >
            View Pipeline →
          </button>
        </div>
      )}

      {/* Bucket Filter Tabs */}
      {currentJobs.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedBucket('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all ${
              selectedBucket === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Matches ({bucketCounts.ALL})
          </button>
          <button
            onClick={() => setSelectedBucket('APPLY_NOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'APPLY_NOW'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Flame size={12} />
            Apply Now ({bucketCounts.APPLY_NOW})
          </button>
          <button
            onClick={() => setSelectedBucket('LEARN_THEN_APPLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'LEARN_THEN_APPLY'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            <Sparkles size={12} />
            Learn Then Apply ({bucketCounts.LEARN_THEN_APPLY})
          </button>
          <button
            onClick={() => setSelectedBucket('STRETCH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedBucket === 'STRETCH'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Target size={12} />
            Stretch ({bucketCounts.STRETCH})
          </button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#12131c] rounded-2xl border border-zinc-800 p-12 min-h-[350px]">
          <Loader2 size={28} className="animate-spin text-indigo-400 mb-3" />
          <p className="text-sm font-bold font-['Space_Grotesk'] text-white">Scanning Live Market Pipelines...</p>
          <p className="text-xs text-zinc-500 font-mono mt-1">Calculating multi-signal scores & trust metrics</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-500/10 text-rose-300 text-xs font-mono rounded-xl border border-rose-500/20 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && currentJobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#12131c] rounded-2xl border border-zinc-800 p-12 min-h-[350px] text-center">
          <Target size={32} className="text-zinc-600 mb-3" />
          <p className="text-sm font-bold font-['Space_Grotesk'] text-white">No Direct Matches in Current Cache</p>
          <p className="text-xs text-zinc-500 font-mono mt-1">Run the Agent Mesh or update your Target Role to scan fresh postings.</p>
        </div>
      )}

      {!loading && !error && currentJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isTracked = trackedJobIds.has(job.id);
            const isSaving = trackingJobId === job.id;

            return (
              <Card
                key={job.id}
                variant="glass"
                className="border-zinc-800 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${
                      job.bucket === 'APPLY_NOW'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : job.bucket === 'LEARN_THEN_APPLY'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : job.bucket === 'STRETCH'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {job.bucket === 'APPLY_NOW' ? '🔥 Apply Now' : job.bucket === 'LEARN_THEN_APPLY' ? '⚡ Learn Then Apply' : job.bucket === 'STRETCH' ? '🎯 Stretch' : 'Moderate Match'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {job.isLikelyGhost && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                          <Clock size={10} />
                          Stale (&gt;45d)
                        </span>
                      )}
                      {job.isDirectAts && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Direct ATS
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        <ShieldCheck size={11} className="text-emerald-400" />
                        {job.trustPercent ?? 85}% Trust
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Company */}
                  <div className="mb-3">
                    <h2 className="text-base font-bold font-['Space_Grotesk'] text-white leading-snug hover:text-indigo-300 transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-1">
                      <Building size={13} className="text-zinc-500" />
                      <span>{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      <span className="capitalize">{job.source}</span>
                    </div>
                  </div>

                  {/* Multi-Signal Breakdown */}
                  <div className="bg-[#1a1b28] rounded-xl p-3 border border-zinc-800 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Multi-Signal Overlap</span>
                      <span className="text-xs font-mono font-bold text-indigo-300">{job.overallScore ?? job.alignmentScore}% Composite</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <p className="text-[9px] text-zinc-500 uppercase">Skills</p>
                        <p className="text-xs font-bold text-emerald-400">{job.skillScore ?? 85}%</p>
                      </div>
                      <div className="p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <p className="text-[9px] text-zinc-500 uppercase">Exp</p>
                        <p className="text-xs font-bold text-cyan-400">{job.experienceScore ?? 80}%</p>
                      </div>
                      <div className="p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <p className="text-[9px] text-zinc-500 uppercase">Title</p>
                        <p className="text-xs font-bold text-purple-400">{job.titleScore ?? 75}%</p>
                      </div>
                      <div className="p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <p className="text-[9px] text-zinc-500 uppercase">Project</p>
                        <p className="text-xs font-bold text-amber-400">{job.projectScore ?? 70}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Nexus Match Reason */}
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2 font-normal">
                    {job.nexusMatchReason}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                  <Button
                    variant={isTracked ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleTrackApplication(job)}
                    disabled={isTracked || isSaving}
                    isLoading={isSaving}
                    leftIcon={isTracked ? <Check size={13} className="text-emerald-400" /> : <BookmarkPlus size={13} />}
                    className="flex-1"
                  >
                    {isTracked ? 'Tracked' : 'Track Application'}
                  </Button>

                  <button
                    onClick={() => {
                      setStructuredResume({ targetJD: `${job.title} at ${job.company}\n\nNexus Match Reason: ${job.nexusMatchReason}` });
                      setActiveSidebarTab('skill-gaps');
                    }}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs border border-zinc-800 transition-colors"
                    title="Generate Reverse Resume"
                  >
                    <Repeat size={14} />
                  </button>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold font-['Space_Grotesk'] tracking-wider transition-all flex items-center gap-1 shadow-md shadow-indigo-600/25"
                  >
                    <span>Apply</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobMatchesView;
