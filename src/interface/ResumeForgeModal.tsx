import { Loader2, Github, Plus, Check, X, Sparkles, Code2, Link as LinkIcon, ArrowRight, ShieldCheck, AlertCircle, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateResumeBullet } from '../core/agent/resumeForge'
import { useGitHubData } from '../integration/hooks/useGitHubData'
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore'
import { auditBulletQuality } from '../services/antiSlopResumeService'

type ResumeForgeStage = 'connect' | 'loading' | 'results'

interface ResumeForgeModalProps {
  onClose: () => void
}

function ProgressStrip() {
  return (
    <div className="w-full rounded-2xl border border-[#EADFCF] bg-[#FAF6F0] p-6 relative overflow-hidden shadow-sm">
      <div className="text-xs uppercase tracking-wider text-[#6A6359] mb-4 flex items-center gap-2 font-bold">
        <Sparkles size={15} className="text-[#F47B20] animate-spin" />
        <span>Nexus-Writer parsing repositories & synthesizing quantified impact bullets...</span>
      </div>
      <div className="h-2.5 w-full bg-[#E5DBCF] rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-[#F47B20] animate-pulse rounded-full" />
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
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" />
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-[#FFFDF9] rounded-2xl shadow-2xl p-6 md:p-8 border border-[#EADFCF] animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col z-10 text-[#181512]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-[#999084] hover:text-[#181512] hover:bg-[#F2ECE2] rounded-full transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FAF6F0] border border-[#EADFCF] flex items-center justify-center shadow-xs shrink-0 text-[#181512]">
            <Github size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF0E4] border border-[#FDCBA7] text-[#C45709] text-[10px] font-bold mb-1">
              <Sparkles size={11} />
              <span>NEXUS-WRITER REPO SYNTHESIS</span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#181512] tracking-tight">
              Resume Forge
            </h2>
            <p className="text-xs text-[#6A6359] mt-1 max-w-lg leading-relaxed">
              Transform your GitHub repositories and production commits into quantified, high-ATS resume bullets via Nexus-Writer.
            </p>
          </div>
        </div>

        {stage === 'connect' && (
          <div className="flex-1 overflow-auto space-y-6 custom-scrollbar">
            <div className="rounded-2xl border border-[#EADFCF] p-8 bg-[#FAF6F0] flex flex-col items-center justify-center text-center gap-6 shadow-2xs">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#999084] mb-1">Telemetry Status</p>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isConnected 
                    ? 'bg-[#E8F6EE] text-[#246B44] border border-[#BCE4CE]' 
                    : 'bg-[#F2ECE2] text-[#6A6359] border border-[#E5DBCF]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#2E8555]' : 'bg-[#999084]'}`} />
                  {isConnected ? 'GitHub Connected' : 'No Account Linked'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isConnected ? (
                  <button
                    onClick={() => { window.location.href = connectUrl }}
                    className="nx-btn-primary !py-2.5 !px-5 !text-xs cursor-pointer"
                  >
                    <LinkIcon size={15} />
                    <span>Connect GitHub Account</span>
                  </button>
                ) : (
                  <button
                    onClick={clearToken}
                    className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer"
                  >
                    Disconnect Account
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#B83128] font-medium bg-[#FDEEED] border border-[#F7BEBA] rounded-xl p-4 flex items-center gap-2">
                <X size={16} className="text-[#D9453B] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-[#F0E6D8] pt-5">
              <button
                onClick={runForge}
                disabled={!isConnected}
                className={`nx-btn-primary !py-2.5 !px-5 !text-xs ${
                  !isConnected ? 'opacity-50 cursor-not-allowed !bg-[#E5DBCF] !text-[#999084] shadow-none' : 'cursor-pointer'
                }`}
              >
                <Sparkles size={15} />
                <span>Run Nexus-Writer</span>
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
          <div className="flex-1 overflow-auto custom-scrollbar pr-1 space-y-4">
            {resumeForgeItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#EADFCF] bg-[#FAF6F0] p-5 shadow-2xs hover:border-[#D7CABB] transition-colors flex flex-col gap-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Repo metadata */}
                  <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5DBCF] p-4 flex flex-col gap-2.5 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#999084] flex items-center gap-1.5">
                      <Code2 size={12} className="text-[#F47B20]" />
                      Repository Telemetry
                    </p>
                    <a
                      href={item.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-[#181512] hover:text-[#F47B20] transition-colors underline decoration-[#D7CABB] underline-offset-4"
                    >
                      {item.repository}
                    </a>
                    <div className="inline-flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADFCF] px-2.5 py-1 rounded-lg text-xs font-medium text-[#6A6359] w-max">
                      {item.codeSnapshot}
                    </div>
                  </div>

                  {/* Right: Suggested bullet & actions */}
                  {(() => {
                    const audit = auditBulletQuality(item.suggestedBullet);
                    return (
                      <div className="lg:col-span-7 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between px-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#999084] flex items-center gap-1.5">
                            <Sparkles size={12} className="text-[#F47B20]" />
                            Quantified STAR Bullet
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                              audit.fleschScore >= 70
                                ? 'bg-[#E8F6EE] text-[#246B44] border border-[#BCE4CE]'
                                : 'bg-[#FEF6E9] text-[#A6690E] border border-[#F8DFAC]'
                            }`}>
                              <ShieldCheck size={10} />
                              {audit.fleschScore}/100 Reading Ease
                            </span>
                            {!audit.isClean && (
                              <button
                                onClick={() => {
                                  const cleaned = item.suggestedBullet
                                    .replace(/—/g, '-')
                                    .replace(/\b(spearheaded|spearhead|synergy|synergistic|leveraging|leveraged|utilizing)\b/gi, 'delivered');
                                  updateResumeForgeItemBullet(item.id, cleaned);
                                }}
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF0E4] text-[#C45709] border border-[#FDCBA7] hover:bg-[#FFE6D3] flex items-center gap-1 cursor-pointer transition-colors"
                                title="Auto-sanitize buzzwords & em-dashes"
                              >
                                <Wand2 size={10} />
                                Sanitize Anti-Slop
                              </button>
                            )}
                          </div>
                        </div>

                        {audit.warnings.length > 0 && (
                          <div className="p-2 rounded-lg bg-[#FEF6E9] border border-[#F8DFAC] text-[10px] text-[#A6690E] flex items-start gap-1.5">
                            <AlertCircle size={12} className="shrink-0 mt-0.5 text-[#C98218]" />
                            <span>{audit.warnings.join(' ')}</span>
                          </div>
                        )}

                        <textarea
                          value={item.suggestedBullet}
                          onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                          className="w-full flex-1 min-h-[90px] resize-y bg-white border border-[#D7CABB] rounded-xl p-3.5 text-xs text-[#181512] leading-relaxed focus:outline-none focus:border-[#F47B20] transition-all"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => acceptResumeForgeBullet(item.id)}
                            className={`flex-1 nx-btn-primary !py-2 !text-xs cursor-pointer ${
                              item.accepted ? '!bg-[#E8F6EE] !text-[#246B44] !border-[#BCE4CE] !shadow-none' : ''
                            }`}
                          >
                            <Check size={14} />
                            <span>{item.accepted ? 'Accepted' : 'Accept Bullet'}</span>
                          </button>
                          <button
                            onClick={() => addResumeForgeToLedger(item.id)}
                            className="flex-1 nx-btn-secondary !py-2 !text-xs cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>{item.addedToLedger ? 'In Ledger' : 'Add to Ledger'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
