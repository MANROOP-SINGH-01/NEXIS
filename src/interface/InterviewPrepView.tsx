import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Loader2, ChevronRight, Lightbulb, BookOpen,
  AlertTriangle, Sparkles, Trophy, RefreshCw
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { CandidateSkill } from '../types';

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'technical': { label: 'Technical', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'behavioral': { label: 'Behavioral', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  'system-design': { label: 'System Design', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
};

interface FocusArea {
  category: string;
  topic: string;
  why: string;
  tip: string;
}

interface GapTopic {
  skill: string;
  likely_question_angle: string;
  prep_suggestion: string;
}

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
    {
      category: 'technical',
      topic: 'API Design & State Management',
      why: 'Interviewers evaluate your ability to architect scalable frontend-to-backend communication patterns.',
      tip: 'Prepare a 90-second explanation of how you handle error boundaries, optimistic UI updates, and token lifecycle.',
    },
    {
      category: 'system-design',
      topic: 'Database Performance & Indexing',
      why: 'Assesses your understanding of real-world latency, connection pooling, and ACID transaction boundaries.',
      tip: 'Walk through an instance where you identified slow queries with EXPLAIN and resolved them using composite indexes.',
    },
    {
      category: 'behavioral',
      topic: 'Ownership & Production Incident Resolution',
      why: 'Evaluates composure, communication, and engineering rigor under high-stakes incidents.',
      tip: 'Use the STAR format to describe an ambiguous bug or outage, emphasizing mitigation speed and post-mortem improvements.',
    },
    {
      category: 'technical',
      topic: 'Automated CI/CD & Cloud Infrastructure',
      why: 'Confirms you can independently ship and monitor services in production.',
      tip: 'Highlight multi-stage Docker builds, automated test gates, and continuous delivery with zero downtime.',
    },
  ],
  gap_topics: [
    {
      skill: 'Cloud & Distributed Architecture',
      likely_question_angle: 'How would you scale an API service from 1,000 to 100,000 concurrent requests without ballooning database costs?',
      prep_suggestion: 'Review horizontal autoscaling, Redis caching, and rate limiting strategies with token bucket algorithms.',
    },
    {
      skill: 'Container Orchestration & CI/CD',
      likely_question_angle: 'Explain how your CI/CD pipeline validates changes before promoting them to production.',
      prep_suggestion: 'Be ready to detail GitHub Actions or GitLab CI stages: lint, test, docker build, security scan, and deploy.',
    },
  ],
  isRealTime: false,
};

export const InterviewPrepView: React.FC = () => {
  const { skillProfile } = useUiStore();
  const { currentResume, runtimeKeys, setNexusMirrorOpen } = useCoreStore();
  const [brief, setBrief] = useState<InterviewBrief>(DEFAULT_INTERVIEW_BRIEF);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateNames = new Set(
    (skillProfile?.candidate_skills || []).map((s: CandidateSkill) => s.skill.toLowerCase())
  );
  const requiredGaps = (skillProfile?.jd_required_skills || []).filter(
    (s) => !candidateNames.has(s.toLowerCase())
  );
  const niceGaps = (skillProfile?.jd_nice_to_have_skills || []).filter(
    (s) => !candidateNames.has(s.toLowerCase())
  );
  const matchedSkills = (skillProfile?.candidate_skills || []).map(s => s.skill);

  const roleTitle = skillProfile?.jd_role_title || (currentResume.targetJD ? currentResume.targetJD.split('\n')[0].slice(0, 50) : 'Full Stack Software Engineer');
  const seniority = skillProfile?.jd_seniority || 'Mid-Senior';

  const fetchRealTimeBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/interview/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle,
          seniority,
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
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 flex flex-col gap-4 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: USER_COLOR_LIGHT }}
          >
            <MessageSquare size={16} strokeWidth={2.5} style={{ color: USER_COLOR }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Interview Prep</h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              {seniority} ? {roleTitle}
              {brief.isRealTime && (
                <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-black rounded text-[9px] uppercase tracking-wider">
                  Real-Time AI Active
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRealTimeBrief}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Regenerate
          </button>

          <button
            onClick={() => setNexusMirrorOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold text-white transition-colors shadow-sm"
            style={{ background: USER_COLOR }}
          >
            <Sparkles size={12} />
            Start Mock Simulator
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-8">
          <Loader2 size={24} className="animate-spin text-zinc-400 mb-3" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Generating tailored interview questions for {roleTitle}...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-md border border-red-100 font-medium">
          {error}
        </div>
      )}

      {!loading && brief && (
        <>
          {/* Strength to lead with */}
          {brief.key_strength_to_lead_with && (
            <div
              className="rounded-lg border p-4 flex items-start gap-3 bg-blue-50/50 border-blue-200/70"
            >
              <Trophy size={16} className="shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-blue-600">
                  Lead With This (Core Competitive Edge)
                </p>
                <p className="text-sm font-bold text-zinc-900">{brief.key_strength_to_lead_with}</p>
              </div>
            </div>
          )}

          {/* Overall readiness note */}
          {brief.overall_readiness_note && (
            <div className="rounded-lg border border-zinc-200/80 bg-white shadow-sm p-4 flex items-start gap-3">
              <BookOpen size={16} className="shrink-0 mt-0.5 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-600 leading-relaxed">{brief.overall_readiness_note}</p>
            </div>
          )}

          {/* Focus areas */}
          {Array.isArray(brief.focus_areas) && brief.focus_areas.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-1">
                Role-Specific Focus Areas & Technical Depth
              </p>
              <div className="flex flex-col gap-3">
                {brief.focus_areas.map((area, i) => {
                  const style = CATEGORY_STYLES[area.category] || CATEGORY_STYLES['technical'];
                  return (
                    <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
                        >
                          {style.label}
                        </span>
                        <span className="text-sm font-black text-zinc-900">{area.topic}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mb-2 leading-relaxed">{area.why}</p>
                      <div className="flex items-start gap-2 bg-zinc-50 rounded-md p-3 border border-zinc-100">
                        <Lightbulb size={12} className="shrink-0 mt-0.5 text-amber-500" />
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
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-1">
                Anticipate Questions On Your Skill Gaps
              </p>
              <div className="flex flex-col gap-3">
                {brief.gap_topics.map((topic, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={13} className="shrink-0 text-orange-500" />
                      <span className="text-sm font-black text-zinc-900">{topic.skill}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mb-2 italic leading-relaxed">
                      "{topic.likely_question_angle}"
                    </p>
                    <div className="flex items-start gap-2 bg-amber-50 rounded-md p-3 border border-amber-100">
                      <ChevronRight size={12} className="shrink-0 mt-0.5 text-amber-600" />
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">{topic.prep_suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA to launch full mock */}
          <div className="mt-2 rounded-lg border border-zinc-200/80 bg-white shadow-sm p-5 text-center">
            <p className="text-xs font-bold text-zinc-500 mb-3">
              Ready to test yourself against the Nexus-Mirror interview simulator?
            </p>
            <button
              onClick={() => setNexusMirrorOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-black uppercase tracking-wider text-white transition-colors shadow"
              style={{ background: USER_COLOR }}
            >
              <Sparkles size={14} />
              Launch Nexus-Mirror Full Simulation
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewPrepView;
