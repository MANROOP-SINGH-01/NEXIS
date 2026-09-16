import { Loader2, Github, Plus, Check, X, Sparkles, Code2, Link } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateResumeBullet } from '../core/agent/resumeForge'
import { useGitHubData } from '../integration/hooks/useGitHubData'
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore'

type ResumeForgeStage = 'connect' | 'loading' | 'results'

interface ResumeForgeModalProps {
  onClose: () => void
}

function ProgressStrip() {
  return (
    <div className="w-full rounded-2xl border border-zinc-200/60 bg-white shadow-sm p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-blue-500 animate-pulse" />
        Nexus-Writer parsing repositories...
      </div>
      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full" />
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
      <div onClick={onClose} className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm transition-opacity duration-300" />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 md:p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-lg shrink-0">
            <Github size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-zinc-950 tracking-tight">Resume Forge</h2>
            <p className="text-sm text-zinc-500 font-medium mt-1 max-w-md leading-relaxed">
              Transform your GitHub repositories into quantified, high-impact resume bullets via Nexus-Writer.
            </p>
          </div>
        </div>

        {stage === 'connect' && (
          <div className="flex-1 overflow-auto space-y-6 custom-scrollbar">
            
            <div className="rounded-3xl border border-zinc-200/60 p-8 bg-zinc-50/50 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${isConnected ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/50' : 'bg-zinc-200/80 text-zinc-600 border border-zinc-300/50'}`}>
                  {isConnected ? 'GitHub Connected' : 'Not Connected'}
                </div>
              </div>

              <div className="flex items-center gap-4 relative z-10">
                {!isConnected ? (
                  <button
                    onClick={() => { window.location.href = connectUrl }}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-md"
                  >
                    <Link size={16} />
                    Connect Account
                  </button>
                ) : (
                  <button onClick={clearToken} className="px-6 py-3.5 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors">
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {error && <div className="text-xs text-red-800 font-medium bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><X size={16} className="text-red-600"/> {error}</div>}

            <div className="flex justify-end border-t border-zinc-100 pt-6">
              <button
                onClick={runForge}
                disabled={!isConnected}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Sparkles size={16} />
                Run Nexus-Writer
              </button>
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
          <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-6">
            {resumeForgeItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-[var(--shadow-subtle)] hover:shadow-md transition-shadow flex flex-col gap-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Repo Info */}
                  <div className="lg:col-span-5 bg-zinc-50/80 rounded-2xl border border-zinc-100 p-5 flex flex-col gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Code2 size={12}/> Repository Details</p>
                    <a href={item.repositoryUrl} target="_blank" rel="noreferrer" className="text-base font-display font-bold text-zinc-950 hover:text-blue-600 transition-colors underline decoration-zinc-200 underline-offset-4">
                      {item.repository}
                    </a>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-600 shadow-sm w-max">
                      {item.codeSnapshot}
                    </div>
                  </div>

                  {/* Right Column: Output & Actions */}
                  <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Sparkles size={12} className="text-amber-500"/> Generated Bullet</p>
                    </div>
                    <textarea
                      value={item.suggestedBullet}
                      onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                      className="w-full flex-1 min-h-[100px] resize-y bg-white border border-zinc-200/80 rounded-2xl p-4 text-sm text-zinc-900 leading-relaxed font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 shadow-sm transition-all"
                    />
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => acceptResumeForgeBullet(item.id)}
                        className={`flex-1 inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                          item.accepted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-md'
                        }`}
                      >
                        <Check size={16} />
                        {item.accepted ? 'Accepted' : 'Accept Draft'}
                      </button>
                      <button
                        onClick={() => addResumeForgeToLedger(item.id)}
                        className={`flex-1 inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                          item.addedToLedger ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                        }`}
                      >
                        <Plus size={16} />
                        {item.addedToLedger ? 'In Ledger' : 'Add to Ledger'}
                      </button>
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
