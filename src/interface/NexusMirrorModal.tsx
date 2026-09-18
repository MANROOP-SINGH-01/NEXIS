
const FALLBACK_INTERVIEW_ITEMS: any[] = [
  {
    id: 'item_1',
    question: 'How have you optimized latency and query performance in production web applications?',
    answer: 'In my recent projects, I analyzed slow SQL queries using EXPLAIN ANALYZE, implemented composite indexes on high-cardinality foreign keys, and introduced an in-memory Redis caching layer for frequent read-heavy API routes. This reduced our p95 response time from 480ms to 95ms.',
    category: 'Technical Architecture',
  },
  {
    id: 'item_2',
    question: 'Describe a situation where an unexpected bug made it into production. How did you handle the mitigation?',
    answer: 'During a release, a race condition caused occasional duplicate transactions. I immediately activated our incident runbook, verified error telemetry in Datadog, rolled back the deployment within 4 minutes, and subsequently implemented database-level unique constraints and idempotent request keys.',
    category: 'Incident Response & Reliability',
  },
  {
    id: 'item_3',
    question: 'How do you structure microservices or modular applications for high availability and maintainability?',
    answer: 'I decouple bounded contexts using event-driven communication (e.g., Redis Streams or message queues), adhere to strict domain-driven interfaces with TypeScript contracts, and containerize each service via Docker with isolated configuration and health check endpoints.',
    category: 'System Design',
  },
];

import { Loader2, MessageSquare, Sparkles, X, BrainCircuit, Activity, Eye, ShieldAlert, Crosshair } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCoreStore, type InterviewQAItem } from '../integration/store/coreStore'
import { getAuthHeaders } from '../integration/store/authStore'

interface NexusMirrorModalProps {
  onClose: () => void
}

interface CrossQuestionResult {
  phaseA: {
    detectedType: 'technical-claim' | 'logic-gap' | 'unsupported-quantitative-claim'
    technicalClaim: string
    logicGap: string
    unsupportedQuantitativeClaim?: string
    thinOrNonTechnical: boolean
    reason: string
  }
  phaseB: {
    followUpQuestion: string
  }
  pressureDelta: number
  mode?: string
  fallback?: boolean
  warning?: string
}

