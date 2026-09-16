import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Loader2, ChevronRight, Lightbulb, BookOpen,
  AlertTriangle, Sparkles, Trophy, RefreshCw, Activity
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { CandidateSkill } from '../types';

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'technical': { label: 'Technical', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'behavioral': { label: 'Behavioral', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  'system-design': { label: 'System Design', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
};

interface FocusArea { category: string; topic: string; why: string; tip: string; }
interface GapTopic { skill: string; likely_question_angle: string; prep_suggestion: string; }
interface InterviewBrief {
  focus_areas: FocusArea[];
  gap_topics: GapTopic[];
  key_strength_to_lead_with: string;
  overall_readiness_note: string;
  isRealTime?: boolean;
}

const DEFAULT_INTERVIEW_BRIEF: InterviewBrief = {
  key_strength_to_lead_with: 'Full-stack problem solving with clean architecture, API design, and modern database workflows.',
  overall_readiness_note: 'You are well-positioned for modern software roles. Focus on articulating architectural tradeoffs and demonstrating your ownership of end-to-end deliverables.',
  focus_areas: [
    { category: 'technical', topic: 'API Design & State Management', why: 'Interviewers evaluate your ability to architect scalable frontend-to-backend communication patterns.', tip: 'Prepare a 90-second explanation of how you handle error boundaries, optimistic UI updates, and token lifecycle.' },
    { category: 'system-design', topic: 'Database Performance & Indexing', why: 'Assesses your understanding of real-world latency, connection pooling, and ACID transaction boundaries.', tip: 'Walk through an instance where you identified slow queries with EXPLAIN and resolved them using composite indexes.' },
    { category: 'behavioral', topic: 'Ownership & Production Incident Resolution', why: 'Evaluates composure, communication, and engineering rigor under high-stakes incidents.', tip: 'Use the STAR format to describe an ambiguous bug or outage, emphasizing mitigation speed and post-mortem improvements.' },
    { category: 'technical', topic: 'Automated CI/CD & Cloud Infrastructure', why: 'Confirms you can independently ship and monitor services in production.', tip: 'Highlight multi-stage Docker builds, automated test gates, and continuous delivery with zero downtime.' },
  ],
  gap_topics: [
    { skill: 'Cloud & Distributed Architecture', likely_question_angle: 'How would you scale an API service from 1,000 to 100,000 concurrent requests without ballooning database costs?', prep_suggestion: 'Review horizontal autoscaling, Redis caching, and rate limiting strategies with token bucket algorithms.' },
    { skill: 'Container Orchestration & CI/CD', likely_question_angle: 'Explain how your CI/CD pipeline validates changes before promoting them to production.', prep_suggestion: 'Be ready to detail GitHub Actions or GitLab CI stages: lint, test, docker build, security scan, and deploy.' },
  ],
  isRealTime: false,
};

export const InterviewPrepView: React.FC = () => {
  const { skillProfile } = useUiStore();
  const { currentResume, runtimeKeys, setNexusMirrorOpen } = useCoreStore();
  const [brief, setBrief] = useState<InterviewBrief>(DEFAULT_INTERVIEW_BRIEF);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateNames = new Set((skillProfile?.candidate_skills || []).map((s: CandidateSkill) => s.skill.toLowerCase()));
  const requiredGaps = (skillProfile?.jd_required_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()));
  const niceGaps = (skillProfile?.jd_nice_to_have_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()));
  const matchedSkills = (skillProfile?.candidate_skills || []).map(s => s.skill);

  const roleTitle = skillProfile?.jd_role_title || (currentResume.targetJD ? currentResume.targetJD.split('\n')[0].slice(0, 50) : 'Full Stack Software Engineer');
  const seniority = skillProfile?.jd_seniority || 'Mid-Senior';

  const fetchRealTimeBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/interview/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          roleTitle, seniority,
          requiredGaps: requiredGaps.length > 0 ? requiredGaps : ['Cloud Architecture', 'DevOps & CI/CD'],
          niceGaps: niceGaps.length > 0 ? niceGaps : ['Kubernetes'],
          matchedSkills: matchedSkills.length > 0 ? matchedSkills : ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
          key: runtimeKeys.gemini,
        }),
      });

      const json = await res.json();
      if (res.ok && json && Array.isArray(json.focus_areas) && json.focus_areas.length > 0) {
        setBrief({ ...json, isRealTime: true });
      } else {
        setBrief({ ...DEFAULT_INTERVIEW_BRIEF, isRealTime: false });
      }
    } catch (err) {
      console.warn('[InterviewPrepView] API failover to default brief:', err);
      setBrief({ ...DEFAULT_INTERVIEW_BRIEF, isRealTime: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeBrief();
  }, [skillProfile?.jd_role_title, currentResume.targetJD]);

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <MessageSquare size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Interview Prep</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-2">
              <span>{seniority}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span>{roleTitle}</span>
              {brief.isRealTime && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[9px] uppercase tracking-widest shadow-sm">
                  Live AI Active
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRealTimeBrief}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-[var(--shadow-subtle)] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-zinc-900" /> : <RefreshCw size={14} />}
            Regenerate
          </button>
          <button
            onClick={() => setNexusMirrorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            <Sparkles size={15} />
            Start Simulator
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-zinc-950 mb-4" />
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Generating tailored interview questions...</p>
          <p className="text-xs text-zinc-500 mt-2">Analyzing gap intersections for {roleTitle}</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50/80 text-red-700 text-sm rounded-2xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {!loading && brief && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strength to lead with */}
            {brief.key_strength_to_lead_with && (
              <div className="rounded-3xl border p-6 flex flex-col gap-3 bg-blue-50/50 border-blue-200/70 shadow-[var(--shadow-subtle)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-blue-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                    Lead With This (Core Edge)
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-900 leading-relaxed z-10">{brief.key_strength_to_lead_with}</p>
              </div>
            )}

            {/* Overall readiness note */}
            {brief.overall_readiness_note && (
              <div className="rounded-3xl border border-zinc-200/80 bg-white shadow-[var(--shadow-subtle)] p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={18} className="text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                    Overall Readiness
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-600 leading-relaxed">{brief.overall_readiness_note}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Focus areas */}
            {Array.isArray(brief.focus_areas) && brief.focus_areas.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-2">
                  <BookOpen size={14} className="text-zinc-400" /> Role-Specific Focus Areas
                </p>
                <div className="flex flex-col gap-4">
                  {brief.focus_areas.map((area, i) => {
                    const style = CATEGORY_STYLES[area.category] || CATEGORY_STYLES['technical'];
                    return (
                      <div key={i} className="bg-white rounded-3xl border border-zinc-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm font-bold text-zinc-950">{area.topic}</span>
                        </div>
                        <p className="text-xs text-zinc-600 mb-4 leading-relaxed">{area.why}</p>
                        <div className="flex items-start gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                          <Lightbulb size={16} className="shrink-0 text-amber-500" />
                          <p className="text-xs text-zinc-700 font-medium leading-relaxed">{area.tip}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gap-specific topics */}
            {Array.isArray(brief.gap_topics) && brief.gap_topics.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-zinc-400" /> Gap Vulnerabilities
                </p>
                <div className="flex flex-col gap-4">
                  {brief.gap_topics.map((topic, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-zinc-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                          <AlertTriangle size={14} className="text-orange-500" />
                        </span>
                        <span className="text-sm font-bold text-zinc-950">{topic.skill}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mb-4 italic leading-relaxed border-l-2 border-zinc-200 pl-3">
                        "{topic.likely_question_angle}"
                      </p>
                      <div className="flex items-start gap-3 bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50">
                        <ChevronRight size={16} className="shrink-0 text-orange-600" />
                        <p className="text-xs text-orange-900 font-medium leading-relaxed">{topic.prep_suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA to launch full mock */}
          <div className="mt-6 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-zinc-950 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative z-10 flex-1">
              <p className="text-lg font-display font-bold text-white mb-2">
                Ready to test yourself?
              </p>
              <p className="text-sm text-zinc-400 font-medium">
                Launch the Nexus-Mirror simulator for a real-time, AI-driven voice interview.
              </p>
            </div>
            <button
              onClick={() => setNexusMirrorOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-zinc-900 bg-white hover:bg-zinc-100 transition-all shadow-xl relative z-10"
            >
              <Sparkles size={16} />
              Launch Simulator
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPrepView;
