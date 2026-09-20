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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 pointer-events-auto overflow-hidden font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs transition-opacity duration-200" />
      
      {/* Bauhaus Modal Container */}
      <div
        className="relative w-full max-w-5xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#111111]"
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #111111',
          borderRadius: '0px',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-[#EFE7D8] transition-colors cursor-pointer z-10"
          style={{ border: '1px solid #111111', borderRadius: '0px' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: '#111111',
              color: '#F5F0E6',
              border: '2px solid #111111',
              borderRadius: '0px',
            }}
          >
            <Compass size={24} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold uppercase tracking-tight text-[#111111]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Nexus-Hunter Discovery
            </h2>
            <p className="text-xs text-[#555555] mt-1 max-w-xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Crew-style market scan, hidden-fit filtering, and Blue Ocean prioritization for low-competition opportunities.
            </p>
          </div>
        </div>

        {/* Features Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div
            className="p-4"
            style={{
              backgroundColor: '#F5F0E6',
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
          >
            <div className="w-8 h-8 bg-[#FFFFFF] border border-[#111111] flex items-center justify-center mb-2.5 text-[#2457A6]">
              <Search size={16} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Market Scraping
            </p>
            <p className="text-xs text-[#555555] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Scans direct company career pages and niche boards via web connectors.
            </p>
          </div>

          <div
            className="p-4"
            style={{
              backgroundColor: '#F5F0E6',
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
          >
            <div className="w-8 h-8 bg-[#FFFFFF] border border-[#111111] flex items-center justify-center mb-2.5 text-[#2E7D32]">
              <Zap size={16} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Hidden Fit Engine
            </p>
            <p className="text-xs text-[#555555] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Detects technical fit from niche project signals and architectural choices.
            </p>
          </div>

          <div
            className="p-4"
            style={{
              backgroundColor: '#F5F0E6',
              border: '1px solid #111111',
              borderRadius: '0px',
            }}
          >
            <div className="w-8 h-8 bg-[#FFFFFF] border border-[#111111] flex items-center justify-center mb-2.5 text-[#E53935]">
              <Target size={16} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Blue Ocean Score
            </p>
            <p className="text-xs text-[#555555] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Prioritizes high-alignment roles with lower applicant saturation.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4"
          style={{
            backgroundColor: '#F5F0E6',
            border: '2px solid #111111',
            borderRadius: '0px',
          }}
        >
          <div className="flex-1">
            {error && (
              <span className="text-xs text-[#E53935] font-bold flex items-center gap-1.5 uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <X size={14} /> {error}
              </span>
            )}
            {!error && (
              <span className="text-xs text-[#111111] font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Ready to scan live market pipelines
              </span>
            )}
          </div>
          <button
            onClick={runDiscovery}
            disabled={!canRun || loading}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              backgroundColor: !canRun || loading ? '#EFE7D8' : '#E53935',
              color: !canRun || loading ? '#888888' : '#FFFFFF',
              border: '2px solid #111111',
              borderRadius: '0px',
              boxShadow: !canRun || loading ? 'none' : '3px 3px 0px #111111',
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span>{loading ? 'Scanning Market...' : 'Run Nexus-Hunter'}</span>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-4">
          {discoveredJobs.length === 0 ? (
            <div
              className="h-full min-h-[200px] flex items-center justify-center p-8 text-center"
              style={{
                backgroundColor: '#F5F0E6',
                border: '2px dashed #111111',
                borderRadius: '0px',
              }}
            >
              <div>
                <div className="w-10 h-10 flex items-center justify-center mx-auto mb-2 text-[#7A7A7A] bg-[#FFFFFF] border border-[#111111]">
                  <Target size={18} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No prime targets discovered yet
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoveredJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="p-5 flex flex-col gap-3.5"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #111111',
                    borderRadius: '0px',
                    boxShadow: '3px 3px 0px #111111',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3
                        className="text-base font-bold text-[#111111] uppercase tracking-tight truncate mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-[#555555]">
                        <Building size={14} className="text-[#111111]" />
                        <span className="truncate font-bold text-[#111111] uppercase">{job.company}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#F5F0E6] border border-[#111111] p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#2E7D32]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Alignment</p>
                      <p className="text-lg font-bold text-[#2E7D32]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{Math.round(job.alignmentScore)}%</p>
                    </div>
                    <div className="bg-[#F5F0E6] border border-[#111111] p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#2457A6]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Blue Ocean</p>
                      <p className="text-lg font-bold text-[#2457A6]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{Math.round(job.blueOceanScore)}%</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#555555] leading-relaxed p-2.5 bg-[#F5F0E6] border border-[#111111]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {job.nexusMatchReason}
                  </p>

                  <div className="pt-2 mt-auto">
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider text-[#F5F0E6] transition-colors"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        backgroundColor: '#111111',
                        border: '1px solid #111111',
                      }}
                    >
                      <span>View Role</span>
                      <ExternalLink size={13} />
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
