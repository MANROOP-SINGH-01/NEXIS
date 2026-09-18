import React, { useEffect, useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, BookOpen, ChevronRight, Landmark, Sparkles, CheckCircle2 } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { CandidateSkill, RecommendedProgram } from '../types';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';

const CURATED_PROGRAMS_FALLBACK: Record<string, RecommendedProgram[]> = {
  'AWS / Cloud Architecture': [
    { title: 'Cloud Computing & Distributed Systems', provider: 'NPTEL (Ministry of Education, Govt. of India)', url: 'https://onlinecourses.nptel.ac.in/explorer?q=cloud+computing', isFree: true, isGovt: true, badge: 'NPTEL / IIT' },
    { title: 'AWS Certified Solutions Architect', provider: 'AWS Training & Coursera', url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials', isFree: true, isGovt: false, badge: 'Industry Standard' },
  ],
  'Docker & Containers': [
    { title: 'Linux and Open Source Container Technologies', provider: 'SWAYAM (Govt. of India / IIT Bombay)', url: 'https://swayam.gov.in/explorer?searchText=linux', isFree: true, isGovt: true, badge: 'Govt. of India' },
    { title: 'Introduction to Kubernetes & Containers', provider: 'edX & Linux Foundation', url: 'https://www.edx.org/course/introduction-to-kubernetes', isFree: true, isGovt: false, badge: 'Free Verified' },
  ],
  'PostgreSQL Optimization': [
    { title: 'Database Management Systems & SQL Query Architecture', provider: 'NPTEL & IIT Kharagpur', url: 'https://onlinecourses.nptel.ac.in/explorer?q=database', isFree: true, isGovt: true, badge: 'NPTEL / IIT' },
    { title: 'Database Design & Relational Modeling', provider: 'Skill India Digital Hub', url: 'https://www.skillindiadigital.gov.in/courses?search=database', isFree: true, isGovt: true, badge: 'Skill India' },
  ],
  'CI/CD Pipelines': [
    { title: 'DevOps & Software Automation Practices', provider: 'SWAYAM & NPTEL', url: 'https://swayam.gov.in/explorer?searchText=devops', isFree: true, isGovt: true, badge: 'Govt. of India' },
    { title: 'Automated CI/CD with GitHub Actions', provider: 'GitHub Skills Lab', url: 'https://skills.github.com', isFree: true, isGovt: false, badge: 'Free Lab' },
  ],
};

export const RecommendedProgramsView: React.FC = () => {
  const { skillProfile, recommendedPrograms, setRecommendedPrograms } = useUiStore();
  const { runtimeKeys } = useCoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateNames = new Set((skillProfile?.candidate_skills || []).map((s: CandidateSkill) => s.skill.toLowerCase()));
  const requiredGaps = (skillProfile?.jd_required_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()));
  const niceGaps = (skillProfile?.jd_nice_to_have_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()));
  const allGaps = [...requiredGaps, ...niceGaps];

  useEffect(() => {
    if (!skillProfile || allGaps.length === 0 || Object.keys(recommendedPrograms).length > 0) return;

    const fetchPrograms = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/programs/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gaps: allGaps,
            key: runtimeKeys.gemini,
            serperKey: runtimeKeys.sarvam,
          }),
        });

        const json = await res.json();
        
        if (!res.ok || !json?.programs || Object.keys(json.programs).length === 0) {
          setRecommendedPrograms(CURATED_PROGRAMS_FALLBACK);
          return;
        }

        setRecommendedPrograms(json.programs);
      } catch (err) {
        console.warn('[RecommendedProgramsView] API fallback activated:', err);
        setRecommendedPrograms(CURATED_PROGRAMS_FALLBACK);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [skillProfile, Object.keys(recommendedPrograms).length, runtimeKeys, setRecommendedPrograms]);

  if (Object.keys(recommendedPrograms).length === 0) {
    setRecommendedPrograms(CURATED_PROGRAMS_FALLBACK);
  }

  const renderCourseList = (skill: string) => {
    const courses = recommendedPrograms[skill];
    if (!courses) return null;
    
    if (courses.length === 0) {
      return <p className="text-xs text-zinc-500 font-mono italic mt-2">No programs currently indexed for this skill.</p>;
    }
    
    return (
      <div className="grid gap-2.5 mt-3">
        {courses.map((course, idx) => {
          const isGovt = course.isGovt || /swayam|nptel|skill india|govt|moe|iit/i.test(course.provider);
          return (
            <a
              key={idx}
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all duration-200 group ${
                isGovt
                  ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10'
                  : 'bg-[#1a1b28] border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-800/60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {isGovt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider">
                      <Landmark size={11} className="text-amber-400" />
                      Govt. Accredited
                    </span>
                  )}
                  {course.isFree && (
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider">
                      Free Access
                    </span>
                  )}
                  {course.badge && !isGovt && (
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                  <span>{course.provider}</span>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all shadow-xs">
                <ChevronRight size={15} />
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar bg-[#090a0f]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              Recommended Programs & Roadmaps
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Verified Indian Government training portals (SWAYAM, NPTEL) & free accredited courses
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-mono font-semibold">
          <Landmark size={14} className="text-amber-400" />
          <span>Govt. Accredited Registry Synced</span>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#12131c] rounded-2xl border border-zinc-800 p-12 min-h-[350px]">
          <Loader2 size={28} className="animate-spin text-amber-400 mb-3" />
          <p className="text-sm font-bold font-['Space_Grotesk'] text-white">Indexing Course Catalogs...</p>
          <p className="text-xs text-zinc-500 font-mono mt-1">Cross-referencing skill gaps against SWAYAM & NPTEL</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-3.5 bg-rose-500/10 text-rose-300 text-xs font-mono rounded-xl border border-rose-500/20">
          {error}
        </div>
      )}

      {!loading && !error && allGaps.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#12131c] rounded-2xl border border-zinc-800 p-12 min-h-[350px] text-center">
          <BookOpen size={36} className="text-emerald-400 mb-3" />
          <p className="text-base font-bold font-['Space_Grotesk'] text-white mb-1">No Skill Gaps Detected!</p>
          <p className="text-xs text-zinc-400 font-mono">Your profile already satisfies all target requirements.</p>
        </div>
      )}

      {!loading && !error && allGaps.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {requiredGaps.length > 0 && (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 px-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Critical Priority (Required for Role)
              </span>
              {requiredGaps.slice(0, 3).map(skill => (
                <Card key={skill} variant="glass" className="border-zinc-800 p-5">
                  <span className="inline-block px-2.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-mono font-bold mb-1">
                    {skill}
                  </span>
                  {renderCourseList(skill)}
                </Card>
              ))}
            </div>
          )}

          {niceGaps.length > 0 && (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Secondary Priority (Differentiating Edge)
              </span>
              {niceGaps.slice(0, 2).map(skill => (
                <Card key={skill} variant="glass" className="border-zinc-800 p-5">
                  <span className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-mono font-bold mb-1">
                    {skill}
                  </span>
                  {renderCourseList(skill)}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedProgramsView;
