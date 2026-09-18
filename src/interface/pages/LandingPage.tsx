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
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { Card } from '../primitives/Card';

interface LandingPageProps {
  onEnterApp: () => void;
  onGoLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onGoLogin }) => {
  const agents = [
    {
      name: 'NEXUS DIRECTOR',
      role: 'Master Task Orchestrator',
      color: '#6366F1',
      desc: 'Coordinates multi-agent parallel pipelines and schedules career goals.',
      badge: 'ORCHESTRATION',
    },
    {
      name: 'NEXUS VISION',
      role: 'CV & ATS Deep Scanner',
      color: '#06B6D4',
      desc: 'Parses PDFs, extracts core skills, and eliminates formatting pitfalls.',
      badge: 'ANALYSIS',
    },
    {
      name: 'NEXUS STRATEGIST',
      role: 'Market Gap Synthesizer',
      color: '#10B981',
      desc: 'Cross-references current talent telemetry against active market demands.',
      badge: 'STRATEGY',
    },
    {
      name: 'NEXUS WRITER',
      role: 'Precision Tailoring Engine',
      color: '#F59E0B',
      desc: 'Generates role-tailored resumes and high-impact accomplishment bullets.',
      badge: 'SYNTHESIS',
    },
    {
      name: 'NEXUS HUNTER',
      role: 'Real-time Opportunity Radar',
      color: '#8B5CF6',
      desc: 'Scrapes, indexes, and ranks verified live jobs matching your profile.',
      badge: 'DISCOVERY',
    },
    {
      name: 'NEXUS MIRROR',
      role: 'Audit & Self-Correction Inspector',
      color: '#FF6B6B',
      desc: 'Validates factual consistency, detects hallucinations, and confirms truth.',
      badge: 'VERIFICATION',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Decorative Memphis Geometry */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090a0f]/80 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#090a0f] rounded-[11px] flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm text-indigo-400">
                NX
              </div>
            </div>
            <span className="font-['Space_Grotesk'] font-bold text-lg tracking-wider text-white">
              NEXIS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#intelligence" className="hover:text-white transition-colors">Intelligence</a>
            <a href="#resume-forge" className="hover:text-white transition-colors">Resume Forge</a>
            <a href="#security" className="hover:text-white transition-colors">Verification</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoLogin}
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
            >
              Sign In
            </button>
            <Button
              variant="glow"
              size="sm"
              onClick={onEnterApp}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Workspace
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AUTONOMOUS CAREER ORCHESTRATION PLATFORM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-['Space_Grotesk'] tracking-tight max-w-5xl mx-auto leading-[1.08] text-white">
          Your career, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
            orchestrated by living AI.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          NEXIS deploys a collaborative workforce of 3D autonomous agents that analyze your skill telemetry, forge high-ATS resumes, and navigate your trajectory with empirical precision.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="glow"
            size="lg"
            onClick={onEnterApp}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto text-sm px-8 py-3.5 shadow-xl shadow-indigo-600/30"
          >
            Enter 3D Command Center
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onGoLogin}
            className="w-full sm:w-auto text-sm px-8 py-3.5"
          >
            Authenticate with Phone / OTP
          </Button>
        </div>

        {/* Hero Interactive Terminal & 3D Preview Box */}
        <div className="mt-16 relative rounded-3xl p-1 bg-gradient-to-b from-zinc-700/40 to-zinc-900/40 border border-zinc-700/50 shadow-2xl shadow-indigo-950/40">
          <div className="rounded-[22px] bg-[#0c0d14] p-4 sm:p-6 overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-zinc-400">nexis://runtime/agents-mesh</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="mint" size="sm" pulseDot>
                  ORCHESTRATOR ONLINE
                </Badge>
              </div>
            </div>

            {/* Simulated Live Telemetry Feed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
              <Card variant="glass" padding="sm" className="border-indigo-500/30">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-bold font-mono">DIRECTOR PIPELINE</span>
                </div>
                <p className="text-xs text-zinc-300">Target Role: Senior Full-Stack Architect</p>
                <div className="mt-3 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-4/5 animate-pulse" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1.5 block">82% Match Alignment</span>
              </Card>

              <Card variant="glass" padding="sm" className="border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-bold font-mono">SKILL RADAR</span>
                </div>
                <p className="text-xs text-zinc-300">Identified 3 high-impact gaps: Kubernetes, Golang, CI/CD</p>
                <span className="text-[10px] text-cyan-400 font-mono mt-3 inline-block">→ 2 Learning Paths Synced</span>
              </Card>

              <Card variant="glass" padding="sm" className="border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold font-mono">ATS VERIFICATION</span>
                </div>
                <p className="text-xs text-zinc-300">ATS Score: 94/100 across 18 Fortune 500 criteria</p>
                <span className="text-[10px] text-emerald-400 font-mono mt-3 inline-block">✓ Verifiable Hash Generated</span>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Mesh Section */}
      <section id="agents" className="relative z-10 py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="indigo" size="sm" className="mb-3 font-mono">
            COLLABORATIVE AGENT MESH
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white">
            Six specialized AI workers. <br />
            One cohesive career force.
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Each agent lives in your 3D workspace, executing distinct aspects of your job search, resume tailoring, and skill verification.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card
              key={agent.name}
              variant="glass"
              hoverable
              padding="md"
              className="border border-zinc-800/80 hover:border-indigo-500/40 relative group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                  style={{ backgroundColor: `${agent.color}20`, color: agent.color, border: `1px solid ${agent.color}40` }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  {agent.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk'] group-hover:text-indigo-300 transition-colors">
                {agent.name}
              </h3>
              <p className="text-xs font-medium text-indigo-400 mt-0.5">{agent.role}</p>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">{agent.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Resume Forge Showcase */}
      <section id="resume-forge" className="relative z-10 py-20 px-6 bg-zinc-950/40 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="amber" size="sm" className="mb-3 font-mono">
              ATS DEEP FORGE
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white leading-tight">
              Transform passive resumes into high-impact accomplishment portfolios.
            </h2>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Our Nexus Writer and ATS scanners inspect syntax, quantified metric impacts, and keyword density in real-time, tailoring your resume for every opportunity with zero hallucinations.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Instant side-by-side Diff Viewer with bullet optimization',
                'Verified ATS Score breakdown across formatting, keywords & metrics',
                'Cryptographically verifiable Career Passport credentials',
                'Automatic PDF export optimized for Taleo, Workday, and Lever',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button variant="glow" onClick={onEnterApp} rightIcon={<ChevronRight className="w-4 h-4" />}>
                Try Resume Forge Now
              </Button>
            </div>
          </div>

          <div className="relative rounded-2xl bg-[#12131c] border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <span className="text-xs font-mono text-zinc-400">RESUME_OPTIMIZATION_DIFF.MD</span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +38% ATS IMPROVEMENT
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 line-through">
                - Worked on backend server APIs and helped fix bugs in database queries.
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                + Architected low-latency Node.js microservices reducing P99 query latency by 42% across 2.4M daily requests.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Verification Pass */}
      <section id="security" className="relative z-10 py-20 px-6 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto">
          <Badge variant="mint" size="sm" className="mb-3 font-mono">
            EMPLOYER & GOVERNANCE READY
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white">
            DPDP Compliant & Cryptographically Verifiable.
          </h2>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            NEXIS protects candidate privacy with strict Digital Personal Data Protection compliance, audit logging, and shareable QR verification tokens for hiring managers.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <Card variant="glass" padding="md">
            <Lock className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 font-['Space_Grotesk']">
              DPDP Consent Framework
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Granular candidate consent tracking with full data sovereignty and right-to-forget controls.
            </p>
          </Card>

          <Card variant="glass" padding="md">
            <Globe className="w-6 h-6 text-cyan-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 font-['Space_Grotesk']">
              Employer Verification Portals
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Public standalone verification routes (/verify/:token) allowing instant credential checks without sign-in.
            </p>
          </Card>

          <Card variant="glass" padding="md">
            <Zap className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 font-['Space_Grotesk']">
              Sub-second Telemetry
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              High-throughput SSE event streaming keeping 3D simulation and browser states tightly synchronized.
            </p>
          </Card>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative z-10 py-24 px-6 text-center border-t border-zinc-800/80 bg-gradient-to-b from-transparent to-indigo-950/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-['Space_Grotesk'] text-white tracking-tight">
            Ready to deploy your AI career team?
          </h2>
          <p className="mt-4 text-base text-zinc-400 max-w-xl mx-auto">
            Experience the future of talent orchestration with real-time 3D agents, verified skill roadmaps, and intelligent market positioning.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="glow"
              size="lg"
              onClick={onEnterApp}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="text-sm px-8 py-3.5 shadow-xl shadow-indigo-600/30"
            >
              Launch Free Workspace
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onGoLogin}
              className="text-sm px-8 py-3.5"
            >
              Sign In with Phone
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/60 py-8 px-6 text-center text-xs text-zinc-500">
        <p>© 2026 NEXIS Career Orchestration Mesh. All rights reserved.</p>
      </footer>
    </div>
  );
};
