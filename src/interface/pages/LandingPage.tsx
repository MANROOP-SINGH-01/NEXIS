import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Target, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Github, 
  Globe, 
  Lock, 
  ChevronRight 
} from 'lucide-react';
import { GeometricAccent } from '../bauhaus/GeometricAccent';
import { colors } from '../../theme/bauhaus';

interface LandingPageProps {
  onEnterApp: () => void;
  onGoLogin: () => void;
  onGoRegister?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onGoLogin, onGoRegister }) => {
  const agents = [
    {
      name: 'NEXUS DIRECTOR',
      role: 'Master Task Orchestrator',
      color: colors.agents.director,
      desc: 'Coordinates multi-agent parallel pipelines and schedules strategic career goals.',
      badge: 'ORCHESTRATION',
    },
    {
      name: 'NEXUS VISION',
      role: 'CV & ATS Deep Scanner',
      color: colors.agents.vision,
      desc: 'Parses PDFs, extracts core skills, and eliminates formatting pitfalls.',
      badge: 'ANALYSIS',
    },
    {
      name: 'NEXUS STRATEGIST',
      role: 'Market Gap Synthesizer',
      color: colors.agents.strategist,
      desc: 'Cross-references current talent telemetry against active O*NET market demands.',
      badge: 'STRATEGY',
    },
    {
      name: 'NEXUS WRITER',
      role: 'Precision Tailoring Engine',
      color: colors.agents.writer,
      desc: 'Generates role-tailored resumes and high-impact accomplishment bullets.',
      badge: 'SYNTHESIS',
    },
    {
      name: 'NEXUS HUNTER',
      role: 'Real-time Opportunity Radar',
      color: colors.agents.hunter,
      desc: 'Scrapes, indexes, and ranks verified live jobs matching your profile.',
      badge: 'DISCOVERY',
    },
    {
      name: 'NEXUS MIRROR',
      role: 'Audit & Recursive Inspector',
      color: colors.agents.mirror,
      desc: 'Validates factual consistency, detects hallucinations, and confirms truth.',
      badge: 'VERIFICATION',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#111111] overflow-x-hidden selection:bg-[#E53935] selection:text-white font-sans">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#F5F0E6]/95 backdrop-blur-md border-b-2 border-[#111111]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E53935] border-2 border-[#111111] flex items-center justify-center font-['Space_Grotesk'] font-black text-sm text-white shadow-[2px_2px_0px_#111111]">
              NX
            </div>
            <span className="font-['Space_Grotesk'] font-black text-lg tracking-tight text-[#111111] uppercase">
              NEXIS
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4C430] text-[#111111] border border-[#111111]">
              BAUHAUS EDITION
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
            <a href="#agents" className="hover:text-[#E53935] transition-colors">Agents</a>
            <a href="#intelligence" className="hover:text-[#E53935] transition-colors">Intelligence</a>
            <a href="#resume-forge" className="hover:text-[#E53935] transition-colors">Resume Forge</a>
            <a href="#security" className="hover:text-[#E53935] transition-colors">Verification</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onGoLogin}
              className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111] hover:bg-[#EFE7D8] px-3.5 py-2 border-2 border-transparent hover:border-[#111111] transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onGoRegister || onGoLogin}
              className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111] bg-[#FFE600] hover:bg-[#F4C430] px-3.5 py-2 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer hidden sm:inline-block"
            >
              Create Account
            </button>
            <button
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-20 px-6 max-w-7xl mx-auto text-center">
        {/* Decorative Geometric Shapes */}
        <div className="hidden lg:block absolute top-12 left-10 pointer-events-none">
          <GeometricAccent shape="circle" color="red" size={56} />
        </div>
        <div className="hidden lg:block absolute top-28 right-12 pointer-events-none">
          <GeometricAccent shape="triangle" color="yellow" size={64} />
        </div>
        <div className="hidden lg:block absolute bottom-32 left-1/4 pointer-events-none">
          <GeometricAccent shape="quarterCircle" color="blue" size={50} />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border-2 border-[#111111] text-[#111111] text-xs font-mono font-bold uppercase tracking-wider mb-8 shadow-[3px_3px_0px_#111111]">
          <span className="w-2 h-2 bg-[#E53935] border border-[#111111]" />
          <span>[00] // AUTONOMOUS CAREER ORCHESTRATION PLATFORM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-['Space_Grotesk'] tracking-tight max-w-5xl mx-auto leading-[1.05] text-[#111111] uppercase">
          Your career, <br />
          <span className="bg-[#E53935] text-white px-3 py-1 inline-block mt-2 border-2 border-[#111111] shadow-[4px_4px_0px_#111111]">
            orchestrated by living AI.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#555555] font-mono max-w-2xl mx-auto leading-relaxed font-normal">
          NEXIS deploys a collaborative workforce of 3D autonomous agents that analyze your skill telemetry, forge high-ATS resumes, and navigate your trajectory with empirical precision.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onGoRegister || onGoLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4 text-[#F4C430]" />
          </button>
          <button
            onClick={onGoLogin}
            className="w-full sm:w-auto px-7 py-3.5 bg-[#FFE600] hover:bg-[#F4C430] text-[#111111] text-xs font-mono font-black uppercase tracking-wider border-2 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
          >
            Sign In with OTP / Password
          </button>
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-[#EFE7D8] text-[#111111] text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
          >
            Launch Demo Workspace
          </button>
        </div>

        {/* Hero Interactive Terminal & 3D Preview Box */}
        <div className="mt-16 relative bg-white border-4 border-[#111111] p-4 sm:p-6 shadow-[8px_8px_0px_#111111] text-left">
          {/* Terminal Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-[#111111]">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-[#E53935] border border-[#111111]" />
              <span className="w-3.5 h-3.5 bg-[#F4C430] border border-[#111111]" />
              <span className="w-3.5 h-3.5 bg-[#2457A6] border border-[#111111]" />
              <span className="ml-3 text-xs font-mono font-bold text-[#111111]">nexis://runtime/agents-mesh</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 bg-[#2457A6] text-white border border-[#111111]">
                ORCHESTRATOR ONLINE
              </span>
            </div>
          </div>

          {/* Simulated Live Telemetry Feed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="flex items-center gap-2 text-[#E53935] mb-2 font-mono font-bold text-xs uppercase">
                <Bot className="w-4 h-4" />
                <span>DIRECTOR PIPELINE</span>
              </div>
              <p className="text-xs font-mono font-bold text-[#111111]">Target Role: Full-Stack Architect</p>
              <div className="mt-3 w-full bg-white border border-[#111111] h-3">
                <div className="bg-[#E53935] h-full w-4/5" />
              </div>
              <span className="text-[10px] text-[#555555] font-mono mt-1.5 block font-bold">82% Match Alignment</span>
            </div>

            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="flex items-center gap-2 text-[#2457A6] mb-2 font-mono font-bold text-xs uppercase">
                <Target className="w-4 h-4" />
                <span>SKILL RADAR</span>
              </div>
              <p className="text-xs font-mono font-bold text-[#111111]">3 Critical Gaps: Kubernetes, Golang, CI/CD</p>
              <span className="text-[10px] text-[#2457A6] font-mono mt-3 inline-block font-bold">→ 2 Learning Paths Synced</span>
            </div>

            <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111]">
              <div className="flex items-center gap-2 text-[#111111] mb-2 font-mono font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4 text-[#2457A6]" />
                <span>ATS VERIFICATION</span>
              </div>
              <p className="text-xs font-mono font-bold text-[#111111]">ATS Score: 94/100 across 18 criteria</p>
              <span className="text-[10px] text-[#111111] font-mono mt-3 inline-block font-bold">✓ Verifiable Hash Generated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Mesh Section */}
      <section id="agents" className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t-2 border-[#111111]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 bg-[#F4C430] border-2 border-[#111111] text-[#111111] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-[2px_2px_0px_#111111]">
            [01] // COLLABORATIVE AGENT MESH
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight">
            Six specialized AI workers. <br />
            One cohesive career force.
          </h2>
          <p className="mt-3 text-xs font-mono text-[#555555]">
            Each agent lives in your 3D workspace, executing distinct aspects of your job search, resume tailoring, and skill verification.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] hover:shadow-[6px_6px_0px_#111111] hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 border-2 border-[#111111] flex items-center justify-center text-white font-bold text-sm shadow-[2px_2px_0px_#111111]"
                  style={{ backgroundColor: agent.color }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#F5F0E6] text-[#111111] border border-[#111111]">
                  {agent.badge}
                </span>
              </div>

              <h3 className="text-base font-black text-[#111111] font-['Space_Grotesk'] uppercase tracking-tight">
                {agent.name}
              </h3>
              <p className="text-xs font-mono font-bold text-[#E53935] mt-0.5">{agent.role}</p>
              <p className="text-xs font-mono text-[#555555] mt-2.5 leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resume Forge Showcase */}
      <section id="resume-forge" className="relative z-10 py-20 px-6 bg-[#EFE7D8] border-t-2 border-b-2 border-[#111111]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-3 py-1 bg-[#2457A6] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-[2px_2px_0px_#111111]">
              [02] // ATS DEEP FORGE
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] text-[#111111] uppercase leading-tight">
              Transform passive resumes into high-impact accomplishment portfolios.
            </h2>
            <p className="mt-4 text-xs font-mono text-[#555555] leading-relaxed">
              Our Nexus Writer and ATS scanners inspect syntax, quantified metric impacts, and keyword density in real-time, tailoring your resume for every opportunity with zero hallucinations.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Instant side-by-side Diff Viewer with bullet optimization',
                'Verified ATS Score breakdown across formatting, keywords & metrics',
                'Cryptographically verifiable Career Passport credentials',
                'Automatic PDF export optimized for Taleo, Workday, and Lever',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs font-mono font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#2457A6] shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <button
                onClick={onEnterApp}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
              >
                <span>Try Resume Forge Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative bg-white border-2 border-[#111111] p-6 shadow-[6px_6px_0px_#111111]">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#111111]">
              <span className="text-xs font-mono font-bold text-[#111111]">RESUME_OPTIMIZATION_DIFF.MD</span>
              <span className="text-xs font-mono font-bold text-white bg-[#2457A6] px-2 py-0.5 border border-[#111111]">
                +38% ATS IMPROVEMENT
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#E53935]/10 border-2 border-[#E53935] text-[#111111] line-through">
                - Worked on backend server APIs and helped fix bugs in database queries.
              </div>
              <div className="p-3 bg-[#2457A6]/10 border-2 border-[#2457A6] text-[#111111] font-bold">
                + Architected low-latency Node.js microservices reducing P99 query latency by 42% across 2.4M daily requests.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Verification Pass */}
      <section id="security" className="relative z-10 py-20 px-6 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 bg-[#111111] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-[2px_2px_0px_#E53935]">
            [03] // EMPLOYER & GOVERNANCE READY
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight">
            DPDP Compliant & Cryptographically Verifiable.
          </h2>
          <p className="mt-3 text-xs font-mono text-[#555555] leading-relaxed">
            NEXIS protects candidate privacy with strict Digital Personal Data Protection compliance, audit logging, and shareable QR verification tokens for hiring managers.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
            <Lock className="w-6 h-6 text-[#E53935] mb-3" />
            <h3 className="text-sm font-black font-['Space_Grotesk'] uppercase text-[#111111] mb-1">
              DPDP Consent Framework
            </h3>
            <p className="text-xs font-mono text-[#555555] leading-relaxed">
              Granular candidate consent tracking with full data sovereignty and right-to-forget controls.
            </p>
          </div>

          <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
            <Globe className="w-6 h-6 text-[#2457A6] mb-3" />
            <h3 className="text-sm font-black font-['Space_Grotesk'] uppercase text-[#111111] mb-1">
              Employer Verification Portals
            </h3>
            <p className="text-xs font-mono text-[#555555] leading-relaxed">
              Public standalone verification routes (/verify/:token) allowing instant credential checks without sign-in.
            </p>
          </div>

          <div className="bg-white border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
            <Zap className="w-6 h-6 text-[#F4C430] mb-3" />
            <h3 className="text-sm font-black font-['Space_Grotesk'] uppercase text-[#111111] mb-1">
              Sub-second Telemetry
            </h3>
            <p className="text-xs font-mono text-[#555555] leading-relaxed">
              High-throughput SSE event streaming keeping 3D simulation and browser states tightly synchronized.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative z-10 py-24 px-6 text-center border-t-2 border-[#111111] bg-[#F4C430]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight">
            Ready to deploy your AI career team?
          </h2>
          <p className="mt-4 text-xs font-mono font-bold text-[#111111] max-w-xl mx-auto">
            Experience the future of talent orchestration with real-time 3D agents, verified skill roadmaps, and intelligent market positioning.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              <span>Launch Free Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onGoLogin}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-[#EFE7D8] text-[#111111] text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              Sign In with Phone
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-[#111111] bg-[#111111] py-8 px-6 text-center text-xs font-mono text-[#C8C0B4]">
        <p>© 2026 NEXIS Career Orchestration Mesh. Bauhaus Editorial Edition. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
