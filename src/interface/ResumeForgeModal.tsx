import { Loader2, Github, Plus, Check, X, Sparkles, Code2, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateResumeBullet } from '../core/agent/resumeForge'
import { useGitHubData } from '../integration/hooks/useGitHubData'
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore'
import { Button } from './primitives/Button'
import { Badge } from './primitives/Badge'

type ResumeForgeStage = 'connect' | 'loading' | 'results'

interface ResumeForgeModalProps {
  onClose: () => void
}

function ProgressStrip() {
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-[#12131c] p-6 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-400 animate-spin" />
        <span>Nexus-Writer parsing repositories & synthesizing impact bullets...</span>
      </div>
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

export default function ResumeForgeModal({ onClose }: ResumeForgeModalProps) {
  const {
    resumeForgeItems,
    setResumeForgeItems,
    updateResumeForgeItemBullet,
    acceptResumeForgeBullet,
    addResumeForgeToLedger,
  } = useCoreStore()

  const [stage, setStage] = useState<ResumeForgeStage>('connect')
  const [error, setError] = useState<string | null>(null)

  const { token, clearToken, connectUrl, fetchRecentActivity } = useGitHubData()

  const isConnected = useMemo(() => Boolean(token), [token])

  const runForge = async () => {
    setError(null)
    setStage('loading')

    try {
      const repos = await fetchRecentActivity()
      if (repos.length === 0) {
        throw new Error('No repositories found. Push code or check token scope.')
      }

      const generated: ResumeForgeItem[] = []
      for (const repo of repos) {
        const bullet = await generateResumeBullet(repo)
        generated.push({
          id: `rf_${repo.id}`,
          repository: repo.name,
          repositoryUrl: repo.url,
          codeSnapshot: `${repo.commits} commits, ${Math.round(repo.linesEstimate / 100) / 10}K lines ${repo.primaryLanguage}`,
          suggestedBullet: bullet,
          accepted: false,
          addedToLedger: false,
        })
      }

      setResumeForgeItems(generated)
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume Forge failed to process repositories.')
      setStage('connect')
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" />
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-[#12131c] rounded-2xl shadow-2xl shadow-black/80 p-6 md:p-8 border border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col z-10">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-md shrink-0 text-indigo-400">
            <Github size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono mb-1">
              <Sparkles size={11} />
              <span>NEXUS-WRITER REPO SYNTHESIS</span>
            </div>
            <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              Resume Forge
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
              Transform your GitHub repositories and production commits into quantified, high-ATS resume bullets via Nexus-Writer.
            </p>
          </div>
        </div>

        {stage === 'connect' && (
          <div className="flex-1 overflow-auto space-y-6 custom-scrollbar">
            <div className="rounded-2xl border border-zinc-800 p-8 bg-zinc-900/60 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden shadow-inner">
              <div className="relative z-10 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1">Telemetry Status</p>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider ${
                  isConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  {isConnected ? 'GitHub Connected' : 'No Account Linked'}
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                {!isConnected ? (
                  <Button
                    variant="glow"
                    size="md"
                    onClick={() => { window.location.href = connectUrl }}
                    leftIcon={<LinkIcon size={15} />}
                  >
                    Connect GitHub Account
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={clearToken}>
                    Disconnect Account
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-300 font-medium bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-2">
                <X size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-zinc-800/80 pt-5">
              <Button
                variant="glow"
                size="md"
                onClick={runForge}
                disabled={!isConnected}
                leftIcon={<Sparkles size={16} />}
              >
                Run Nexus-Writer
              </Button>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-xl">
              <ProgressStrip />
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="flex-1 overflow-auto custom-scrollbar pr-1 space-y-4">
            {resumeForgeItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm hover:border-zinc-700 transition-colors flex flex-col gap-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Repo metadata */}
                  <div className="lg:col-span-5 bg-[#12131c] rounded-xl border border-zinc-800 p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                      <Code2 size={12} className="text-indigo-400" />
                      Repository Telemetry
                    </p>
                    <a
                      href={item.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-white hover:text-indigo-400 transition-colors underline decoration-zinc-700 underline-offset-4"
                    >
                      {item.repository}
                    </a>
                    <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300 w-max">
                      {item.codeSnapshot}
                    </div>
                  </div>

                  {/* Right: Suggested bullet & actions */}
                  <div className="lg:col-span-7 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-400" />
                        Quantified STAR Bullet
                      </p>
                    </div>
                    <textarea
                      value={item.suggestedBullet}
                      onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                      className="w-full flex-1 min-h-[90px] resize-y bg-[#12131c] border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-100 leading-relaxed font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant={item.accepted ? 'secondary' : 'glow'}
                        size="sm"
                        onClick={() => acceptResumeForgeBullet(item.id)}
                        className="flex-1"
                        leftIcon={<Check size={14} />}
                      >
                        {item.accepted ? 'Accepted' : 'Accept Bullet'}
                      </Button>
                      <Button
                        variant={item.addedToLedger ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => addResumeForgeToLedger(item.id)}
                        className="flex-1"
                        leftIcon={<Plus size={14} />}
                      >
                        {item.addedToLedger ? 'In Ledger' : 'Add to Ledger'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
