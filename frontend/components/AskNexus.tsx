'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2, Bot, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "Which projects are at risk?",
  "Which decisions need my attention?",
  "Summarise the project portfolio",
]

export default function AskNexus() {
  const [open, setOpen]               = useState(false)
  const [input, setInput]             = useState('')
  const [messages, setMessages]       = useState<Message[]>([])
  const [streaming, setStreaming]     = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuffer])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return

    const userMsg: Message = { role: 'user', content: msg }
    const history = messages.slice(-10)
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamBuffer('')

    const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    try {
      const res = await fetch(`${BACKEND}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })

      if (!res.body) throw new Error('No response')
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setStreamBuffer(full)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreamBuffer('')
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Couldn't reach the backend. Make sure the server is running on port 8000.",
      }])
    } finally {
      setStreaming(false)
    }
  }

  const unread = messages.filter(m => m.role === 'assistant').length

  return (
    <>
      {/* ── Floating button ─────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Collapsed pill label (shown when closed & has messages) */}
        {!open && messages.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-[#16162a] border border-indigo-500/30 shadow-lg
                       text-xs text-indigo-300 hover:text-white transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {unread} response{unread !== 1 ? 's' : ''}
          </button>
        )}

        {/* Main button */}
        <button
          onClick={() => setOpen(o => !o)}
          className={clsx(
            'relative w-14 h-14 rounded-full flex items-center justify-center',
            'transition-all duration-300 shadow-2xl',
            open
              ? 'bg-[#16162a] border border-[#252542] text-slate-400 hover:text-white rotate-0'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/40',
          )}
          title="Ask NEXUS"
        >
          {/* Pulse ring (only when closed) */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
          )}
          {open
            ? <X className="w-5 h-5" />
            : <Bot className="w-6 h-6" />
          }
        </button>
      </div>

      {/* ── Chat panel ──────────────────────────────── */}
      {open && (
        <div
          className={clsx(
            'fixed bottom-24 right-6 z-50',
            'w-[380px] h-[520px] flex flex-col',
            'bg-[#0c0c1e]/95 backdrop-blur-xl',
            'border border-indigo-500/20',
            'rounded-2xl overflow-hidden',
            'shadow-2xl shadow-indigo-900/40',
            'animate-slide-up',
          )}
          style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 25px 50px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.08)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-gradient-to-r from-indigo-600/20 to-violet-600/10
                          border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-500/40
                              flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white tracking-tight">Ask NEXUS</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-emerald-400">Live org context loaded</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">

            {/* Welcome + suggestions */}
            {messages.length === 0 && !streaming && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30
                                  flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 bg-[#16162a] border border-[#252542] rounded-2xl rounded-tl-sm
                                  px-3.5 py-2.5 text-xs text-slate-300 leading-relaxed">
                    I have a live view of your entire organisation — emails, projects, meetings, and decisions.
                    What would you like to know?
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 pt-1">
                  Quick questions
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-[11px] text-slate-400 hover:text-slate-100
                                 px-2.5 py-2 bg-[#16162a] hover:bg-[#1e1e38]
                                 border border-[#252542] hover:border-indigo-500/30
                                 rounded-xl transition-all leading-snug"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message history */}
            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30
                                  flex items-center justify-center