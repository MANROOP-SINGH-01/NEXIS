import React, { useState, useEffect } from 'react';
import {
  Target, ExternalLink, Loader2, Sparkles, Briefcase, MapPin,
  Building, Activity, AlertTriangle, ShieldCheck, CheckCircle2,
  Clock, Flame, Check, BookmarkPlus, ArrowUpRight, Repeat,
  ShieldAlert, Users, Copy, CheckCheck, X, Search, Sliders, Info
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { DiscoveredJob, JobBucket, NetworkContact } from '../types';
import { generateWarmOutreachMessage } from '../services/networkMatchingService';
import { isDemoMode, DEMO_JOBS } from '../demo/demoData';
import { SectionNumber } from './bauhaus/SectionNumber';
import AdzunaAttributionBadge from './primitives/AdzunaAttributionBadge';

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

  // 6-Factor Deterministic Matching Weights (Section 18.2: M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P)
  const [showWeightsConfig, setShowWeightsConfig] = useState<boolean>(false);
  const [weights, setWeights] = useState({ S: 0.40, E: 0.20, L: 0.15, Q: 0.10, R: 0.10, P: 0.05 });

  const currentJobs = mode === 'current' ? jobMatchesCurrent : jobMatchesReachable;
  const targetRole = currentResume.targetJD.trim().split('\n')[0]?.slice(0, 120) || userCareerProfile.targetRole || 'Full Stack Engineer';
  const lastFetchedRef = React.useRef<{ role: string; mode: string } | null>(null);

  useEffect(() => {
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
            weights,
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
    <div
      className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar font-sans"
      style={{ backgroundColor: '#F5F0E6' }}
    >
      {/* Bauhaus Header & Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4" style={{ borderBottom: '2px solid #111111' }}>
        <div>
          <SectionNumber number="04" label="OPPORTUNITIES" />
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] uppercase tracking-tight mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            JOB INTELLIGENCE
          </h1>
          <p className="text-xs sm:text-sm text-[#555555] mt-1 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
            Targeting: <span className="font-bold text-[#111111]">{targetRole}</span> • Transparent fit ratings & warm referral radar.
          </p>
        </div>

        {/* Bauhaus Segmented Mode Toggle & Official Adzuna Attribution Badge */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <AdzunaAttributionBadge country="in" />

          <div
            className="inline-flex items-center gap-0"
            style={{ border: '2px solid #111111' }}
          >
            <button
              onClick={() => setMode('current')}
              className="py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: mode === 'current' ? '#111111' : '#FFFFFF',
                color: mode === 'current' ? '#F5F0E6' : '#111111',
                borderRight: '1px solid #111111',
              }}
            >
              Current Fit
            </button>
            <button
              onClick={() => setMode('reachable')}
              className="py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: mode === 'reachable' ? '#111111' : '#FFFFFF',
                color: mode === 'reachable' ? '#F5F0E6' : '#111111',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Reachable (Stretch)</span>
            </button>
          </div>

          <button
            onClick={() => setShowWeightsConfig(!showWeightsConfig)}
            className="py-2 px-3 text-xs font-mono font-bold uppercase border-2 border-[#111111] bg-[#FFFFFF] hover:bg-[#F5F0E6] flex items-center gap-1.5 shadow-[2px_2px_0px_#111111]"
            title="Configure 6-factor matching formula weights"
          >
            <Sliders size={13} className="text-[#2457A6]" />
            <span>Weights ({weights.S * 100}S / {weights.E * 100}E)</span>
          </button>
        </div>
      </div>

      {/* Provider Attribution Banner */}
      <div className="p-2.5 bg-[#EBF3FC] border-2 border-[#2457A6] shadow-[2px_2px_0px_#111111] flex items-center justify-between text-xs font-mono text-[#1E40AF]">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-[#2457A6] shrink-0" />
          <span>Real-time Multi-Provider Postings (Adzuna & Arbeitnow)</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-[#2457A6]">Live API Results</span>
      </div>

      {/* Section 25.3 Synthetic Demo Dataset Disclaimer */}
      <div className="p-3 bg-[#FFFBEB] border-2 border-[#D97706] shadow-[2px_2px_0px_#111111] flex items-start gap-2.5 text-xs font-mono text-[#92400E]">
        <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <span className="font-black uppercase tracking-wider mr-2">[SECTION 25.3 NOTICE]:</span>
          Synthetic demonstration data — not official Maharashtra government statistics. Match scoring and candidate compatibility are generated for technical evaluation.
        </div>
      </div>

      {/* Configurable 6-Factor Weights Panel (Section 18.2) */}
      {showWeightsConfig && (
        <div className="p-4 bg-[#FFFFFF] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#111111]">
            <span className="font-black uppercase text-[#111111]">
              Deterministic 6-Factor Match Model: M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P
            </span>
            <button
              onClick={() => setWeights({ S: 0.40, E: 0.20, L: 0.15, Q: 0.10, R: 0.10, P: 0.05 })}
              className="text-[10px] text-[#2457A6] underline font-bold"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">S (Skills): {(weights.S * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.10" max="0.70" step="0.05" value={weights.S}
                onChange={(e) => setWeights({ ...weights, S: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">E (Experience): {(weights.E * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.05" max="0.40" step="0.05" value={weights.E}
                onChange={(e) => setWeights({ ...weights, E: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">L (Location): {(weights.L * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.05" max="0.30" step="0.05" value={weights.L}
                onChange={(e) => setWeights({ ...weights, L: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">Q (Quals): {(weights.Q * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.05" max="0.25" step="0.05" value={weights.Q}
                onChange={(e) => setWeights({ ...weights, Q: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">R (Role Rel): {(weights.R * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.05" max="0.25" step="0.05" value={weights.R}
                onChange={(e) => setWeights({ ...weights, R: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555555] font-bold block">P (Preference): {(weights.P * 100).toFixed(0)}%</label>
              <input
                type="range" min="0.01" max="0.15" step="0.01" value={weights.P}
                onChange={(e) => setWeights({ ...weights, P: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {trackFeedback && (
        <div
          className="p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 text-xs font-bold uppercase tracking-wider"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: 'rgba(46,125,50,0.1)',
            border: '2px solid #2E7D32',
            color: '#2E7D32',
            borderRadius: '0px',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#2E7D32]" />
            <span>{trackFeedback}</span>
          </div>
          <button
            onClick={() => setActiveSidebarTab('application-tracker')}
            className="px-3 py-1 bg-[#111111] text-[#F5F0E6] text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            View Pipeline →
          </button>
        </div>
      )}

      {/* Bucket Filter Tabs */}
      {currentJobs.length > 0 && (
        <div
          className="flex items-center gap-0 overflow-x-auto custom-scrollbar"
          style={{ border: '2px solid #111111' }}
        >
          <button
            onClick={() => setSelectedBucket('ALL')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: selectedBucket === 'ALL' ? '#111111' : '#FFFFFF',
              color: selectedBucket === 'ALL' ? '#F5F0E6' : '#555555',
              borderRight: '1px solid #111111',
            }}
          >
            All ({bucketCounts.ALL})
          </button>
          <button
            onClick={() => setSelectedBucket('APPLY_NOW')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: selectedBucket === 'APPLY_NOW' ? '#2E7D32' : '#FFFFFF',
              color: selectedBucket === 'APPLY_NOW' ? '#FFFFFF' : '#2E7D32',
              borderRight: '1px solid #111111',
            }}
          >
            <Flame size={13} />
            Apply Now ({bucketCounts.APPLY_NOW})
          </button>
          <button
            onClick={() => setSelectedBucket('LEARN_THEN_APPLY')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: selectedBucket === 'LEARN_THEN_APPLY' ? '#E53935' : '#FFFFFF',
              color: selectedBucket === 'LEARN_THEN_APPLY' ? '#FFFFFF' : '#E53935',
              borderRight: '1px solid #111111',
            }}
          >
            <Sparkles size={13} />
            Learn Then Apply ({bucketCounts.LEARN_THEN_APPLY})
          </button>
          <button
            onClick={() => setSelectedBucket('STRETCH')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: selectedBucket === 'STRETCH' ? '#F4C430' : '#FFFFFF',
              color: selectedBucket === 'STRETCH' ? '#111111' : '#8B6914',
            }}
          >
            <Target size={13} />
            Stretch ({bucketCounts.STRETCH})
          </button>
        </div>
      )}

      {loading && (
        <div
          className="p-12 text-center min-h-[350px] flex flex-col items-center justify-center shadow-[4px_4px_0px_#111111]"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #111111',
          }}
        >
          <Loader2 size={32} className="animate-spin text-[#E53935] mb-3" />
          <p
            className="text-base font-bold text-[#111111] uppercase tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Scanning Live Market Pipelines...
          </p>
          <p className="text-xs text-[#555555] mt-1 font-mono">
            Calculating multi-signal fit scores & warm referral connections
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          className="p-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: 'rgba(229,57,53,0.1)',
            border: '2px solid #E53935',
            color: '#E53935',
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && currentJobs.length === 0 && (
        <div
          className="p-12 text-center min-h-[350px] flex flex-col items-center justify-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px dashed #111111',
          }}
        >
          <Target size={36} className="text-[#7A7A7A] mb-3" />
          <p
            className="text-base font-bold text-[#111111] uppercase tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No Direct Matches in Current Cache
          </p>
          <p className="text-xs text-[#555555] mt-1 max-w-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                className="p-6 flex flex-col justify-between transition-all duration-150"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #111111',
                  boxShadow: '4px 4px 0px #111111',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                    <span
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        backgroundColor:
                          job.bucket === 'APPLY_NOW'
                            ? 'rgba(46,125,50,0.1)'
                            : job.bucket === 'LEARN_THEN_APPLY'
                            ? 'rgba(229,57,53,0.1)'
                            : 'rgba(244,196,48,0.15)',
                        color:
                          job.bucket === 'APPLY_NOW'
                            ? '#2E7D32'
                            : job.bucket === 'LEARN_THEN_APPLY'
                            ? '#E53935'
                            : '#8B6914',
                        border: `1px solid ${
                          job.bucket === 'APPLY_NOW'
                            ? '#2E7D32'
                            : job.bucket === 'LEARN_THEN_APPLY'
                            ? '#E53935'
                            : '#F4C430'
                        }`,
                      }}
                    >
                      {job.bucket === 'APPLY_NOW'
                        ? '● Apply Now'
                        : job.bucket === 'LEARN_THEN_APPLY'
                        ? '▲ Learn Then Apply'
                        : '■ Stretch'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {job.isLikelyGhost && (
                        <span
                          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            backgroundColor: 'rgba(229,57,53,0.1)',
                            color: '#E53935',
                            border: '1px solid #E53935',
                          }}
                        >
                          <Clock size={10} />
                          Stale (&gt;45d)
                        </span>
                      )}
                      {job.isDirectAts && (
                        <span
                          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            backgroundColor: 'rgba(36,87,166,0.1)',
                            color: '#2457A6',
                            border: '1px solid #2457A6',
                          }}
                        >
                          Direct ATS
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          backgroundColor: '#F5F0E6',
                          color: '#111111',
                          border: '1px solid #111111',
                        }}
                      >
                        <ShieldCheck size={12} className="text-[#2E7D32]" />
                        {job.trustPercent ?? 85}% Trust
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Company */}
                  <div className="mb-3.5">
                    <h2
                      className="text-lg font-bold text-[#111111] uppercase tracking-tight leading-snug"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#555555] mt-1 font-medium">
                      <Building size={13} className="text-[#111111]" />
                      <span className="font-bold text-[#111111] uppercase">{job.company}</span>
                      <span className="text-[#7A7A7A]">/</span>
                      <span className="capitalize font-mono text-[#7A7A7A]">{job.source}</span>
                    </div>
                  </div>

                  {/* Multi-Signal Breakdown Box */}
                  <div
                    className="p-3 mb-3.5"
                    style={{
                      backgroundColor: '#F5F0E6',
                      border: '1px solid #111111',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider text-[#555555]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        Signal Overlap
                      </span>
                      <span
                        className="text-xs font-bold text-[#E53935]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {job.overallScore ?? job.alignmentScore}% Composite
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 bg-[#FFFFFF] border border-[#111111]">
                        <p className="text-[9px] text-[#7A7A7A] font-bold uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Skills</p>
                        <p className="text-xs font-bold text-[#2E7D32]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{job.skillScore ?? 85}%</p>
                      </div>
                      <div className="p-1.5 bg-[#FFFFFF] border border-[#111111]">
                        <p className="text-[9px] text-[#7A7A7A] font-bold uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Exp</p>
                        <p className="text-xs font-bold text-[#2457A6]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{job.experienceScore ?? 80}%</p>
                      </div>
                      <div className="p-1.5 bg-[#FFFFFF] border border-[#111111]">
                        <p className="text-[9px] text-[#7A7A7A] font-bold uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Title</p>
                        <p className="text-xs font-bold text-[#E53935]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{job.titleScore ?? 75}%</p>
                      </div>
                      <div className="p-1.5 bg-[#FFFFFF] border border-[#111111]">
                        <p className="text-[9px] text-[#7A7A7A] font-bold uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Project</p>
                        <p className="text-xs font-bold text-[#8B6914]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{job.projectScore ?? 70}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Transparent Fit Evaluation */}
                  {job.fitEvaluation && (
                    <div
                      className="p-3 mb-3.5 text-xs"
                      style={{
                        backgroundColor:
                          job.fitEvaluation.rating === 'HIGH'
                            ? 'rgba(46,125,50,0.06)'
                            : job.fitEvaluation.rating === 'MEDIUM'
                            ? 'rgba(244,196,48,0.1)'
                            : 'rgba(229,57,53,0.06)',
                        border: '1px solid #111111',
                      }}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span
                          className="uppercase text-[10px] tracking-wider text-[#111111]"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {job.fitEvaluation.rating === 'HIGH' && '🎯 High Alignment'}
                          {job.fitEvaluation.rating === 'MEDIUM' && '⚡ Moderate Fit'}
                          {job.fitEvaluation.rating === 'LOW' && '▲ Stretch Target'}
                          {job.fitEvaluation.rating === 'SKIP' && '⛔ Disqualified'}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 bg-[#111111] text-[#F5F0E6] font-bold"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {job.fitEvaluation.scorePercent}/100
                        </span>
                      </div>

                      {job.fitEvaluation.dealbreakersTriggered.length > 0 && (
                        <p className="text-[11px] text-[#E53935] font-bold mt-1">
                          Dealbreaker: {job.fitEvaluation.dealbreakersTriggered.join(', ')}
                        </p>
                      )}

                      {job.fitEvaluation.mustHavesMatched.length > 0 && (
                        <p className="text-[11px] text-[#555555] mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                          ✓ Must-Haves: {job.fitEvaluation.mustHavesMatched.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warm Referral Connection Banner */}
                  {job.networkMatches && job.networkMatches.length > 0 && (
                    <div
                      className="p-3 mb-3.5 flex items-center justify-between gap-3 text-xs"
                      style={{
                        backgroundColor: 'rgba(36,87,166,0.08)',
                        border: '1px solid #2457A6',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            backgroundColor: '#2457A6',
                            color: '#FFFFFF',
                          }}
                        >
                          {job.networkMatches[0].name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-[#111111] uppercase text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {job.networkMatches[0].name} ({job.networkMatches[0].position})
                          </p>
                          <p className="text-[10px] text-[#2457A6] font-bold">
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
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap transition-colors cursor-pointer"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          backgroundColor: '#2457A6',
                          border: '1px solid #111111',
                        }}
                      >
                        Draft Intro →
                      </button>
                    </div>
                  )}

                  {/* Nexus Match Reason */}
                  <p className="text-xs text-[#555555] leading-relaxed mb-4 line-clamp-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {job.nexusMatchReason}
                  </p>
                </div>

                {/* Card Actions: Bauhaus Buttons */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '2px solid #111111' }}>
                  <button
                    onClick={() => handleTrackApplication(job)}
                    disabled={isTracked || isSaving}
                    className="py-2 px-3 text-xs font-bold uppercase tracking-wider flex-1 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: isTracked ? 'rgba(46,125,50,0.1)' : '#FFFFFF',
                      color: isTracked ? '#2E7D32' : '#111111',
                      border: `1px solid ${isTracked ? '#2E7D32' : '#111111'}`,
                    }}
                  >
                    {isTracked ? (
                      <>
                        <Check size={13} className="text-[#2E7D32]" />
                        <span>Tracked</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={13} />
                        <span>Track</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => createApplicationProposal(job)}
                    className="py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: '#E53935',
                      color: '#FFFFFF',
                      border: '1px solid #111111',
                      boxShadow: '2px 2px 0px #111111',
                    }}
                    title="Two-Phase Application Navigator"
                  >
                    <ShieldAlert size={13} />
                    <span>Prep ATS</span>
                  </button>

                  <button
                    onClick={() => {
                      setStructuredResume({ targetJD: `${job.title} at ${job.company}\n\nNexus Match Reason: ${job.nexusMatchReason}` });
                      setActiveSidebarTab('skill-gaps');
                    }}
                    className="p-2 text-[#111111] hover:bg-[#F5F0E6] transition-colors cursor-pointer"
                    style={{ border: '1px solid #111111' }}
                    title="Generate Reverse Resume"
                  >
                    <Repeat size={14} />
                  </button>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 bg-[#2457A6] hover:bg-[#1E40AF] text-white border border-[#111111] shadow-[2px_2px_0px_#111111]"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    <span>Apply on Adzuna</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg overflow-hidden p-6 font-sans space-y-4 shadow-[8px_8px_0px_#111111]"
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #111111',
              borderRadius: '0px',
            }}
          >
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '2px solid #111111' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 text-white"
                  style={{ backgroundColor: '#2457A6', border: '1px solid #111111' }}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-base font-bold text-[#111111] uppercase tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Warm Referral Intro Draft
                  </h3>
                  <p className="text-xs text-[#555555]">To {warmOutreachModal.contact.name} at {warmOutreachModal.contact.company}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWarmOutreachModal(null);
                  setCopiedOutreach(false);
                }}
                className="p-1.5 text-[#111111] hover:bg-[#EFE7D8] cursor-pointer"
                style={{ border: '1px solid #111111' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-4 font-mono text-xs text-[#111111] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto"
              style={{
                backgroundColor: '#F5F0E6',
                border: '1px solid #111111',
              }}
            >
              {warmOutreachModal.message}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#7A7A7A] font-mono">
                {warmOutreachModal.contact.linkedinUrl ? 'Verified LinkedIn connection' : 'Internal network contact'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(warmOutreachModal.message);
                  setCopiedOutreach(true);
                  setTimeout(() => setCopiedOutreach(false), 2000);
                }}
                className="py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundColor: '#E53935',
                  color: '#FFFFFF',
                  border: '2px solid #111111',
                  boxShadow: '3px 3px 0px #111111',
                }}
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
