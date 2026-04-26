'use client'

import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import type { Decision } from '@/lib/types'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GitBranch, CheckCircle2, AlertCircle, Cpu, Sparkles, ArrowRight, User } from 'lucide-react'
import clsx from 'clsx'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:        { label: 'Pending',         cls: 'bg-slate-500/15 text-slate-400' },
  ai_resolved:    { label: 'AI Resolved',     cls: 'bg-emerald-500/15 text-emerald-400' },
  escalated:      { label: 'Escalated',       cls: 'bg-amber-500/15 text-amber-400' },
  human_resolved: { label: 'Human Resolved',  cls: 'bg-blue-500/15 text-blue-400' },
}

const URGENCY_LABELS: Record<string, string> = {
  immediate:  'priority-critical',
  this_week:  'priority-high',
  this_month: 'priority-medium',
}

export default function DecisionsPage() {
  const { data: decisions, mutate } = useSWR<Decision[]>('/api/decisions/', fetcher, { refreshInterval: 8000 })
  const [selected, setSelected] = useState<Decision | null>(null)
  const [resolution, setResolution] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

  const handleHumanResolve = async () => {
    if (!selected || !resolution.trim()) return
    await api.decisions.resolve(selected.id, resolution)
    toast('Decision resolved.')
    setResolution('')
    mutate()
  }

  const aiResolved     = (decisions ?? []).filter(d => d.status === 'ai_resolved')
  const needsAttention = (decisions ?? []).filter(d => d.status === 'pending' || d.status === 'escalated')
  const resolved       = (decisions ?? []).filter(d => d.status === 'human_resolved')

  return (
    <div className="flex gap-5 h-full animate-fade-in">
      {/* Left: Decision list */}
      <div className="w-96 flex-shrink-0 flex flex-col card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#252542] flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Decision Engine</p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <Cpu className="w-3 h-3" />
            <span>{aiResolved.length} auto-resolved</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {needsAttention.length > 0 && (
            <div>
              <p className="section-title px-4 pt-3 pb-1">Needs Attention</p>
              {needsAttention.map(d => (
                <DecisionRow key={d.id} decision={d} selected={selected?.id === d.id} onClick={() => setSelected(d)} />
              ))}
            </div>
          )}
          {aiResolved.length > 0 && (
            <div>
              <p className="section-title px-4 pt-4 pb-1">AI Resolved</p>
              {aiResolved.map(d => (
                <DecisionRow key={d.id} decision={d} selected={selected?.id === d.id} onClick={() => setSelected(d)} />
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <p className="section-title px-4 pt-4 pb-1">Closed</p>
              {resolved.map(d => (
                <DecisionRow key={d.id} decision={d} selected={selected?.id === d.id} onClick={() => setSelected(d)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {selected ? (
          <>
            <div className="px-5 py-4 border-b border-[#252542]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">{selected.title}</h2>
                <span className={clsx('badge flex-shrink-0', STATUS_LABELS[selected.status]?.cls)}>
                  {STATUS_LABELS[selected.status]?.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className={clsx('badge', URGENCY_LABELS[selected.urgency])}>
                  {selected.urgency.replace('_', ' ')}
                </span>
                {selected.department && <span>· {selected.department}</span>}
                <span>· {selected.submitted_by}</span>
                <span>· {formatDistanceToNow(new Date(selected.submitted_at), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Context */}
              <div>
                <p className="section-title mb-2">Context</p>
                <p className="text-xs text-slate-300 leading-relaxed">{selected.context}</p>
              </div>

              {/* Options */}
              {selected.options.length > 0 && (
                <div>
                  <p className="section-title mb-2">Options</p>
                  <div className="space-y-1.5">
                    {selected.options.map((opt, i) => (
                      <div key={i} className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                        opt === selected.ai_recommendation
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                          : 'bg-[#1a1a30] border-[#252542] text-slate-400'
                      )}>
                        {opt === selected.ai_recommendation && <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                        <span>{opt}</span>
                        {opt === selected.ai_recommendation && (
                          <span className="ml-auto text-[10px] text-indigo-400 font-medium">AI Pick</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {selected.ai_reasoning && (
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-400">AI Analysis</span>
                    </div>
                    {selected.confidence_score && (
                      <span className={clsx('text-xs font-medium',
                        selected.confidence_score >= 0.9 ? 'text-emerald-400' :
                        selected.confidence_score >= 0.75 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {Math.round(selected.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.ai_reasoning}</p>
                  {selected.escalated_to && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                      <User className="w-3 h-3" />
                      Escalated to: <span className="font-semibold">{selected.escalated_to}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution */}
              {selected.resolution && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400 mb-1">Resolution</p>
                  <p className="text-xs text-slate-300">{selected.resolution}</p>
                </div>
              )}

              {/* Human resolve input */}
              {(selected.status === 'escalated' || selected.status === 'pending') && (
                <div className="border border-[#252542] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#252542] bg-[#16162a]">
                    <p className="text-xs font-medium text-slate-300">Resolve manually</p>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 bg-transparent text-xs text-slate-300 resize-none outline-none placeholder-slate-600"
                    rows={3}
                    placeholder="Enter your decision..."
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                  />
                  <div className="px-3 py-2 border-t border-[#252542] bg-[#16162a] flex justify-end">
                    <button
                      onClick={handleHumanResolve}
                      disabled={!resolution.trim()}
                      className="btn-primary text-xs disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Submit Resolution
                    </button>
                  </div>
                </div>
              )}
            </div>

            {toastMsg && (
              <div className="px-5 py-2.5 border-t border-[#252542] bg-emerald-500/10">
                <p className="text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" /> {toastMsg}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <GitBranch className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select a decision</p>
              <p className="text-xs text-slate-600 mt-1">NEXUS resolves routine decisions autonomously</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DecisionRow({ decision, selected, onClick }: { decision: Decision; selected: boolean; onClick: () => void }) {
  const s = STATUS_LABELS[decision.status]
  return (
    <button onClick={onClick} className={clsx(
      'w-full text-left px-4 py-3 border-b border-[#252542]/40 transition-colors hover:bg-white/5',
      selected && 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-slate-200 line-clamp-2">{decision.title}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={clsx('badge text-[10px]', s?.cls)}>{s?.label}</span>
        {decision.confidence_score && (
          <span className={clsx('text-[10px] font-medium ml-auto',
            decision.confidence_score >= 0.9 ? 'text-emerald-500' : 'text-amber-500'
          )}>
            {Math.round(decision.confidence_score * 100)}%
          </span>
        )}
      </div>
    </button>
  )
}
