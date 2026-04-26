'use client'

import { useEffect, useState } from 'react'
import { Mail, CalendarDays, FolderKanban, GitBranch, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { AgentEvent } from '@/lib/types'
import clsx from 'clsx'

interface Props { initialEvents: AgentEvent[] }

const eventConfig: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
  email_classified:  { icon: Mail,          color: 'text-sky-400',     bg: 'bg-sky-500/15' },
  draft_generated:   { icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-500/15' },
  email_sent:        { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  meeting_brief:     { icon: CalendarDays,  color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  action_item:       { icon: CheckCircle2,  color: 'text-indigo-400',  bg: 'bg-indigo-500/15' },
  project_risk:      { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  decision_routed:   { icon: GitBranch,     color: 'text-orange-400',  bg: 'bg-orange-500/15' },
  decision_resolved: { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  knowledge_indexed: { icon: Cpu,           color: 'text-slate-400',   bg: 'bg-slate-500/15' },
}

export default function AgentActivity({ initialEvents }: Props) {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents)

  // WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + '/ws/agents'
    let ws: WebSocket

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl)
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data)
          if (data.type === 'ping') return
          if (data.event_type) {
            setEvents(prev => [data as AgentEvent, ...prev].slice(0, 25))
          }
        }
        ws.onerror = () => ws.close()
        ws.onclose = () => setTimeout(connect, 3000)  // reconnect
      } catch { /* ignore connection errors in demo mode */ }
    }

    connect()
    return () => ws?.close()
  }, [])

  return (
    <div className="card flex flex-col" style={{ maxHeight: 420 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252542]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm font-semibold text-white">Live Agent Feed</p>
        </div>
        <span className="text-xs text-slate-500">{events.length} events</span>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-[#252542]/60">
        {events.map((evt, i) => {
          const cfg = eventConfig[evt.event_type] ?? eventConfig.knowledge_indexed
          const Icon = cfg.icon
          return (
            <div key={evt.id} className={clsx('flex gap-3 px-4 py-3 feed-item hover:bg-white/3 transition-colors', i === 0 && 'bg-indigo-500/5')}>
              <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                <Icon className={clsx('w-3.5 h-3.5', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{evt.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{evt.detail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-600">
                    {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                  </span>
                  {evt.confidence !== null && (
                    <span className={clsx('text-[10px] font-medium',
                      evt.confidence >= 0.9 ? 'text-emerald-500' :
                      evt.confidence >= 0.75 ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {Math.round(evt.confidence * 100)}% confidence
                    </span>
                  )}
                  {evt.duration_ms && (
                    <span className="text-[10px] text-slate-600">{evt.duration_ms}ms</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
