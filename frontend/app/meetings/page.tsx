'use client'

import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import type { Meeting } from '@/lib/types'
import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Clock, Users, Cpu, CheckCircle2, ChevronRight, Sparkles, BookOpen } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLOR: Record<string, string> = {
  scheduled:      'bg-slate-500/15 text-slate-400',
  briefing_ready: 'bg-indigo-500/15 text-indigo-400',
  in_progress:    'bg-amber-500/15 text-amber-400',
  completed:      'bg-emerald-500/15 text-emerald-400',
  cancelled:      'bg-red-500/15 text-red-400',
}

export default function MeetingsPage() {
  const { data: meetings, mutate } = useSWR<Meeting[]>('/api/meetings/', fetcher, { refreshInterval: 8000 })
  const [selected, setSelected] = useState<Meeting | null>(null)
  const [tab, setTab] = useState<'brief' | 'actions'>('brief')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

  const handleGenerateBrief = async (id: string) => {
    await api.meetings.generateBrief(id)
    toast('AI is generating your briefing...')
    setTimeout(() => mutate(), 4000)
  }

  const upcoming = (meetings ?? []).filter(m => ['scheduled','briefing_ready','in_progress'].includes(m.status))
  const past     = (meetings ?? []).filter(m => m.status === 'completed')

  return (
    <div className="flex gap-5 h-full animate-fade-in">
      {/* Left: Meeting list */}
      <div className="w-80 flex-shrink-0 flex flex-col card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#252542]">
          <p className="text-sm font-semibold text-white">Meetings</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {upcoming.length > 0 && (
            <div>
              <p className="section-title px-4 pt-3 pb-1">Upcoming</p>
              {upcoming.map(m => (
                <MeetingRow key={m.id} meeting={m} selected={selected?.id === m.id} onClick={() => { setSelected(m); setTab('brief') }} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="section-title px-4 pt-4 pb-1">Past</p>
              {past.map(m => (
                <MeetingRow key={m.id} meeting={m} selected={selected?.id === m.id} onClick={() => { setSelected(m); setTab('actions') }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#252542]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white mb-2">{selected.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(selected.scheduled_at), 'EEE MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(selected.scheduled_at), 'h:mm a')} · {selected.duration_minutes}min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {selected.attendees.length} attendees
                    </span>
                  </div>
                </div>
                <span className={clsx('badge', STATUS_COLOR[selected.status])}>{selected.status.replace('_',' ')}</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {[['brief', 'Pre-Brief', BookOpen], ['actions', 'Action Items', CheckCircle2]].map(([key, label, Icon]: any) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      tab === key ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    )}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === 'brief' && (
                <>
                  {selected.pre_brief ? (
                    <div className="space-y-4">
                      {selected.pre_brief.split('\n\n').map((section, i) => {
                        const [heading, ...lines] = section.split('\n')
                        return (
                          <div key={i}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">{heading}</p>
                            {lines.map((line, j) => (
                              <p key={j} className="text-xs text-slate-300 leading-relaxed">{line}</p>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <Cpu className="w-8 h-8 text-slate-700 mb-3" />
                      <p className="text-sm text-slate-500 mb-3">No briefing generated yet</p>
                      <button onClick={() => handleGenerateBrief(selected.id)} className="btn-primary text-xs">
                        <Sparkles className="w-3.5 h-3.5" /> Generate AI Brief
                      </button>
                    </div>
                  )}
                </>
              )}

              {tab === 'actions' && (
                <>
                  {selected.action_items.length > 0 ? (
                    <div className="space-y-2">
                      {selected.action_items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1a30] rounded-lg border border-[#252542]">
                          <CheckCircle2 className={clsx('w-4 h-4 mt-0.5 flex-shrink-0',
                            item.priority === 'high' ? 'text-orange-400' :
                            item.priority === 'medium' ? 'text-amber-400' : 'text-slate-500'
                          )} />
                          <div>
                            <p className="text-xs font-medium text-slate-200">{item.task}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Owner: <span className="text-slate-400">{item.owner}</span>
                              {' · '}Deadline: <span className="text-slate-400">{item.deadline}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      {selected.summary && (
                        <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Meeting Summary</p>
                          <p className="text-xs text-slate-300">{selected.summary}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-12">No action items yet</p>
                  )}
                </>
              )}
            </div>

            {/* Toast */}
            {toastMsg && (
              <div className="px-5 py-3 border-t border-[#252542] bg-indigo-500/10">
                <p className="text-xs text-indigo-400 flex items-center gap-2">
                  <Cpu className="w-3 h-3 animate-spin" /> {toastMsg}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select a meeting</p>
              <p className="text-xs text-slate-600 mt-1">AI-prepared briefings ready for upcoming sessions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MeetingRow({ meeting, selected, onClick }: { meeting: Meeting; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={clsx(
      'w-full text-left px-4 py-3 border-b border-[#252542]/40 transition-colors hover:bg-white/5',
      selected && 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-200 truncate">{meeting.title}</p>
        {meeting.status === 'briefing_ready' && (
          <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" title="Brief ready" />
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        {format(new Date(meeting.scheduled_at), 'MMM d · h:mm a')} · {meeting.duration_minutes}min
      </p>
    </button>
  )
}
