'use client'

import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'
import type { OrgPulse } from '@/lib/types'
import clsx from 'clsx'

interface Props { pulse: OrgPulse }

export default function OrgPulseCard({ pulse }: Props) {
  const config = {
    green: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'All Systems Nominal',
    },
    amber: {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      label: 'Attention Required',
    },
    red: {
      icon: AlertCircle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-500',
      label: 'Immediate Action Needed',
    },
  }[pulse.pulse]

  const Icon = config.icon

  return (
    <div className={clsx('card p-4 border', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-lg', config.bg, 'border', config.border)}>
          <Icon className={clsx('w-4 h-4', config.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={clsx('w-2 h-2 rounded-full animate-pulse', config.dot)} />
            <p className={clsx('text-sm font-semibold', config.text)}>{config.label}</p>
          </div>
          <p className="text-xs text-slate-400">{pulse.pulse_message}</p>

          {(pulse.critical_projects.length > 0 || pulse.urgent_decisions.length > 0) && (
            <div className="mt-3 space-y-1">
              {pulse.critical_projects.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-slate-400 truncate">{p.name}</span>
                  <span className="text-red-400 font-medium ml-auto">{p.score}/100</span>
                </div>
              ))}
              {pulse.urgent_decisions.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="text-slate-400 truncate">{d.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
