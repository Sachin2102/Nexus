'use client'

import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  FolderKanban, AlertTriangle, TrendingDown, TrendingUp, Minus,
  Cpu, Sparkles, Users, Clock, DollarSign, CheckSquare
} from 'lucide-react'
import clsx from 'clsx'

export default function ProjectsPage() {
  const { data: projects, mutate } = useSWR<Project[]>('/api/projects/', fetcher, { refreshInterval: 10000 })
  const [selected, setSelected] = useState<Project | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 4000) }

  const handleAssess = async (id: string) => {
    await api.projects.assess(id)
    toast('AI health assessment running...')
    setTimeout(() => mutate(), 5000)
  }

  const critical = (projects ?? []).filter(p => p.health === 'critical')
  const atRisk   = (projects ?? []).filter(p => p.health === 'at_risk')
  const healthy  = (projects ?? []).filter(p => p.health === 'healthy')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: critical.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'At Risk',  count: atRisk.length,   color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Healthy',  count: healthy.length,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={clsx('card p-4 border', s.bg)}>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label} projects</p>
          </div>
        ))}
      </div>

      {/* Project cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {(projects ?? []).map(p => (
          <ProjectCard key={p.id} project={p} onSelect={() => setSelected(p)} onAssess={handleAssess} />
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <ProjectDrawer project={selected} onClose={() => setSelected(null)} />
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-xl text-xs text-white shadow-xl">
          <Cpu className="w-3.5 h-3.5 animate-spin" /> {toastMsg}
        </div>
      )}
    </div>
  )
}

function HealthRing({ score, health }: { score: number; health: string }) {
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color  = health === 'healthy' ? '#10b981' : health === 'at_risk' ? '#f59e0b' : '#ef4444'

  return (
    <svg width="72" height="72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#252542" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">{score}</text>
    </svg>
  )
}

function ProjectCard({ project: p, onSelect, onAssess }: { project: Project; onSelect: () => void; onAssess: (id: string) => void }) {
  const highRisks = (p.risk_flags ?? []).filter(r => r.severity === 'high')

  return (
    <div className={clsx('card p-4 cursor-pointer hover:border-indigo-500/40 transition-all',
      p.health === 'critical' && 'border-red-500/30',
      p.health === 'at_risk'  && 'border-amber-500/30',
    )} onClick={onSelect}>
      <div className="flex items-start gap-3 mb-3">
        <HealthRing score={p.health_score} health={p.health} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate mb-0.5">{p.name}</p>
          <p className="text-[11px] text-slate-500 mb-1.5">{p.owner}</p>
          <span className={clsx('badge text-[10px]', `health-${p.health}`)}>{p.health.replace('_', ' ')}</span>
        </div>
        <div className="flex-shrink-0">
          {p.velocity_trend === 'up'   && <TrendingUp   className="w-4 h-4 text-emerald-400" />}
          {p.velocity_trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
          {p.velocity_trend === 'flat' && <Minus        className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>Progress</span>
          <span>{p.completion_pct}%</span>
        </div>
        <div className="h-1.5 bg-[#252542] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.completion_pct}%` }} />
        </div>
      </div>

      {/* Risk flags */}
      {highRisks.length > 0 && (
        <div className="flex items-center gap-1.5 p-2 bg-red-500/5 border border-red-500/15 rounded-lg mb-3">
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-300 truncate">{highRisks[0].flag}</p>
          {highRisks.length > 1 && (
            <span className="text-[10px] text-red-400 ml-auto flex-shrink-0">+{highRisks.length - 1}</span>
          )}
        </div>
      )}

      {/* AI recommendation */}
      {p.ai_recommendation && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="truncate text-slate-400">{p.ai_recommendation}</p>
        </div>
      )}
    </div>
  )
}

function ProjectDrawer({ project: p, onClose }: { project: Project; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-[520px] h-full bg-[#0f0f1a] border-l border-[#252542] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#252542] sticky top-0 bg-[#0f0f1a]">
          <div>
            <h2 className="text-sm font-semibold text-white">{p.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Owner: {p.owner}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CheckSquare, label: 'Tasks', value: `${p.tasks_done}/${p.tasks_total}` },
              { icon: FolderKanban, label: 'Milestones', value: `${p.milestones_hit}/${p.milestones_total}` },
              { icon: DollarSign,  label: 'Budget', value: p.budget_usd ? `$${(p.budget_usd/1000).toFixed(0)}k` : '—' },
              { icon: Clock,       label: 'Deadline', value: p.deadline ? formatDistanceToNow(new Date(p.deadline), {addSuffix:true}) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 bg-[#16162a] rounded-lg border border-[#252542]">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Icon className="w-3 h-3" /><span className="text-[10px] uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Budget bar */}
          {p.budget_pct !== null && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Budget Utilisation</span>
                <span className={p.budget_pct > 90 ? 'text-red-400' : 'text-slate-400'}>{p.budget_pct}%</span>
              </div>
              <div className="h-2 bg-[#252542] rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full', p.budget_pct > 90 ? 'bg-red-500' : p.budget_pct > 75 ? 'bg-amber-500' : 'bg-indigo-500')}
                  style={{ width: `${Math.min(100, p.budget_pct)}%` }} />
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {p.ai_recommendation && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">AI Recommendation</span>
              </div>
              <p className="text-xs text-slate-300">{p.ai_recommendation}</p>
            </div>
          )}

          {/* Risk Flags */}
          {p.risk_flags.length > 0 && (
            <div>
              <p className="section-title mb-2">Risk Flags</p>
              <div className="space-y-2">
                {p.risk_flags.map((r, i) => (
                  <div key={i} className={clsx('p-3 rounded-lg border',
                    r.severity === 'high'   ? 'bg-red-500/5 border-red-500/20' :
                    r.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-slate-500/5 border-slate-500/20'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={clsx('w-3 h-3',
                        r.severity === 'high' ? 'text-red-400' : r.severity === 'medium' ? 'text-amber-400' : 'text-slate-500'
                      )} />
                      <p className="text-xs font-medium text-slate-200">{r.flag}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 ml-5">Action: {r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers */}
          {p.blockers.length > 0 && (
            <div>
              <p className="section-title mb-2">Blockers</p>
              {p.blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-300">{b}</p>
                </div>
              ))}
            </div>
          )}

          {/* Last update */}
          {p.last_update && (
            <div>
              <p className="section-title mb-1">Last Update</p>
              <p className="text-xs text-slate-400">{p.last_update}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
