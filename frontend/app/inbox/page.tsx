'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import type { Email } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Send, Archive, CheckCircle2, AlertCircle, Cpu, ChevronRight, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const STATUS_TABS = [
  { key: '',         label: 'All' },
  { key: 'flagged',  label: 'Flagged' },
  { key: 'drafted',  label: 'Drafts' },
  { key: 'sent',     label: 'Sent' },
  { key: 'unread',   label: 'Unread' },
]

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Email | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const { data: emails, mutate } = useSWR<Email[]>(
    `/api/emails/${statusFilter ? `?status=${statusFilter}` : ''}`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const handleApprove = async (id: string) => {
    await api.emails.approveDraft(id)
    setActionMsg('Draft approved and sent!')
    mutate()
    setTimeout(() => setActionMsg(null), 3000)
  }

  const handleArchive = async (id: string) => {
    await api.emails.archive(id)
    setActionMsg('Email archived.')
    setSelected(null)
    mutate()
    setTimeout(() => setActionMsg(null), 3000)
  }

  const handleProcess = async (id: string) => {
    await api.emails.process(id)
    setActionMsg('Processing started — AI is working...')
    setTimeout(() => mutate(), 3000)
    setTimeout(() => setActionMsg(null), 4000)
  }

  return (
    <div className="flex gap-5 h-full animate-fade-in">
      {/* Left: Email list */}
      <div className="w-96 flex-shrink-0 flex flex-col card overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-[#252542] overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === tab.key
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#252542]/60">
          {(emails ?? []).map(email => (
            <button
              key={email.id}
              onClick={() => setSelected(email)}
              className={clsx(
                'w-full text-left px-4 py-3 transition-colors hover:bg-white/5',
                selected?.id === email.id && 'bg-indigo-500/10 border-l-2 border-l-indigo-500',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={clsx('text-xs font-semibold truncate', email.status === 'unread' ? 'text-white' : 'text-slate-300')}>
                  {email.sender_name}
                </p>
                <span className={clsx('badge flex-shrink-0 text-[10px]', `priority-${email.priority}`)}>
                  {email.priority}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mb-1">{email.subject}</p>
              {email.summary && (
                <p className="text-[11px] text-slate-600 truncate">{email.summary}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={clsx('badge text-[10px]', `status-${email.status}`)}>{email.status}</span>
                <span className="text-[10px] text-slate-600 ml-auto">
                  {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))}
          {(!emails || emails.length === 0) && (
            <p className="p-8 text-center text-xs text-slate-500">No emails</p>
          )}
        </div>
      </div>

      {/* Right: Email detail */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#252542]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-white mb-1">{selected.subject}</h2>
                  <p className="text-xs text-slate-400">
                    From: <span className="text-slate-300">{selected.sender_name}</span>
                    <span className="text-slate-600"> &lt;{selected.sender_email}&gt;</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={clsx('badge', `priority-${selected.priority}`)}>{selected.priority}</span>
                  <span className={clsx('badge', `status-${selected.status}`)}>{selected.status}</span>
                </div>
              </div>

              {/* AI Classification */}
              {selected.summary && (
                <div className="mt-3 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3 h-3 text-indigo-400" />
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">AI Summary</span>
                    {selected.confidence_score && (
                      <span className={clsx('ml-auto text-[10px] font-medium',
                        selected.confidence_score >= 0.9 ? 'text-emerald-400' :
                        selected.confidence_score >= 0.75 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {Math.round(selected.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{selected.summary}</p>
                  {selected.routing_reason && (
                    <p className="text-xs text-amber-400 mt-1">
                      <AlertCircle className="inline w-3 h-3 mr-1" />
                      {selected.routing_reason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.body}</p>

              {/* AI Draft Reply */}
              {selected.ai_draft_reply && (
                <div className="mt-5 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">AI Draft Reply</span>
                    {selected.status === 'sent' && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" /> Auto-sent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.ai_draft_reply}</p>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="px-5 py-3 border-t border-[#252542] flex items-center gap-2">
              {actionMsg && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {actionMsg}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {selected.status === 'unread' && (
                  <button onClick={() => handleProcess(selected.id)} className="btn-ghost text-xs">
                    <Cpu className="w-3.5 h-3.5" /> Process with AI
                  </button>
                )}
                {selected.status === 'drafted' && (
                  <button onClick={() => handleApprove(selected.id)} className="btn-primary text-xs">
                    <Send className="w-3.5 h-3.5" /> Approve & Send
                  </button>
                )}
                <button onClick={() => handleArchive(selected.id)} className="btn-ghost text-xs">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Mail className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select an email to view</p>
              <p className="text-xs text-slate-600 mt-1">NEXUS has processed and classified your inbox</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
