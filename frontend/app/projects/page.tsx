'use client'

import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  FolderKanban, AlertTriangle, TrendingDown, TrendingUp, Minus,
  Cpu, Sparkles, Clock, DollarSign, CheckSquare, X,
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

      {/* ── Summary row — always 3 columns ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: critical.length, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'At Risk',  count: atRisk.length,   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Healthy',  count: healthy.length,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={clsx('card p-4 border', s.bg)}>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label} projects</p>
          </div>
        ))}
      </div>

      {/* ── Project cards — original grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {(projects ?? []).map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            isSelected={selected?.id === p.id}
            onSelect={() => setSelected(prev => prev?.id === p.id ? null : p)}
            onAssess={handleAssess}
          />
        ))}
      </div>

      {/* ── Floating detail panel ── */}
      {selected && (
        <ProjectPanel project={selected} onClose={() => setSelected(null)} />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-xl text-xs text-white shadow-xl z-50">
          <Cpu className="w-3.5 h-3.5 animate-spin" /> {toastMsg}
        </div>
      )}
    </div>
  )
}

/* ── Health ring ─────────────────────────────────────── */
function HealthRing({ score, health }: { score: number; health: string }) {
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color  = health === 'healthy' ? '#10b981' : health === 'at_risk' ? '#f59e0b' : '#ef4444'
  return (
    <svg width="72" height="72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#252542" strokeWidth="5" />
      <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">{score}</text>
    </svg>
  )
}

/* ── Project card ────────────────────────────────────── */
function ProjectCard({
  project: p, isSelected, onSelect, onAssess,
}: {
  project: Project; isSelected: boolean; onSelect: () => void; onAssess: (id: string) => void
}) {
  const highRisks = (p.risk_flags ?? []).filter(r => r.severity === 'high')

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'card p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-indigo-500/60 bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
          : [
              'hover:border-indigo-500/40',
              p.health === 'critical' && 'border-red-500/30',
              p.health === 'at_risk'  && 'border-amber-500/30',
            ],
      )}
    >
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
          <span>Progress</span><span>{p.completion_pct}%</span>
        </div>
        <div className="h-1.5 bg-[#252542] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.completion_pct}%` }} />
        </div>
      </div>

      {/* Risk flag */}
      {highRisks.length > 0 && (
        <div className="flex items-center gap-1.5 p-2 bg-red-500/5 border border-red-500/15 rounded-lg mb-3">
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-300 truncate">{highRisks[0].flag}</p>
          {highRisks.length > 1 && (
            <span className="text-[10px] text-red-400 ml-auto flex-shrink-0">+{highRisks.length - 1}</span>
          )}
        </div>
      )}

      {/* AI rec */}
      {p.ai_recommendation && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="truncate text-slate-400">{p.ai_recommendation}</p>
        </div>
      )}
    </div>
  )
}

/* ── Floating detail panel ───────────────────────────── */
function ProjectPanel({ project: p, onClose }: { project: Project; onClose: () => void }) {
  return (
    <>
      {/* Subtle backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        style={{ left: '192px' }}   /* don't cover the sidebar */
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={clsx(
          'fixed top-0 right-0 z-50 h-full w-[480px]',
          'bg-[#0c0c1e] border-l border-[#252542]',
          'overflow-y-auto shadow-2xl shadow-black/60',
        )}
        style={{ animation: 'panelSlideIn 0.28s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#252542] sticky top-0 bg-[#0c0c1e] z-10">
          <div>
            <h2 className="text-sm font-semibold text-white">{p.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Owner: {p.owner}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CheckSquare,  label: 'Tasks',      value: `${p.tasks_done}/${p.tasks_total}` },
              { icon: FolderKanban, label: 'Milestones', value: `${p.milestones_hit}/${p.milestones_total}` },
              { icon: DollarSign,   label: 'Budget',     value: p.budget_usd ? `$${(p.budget_usd / 1000).toFixed(0)}k` : '—' },
              { icon: Clock,        label: 'Deadline',   value: p.deadline ? formatDistanceToNow(new Date(p.deadline), { addSuffix: true }) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 bg-[#16162a] rounded-lg border border-[#252542]">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Icon className="w-3 h-3" />
                  <span className="text-[10px] uppercase tracking-wide">{label}</span>
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
                <div
                  className={clsx('h-full rounded-full transition-all',
                    p.budget_pct > 90 ? 'bg-red-500' : p.budget_pct > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                  )}
                  style={{ width: `${Math.min(100, p.budget_pct)}%` }}
                />
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {p.ai_recommendation && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">AI Recommendation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{p.ai_recommendation}</p>
            </div>
          )}

          {/* Risk Flags */}
          {p.risk_flags.length > 0 && (
            <div>
              <p className="section-title mb-2">Risk Flags</p>
              <div className="space-y-2">
                {p.risk_flags.map((r, i) => (
                  <div key={i} className={clsx('p-3 rounded-lg border',
                    r.severity === 'high'   ? '