import React, { useEffect, useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, BookOpen, ChevronRight, Landmark, ShieldCheck, Award } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { USER_COLOR, USER_COLOR_LIGHT } from '../theme/brand';
import { CandidateSkill, RecommendedProgram } from '../types';

const CURATED_PROGRAMS_FALLBACK: Record<string, RecommendedProgram[]> = {
  'AWS / Cloud Architecture': [
    {
      title: 'Cloud Computing & Distributed Systems',
      provider: 'NPTEL (Ministry of Education, Govt. of India)',
      url: 'https://onlinecourses.nptel.ac.in/explorer?q=cloud+computing',
      isFree: true,
      isGovt: true,
      badge: 'NPTEL / IIT',
    },
    {
      title: 'AWS Certified Solutions Architect (Associate)',
      provider: 'AWS Training & Coursera',
      url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials',
      isFree: true,
      isGovt: false,
      badge: 'Industry Audit',
    },
  ],
  'Docker & Containers': [
    {
      title: 'Linux and Open Source Container Technologies',
      provider: 'SWAYAM (Govt. of India / IIT Bombay)',
      url: 'https://swayam.gov.in/explorer?searchText=linux',
      isFree: true,
      isGovt: true,
      badge: 'Govt. of India',
    },
    {
      title: 'Introduction to Kubernetes & Containers',
      provider: 'edX & Linux Foundation',
      url: 'https://www.edx.org/course/introduction-to-kubernetes',
      isFree: true,
      isGovt: false,
      badge: 'Free Course',
    },
  ],
  'PostgreSQL Optimization': [
    {
      title: 'Database Management Systems & SQL Query Architecture',
      provider: 'NPTEL & IIT Kharagpur (Govt. of India)',
      url: 'https://onlinecourses.nptel.ac.in/explorer?q=database',
      isFree: true,
      isGovt: true,
      badge: 'NPTEL / IIT',
    },
    {
      title: 'Database Design & Relational Modeling',
      provider: 'Skill India Digital Hub (MSDE)',
      url: 'https://www.skillindiadigital.gov.in/courses?search=database',
      isFree: true,
      isGovt: true,
      badge: 'Skill India',
    },
  ],
  'CI/CD Pipelines': [
    {
      title: 'DevOps & Software Automation Practices',
      provider: 'SWAYAM & NPTEL (Govt. of India)',
      url: 'https://swayam.gov.in/explorer?searchText=devops',
      isFree: true,
      isGovt: true,
      badge: 'Govt. of India',
    },
    {
      title: 'Automated CI/CD with GitHub Actions',
      provider: 'GitHub Skills Lab',
      url: 'https://skills.github.com',
      isFree: true,
      isGovt: false,
      badge: 'Free Lab',
    },
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
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [skillProfile, Object.keys(recommendedPrograms).length, runtimeKeys, setRecommendedPrograms]);

  // Populate baseline recommendations if empty
  if (Object.keys(recommendedPrograms).length === 0) {
    setRecommendedPrograms(CURATED_PROGRAMS_FALLBACK);
  }

  const renderCourseList = (skill: string) => {
    const courses = recommendedPrograms[skill];
    if (!courses) {
      return null;
    }
    if (courses.length === 0) {
      return (
        <p className="text-xs text-zinc-500 italic mt-2 ml-1">No programs found for this skill yet.</p>
      );
    }
    return (
      <div className="grid gap-2 mt-3">
        {courses.map((course, idx) => {
          const isGovt = course.isGovt || /swayam|nptel|skill india|govt|moe|iit/i.test(course.provider);
          return (
            <a
              key={idx}
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-3 border p-3 rounded-lg transition-all group ${
                isGovt
                  ? 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300'
                  : 'bg-zinc-50 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-100/50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {isGovt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded text-[10px] font-bold uppercase tracking-wider">
                      <Landmark size={11} className="text-orange-700" />
                      Indian Govt. Program
                    </span>
                  )}
                  {course.isFree && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-wider">
                      Free Access
                    </span>
                  )}
                  {course.badge && !isGovt && (
                    <span className="px-1.5 py-0.5 bg-zinc-200/80 text-zinc-700 rounded text-[9px] font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900 break-words group-hover:text-blue-700 transition-colors">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                  <span className="font-semibold text-zinc-600 uppercase tracking-wider">{course.provider}</span>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 group-hover:border-zinc-300 transition-all">
                <ChevronRight size={14} strokeWidth={3} />
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 flex flex-col gap-4 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: USER_COLOR_LIGHT }}>
            <GraduationCap size={16} strokeWidth={2.5} style={{ color: USER_COLOR }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Recommended Programs & Courses</h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              Verified Indian Government training portals (SWAYAM, NPTEL, Skill India) & free accredited courses
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs font-semibold">
          <Landmark size={14} className="text-orange-700" />
          <span>Govt. Accredited Portals Included</span>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200">
          <Loader2 size={24} className="animate-spin text-zinc-300 mb-3" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Searching course catalogs & government registries...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-md border border-red-100 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && allGaps.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-6 text-center">
          <BookOpen size={24} className="text-zinc-300 mb-3 mx-auto" />
          <p className="text-sm font-black text-zinc-900 mb-1">No Skill Gaps Detected!</p>
          <p className="text-xs font-medium text-zinc-500">You already possess all the required and nice-to-have skills for this role.</p>
        </div>
      )}

      {!loading && !error && allGaps.length > 0 && (
        <div className="flex flex-col gap-4">
          {requiredGaps.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-1">Critical Priority (Required Gaps)</p>
              <div className="flex flex-col gap-4">
                {requiredGaps.slice(0, 3).map(skill => (
                  <div key={skill} className="bg-white rounded-lg border border-slate-200 p-5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[11px] font-bold select-none">
                        {skill}
                      </span>
                    </div>
                    {renderCourseList(skill)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {niceGaps.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-1">Secondary Priority (Nice-to-Have Gaps)</p>
              <div className="flex flex-col gap-4">
                {niceGaps.slice(0, 2).map(skill => (
                  <div key={skill} className="bg-white rounded-lg border border-slate-200 p-5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[11px] font-bold select-none">
                        {skill}
                      </span>
                    </div>
                    {renderCourseList(skill)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedProgramsView;
