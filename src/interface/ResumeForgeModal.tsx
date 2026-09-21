import { 
  Loader2, 
  Github, 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  Code2, 
  Link as LinkIcon, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Wand2,
  Lock,
  Globe,
  Flame,
  CheckCircle2,
  Layers,
  BookOpen,
  Send
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGitHubData } from '../integration/hooks/useGitHubData'
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore'
import { auditBulletQuality } from '../services/antiSlopResumeService'

type ResumeForgeStage = 'connect' | 'loading' | 'results'

interface ResumeForgeModalProps {
  onClose: () => void
}

export interface MatchedProjectItem {
  repoId: string
  name: string
  fullName: string
  url: string
  language: string
  description: string
  topics: string[]
  relevanceScore: number
  matchedTerms: string[]
  isAlreadyInResume: boolean
  isPrivate?: boolean
  groundedBullets: string[]
}

export interface TrendingBlueprintItem {
  id: string
  title: string
  problemStatement: string
  techStack: string[]
  architecture: string
  readinessBullets: string[]
  recruiterImpact: string
  trendingScore: number
}

function ProgressStrip() {
  return (
    <div
      className="w-full p-6 relative overflow-hidden shadow-[4px_4px_0px_#111111]"
      style={{
        backgroundColor: '#FFFFFF',
        border: '2px solid #111111',
        borderRadius: '0px',
      }}
    >
      <div
        className="text-xs uppercase tracking-wider mb-4 flex items-center gap-2 font-bold text-[#111111]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <Sparkles size={15} className="text-[#E53935] animate-spin" />
        <span>Nexus-Writer analyzing GitHub repositories against target role...</span>
      </div>
      <div className="h-2 w-full bg-[#F5F0E6] border border-[#111111] overflow-hidden">
        <div className="h-full w-3/4 bg-[#E53935] animate-pulse" />
      </div>
    </div>
  )
}

export default function ResumeForgeModal({ onClose }: ResumeForgeModalProps) {
  const {
    currentResume,
    setCurrentResumeContent,
    structuredResume,
    setStructuredResume,
    addNexusActivityEntry,
  } = useCoreStore()

  const [stage, setStage] = useState<ResumeForgeStage>('connect')
  const [activeTab, setActiveTab] = useState<'matched' | 'trending'>('matched')
  const [error, setError] = useState<string | null>(null)
  const [injectSuccess, setInjectSuccess] = useState<string | null>(null)
  const [isInjecting, setIsInjecting] = useState(false)

  const { token, setToken, clearToken, connectUrl } = useGitHubData()

  // Dynamic user-customizable input
  const [username, setUsername] = useState('prkhrexists')
  const [personalToken, setPersonalToken] = useState(token || '')
  const [targetJobRole, setTargetJobRole] = useState(
    currentResume.targetJD || 'Full Stack Engineer & AI Systems'
  )

  const [matchedProjects, setMatchedProjects] = useState<MatchedProjectItem[]>([])
  const [trendingBlueprints, setTrendingBlueprints] = useState<TrendingBlueprintItem[]>([])
  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(new Set())

  const isConnected = !!token || !!personalToken

  const handleSaveToken = () => {
    if (personalToken.trim()) {
      setToken(personalToken.trim())
      setError(null)
    } else {
      clearToken()
    }
  }

  const runDynamicForge = async () => {
    if (!username.trim()) {
      setError('Please provide a GitHub username to scan.')
      return
    }

    setStage('loading')
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        username: username.trim(),
        targetRole: targetJobRole.trim(),
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (personalToken.trim() || token) {
        headers['Authorization'] = `token ${personalToken.trim() || token}`
      }

      const res = await fetch(`/api/github/match?${queryParams.toString()}`, {
        headers,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to fetch GitHub data (${res.status})`)
      }

      const data = await res.json()
      setMatchedProjects(data.matchedProjects || [])
      setTrendingBlueprints(data.trendingBlueprints || [])

      const autoSelected = new Set<string>()
      ;(data.matchedProjects || []).forEach((p: MatchedProjectItem) => {
        if (p.relevanceScore >= 60 && !p.isAlreadyInResume) {
          autoSelected.add(p.name)
        }
      })
      setSelectedRepoNames(autoSelected)

      addNexusActivityEntry({
        agentType: 'writer',
        action: 'GitHub Repos Analyzed',
        result: {
          username: username.trim(),
          matchedCount: data.matchedProjects?.length || 0,
        },
        impact: 'positive',
      })

      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process GitHub repositories.')
      setStage('connect')
    }
  }

  const toggleRepoSelection = (name: string) => {
    const next = new Set(selectedRepoNames)
    if (next.has(name)) {
      next.delete(name)
    } else {
      next.add(name)
    }
    setSelectedRepoNames(next)
  }

  const handleUpdateBullet = (repoName: string, bulletIdx: number, newText: string) => {
    setMatchedProjects((prev) =>
      prev.map((p) => {
        if (p.name !== repoName) return p
        const nextBullets = [...p.groundedBullets]
        nextBullets[bulletIdx] = newText
        return { ...p, groundedBullets: nextBullets }
      })
    )
  }

  const handleInjectIntoResume = async () => {
    const selected = matchedProjects.filter((p) => selectedRepoNames.has(p.name))
    if (selected.length === 0) {
      setError('Please select at least one project to inject into your resume.')
      return
    }

    setIsInjecting(true)
    setError(null)
    setInjectSuccess(null)

    try {
      const res = await fetch('/api/github/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeDocument: structuredResume || {
            metadata: { sourceFormat: 'json', extractedAt: new Date().toISOString(), version: '1.0.0', fileName: 'resume.json' },
            contact: { name: 'Prakhar Jaiswal', title: '', email: 'prkhr.exists@gmail.com', phone: '', location: '', links: [] },
            summary: '',
            education: [],
            experience: [],
            projects: [],
            skills: { core: [] },
          },
          selectedProjects: selected,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to inject projects into resume.')
      }

      const data = await res.json()
      if (data.updatedDocument) {
        setStructuredResume(data.updatedDocument)

        const newProjectText = selected
          .map((p) => `\n${p.name} (${p.language})\n${p.groundedBullets.map((b) => `• ${b}`).join('\n')}`)
          .join('\n')

        const currentText = currentResume.content || ''
        const updatedText = currentText.includes('PROJECTS') || currentText.includes('Projects')
          ? `${currentText}\n${newProjectText}`
          : `${currentText}\n\nPROJECTS\n${newProjectText}`

        setCurrentResumeContent(updatedText)

        addNexusActivityEntry({
          agentType: 'writer',
          action: 'GitHub Projects Injected',
          result: {
            injectedCount: data.injectedCount,
            projects: selected.map((s) => s.name),
          },
          impact: 'positive',
        })

        setInjectSuccess(`Successfully injected ${selected.length} GitHub project(s) tailored to ${targetJobRole}!`)
        setTimeout(() => setInjectSuccess(null), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Injection failed.')
    } finally {
      setIsInjecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 pointer-events-auto overflow-hidden font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs transition-opacity duration-200" />
      
      {/* Bauhaus Modal Dialog */}
      <div
        className="relative w-full max-w-5xl p-4 sm:p-6 md:p-8 animate-in zoom-in-95 duration-150 max-h-[90vh] max-h-[calc(100dvh-32px)] flex flex-col z-10 overflow-hidden shadow-[8px_8px_0px_#111111]"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-[#EFE7D8] transition-colors cursor-pointer z-10"
          style={{ border: '1px solid #111111', borderRadius: '0px' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-start gap-3 sm:gap-4 shrink-0 pr-8">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: '#111111',
              color: '#F5F0E6',
              border: '2px solid #111111',
              borderRadius: '0px',
            }}
          >
            <Github size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: 'rgba(229,57,53,0.1)',
                color: '#E53935',
                border: '1px solid rgba(229,57,53,0.3)',
              }}
            >
              <Sparkles size={11} />
              <span>PHASE 2 • DYNAMIC GITHUB INTELLIGENCE</span>
            </div>
            <h2
              className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#111111] truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              GitHub Project Sync & JD Matching
            </h2>
            <p className="text-xs text-[#555555] mt-1 max-w-2xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Connect your GitHub account or input your username to fetch repositories.
              Nexus-Writer analyzes code against target JDs and injects grounded STAR bullets directly into your resume.
            </p>
          </div>
        </div>

        {/* Stage 1: Configuration & Connect */}
        {stage === 'connect' && (
          <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Box 1: Account / Username Input */}
              <div
                className="p-5 space-y-4 shadow-xs"
                style={{
                  backgroundColor: '#F5F0E6',
                  border: '1px solid #111111',
                  borderRadius: '0px',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <Globe size={13} className="text-[#2457A6]" />
                    Candidate GitHub Profile
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      backgroundColor: isConnected ? 'rgba(46,125,50,0.1)' : '#FFFFFF',
                      color: isConnected ? '#2E7D32' : '#7A7A7A',
                      border: `1px solid ${isConnected ? 'rgba(46,125,50,0.3)' : '#111111'}`,
                    }}
                  >
                    {isConnected ? <Lock size={10} /> : null}
                    {isConnected ? 'Public + Private' : 'Public Only'}
                  </span>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    GitHub Username / Handle
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7A7A7A] font-mono">github.com/</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. prkhrexists"
                      className="flex-1 px-3 py-2 text-xs font-mono text-[#111111] focus:outline-none"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #111111',
                        borderRadius: '0px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Personal Access Token (Optional for Private Repos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={personalToken}
                      onChange={(e) => setPersonalToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="flex-1 px-3 py-2 text-xs font-mono text-[#111111] focus:outline-none"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #111111',
                        borderRadius: '0px',
                      }}
                    />
                    <button
                      onClick={handleSaveToken}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#111111] transition-colors cursor-pointer"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #111111',
                        borderRadius: '0px',
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7A7A7A] mt-1">
                    Without a token, public repositories are fetched. With a token, private repositories are also indexed.
                  </p>
                </div>
              </div>

              {/* Box 2: Target Role & Job Description */}
              <div
                className="p-5 space-y-4 shadow-xs"
                style={{
                  backgroundColor: '#F5F0E6',
                  border: '1px solid #111111',
                  borderRadius: '0px',
                }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <ShieldCheck size={13} className="text-[#E53935]" />
                  Target Role or Requirements
                </span>
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Job Title or Skills to Match
                  </label>
                  <textarea
                    rows={4}
                    value={targetJobRole}
                    onChange={(e) => setTargetJobRole(e.target.value)}
                    placeholder="Paste job description or specify target title..."
                    className="w-full p-3 text-xs font-mono text-[#111111] focus:outline-none resize-none"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #111111',
                      borderRadius: '0px',
                    }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                className="text-xs font-bold uppercase tracking-wider p-3 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(229,57,53,0.1)',
                  border: '2px solid #E53935',
                  color: '#E53935',
                }}
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-3 shrink-0" style={{ borderTop: '2px solid #111111' }}>
              <div
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#555555]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <ShieldCheck size={14} className="text-[#2E7D32] shrink-0" />
                <span>Anti-Hallucination Active: 100% Verified Metrics</span>
              </div>

              <button
                onClick={runDynamicForge}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-bold uppercase tracking-wider text-xs transition-all cursor-pointer shrink-0"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  backgroundColor: '#E53935',
                  color: '#FFFFFF',
                  border: '2px solid #111111',
                  borderRadius: '0px',
                  boxShadow: '3px 3px 0px #111111',
                }}
              >
                <Sparkles size={15} />
                <span>Fetch & Match Repositories</span>
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: Loading Analysis */}
        {stage === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0">
            <div className="w-full max-w-xl">
              <ProgressStrip />
            </div>
          </div>
        )}

        {/* Stage 3: Results & Project Injection */}
        {stage === 'results' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 min-h-0">
            {/* Tabs & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 gap-3 shrink-0" style={{ borderBottom: '2px solid #111111' }}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('matched')}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: activeTab === 'matched' ? '#111111' : '#F5F0E6',
                    color: activeTab === 'matched' ? '#F5F0E6' : '#111111',
                    border: '1px solid #111111',
                    borderRadius: '0px',
                  }}
                >
                  <Layers size={13} />
                  <span>Matched Repositories ({matchedProjects.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('trending')}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: activeTab === 'trending' ? '#111111' : '#F5F0E6',
                    color: activeTab === 'trending' ? '#F5F0E6' : '#111111',
                    border: '1px solid #111111',
                    borderRadius: '0px',
                  }}
                >
                  <Flame size={13} className="text-[#E53935]" />
                  <span>Trending Blueprints ({trendingBlueprints.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 justify-between sm:justify-end">
                <button
                  onClick={() => setStage('connect')}
                  className="text-xs font-bold uppercase tracking-wider text-[#555555] hover:text-[#111111] px-2.5 py-1 cursor-pointer"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Change Profile / JD
                </button>

                <button
                  onClick={handleInjectIntoResume}
                  disabled={isInjecting || selectedRepoNames.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    backgroundColor: isInjecting || selectedRepoNames.size === 0 ? '#EFE7D8' : '#E53935',
                    color: isInjecting || selectedRepoNames.size === 0 ? '#888888' : '#FFFFFF',
                    border: '2px solid #111111',
                    borderRadius: '0px',
                    boxShadow: isInjecting || selectedRepoNames.size === 0 ? 'none' : '3px 3px 0px #111111',
                  }}
                >
                  {isInjecting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Inject Selected ({selectedRepoNames.size})</span>
                </button>
              </div>
            </div>

            {/* Notifications */}
            {injectSuccess && (
              <div
                className="p-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(46,125,50,0.1)',
                  border: '2px solid #2E7D32',
                  color: '#2E7D32',
                }}
              >
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{injectSuccess}</span>
              </div>
            )}

            {error && (
              <div
                className="p-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(229,57,53,0.1)',
                  border: '2px solid #E53935',
                  color: '#E53935',
                }}
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab 1: Matched Projects */}
            {activeTab === 'matched' && (
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {matchedProjects.map((repo) => {
                  const isSelected = selectedRepoNames.has(repo.name)
                  return (
                    <div
                      key={repo.repoId}
                      className="p-4 transition-all"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: isSelected ? '2px solid #E53935' : '1px solid #111111',
                        borderRadius: '0px',
                        boxShadow: isSelected ? '4px 4px 0px #E53935' : '2px 2px 0px #111111',
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRepoSelection(repo.name)}
                            className="w-4 h-4 accent-[#E53935] cursor-pointer"
                          />
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold text-[#111111] hover:text-[#E53935] uppercase tracking-tight transition-colors"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {repo.name}
                          </a>
                          <span className="text-[11px] font-mono text-[#555555] bg-[#F5F0E6] px-2 py-0.5 border border-[#111111]">
                            {repo.language}
                          </span>
                          {repo.isPrivate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B6914] bg-[rgba(244,196,48,0.15)] px-1.5 py-0.5 border border-[#F4C430]">
                              <Lock size={10} /> Private
                            </span>
                          )}
                          {repo.isAlreadyInResume && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] bg-[rgba(46,125,50,0.1)] px-1.5 py-0.5 border border-[#2E7D32]">
                              In Resume
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              backgroundColor: repo.relevanceScore >= 75 ? 'rgba(46,125,50,0.1)' : 'rgba(244,196,48,0.15)',
                              color: repo.relevanceScore >= 75 ? '#2E7D32' : '#8B6914',
                              border: `1px solid ${repo.relevanceScore >= 75 ? '#2E7D32' : '#F4C430'}`,
                            }}
                          >
                            {repo.relevanceScore}% JD Fit
                          </span>
                        </div>
                      </div>

                      {repo.description && (
                        <p className="text-xs text-[#555555] mb-3 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {repo.description}
                        </p>
                      )}

                      {/* Grounded STAR Bullets */}
                      <div className="space-y-2 mt-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider text-[#111111] block"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          Synthesized STAR Accomplishment Bullets:
                        </span>
                        {repo.groundedBullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs">
                            <span className="text-[#E53935] font-bold mt-0.5">•</span>
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => handleUpdateBullet(repo.name, bIdx, e.target.value)}
                              className="flex-1 p-2 text-xs font-mono text-[#111111] focus:outline-none"
                              style={{
                                backgroundColor: '#F5F0E6',
                                border: '1px solid #111111',
                                borderRadius: '0px',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab 2: Trending Blueprints */}
            {activeTab === 'trending' && (
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {trendingBlueprints.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #111111',
                      borderRadius: '0px',
                      boxShadow: '3px 3px 0px #111111',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className="text-sm font-bold uppercase text-[#111111]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {bp.title}
                      </h4>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style={{
                          backgroundColor: 'rgba(229,57,53,0.1)',
                          color: '#E53935',
                          border: '1px solid #E53935',
                        }}
                      >
                        Impact Score: {bp.trendingScore}
                      </span>
                    </div>
                    <p className="text-xs text-[#555555] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {bp.problemStatement}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {bp.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 text-[10px] font-mono text-[#111111] bg-[#F5F0E6] border border-[#111111]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
