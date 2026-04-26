'use client'

import { Mail, CalendarDays, FolderKanban, GitBranch, Zap } from 'lucide-react'
import type { DashboardMetrics } from '@/lib/types'

interface Props { metrics: DashboardMetrics }

export default function MetricsGrid({ metrics }: Props) {
  const cards = [
    {
      label: 'Automation Rate',
      value: `${metrics.automation_rate}%`,
      sub: 'tasks handled autonomously',
      icon: Zap,
      color: 'indigo',
      glow: 'shadow-indigo-500/20',
      iconBg: 'bg-indigo-500/20 text-indigo-400',
    },
    {
      label: 'Emails',
      value: metrics.emails.auto_handled,
      sub: `${metrics.emails.unread} unread · ${metrics.emails.flagged} flagged`,
      icon: Mail,
      color: 'sky',
      glow: 'shadow-sky-500/20',
      iconBg: 'bg-sky-500/20 text-sky-400',
    },
    {
      label: 'Meetings',
      value: metrics.meetings.upcoming,
      sub: `${metrics.meetings.briefings_ready} briefs ready`,
      icon: CalendarDays,
      color: 'violet',
      glow: 'shadow-violet-500/20',
      iconBg: 'bg-violet-500/20 text-violet-400',
    },
    {
      label: 'Project Health',
      value: `${metrics.projects.avg_health_score}`,
      sub: `${metrics.projects.critical} critical · ${metrics.projects.at_risk} at risk`,
      icon: FolderKanban,
      color: 'amber',
      glow: 'shadow-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    {
      label: 'Decisions',
      value: `${metrics.decisions.resolution_rate}%`,
      sub: `${metrics.decisions.ai_resolved} auto-resolved · ${metrics.decisions.pending} pending`,
      icon: GitBranch,
      color: 'emerald',
      glow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(card => (
        <div key={card.label} className={`card p-4 shadow-lg ${card.glow}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
            <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
              <card.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
          <p className="text-xs text-slate-500">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
