import React, { useEffect, useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, BookOpen, ChevronRight, Landmark } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { CandidateSkill, RecommendedProgram } from '../types';



const CURATED_PROGRAMS_FALLBACK: Record<string, RecommendedProgram[]> = {
  'AWS / Cloud Architecture': [
    { title: 'Cloud Computing & Distributed Systems', provider: 'NPTEL (Ministry of Education, Govt. of India)', url: 'https://onlinecourses.nptel.ac.in/explorer?q=cloud+computing', isFree: true, isGovt: true, badge: 'NPTEL / IIT' },
    { title: 'AWS Certified Solutions Architect', provider: 'AWS Training & Coursera', url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials', isFree: true, isGovt: false, badge: 'Industry Audit' },
  ],
  'Docker & Containers': [
    { title: 'Linux and Open Source Container Technologies', provider: 'SWAYAM (Govt. of India / IIT Bombay)', url: 'https://swayam.gov.in/explorer?searchText=linux', isFree: true, isGovt: true, badge: 'Govt. of India' },
    { title: 'Introduction to Kubernetes & Containers', provider: 'edX & Linux Foundation', url: 'https://www.edx.org/course/introduction-to-kubernetes', isFree: true, isGovt: false, badge: 'Free Course' },
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
      return <p className="text-xs text-zinc-500 italic mt-3">No programs found for this skill yet.</p>;
    }
    
    return (
      <div className="grid gap-3 mt-4">
        {courses.map((course, idx) => {
          const isGovt = course.isGovt || /swayam|nptel|skill india|govt|moe|iit/i.test(course.provider);
          return (
            <a
              key={idx}
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
                isGovt
                  ? 'bg-orange-50/30 border-orange-200/60 hover:bg-orange-50/60 hover:shadow-md hover:border-orange-300'
                  : 'bg-zinc-50/50 border-zinc-200/60 hover:bg-white hover:shadow-md hover:border-zinc-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {isGovt && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-800 border border-orange-200/50 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      <Landmark size={12} className="text-orange-700" />
                      Govt. Program
                    </span>
                  )}
                  {course.isFree && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200/50 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Free Access
                    </span>
                  )}
                  {course.badge && !isGovt && (
                    <span className="px-2.5 py-1 bg-zinc-200 text-zinc-800 border border-zinc-300/50 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-zinc-950 break-words group-hover:text-blue-600 transition-colors line-clamp-1">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-medium">
                  <span>{course.provider}</span>
                </div>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                <ChevronRight size={16} strokeWidth={2.5} />
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <GraduationCap size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Recommended Programs</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Verified Indian Government training portals (SWAYAM, NPTEL) & free accredited courses
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-50/80 border border-orange-200/80 rounded-xl text-orange-800 text-xs font-semibold shadow-sm">
          <Landmark size={16} className="text-orange-700" />
          <span>Govt. Accredited Included</span>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-zinc-950 mb-4" />
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Searching Course Catalogs...</p>
          <p className="text-xs text-zinc-500 mt-2">Connecting to government registries</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50/80 text-red-700 text-sm rounded-2xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && allGaps.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-200/60 shadow-[var(--shadow-subtle)] min-h-[400px]">
          <BookOpen size={48} className="text-zinc-300 mb-4" />
          <p className="text-lg font-display font-bold text-zinc-950 mb-2">No Skill Gaps Detected!</p>
          <p className="text-sm font-medium text-zinc-500">You already possess the required qualifications.</p>
        </div>
      )}

      {!loading && !error && allGaps.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requiredGaps.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Priority (Required)
              </h3>
              {requiredGaps.slice(0, 3).map(skill => (
                <div key={skill} className="bg-white rounded-3xl border border-zinc-200/60 p-6 shadow-[var(--shadow-subtle)] hover:shadow-md transition-shadow">
                  <div className="inline-block px-3 py-1.5 bg-red-50 text-red-700 border border-red-200/60 rounded-xl text-xs font-bold mb-2">
                    {skill}
                  </div>
                  {renderCourseList(skill)}
                </div>
              ))}
            </div>
          )}

          {niceGaps.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Secondary Priority (Nice-to-Have)
              </h3>
              {niceGaps.slice(0, 2).map(skill => (
                <div key={skill} className="bg-white rounded-3xl border border-zinc-200/60 p-6 shadow-[var(--shadow-subtle)] hover:shadow-md transition-shadow">
                  <div className="inline-block px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-xl text-xs font-bold mb-2">
                    {skill}
                  </div>
                  {renderCourseList(skill)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedProgramsView;
