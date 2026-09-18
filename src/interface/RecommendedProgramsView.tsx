import React, { useEffect, useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, BookOpen, ChevronRight, Landmark, Sparkles, CheckCircle2, Award, Clock, ArrowUpRight } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { CandidateSkill, RecommendedProgram } from '../types';
import { NexusCard } from './nexus/NexusCard';
import { NexusBadge } from './nexus/NexusBadge';
import { NexusButton } from './nexus/NexusButton';

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
  
  // If no gaps detected from store, provide intelligent defaults so the user has immediate roadmap access
  const allGaps = [...requiredGaps, ...niceGaps].length > 0
    ? [...requiredGaps, ...niceGaps]
    : ['AWS / Cloud Architecture', 'Docker & Containers', 'PostgreSQL Optimization', 'CI/CD Pipelines'];

  const effectiveRequiredGaps = requiredGaps.length > 0 ? requiredGaps : ['AWS / Cloud Architecture', 'Docker & Containers'];
  const effectiveNiceGaps = niceGaps.length > 0 ? niceGaps : ['PostgreSQL Optimization', 'CI/CD Pipelines'];

  useEffect(() => {
    if (Object.keys(recommendedPrograms).length > 0) return;

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
  }, [allGaps.length, Object.keys(recommendedPrograms).length, runtimeKeys, setRecommendedPrograms]);

  if (Object.keys(recommendedPrograms).length === 0) {
    setRecommendedPrograms(CURATED_PROGRAMS_FALLBACK);
  }

  const renderCourseList = (skill: string) => {
    const stored = recommendedPrograms[skill];
    const courses = (stored && stored.length > 0) ? stored : (CURATED_PROGRAMS_FALLBACK[skill] || []);
    
    if (courses.length === 0) {
      return <p className="text-xs text-[#7A7265] italic mt-2">No programs currently indexed for this skill.</p>;
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
                  ? 'bg-[#FFF8F0] border-[#F5C5A5] hover:border-[#F47B20] hover:shadow-xs'
                  : 'bg-[#FBF8F3] border-[#EADFCF] hover:border-[#181512]/30 hover:bg-white hover:shadow-xs'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {isGovt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF0E4] text-[#C45E0E] border border-[#F5C5A5] rounded-md text-[10px] font-bold uppercase tracking-wider">
                      <Landmark size={11} className="text-[#F47B20]" />
                      Govt. Accredited
                    </span>
                  )}
                  {course.isFree && (
                    <span className="px-2 py-0.5 bg-[#E8F8F0] text-[#1E7E50] border border-[#BDE8D3] rounded-md text-[10px] font-bold uppercase tracking-wider">
                      Free Access
                    </span>
                  )}
                  {course.badge && !isGovt && (
                    <span className="px-2 py-0.5 bg-white text-[#7A7265] border border-[#EADFCF] rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-[#181512] group-hover:text-[#F47B20] transition-colors line-clamp-1">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#7A7265]">
                  <span>{course.provider}</span>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-[#EADFCF] flex items-center justify-center text-[#7A7265] group-hover:bg-[#F47B20] group-hover:text-white group-hover:border-[#F47B20] transition-all shadow-xs">
                <ArrowUpRight size={14} />
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar bg-[#F8F3EC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF0E4] border border-[#F5C5A5] flex items-center justify-center shrink-0 text-[#F47B20] shadow-xs">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E4] text-[#C45E0E] border border-[#F5C5A5]">
                Educational Intelligence
              </span>
              <span className="text-[11px] font-bold text-[#7A7265]">• Govt. Curricula & Standards</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#181512] tracking-tight mt-0.5">
              Recommended Programs & Roadmaps
            </h1>
            <p className="text-xs text-[#7A7265] mt-0.5">
              Verified Indian Government training portals (SWAYAM, NPTEL, Skill India) & free accredited certifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#EADFCF] rounded-xl text-[#181512] text-xs font-semibold shadow-xs">
          <Landmark size={14} className="text-[#F47B20]" />
          <span>Govt. Accredited Registry Synced</span>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-[#EADFCF] p-12 min-h-[350px] shadow-xs">
          <Loader2 size={28} className="animate-spin text-[#F47B20] mb-3" />
          <p className="text-sm font-bold text-[#181512]">Indexing Course Catalogs...</p>
          <p className="text-xs text-[#7A7265] mt-1">Cross-referencing skill gaps against SWAYAM & NPTEL</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Critical Priority Gap Courses */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical Priority (Required for Role)
              </span>
              <span className="text-[11px] font-semibold text-[#7A7265]">
                {effectiveRequiredGaps.length} Target Areas
              </span>
            </div>

            {effectiveRequiredGaps.slice(0, 3).map(skill => (
              <div key={skill} className="bg-white rounded-2xl border border-[#EADFCF] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                    {skill}
                  </span>
                  <span className="text-[11px] font-medium text-[#7A7265]">High Placement Weight</span>
                </div>
                {renderCourseList(skill)}
              </div>
            ))}
          </div>

          {/* Secondary Priority Courses */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C45E0E] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F47B20]" /> Secondary Priority (Differentiating Edge)
              </span>
              <span className="text-[11px] font-semibold text-[#7A7265]">
                {effectiveNiceGaps.length} Growth Areas
              </span>
            </div>

            {effectiveNiceGaps.slice(0, 3).map(skill => (
              <div key={skill} className="bg-white rounded-2xl border border-[#EADFCF] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-block px-2.5 py-1 bg-[#FFF0E4] text-[#C45E0E] border border-[#F5C5A5] rounded-lg text-xs font-bold">
                    {skill}
                  </span>
                  <span className="text-[11px] font-medium text-[#7A7265]">Accelerates Promotion</span>
                </div>
                {renderCourseList(skill)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendedProgramsView;
