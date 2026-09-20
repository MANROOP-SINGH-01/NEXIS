import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Loader2, ChevronRight, Lightbulb, BookOpen,
  AlertTriangle, Sparkles, Trophy, RefreshCw, Activity, ArrowUpRight
} from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { CandidateSkill } from '../types';
import { PageHeader } from './bauhaus/PageHeader';

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'technical': { label: 'Technical Core', color: '#E53935', bg: '#FDEDEC', border: '#E53935' },
  'behavioral': { label: 'Behavioral & Leadership', color: '#2457A6', bg: '#EBF3FC', border: '#2457A6' },
  'system-design': { label: 'System Architecture', color: '#B78103', bg: '#FEF9E7', border: '#F4C430' },
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
    <div className="flex-1 bg-[#F5F0E6] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-[#111111]">
      
      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="07"
        code="INTERVIEW"
        title="INTERVIEW STUDIO"
        subtitle={`COGNITIVE INTERVIEW SIMULATOR // ${seniority.toUpperCase()} // ${roleTitle.toUpperCase()}`}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRealTimeBrief}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase bg-[#FFFFFF] border-2 border-[#111111] text-[#111111] hover:bg-[#EFE7D8] transition-all cursor-pointer shadow-[2px_2px_0px_#111111] disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin text-[#E53935]" /> : <RefreshCw size={14} />}
              Regenerate
            </button>
            <button
              onClick={() => setNexusMirrorOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-mono font-black uppercase text-white bg-[#E53935] hover:bg-[#111111] transition-all shadow-[2px_2px_0px_#111111] cursor-pointer border-2 border-[#111111]"
            >
              <Sparkles size={15} />
              Launch Nexus-Mirror
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] min-h-[400px]">
          <Loader2 size={36} className="animate-spin text-[#E53935] mb-4" />
          <p className="text-sm font-mono font-black uppercase text-[#111111] tracking-tight">Synthesizing role-specific interview matrix...</p>
          <p className="text-xs text-[#555555] mt-1 font-mono">Cross-referencing gap vulnerabilities against {roleTitle}</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-[#FDEDEC] text-[#E53935] text-xs font-mono font-bold border-2 border-[#E53935] shadow-[2px_2px_0px_#111111] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#E53935]" />
          <span>{error}</span>
        </div>
      )}

      {!loading && brief && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strength to lead with */}
            {brief.key_strength_to_lead_with && (
              <div className="border-2 border-[#111111] p-6 flex flex-col gap-3 bg-[#FFFFFF] shadow-[4px_4px_0px_#111111]">
                <div className="flex items-center gap-2 mb-1 pb-2 border-b-2 border-[#111111]">
                  <Trophy size={18} className="text-[#2457A6]" />
                  <p className="text-xs font-mono font-black uppercase tracking-widest text-[#2457A6]">
                    Lead With This (Primary Edge)
                  </p>
                </div>
                <p className="text-sm font-mono font-bold text-[#111111] leading-relaxed">{brief.key_strength_to_lead_with}</p>
              </div>
            )}

            {/* Overall readiness note */}
            {brief.overall_readiness_note && (
              <div className="border-2 border-[#111111] bg-[#FFFFFF] shadow-[4px_4px_0px_#111111] p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1 pb-2 border-b-2 border-[#111111]">
                  <Activity size={18} className="text-[#E53935]" />
                  <p className="text-xs font-mono font-black uppercase tracking-widest text-[#E53935]">
                    Readiness Assessment
                  </p>
                </div>
                <p className="text-sm font-mono font-medium text-[#555555] leading-relaxed">{brief.overall_readiness_note}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
            {/* Focus areas */}
            {Array.isArray(brief.focus_areas) && brief.focus_areas.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-[#111111]">
                  <span className="w-2.5 h-2.5 bg-[#E53935]" />
                  <p className="text-xs font-mono font-black uppercase tracking-widest text-[#111111] flex items-center gap-2">
                    Critical Focus Vectors
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {brief.focus_areas.map((area, i) => {
                    const style = CATEGORY_STYLES[area.category] || CATEGORY_STYLES['technical'];
                    return (
                      <div key={i} className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider border-2"
                            style={{ color: style.color, background: style.bg, borderColor: style.border }}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm font-mono font-black text-[#111111]">{area.topic}</span>
                        </div>
                        <p className="text-xs font-mono text-[#555555] mb-4 leading-relaxed">{area.why}</p>
                        <div className="flex items-start gap-3 bg-[#F5F0E6] p-4 border-2 border-[#111111]">
                          <Lightbulb size={16} className="shrink-0 text-[#E53935] mt-0.5" />
                          <p className="text-xs font-mono font-bold text-[#111111] leading-relaxed">{area.tip}</p>
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
                <div className="flex items-center gap-2 pb-2 border-b-2 border-[#111111]">
                  <span className="w-2.5 h-2.5 bg-[#F4C430]" />
                  <p className="text-xs font-mono font-black uppercase tracking-widest text-[#111111] flex items-center gap-2">
                    Anticipated Pressure Points
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {brief.gap_topics.map((topic, i) => (
                    <div key={i} className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-7 h-7 bg-[#FEF9E7] flex items-center justify-center shrink-0 border-2 border-[#F4C430]">
                          <AlertTriangle size={13} className="text-[#B78103]" />
                        </span>
                        <span className="text-sm font-mono font-black text-[#111111]">{topic.skill}</span>
                      </div>
                      <p className="text-xs text-[#111111] mb-4 italic leading-relaxed border-l-4 border-[#E53935] pl-3 bg-[#F5F0E6] py-2 font-mono text-[11px]">
                        "{topic.likely_question_angle}"
                      </p>
                      <div className="flex items-start gap-3 bg-[#F5F0E6] p-4 border-2 border-[#111111]">
                        <ChevronRight size={16} className="shrink-0 text-[#E53935] mt-0.5" />
                        <p className="text-xs font-mono text-[#555555] leading-relaxed">{topic.prep_suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA to launch full mock */}
          <div className="mt-4 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#FFFFFF] border-2 border-[#111111] shadow-[6px_6px_0px_#111111]">
            <div className="flex-1">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4C430] text-[#111111] border border-[#111111]">
                Interactive Speech & Cadence
              </span>
              <h3 className="text-xl font-mono font-black uppercase text-[#111111] mt-2 mb-1">
                Real-Time Voice & Behavioral Simulation
              </h3>
              <p className="text-xs font-mono text-[#555555] max-w-xl leading-relaxed">
                Nexus-Mirror simulates adaptive technical interrogations, analyzes verbal cadence, and gives live feedback on answer conciseness.
              </p>
            </div>
            <button
              onClick={() => setNexusMirrorOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 text-xs font-mono font-black uppercase tracking-wider text-white bg-[#E53935] hover:bg-[#111111] transition-all shadow-[3px_3px_0px_#111111] cursor-pointer border-2 border-[#111111]"
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