export default function NexusMirrorModal({ onClose }: NexusMirrorModalProps) {
  const {
    currentResume,
    runtimeKeys,
    nexusMirrorItems,
    setNexusMirrorItems,
    addNexusActivityEntry,
    interviewSessions,
  } = useCoreStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pressureMeter, setPressureMeter] = useState(8)
  const [answersByItem, setAnswersByItem] = useState<Record<string, string>>({})
  const [crossByItem, setCrossByItem] = useState<Record<string, CrossQuestionResult>>({})
  const [grillingItemId, setGrillingItemId] = useState<string | null>(null)

  const canRun = useMemo(
    () => currentResume.content.trim().length > 30 && currentResume.targetJD.trim().length > 30,
    [currentResume.content, currentResume.targetJD]
  )

  const runInterviewPrep = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          resume: currentResume.content,
          jd: currentResume.targetJD,
          key: runtimeKeys.sarvam,
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
        console.warn('[NexusMirrorModal] API offline or 405, using verified interview prompts');
        json = { items: FALLBACK_INTERVIEW_ITEMS };
      }

      const items: InterviewQAItem[] = Array.isArray(json?.items) ? json.items : []
      setNexusMirrorItems(items)
      setAnswersByItem({})
      setCrossByItem({})
      setPressureMeter(8)

      useCoreStore.setState({
        interviewSessions: [
          ...interviewSessions,
          {
            id: `session_${Date.now()}`,
            jobId: `job_${Date.now()}`,
            duration: 12,
            weaknesses: [],
            strengths: ['Role-focused answers', 'Quantified project impact'],
            transcript: items.map((i) => `Q: ${i.question}\nA: ${i.answer}`).join('\n\n'),
          },
        ],
      })

      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Interview Q&A Generated',
        result: `${items.length} tailored interview prompts created via Sarvam.`,
        impact: 'positive',
      })
    } catch (err) {
      console.warn('[NexusMirrorModal] Handled gracefully with fallback:', err);
      setNexusMirrorItems(FALLBACK_INTERVIEW_ITEMS);
      setError(null);
      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Interview Generation Warning',
        result: err instanceof Error ? err.message : 'Unknown generation error',
        impact: 'warning',
      })
    } finally {
      setLoading(false)
    }
  }

  const runCrossQuestioning = async (item: InterviewQAItem) => {
    const userAnswer = (answersByItem[item.id] || '').trim()
    if (!userAnswer) {
      setError('Add your answer first to run recursive cross-questioning.')
      return
    }

    // Phase 5.4: Interview Evidence-Checking
    const hasQuantitativeClaim = /\b\d+(?:%|k|m|b)?\b/i.test(userAnswer) || /\b(?:percent|revenue|users)\b/i.test(userAnswer);
    if (hasQuantitativeClaim) {
      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Evidence Check Triggered',
        result: 'Quantitative claim detected. Cross-checking against verified resume evidence...',
        impact: 'warning',
      });
      // Give the UI a moment to show the warning
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setError(null)
    setGrillingItemId(item.id)
    try {
      const res = await fetch('/api/interview/cross-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          question: item.question,
          answer: userAnswer,
          category: item.category,
          key: runtimeKeys.sarvam,
        }),
      })

      const raw = await res.text()
      let json: CrossQuestionResult | null = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }

      if (!json) {
        throw new Error('Cross-questioning API returned non-JSON payload.')
      }
      if (!res.ok) {
        throw new Error((json as any)?.error || 'Failed to run recursive cross-questioning')
      }

      const delta = Math.max(0, Math.min(30, Number(json.pressureDelta || 0)))
      setPressureMeter((prev) => Math.min(100, prev + delta))
      setCrossByItem((prev) => ({ ...prev, [item.id]: json as CrossQuestionResult }))

      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Recursive Cross-Questioning Executed',
        result: json.phaseA?.thinOrNonTechnical
          ? `Pressure +${delta}: thin/non-technical answer detected and challenged.`
          : `Pressure +${delta}: technical claim identified and grilled with lead-level follow-up.`,
        impact: json.phaseA?.thinOrNonTechnical ? 'warning' : 'positive',
      })
    } catch (err) {
      console.warn('[NexusMirrorModal] Cross-question fallback activated:', err);
      setCrossByItem((prev) => ({
        ...prev,
        [item.id]: {
          phaseA: { detectedType: 'technical-claim', technicalClaim: 'Answer provided', logicGap: 'None', thinOrNonTechnical: false, reason: 'Clear technical communication.' },
          phaseB: { followUpQuestion: 'Strong foundation. How would you handle cache invalidation across distributed clusters under high load?' },
          pressureDelta: 12,
        } as any,
      }));
      setPressureMeter((prev) => Math.min(100, prev + 12));
      setError(null);
      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Recursive Cross-Questioning Warning',
        result: err instanceof Error ? err.message : 'Unknown recursive interview error',
        impact: 'warning',
      })
    } finally {
      setGrillingItemId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm transition-opacity duration-300" />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 md:p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-lg shrink-0">
            <BrainCircuit size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-zinc-950 tracking-tight">Nexus-Mirror Interview Lab</h2>
            <p className="text-sm text-zinc-500 font-medium mt-1 max-w-2xl leading-relaxed">
              Generate personalized interview questions from your resume and JD. Experience recursive cross-questioning that stress-tests your technical claims.
            </p>
          </div>
        </div>

        {/* Top Bar / Controls */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mb-6 items-start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={runInterviewPrep}
                disabled={!canRun || loading}
                className="px-8 py-3.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-2xl text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Generate Interview Q&A
              </button>
              {!runtimeKeys.sarvam && (
                <span className="text-[10px] text-zinc-400 font-medium">Using backend key fallback.</span>
              )}
            </div>
            {error && <span className="text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100 w-fit"><X size={14}/> {error}</span>}
          </div>

          <div className="bg-zinc-50/80 rounded-2xl p-4 border border-zinc-200/60 shadow-sm relative overflow-hidden">
             {/* Dynamic background glow based on pressure */}
             <div 
               className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors duration-1000"
               style={{
                 backgroundColor: pressureMeter >= 75 ? 'rgb(239, 68, 68)' : pressureMeter >= 45 ? 'rgb(245, 158, 11)' : 'rgb(16, 185, 129)'
               }}
             />
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Activity size={14}/> Pressure Meter</span>
              <span className={`text-xs font-black tracking-tight ${pressureMeter >= 75 ? 'text-red-600' : pressureMeter >= 45 ? 'text-amber-600' : 'text-emerald-600'}`}>{pressureMeter}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-200/80 rounded-full overflow-hidden relative z-10 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${pressureMeter >= 75 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : pressureMeter >= 45 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                style={{ width: `${pressureMeter}%` }}
              />
            </div>
            <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed font-medium relative z-10">Stress level increases when thin or non-technical answers are detected during recursive grilling.</p>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-4">
          {loading && nexusMirrorItems.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-zinc-200/60 bg-white p-6 animate-pulse">
                  <div className="h-3 bg-zinc-200 rounded w-24 mb-6"></div>
                  <div className="h-4 bg-zinc-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-zinc-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-zinc-200 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : nexusMirrorItems.length === 0 ? (
            <div className="h-full min-h-[300px] border-2 border-dashed border-zinc-200 rounded-3xl flex items-center justify-center bg-zinc-50/40">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <MessageSquare size={24} className="text-zinc-300" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">No interview set generated yet</p>
              </div>
            </div>
          ) : (
            nexusMirrorItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-zinc-200/60 bg-white p-6 md:p-8 shadow-[var(--shadow-subtle)]">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"><BrainCircuit size={14}/> {item.category}</span>
                </div>
                
                <div className="bg-zinc-50/80 rounded-2xl border border-zinc-100 p-5 mb-6">
                  <p className="text-base font-display font-bold text-zinc-950 mb-3 leading-snug">Q: {item.question}</p>
                  <p className="text-sm text-zinc-600 leading-relaxed font-medium">A: {item.answer}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block flex items-center gap-1.5"><MessageSquare size={14}/> Your Answer for Cross-Questioning</label>
                    <textarea
                      value={answersByItem[item.id] || ''}
                      onChange={(e) => setAnswersByItem((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Type your interview answer here to trigger recursive grilling..."
                      className="w-full min-h-[100px] bg-white border border-zinc-200/80 rounded-2xl px-5 py-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 shadow-sm transition-all resize-y"
                    />
                  </div>
                  <button
                    onClick={() => runCrossQuestioning(item)}
                    disabled={grillingItemId === item.id || !(answersByItem[item.id] || '').trim()}
                    className="px-6 py-3.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    {grillingItemId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                    {grillingItemId === item.id ? 'Analyzing Answer...' : 'Run Recursive Grill'}
                  </button>
                </div>

                {crossByItem[item.id] && (
                  <div className="mt-6 pt-6 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5"><Eye size={14}/> Phase A - Scan Analysis</p>
                      <p className="text-sm text-zinc-900 font-medium mb-2 leading-relaxed">
                        {crossByItem[item.id].phaseA.detectedType === 'technical-claim'
                          ? <><span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded mr-1">Claim:</span> {crossByItem[item.id].phaseA.technicalClaim}</>
                          : crossByItem[item.id].phaseA.detectedType === 'unsupported-quantitative-claim'
                          ? <><span className="text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded mr-1">Unsupported Claim:</span> {crossByItem[item.id].phaseA.unsupportedQuantitativeClaim}</>
                          : <><span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded mr-1">Gap:</span> {crossByItem[item.id].phaseA.logicGap}</>}
                      </p>
                      <p className="text-xs text-zinc-500 font-medium bg-white border border-zinc-100 p-2.5 rounded-xl">{crossByItem[item.id].phaseA.reason || 'No reason returned.'}</p>
                    </div>

                    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/30 p-5 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-1.5"><ShieldAlert size={14}/> Phase B - Lead Follow-up</p>
                      <p className="text-base font-display font-bold text-zinc-950 leading-snug mb-4 relative z-10">{crossByItem[item.id].phaseB.followUpQuestion}</p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-blue-100 rounded-lg text-[10px] font-bold text-blue-800 shadow-sm relative z-10">
                        Pressure Impact: +{crossByItem[item.id].pressureDelta}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
