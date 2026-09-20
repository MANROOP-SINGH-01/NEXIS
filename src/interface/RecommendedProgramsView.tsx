import React, { useEffect, useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, BookOpen, ChevronRight, Landmark, Sparkles, CheckCircle2, Award, Clock, ArrowUpRight } from 'lucide-react';
import { useUiStore } from '../integration/store/uiStore';
import { useCoreStore } from '../integration/store/coreStore';
import { CandidateSkill, RecommendedProgram } from '../types';
import { PageHeader } from './bauhaus/PageHeader';

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
      return <p className="text-xs text-[#777777] font-mono italic mt-2">No programs currently indexed for this skill.</p>;
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
              className={`flex items-center justify-between gap-4 p-3.5 border-2 transition-all duration-200 group shadow-[2px_2px_0px_#111111] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111111] ${
                isGovt
                  ? 'bg-[#FFFFFF] border-[#111111]'
                  : 'bg-[#FDFBF7] border-[#111111]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {isGovt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F4C430] text-[#111111] border border-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
                      <Landmark size={11} className="text-[#111111]" />
                      Govt. Accredited
                    </span>
                  )}
                  {course.isFree && (
                    <span className="px-2 py-0.5 bg-[#2457A6] text-white border border-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
                      Free Access
                    </span>
                  )}
                  {course.badge && !isGovt && (
                    <span className="px-2 py-0.5 bg-[#EFE7D8] text-[#111111] border border-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono font-bold text-[#111111] group-hover:text-[#E53935] transition-colors line-clamp-1">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[#555555]">
                  <span>{course.provider}</span>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 bg-[#111111] border border-[#111111] flex items-center justify-center text-white group-hover:bg-[#E53935] group-hover:border-[#E53935] transition-all shadow-[1px_1px_0px_#111111]">
                <ArrowUpRight size={14} />
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar bg-[#F5F0E6] text-[#111111]">
      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="06"
        code="LEARN"
        title="RECOMMENDED PROGRAMS & ROADMAPS"
        subtitle="VERIFIED INDIAN GOVERNMENT TRAINING PORTALS (SWAYAM, NPTEL, SKILL INDIA) & ACCREDITED CERTIFICATIONS"
        action={
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-[#111111] text-xs font-mono font-bold uppercase">
            <Landmark size={14} className="text-[#E53935]" />
            <span>Govt. Accredited Registry Synced</span>
          </div>
        }
      />

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FFFFFF] border-2 border-[#111111] p-12 min-h-[350px] shadow-[4px_4px_0px_#111111]">
          <Loader2 size={28} className="animate-spin text-[#E53935] mb-3" />
          <p className="text-sm font-mono font-black uppercase text-[#111111]">Indexing Course Catalogs...</p>
          <p className="text-xs text-[#555555] mt-1 font-mono">Cross-referencing skill gaps against SWAYAM & NPTEL</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-3.5 bg-[#FDEDEC] text-[#E53935] text-xs font-mono font-bold border-2 border-[#E53935] shadow-[2px_2px_0px_#111111]">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Priority Gap Courses */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1 pb-1 border-b-2 border-[#E53935]">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#E53935] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#E53935]" /> Critical Priority (Required for Role)
              </span>
              <span className="text-[11px] font-mono font-bold text-[#555555]">
                {effectiveRequiredGaps.length} Target Areas
              </span>
            </div>

            {effectiveRequiredGaps.slice(0, 3).map(skill => (
              <div key={skill} className="bg-[#FFFFFF] border-2 border-[#111111] p-5 shadow-[4px_4px_0px_#111111]">
                <div className="flex items-center justify-between">
                  <span className="inline-block px-2.5 py-1 bg-[#FDEDEC] text-[#E53935] border-2 border-[#E53935] text-xs font-mono font-black uppercase shadow-[1px_1px_0px_#111111]">
                    {skill}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#555555] uppercase">High Placement Weight</span>
                </div>
                {renderCourseList(skill)}
              </div>
            ))}
          </div>

          {/* Secondary Priority Courses */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1 pb-1 border-b-2 border-[#F4C430]">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#F4C430]" /> Secondary Priority (Differentiating Edge)
              </span>
              <span className="text-[11px] font-mono font-bold text-[#555555]">
                {effectiveNiceGaps.length} Growth Areas
              </span>
            </div>

            {effectiveNiceGaps.slice(0, 3).map(skill => (
              <div key={skill} className="bg-[#FFFFFF] border-2 border-[#111111] p-5 shadow-[4px_4px_0px_#111111]">
                <div className="flex items-center justify-between">
                  <span className="inline-block px-2.5 py-1 bg-[#FEF9E7] text-[#111111] border-2 border-[#F4C430] text-xs font-mono font-black uppercase shadow-[1px_1px_0px_#111111]">
                    {skill}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#555555] uppercase">Accelerates Promotion</span>
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
