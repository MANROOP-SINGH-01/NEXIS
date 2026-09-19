import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Loader2, ChevronRight, Lightbulb, BookOpen,
  AlertTriangle, Sparkles, Trophy, RefreshCw, Activity, ArrowUpRight
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { CandidateSkill } from '../types';

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'technical': { label: 'Technical Core', color: '#FF5C1A', bg: 'rgba(255, 92, 26, 0.1)', border: 'rgba(255, 92, 26, 0.2)' },
  'behavioral': { label: 'Behavioral & Leadership', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' },
  'system-design': { label: 'System Architecture', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
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
  overall_readiness_note: 'You are well-positioned for modern engineering roles. Focus on articulating architectural tradeoffs and demonstrating end-to-end delivery ownership.',
  focus_areas: [
    { category: 'technical', topic: 'API Design & State Management', why: 'Interviewers evaluate your ability to architect scalable frontend-to-backend communication patterns.', tip: 'Prepare a 90-second explanation of how you handle error boundaries, optimistic UI updates, and token lifecycle.' },
    { category: 'system-design', topic: 'Database Performance & Indexing', why: 'Assesses your understanding of real-world latency, connection pooling, and ACID transaction boundaries.', tip: 'Walk through an instance where you identified slow queries with EXPLAIN and resolved them using composite indexes.' },
    { category: 'behavioral', topic: 'Ownership & Incident Resolution', why: 'Evaluates composure, communication, and engineering rigor under high-stakes incidents.', tip: 'Use the STAR format to describe an ambiguous bug or outage, emphasizing mitigation speed and post-mortem improvements.' },
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
    <div className="flex-1 bg-[#0A0B0E] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-[#EDEDED]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#121317] border border-white/8 flex items-center justify-center shrink-0 shadow-xs text-[#FF5C1A]">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 font-mono">
                Cognitive Interview Simulator
              </span>
              {brief.isRealTime && (
                <span className="px-2 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] font-bold rounded-full text-[9px] uppercase tracking-widest font-mono">
                  Live AI Active
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#EDEDED] tracking-tight">Interview Studio</h1>
            <p className="text-xs text-[#8B949E] font-medium mt-0.5 flex flex-wrap items-center gap-2 font-mono">
              <span className="text-[#EDEDED] font-semibold">{seniority}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[#FF5C1A] font-bold">{roleTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRealTimeBrief}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#121317] border border-white/8 text-[#EDEDED] hover:bg-[#1A1B20] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-[#FF5C1A]" /> : <RefreshCw size={14} />}
            Regenerate
          </button>
          <button
            onClick={() => setNexusMirrorOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 transition-all shadow-xs cursor-pointer"
          >
            <Sparkles size={15} />
            Launch Nexus-Mirror
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#121317] rounded-3xl border border-white/8 shadow-xs min-h-[400px]">
          <Loader2 size={36} className="animate-spin text-[#FF5C1A] mb-4" />
          <p className="text-sm font-bold text-[#EDEDED] tracking-tight">Synthesizing role-specific interview matrix...</p>
          <p className="text-xs text-[#8B949E] mt-1 font-mono">Cross-referencing gap vulnerabilities against {roleTitle}</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded-2xl border border-[#EF4444]/20 font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#EF4444]" />
          <span>{error}</span>
        </div>
      )}

      {!loading && brief && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strength to lead with */}
            {brief.key_strength_to_lead_with && (
              <div className="rounded-3xl border border-[#FF5C1A]/20 p-6 flex flex-col gap-3 bg-[#121317] shadow-xs relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={18} className="text-[#FF5C1A]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#FF5C1A] font-mono">
                    Lead With This (Primary Edge)
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#EDEDED] leading-relaxed">{brief.key_strength_to_lead_with}</p>
              </div>
            )}

            {/* Overall readiness note */}
            {brief.overall_readiness_note && (
              <div className="rounded-3xl border border-white/8 bg-[#121317] shadow-xs p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={18} className="text-[#22C55E]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#22C55E] font-mono">
                    Readiness Assessment
                  </p>
                </div>
                <p className="text-sm font-medium text-[#8B949E] leading-relaxed">{brief.overall_readiness_note}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
            {/* Focus areas */}
            {Array.isArray(brief.focus_areas) && brief.focus_areas.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] px-1 flex items-center gap-2 font-mono">
                  <BookOpen size={14} className="text-[#FF5C1A]" /> Critical Focus Vectors
                </p>
                <div className="flex flex-col gap-4">
                  {brief.focus_areas.map((area, i) => {
                    const style = CATEGORY_STYLES[area.category] || CATEGORY_STYLES['technical'];
                    return (
                      <div key={i} className="bg-[#121317] rounded-3xl border border-white/8 p-6 shadow-xs hover:border-white/16 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono"
                            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm font-bold text-[#EDEDED]">{area.topic}</span>
                        </div>
                        <p className="text-xs text-[#8B949E] mb-4 leading-relaxed">{area.why}</p>
                        <div className="flex items-start gap-3 bg-[#0A0B0E] rounded-2xl p-4 border border-white/6">
                          <Lightbulb size={16} className="shrink-0 text-[#FF5C1A] mt-0.5" />
                          <p className="text-xs text-[#EDEDED] font-medium leading-relaxed">{area.tip}</p>
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
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] px-1 flex items-center gap-2 font-mono">
                  <AlertTriangle size={14} className="text-[#F59E0B]" /> Anticipated Pressure Points
                </p>
                <div className="flex flex-col gap-4">
                  {brief.gap_topics.map((topic, i) => (
                    <div key={i} className="bg-[#121317] rounded-3xl border border-white/8 p-6 shadow-xs hover:border-white/16 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-7 h-7 rounded-xl bg-[#FF5C1A]/10 flex items-center justify-center shrink-0 border border-[#FF5C1A]/20">
                          <AlertTriangle size={13} className="text-[#FF5C1A]" />
                        </span>
                        <span className="text-sm font-bold text-[#EDEDED]">{topic.skill}</span>
                      </div>
                      <p className="text-xs text-[#EDEDED] mb-4 italic leading-relaxed border-l-2 border-[#FF5C1A] pl-3 bg-[#0A0B0E] py-2 rounded-r-lg font-mono text-[11px]">
                        "{topic.likely_question_angle}"
                      </p>
                      <div className="flex items-start gap-3 bg-[#0A0B0E] rounded-2xl p-4 border border-white/6">
                        <ChevronRight size={16} className="shrink-0 text-[#FF5C1A] mt-0.5" />
                        <p className="text-xs text-[#8B949E] font-medium leading-relaxed">{topic.prep_suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA to launch full mock */}
          <div className="mt-4 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#121317] border border-white/8 shadow-xs">
            <div className="flex-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 font-mono">
                Interactive Speech & Cadence
              </span>
              <h3 className="text-xl font-black text-[#EDEDED] mt-2 mb-1">
                Real-Time Voice & Behavioral Simulation
              </h3>
              <p className="text-sm text-[#8B949E] font-medium max-w-xl">
                Nexus-Mirror simulates adaptive technical interrogations, analyzes verbal cadence, and gives live feedback on answer conciseness.
              </p>
            </div>
            <button
              onClick={() => setNexusMirrorOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles size={16} />
              Launch Nexus-Mirror
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPrepView;
