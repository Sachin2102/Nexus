'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Cpu, Sparkles, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "What are the biggest risks this week?",
  "Summarise the project portfolio",
  "Which decisions need my attention?",
  "What emails still need review?",
]

export default function AskNexus() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
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

    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setStreamBuffer(full)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreamBuffer('')
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I couldn't connect to the backend. Make sure the server is running.",
      }])
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center',
          'shadow-xl shadow-indigo-500/30 transition-all duration-200',
          open
            ? 'bg-[#1a1a30] border border-indigo-500/40 text-slate-400 hover:text-slate-200'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white',
        )}
        title="Ask NEXUS"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[400px] h-[540px] flex flex-col
                        bg-[#0d0d1f] border border-[#252542] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden
                        animate-slide-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#252542] bg-[#0f0f20]">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ask NEXUS</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live org context loaded
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="bg-[#16162a] rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-slate-300 leading-relaxed">
                    I have a live view of your entire organisation — emails, projects, meetings, and decisions.
                    What would you like to know?
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-4 mb-2">Try asking</p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs text-slate-400 hover:text-slate-200 px-3 py-2
                                 bg-[#16162a] hover:bg-[#1e1e38] border border-[#252542] rounded-lg
                                 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                )}
                <div className={clsx(
                  'max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-[#16162a] text-slate-300 rounded-tl-sm border border-[#252542]',
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {streaming && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="max-w-[85%] bg-[#16162a] border border-[#252542] rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {streamBuffer || <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#252542]">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#16162a] border border-[#252542]
                            rounded-xl focus-within:border-indigo-500/50 transition-colors">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
                placeholder="Ask anything about your org..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                disabled={streaming}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || streaming}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                           disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
