import React, { useState, useEffect } from 'react';
import {
  Target, ExternalLink, Loader2, Sparkles, Briefcase, MapPin,
  Building, Activity, AlertTriangle, ShieldCheck, CheckCircle2,
  Clock, Flame, Check, BookmarkPlus, ArrowUpRight, Repeat,
  ShieldAlert, Users, Copy, CheckCheck, X, Search
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { DiscoveredJob, JobBucket, NetworkContact } from '../types';
import { generateWarmOutreachMessage } from '../services/networkMatchingService';
import { NexusCard, NexusButton, NexusBadge } from './nexus';
import { isDemoMode, DEMO_JOBS } from '../demo/demoData';

export const JobMatchesView: React.FC = () => {
  const { skillProfile, jobMatchesCurrent, jobMatchesReachable, setJobMatches, setActiveSidebarTab } = useUiStore();
  const { currentResume, runtimeKeys, userCareerProfile, setStructuredResume, createApplicationProposal, workHistoryProfile } = useCoreStore();
  const [warmOutreachModal, setWarmOutreachModal] = useState<{ contact: NetworkContact; jobTitle: string; message: string } | null>(null);
  const [copiedOutreach, setCopiedOutreach] = useState(false);

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
    // In demo mode or if already populated with matching role and mode, keep existing matches
    if (currentJobs.length > 0 && lastFetchedRef.current?.role === targetRole && lastFetchedRef.current?.mode === mode) {
      return;
    }

    if (isDemoMode()) {
      if (currentJobs.length === 0) {
        setJobMatches(mode, DEMO_JOBS as any);
      }
      lastFetchedRef.current = { role: targetRole, mode };
      return;
    }

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

      // Preserve existing jobs if any, otherwise fallback to demo dataset if empty
      if (currentJobs.length === 0) {
        setJobMatches(mode, DEMO_JOBS as any);
      }
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
          role: job.title,
          company: job.company,
          status: 'APPLIED',
          source: job.source,
          url: job.url,
          fitScore: job.overallScore || job.alignmentScore,
          notes: `Tracked from Nexus Hunter. Match reason: ${job.nexusMatchReason}`,
        }),
      });

      if (res.ok) {
        setTrackedJobIds(prev => new Set([...prev, job.id]));
        setTrackFeedback(`Added "${job.title}" at ${job.company} to application pipeline!`);
        setTimeout(() => setTrackFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Failed to track application:', err);
    } finally {
      setTrackingJobId(null);
    }
  };

  const bucketCounts = {
    ALL: currentJobs.length,
    APPLY_NOW: currentJobs.filter(j => j.bucket === 'APPLY_NOW').length,
    LEARN_THEN_APPLY: currentJobs.filter(j => j.bucket === 'LEARN_THEN_APPLY').length,
    STRETCH: currentJobs.filter(j => j.bucket === 'STRETCH').length,
  };

  const filteredJobs = selectedBucket === 'ALL'
    ? currentJobs
    : currentJobs.filter(j => j.bucket === selectedBucket);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#0A0B0E] custom-scrollbar">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
              Job Intelligence & Match Radar
            </h1>
            <NexusBadge variant="orange" size="sm">
              {currentJobs.length} Live Postings
            </NexusBadge>
          </div>
          <p className="text-xs sm:text-sm text-[#8B949E] font-normal">
            Targeting: <span className="font-semibold text-[#EDEDED]">{targetRole}</span> • Transparent fit ratings & warm referral detection.
          </p>
        </div>

        {/* Capsule Mode Toggle */}
        <div className="nx-nav-capsule">
          <button
            onClick={() => setMode('current')}
            className={`nx-nav-tab ${mode === 'current' ? 'active' : ''}`}
          >
            Current Fit
          </button>
          <button
            onClick={() => setMode('reachable')}
            className={`nx-nav-tab flex items-center gap-1.5 ${mode === 'reachable' ? 'active' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF5C1A]" />
            <span>Reachable (Stretch)</span>
          </button>
        </div>
      </div>

      {trackFeedback && (
        <div className="p-3.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded-xl text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#22C55E]" />
            <span className="font-medium">{trackFeedback}</span>
          </div>
          <button
            onClick={() => setActiveSidebarTab('application-tracker')}
            className="px-3 py-1 bg-[#1A1B20] hover:bg-[#22242B] text-[#EDEDED] border border-white/12 rounded-full text-xs font-semibold transition-colors cursor-pointer"
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedBucket === 'ALL'
                ? 'bg-[#1A1B20] text-white border border-[#FF5C1A]/50 shadow-sm'
                : 'bg-[#121317] border border-white/8 text-[#8B949E] hover:text-[#EDEDED] hover:bg-[#1A1B20]'
            }`}
          >
            All Matches ({bucketCounts.ALL})
          </button>
          <button
            onClick={() => setSelectedBucket('APPLY_NOW')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedBucket === 'APPLY_NOW'
                ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50 shadow-sm'
                : 'bg-[#121317] border border-white/8 text-[#8B949E] hover:text-[#22C55E] hover:bg-[#1A1B20]'
            }`}
          >
            <Flame size={13} className="text-[#22C55E]" />
            Apply Now ({bucketCounts.APPLY_NOW})
          </button>
          <button
            onClick={() => setSelectedBucket('LEARN_THEN_APPLY')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedBucket === 'LEARN_THEN_APPLY'
                ? 'bg-[#FF5C1A]/20 text-[#FF5C1A] border border-[#FF5C1A]/50 shadow-sm'
                : 'bg-[#121317] border border-white/8 text-[#8B949E] hover:text-[#FF5C1A] hover:bg-[#1A1B20]'
            }`}
          >
            <Sparkles size={13} className="text-[#FF5C1A]" />
            Learn Then Apply ({bucketCounts.LEARN_THEN_APPLY})
          </button>
          <button
            onClick={() => setSelectedBucket('STRETCH')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedBucket === 'STRETCH'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 shadow-sm'
                : 'bg-[#121317] border border-white/8 text-[#8B949E] hover:text-[#F59E0B] hover:bg-[#1A1B20]'
            }`}
          >
            <Target size={13} className="text-[#F59E0B]" />
            Stretch ({bucketCounts.STRETCH})
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-[#121317] rounded-[10px] border border-white/8 p-12 text-center min-h-[350px] flex flex-col items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <Loader2 size={32} className="animate-spin text-[#FF5C1A] mb-3" />
          <p className="text-base font-bold text-[#EDEDED]">Scanning Live Market Pipelines...</p>
          <p className="text-xs text-[#8B949E] mt-1 font-mono">Calculating multi-signal fit scores & warm referral connections</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded-xl border border-[#EF4444]/20 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-[#EF4444] shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!loading && !error && currentJobs.length === 0 && (
        <div className="bg-[#121317] rounded-[10px] border border-dashed border-white/12 p-12 text-center min-h-[350px] flex flex-col items-center justify-center">
          <Target size={36} className="text-[#8B949E] mb-3" />
          <p className="text-base font-bold text-[#EDEDED]">No Direct Matches in Current Cache</p>
          <p className="text-xs text-[#8B949E] mt-1 max-w-sm">
            Run the 3D Agent Mesh or update your Target Role in Settings to scan fresh partner job postings.
          </p>
        </div>
      )}

      {!loading && currentJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const isTracked = trackedJobIds.has(job.id);
            const isSaving = trackingJobId === job.id;

            return (
              <div
                key={job.id}
                className="bg-[#121317] rounded-[10px] border border-white/8 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition-all duration-200"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                      job.bucket === 'APPLY_NOW'
                        ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                        : job.bucket === 'LEARN_THEN_APPLY'
                        ? 'bg-[#FF5C1A]/15 text-[#FF5C1A] border border-[#FF5C1A]/30'
                        : job.bucket === 'STRETCH'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                        : 'bg-[#1A1B20] text-[#8B949E] border border-white/8'
                    }`}>
                      {job.bucket === 'APPLY_NOW' ? '🔥 Apply Now' : job.bucket === 'LEARN_THEN_APPLY' ? '⚡ Learn Then Apply' : job.bucket === 'STRETCH' ? '🎯 Stretch' : 'Moderate Match'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {job.isLikelyGhost && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 flex items-center gap-1">
                          <Clock size={10} />
                          Stale (&gt;45d)
                        </span>
                      )}
                      {job.isDirectAts && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
                          Direct ATS
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#1A1B20] text-[#EDEDED] border border-white/8">
                        <ShieldCheck size={12} className="text-[#22C55E]" />
                        {job.trustPercent ?? 85}% Trust
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Company */}
                  <div className="mb-3.5">
                    <h2 className="text-lg font-bold text-[#EDEDED] leading-snug hover:text-[#FF5C1A] transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#8B949E] mt-1 font-medium">
                      <Building size={13} className="text-[#8B949E]" />
                      <span className="font-semibold text-[#EDEDED]">{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="capitalize font-mono">{job.source}</span>
                    </div>
                  </div>

                  {/* Multi-Signal Breakdown Box */}
                  <div className="bg-[#1A1B20] rounded-[8px] p-3 border border-white/8 mb-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Multi-Signal Overlap</span>
                      <span className="text-xs font-mono font-bold text-[#FF5C1A]">{job.overallScore ?? job.alignmentScore}% Composite</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-[#121317] border border-white/8">
                        <p className="text-[9px] text-[#8B949E] font-medium uppercase font-mono">Skills</p>
                        <p className="text-xs font-mono font-bold text-[#22C55E]">{job.skillScore ?? 85}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#121317] border border-white/8">
                        <p className="text-[9px] text-[#8B949E] font-medium uppercase font-mono">Exp</p>
                        <p className="text-xs font-mono font-bold text-[#3B82F6]">{job.experienceScore ?? 80}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#121317] border border-white/8">
                        <p className="text-[9px] text-[#8B949E] font-medium uppercase font-mono">Title</p>
                        <p className="text-xs font-mono font-bold text-[#FF5C1A]">{job.titleScore ?? 75}%</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#121317] border border-white/8">
                        <p className="text-[9px] text-[#8B949E] font-medium uppercase font-mono">Project</p>
                        <p className="text-xs font-mono font-bold text-[#F59E0B]">{job.projectScore ?? 70}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Transparent Fit Evaluation */}
                  {job.fitEvaluation && (
                    <div className={`rounded-xl p-3 border mb-3.5 text-xs ${
                      job.fitEvaluation.rating === 'HIGH'
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]'
                        : job.fitEvaluation.rating === 'MEDIUM'
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]'
                        : job.fitEvaluation.rating === 'SKIP'
                        ? 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]'
                        : 'bg-[#1A1B20] border-white/8 text-[#EDEDED]'
                    }`}>
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-tight">
                          {job.fitEvaluation.rating === 'HIGH' && '🎯 High Role Alignment'}
                          {job.fitEvaluation.rating === 'MEDIUM' && '⚡ Moderate Role Fit'}
                          {job.fitEvaluation.rating === 'LOW' && '⚠️ Stretch Target'}
                          {job.fitEvaluation.rating === 'SKIP' && '⛔ Dealbreaker Disqualification'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white font-mono font-bold">
                          {job.fitEvaluation.scorePercent}/100
                        </span>
                      </div>

                      {job.fitEvaluation.dealbreakersTriggered.length > 0 && (
                        <p className="text-[11px] text-[#EF4444] font-medium mt-1">
                          Dealbreaker: {job.fitEvaluation.dealbreakersTriggered.join(', ')}
                        </p>
                      )}

                      {job.fitEvaluation.mustHavesMatched.length > 0 && (
                        <p className="text-[11px] opacity-90 mt-0.5">
                          ✓ Must-Haves: {job.fitEvaluation.mustHavesMatched.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warm Referral Connection Banner */}
                  {job.networkMatches && job.networkMatches.length > 0 && (
                    <div className="p-3 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl mb-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#7C3AED]/25 text-[#A78BFA] flex items-center justify-center font-bold text-xs shrink-0">
                          {job.networkMatches[0].name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-[#EDEDED] leading-tight">
                            {job.networkMatches[0].name} ({job.networkMatches[0].position})
                          </p>
                          <p className="text-[10px] text-[#A78BFA] font-medium">
                            Connection at {job.company}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const contact = job.networkMatches![0];
                          const msg = generateWarmOutreachMessage(contact, job.title, workHistoryProfile.candidateName);
                          setWarmOutreachModal({ contact, jobTitle: job.title, message: msg });
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                      >
                        Draft Intro →
                      </button>
                    </div>
                  )}

                  {/* Nexus Match Reason */}
                  <p className="text-xs text-[#8B949E] leading-relaxed mb-4 line-clamp-2 font-normal">
                    {job.nexusMatchReason}
                  </p>
                </div>

                {/* Card Actions: Primary Orange + Secondary Pill */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/8">
                  <button
                    onClick={() => handleTrackApplication(job)}
                    disabled={isTracked || isSaving}
                    className={`nx-btn-secondary !py-2 !px-3.5 !text-xs flex-1 ${isTracked ? '!bg-[#22C55E]/15 !text-[#22C55E] !border-[#22C55E]/30' : ''}`}
                  >
                    {isTracked ? (
                      <>
                        <Check size={13} className="text-[#22C55E]" />
                        <span>Tracked</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={13} className="text-[#8B949E]" />
                        <span>Track</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => createApplicationProposal(job)}
                    className="nx-btn-primary !py-2 !px-3.5 !text-xs cursor-pointer"
                    title="Two-Phase ATS Application Navigator"
                  >
                    <ShieldAlert size={13} />
                    <span>Prep ATS</span>
                  </button>

                  <button
                    onClick={() => {
                      setStructuredResume({ targetJD: `${job.title} at ${job.company}\n\nNexus Match Reason: ${job.nexusMatchReason}` });
                      setActiveSidebarTab('skill-gaps');
                    }}
                    className="p-2 bg-[#1A1B20] hover:bg-[#22242B] text-[#8B949E] hover:text-[#EDEDED] rounded-full border border-white/8 transition-colors cursor-pointer"
                    title="Generate Reverse Resume"
                  >
                    <Repeat size={14} />
                  </button>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nx-btn-dark !py-2 !px-3.5 !text-xs"
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

      {/* Warm Outreach Modal */}
      {warmOutreachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121317] border border-white/12 rounded-[12px] w-full max-w-lg overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-6 font-sans space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FF5C1A]/15 border border-[#FF5C1A]/30 text-[#FF5C1A]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#EDEDED]">Warm Referral Intro Draft</h3>
                  <p className="text-xs text-[#8B949E]">To {warmOutreachModal.contact.name} at {warmOutreachModal.contact.company}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWarmOutreachModal(null);
                  setCopiedOutreach(false);
                }}
                className="p-1.5 rounded-full text-[#8B949E] hover:text-[#EDEDED] hover:bg-[#1A1B20] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0B0E] border border-white/8 font-mono text-xs text-[#EDEDED] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {warmOutreachModal.message}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#8B949E] font-mono">
                {warmOutreachModal.contact.linkedinUrl ? 'Verified LinkedIn connection' : 'Internal network contact'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(warmOutreachModal.message);
                  setCopiedOutreach(true);
                  setTimeout(() => setCopiedOutreach(false), 2000);
                }}
                className="nx-btn-primary !py-2 !px-4 !text-xs cursor-pointer"
              >
                {copiedOutreach ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedOutreach ? 'Copied!' : 'Copy Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMatchesView;
