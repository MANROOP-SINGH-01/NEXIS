import { ExternalLink, Loader2, Search, Target, X, Building, MapPin, Compass, Briefcase, Zap, AlertCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCoreStore } from '../integration/store/coreStore'
import { getAuthHeaders } from '../integration/store/authStore'

interface NexusHunterModalProps {
  onClose: () => void
}

export default function NexusHunterModal({ onClose }: NexusHunterModalProps) {
  const {
    currentResume,
    userCareerProfile,
    runtimeKeys,
    discoveredJobs,
    setDiscoveredJobs,
    addNexusActivityEntry,
  } = useCoreStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRun = useMemo(() => currentResume.content.trim().length > 30, [currentResume.content])

  const runDiscovery = async () => {
    setError(null)
    setLoading(true)
    try {
      const targetRole = currentResume.targetJD.trim().split('\n')[0]?.slice(0, 120) || userCareerProfile.targetRole || 'AI Engineer'
      const res = await fetch('/api/jobs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          resume: currentResume.content,
          targetRole,
          key: runtimeKeys.gemini,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }

      if (!res.ok || !json || !Array.isArray(json.items) || json.items.length === 0) {
        const msg = json?.message || json?.warning || json?.error || `No live job listings currently found for "${targetRole}". Try adjusting your target role or search query.`
        setError(msg)
        setDiscoveredJobs([])
        return
      }

      const mapped = (Array.isArray(json.items) ? json.items : []).slice(0, 3).map((item: any, idx: number) => ({
        id: `job_${Date.now()}_${idx}`,
        title: String(item.job_title || 'Target Role'),
        company: String(item.company_name || 'Company'),
        url: String(item.application_link || '#'),
        alignmentScore: Number(item.alignment_score || 80),
        blueOceanScore: Number(item.blue_ocean_score || 75),
        nexusMatchReason: String(item.nexus_match_reason || 'Strong fit based on Nexus profile.'),
        competitionLevel: (String(item.competition_level || 'Medium') as 'Low' | 'Medium' | 'High'),
        discoveredAt: Date.now(),
        source: (String(item.source || 'hidden') as 'linkedin' | 'company-careers' | 'hidden'),
      }))

      setDiscoveredJobs(mapped)
      addNexusActivityEntry({
        agentType: 'hunter',
        action: 'Nexus-Hunter Prime Targets Selected',
        result: `${mapped.length} Prime Targets discovered and sent to Job Discovery pipeline.`,
        impact: 'positive',
      })
    } catch (err) {
      console.warn('[NexusHunterModal] Error running job discovery:', err)
      setError(err instanceof Error ? err.message : 'Job discovery service unavailable. Please check your network or API keys.')
      setDiscoveredJobs([])
      addNexusActivityEntry({
        agentType: 'hunter',
        action: 'Nexus-Hunter Warning',
        result: err instanceof Error ? err.message : 'Unknown job discovery issue',
        impact: 'warning',
      })
    } finally {
      setLoading(false)
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
            <Compass size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-zinc-950 tracking-tight">Nexus-Hunter Discovery</h2>
            <p className="text-sm text-zinc-500 font-medium mt-1 max-w-xl leading-relaxed">
              Crew-style market scan, hidden-fit filtering, and Blue Ocean prioritization for low-competition opportunities.
            </p>
          </div>
        </div>

        {/* Features Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Search size={18} className="text-blue-600" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-950 mb-1.5">Market Scraping</p>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">Scans direct company career pages and niche boards via web API connectors.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Zap size={18} className="text-emerald-600" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-950 mb-1.5">Hidden Fit Engine</p>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">Detects deep technical fit from niche project signals and architectural choices.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Target size={18} className="text-purple-600" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-950 mb-1.5">Blue Ocean Score</p>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">Prioritizes high-alignment roles with lower applicant saturation rates.</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/60">
          <div className="flex-1">
             {error && <span className="text-xs text-red-600 font-bold flex items-center gap-1.5"><X size={14}/> {error}</span>}
             {!error && <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Ready to scan live job boards</span>}
          </div>
          <button
            onClick={runDiscovery}
            disabled={!canRun || loading}
            className="px-8 py-3.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Scanning Market...' : 'Run Nexus-Hunter'}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-4">
          {discoveredJobs.length === 0 ? (
            <div className="h-full min-h-[200px] border-2 border-dashed border-zinc-200 rounded-3xl flex items-center justify-center bg-zinc-50/40">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Target size={20} className="text-zinc-400" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">No prime targets discovered yet</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoveredJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-[var(--shadow-subtle)] hover:shadow-md transition-all flex flex-col gap-4 group relative overflow-hidden">
                   {/* Background Glow */}
                   <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="min-w-0">
                      <h3 className="text-base font-display font-bold text-zinc-950 truncate mb-1">{job.title}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <Building size={14} className="text-zinc-400" />
                        <span className="truncate">{job.company}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Alignment</p>
                      <p className="text-lg font-black text-emerald-800 tracking-tight">{Math.round(job.alignmentScore)}%</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Blue Ocean</p>
                      <p className="text-lg font-black text-blue-800 tracking-tight">{Math.round(job.blueOceanScore)}%</p>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-xs text-zinc-600 leading-relaxed font-medium bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      {job.nexusMatchReason}
                    </p>
                  </div>

                  <div className="pt-2 mt-auto relative z-10">
                     <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-xs font-bold uppercase tracking-widest text-zinc-900 transition-colors"
                      >
                      View Role
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
