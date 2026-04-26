import { api } from '@/lib/api'
import type { DashboardMetrics, AgentEvent, OrgPulse, Project, Email, Decision } from '@/lib/types'
import MetricsGrid from '@/components/dashboard/MetricsGrid'
import AgentActivity from '@/components/dashboard/AgentActivity'
import OrgPulseCard from '@/components/dashboard/OrgPulse'
import { AlertTriangle, ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export const revalidate = 15  // revalidate every 15s (Next.js ISR)

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#252542] rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{score}</span>
    </div>
  )
}

function VelocityIcon({ trend }: { trend: string | null }) {
  if (trend === 'up')   return <TrendingUp   className="w-3.5 h-3.5 text-emerald-400" />
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-slate-500" />
}

export default async function DashboardPage() {
  let metrics: DashboardMetrics, events: AgentEvent[], pulse: OrgPulse,
      projects: Project[], emails: Email[], decisions: Decision[]

  try {
    ;[metrics, events, pulse, projects, emails, decisions] = await Promise.all([
      api.dashboard.metrics()  as Promise<DashboardMetrics>,
      api.dashboard.activity() as Promise<AgentEvent[]>,
      api.dashboard.pulse()    as Promise<OrgPulse>,
      api.projects.list()      as Promise<Project[]>,
      api.emails.list()        as Promise<Email[]>,
      api.decisions.list()     as Promise<Decision[]>,
    ])
  } catch {
    // Fallback demo state when backend isn't running
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Backend not running</h2>
        <p className="text-sm text-slate-400">Start the FastAPI server: <code className="text-indigo-400">uvicorn main:app --reload</code></p>
      </div>
    )
  }

  const criticalProjects = projects.filter(p => p.health === 'critical')
  const atRiskProjects   = projects.filter(p => p.health === 'at_risk')
  const flaggedEmails    = emails.filter(e => e.status === 'flagged')
  const pendingDecisions = decisions.filter(d => d.status === 'pending' || d.status === 'escalated')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Org pulse banner */}
      <OrgPulseCard pulse={pulse} />

      {/* KPI cards */}
      <MetricsGrid metrics={metrics} />

      {/* Main grid: agent feed + attention items */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Agent Activity — wide */}
        <div className="xl:col-span-3">
          <AgentActivity initialEvents={events} />
        </div>

        {/* Attention required — right column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Flagged emails */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252542]">
              <p className="text-sm font-semibold text-white">Needs Your Attention</p>
              <Link href="/inbox" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                All emails <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#252542]/60">
              {flaggedEmails.slice(0, 3).map(e => (
                <Link key={e.id} href="/inbox" className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors group">
                  <div className={clsx('mt-0.5 flex-shrink-0 w-2 h-2 rounded-full',
                    e.priority === 'critical' ? 'bg-red-500' : e.priority === 'high' ? 'bg-orange-500' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white">{e.subject}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{e.routing_reason}</p>
                  </div>
                </Link>
              ))}
              {flaggedEmails.length === 0 && (
                <p className="px-4 py-4 text-xs text-slate-500 text-center">No flagged emails</p>
              )}
            </div>
          </div>

          {/* Pending decisions */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252542]">
              <p className="text-sm font-semibold text-white">Pending Decisions</p>
              <Link href="/decisions" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#252542]/60">
              {pendingDecisions.slice(0, 3).map(d => (
                <Link key={d.id} href="/decisions" className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors group">
                  <span className={clsx('badge mt-0.5 flex-shrink-0',
                    d.urgency === 'immediate' ? 'priority-critical' : 'priority-high'
                  )}>
                    {d.urgency === 'immediate' ? 'URGENT' : 'THIS WEEK'}
                  </span>
                  <p className="text-xs text-slate-300 truncate group-hover:text-white">{d.title}</p>
                </Link>
              ))}
              {pendingDecisions.length === 0 && (
                <p className="px-4 py-4 text-xs text-slate-500 text-center">No pending decisions</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project health table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#252542]">
          <p className="text-sm font-semibold text-white">Project Health</p>
          <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#252542]">
                {['Project', 'Owner', 'Progress', 'Health Score', 'Trend', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left section-title">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252542]/40">
              {projects.slice(0, 5).map(p => (
                <tr key={p.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200 group-hover:text-white truncate max-w-[180px]">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.owner}</td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#252542] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.completion_pct}%` }} />
                      </div>
                      <span className="text-slate-400 w-8 text-right">{p.completion_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-36"><HealthBar score={p.health_score} /></td>
                  <td className="px-4 py-3"><VelocityIcon trend={p.velocity_trend} /></td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', `health-${p.health}`)}>{p.health.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
