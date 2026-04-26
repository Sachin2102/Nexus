'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Mail, CalendarDays, FolderKanban, GitBranch,
  BarChart2, FileText, Cpu, Zap, ArrowRight, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'

interface Command {
  id: string
  label: string
  description?: string
  icon: typeof Search
  action: () => void | Promise<void>
  category: string
  keywords: string[]
}

export default function CommandBar() {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)
  const [answer, setAnswer]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setAnswer(null)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const navigate = (path: string) => { router.push(path); setOpen(false) }

  const processEmails = async () => {
    setLoading('process-emails')
    try {
      const emails: any[] = await api.emails.list('unread') as any[]
      for (const e of emails.slice(0, 3)) await api.emails.process(e.id)
      setAnswer(`Processing ${Math.min(emails.length, 3)} unread emails with AI...`)
    } finally { setLoading(null) }
  }

  const askQuestion = async (q: string) => {
    setLoading('ai-answer')
    setAnswer(null)
    try {
      const res: any = await fetch(`${BASE}/api/chat/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      }).then(r => r.json())
      setAnswer(res.answer)
    } finally { setLoading(null) }
  }

  const COMMANDS: Command[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard',   icon: Zap,          action: () => navigate('/'),          category: 'Navigate', keywords: ['home', 'overview', 'dashboard'] },
    { id: 'nav-inbox',     label: 'Go to Inbox',        icon: Mail,         action: () => navigate('/inbox'),     category: 'Navigate', keywords: ['email', 'inbox', 'mail'] },
    { id: 'nav-meetings',  label: 'Go to Meetings',     icon: CalendarDays, action: () => navigate('/meetings'),  category: 'Navigate', keywords: ['calendar', 'meetings'] },
    { id: 'nav-projects',  label: 'Go to Projects',     icon: FolderKanban, action: () => navigate('/projects'),  category: 'Navigate', keywords: ['projects', 'health', 'status'] },
    { id: 'nav-decisions', label: 'Go to Decisions',    icon: GitBranch,    action: () => navigate('/decisions'), category: 'Navigate', keywords: ['decisions', 'resolve'] },
    { id: 'nav-analytics', label: 'Go to Analytics',    icon: BarChart2,    action: () => navigate('/analytics'), category: 'Navigate', keywords: ['analytics', 'charts', 'stats'] },
    { id: 'nav-digest',    label: 'Generate Digest',    icon: FileText,     action: () => navigate('/digest'),    category: 'Navigate', keywords: ['digest', 'weekly', 'report', 'summary'] },
    // Actions
    { id: 'act-process',   label: 'Process unread emails', description: 'Run AI on all unread emails', icon: Mail, action: processEmails, category: 'Actions', keywords: ['process', 'email', 'ai', 'classify'] },
    // AI Questions
    { id: 'ai-focus',      label: 'What should I focus on today?',      icon: Cpu, action: () => askQuestion('What should I focus on today?'),      category: 'Ask NEXUS', keywords: ['focus', 'today', 'priority'] },
    { id: 'ai-risks',      label: 'What are the biggest risks this week?', icon: Cpu, action: () => askQuestion('What are the biggest risks this week?'), category: 'Ask NEXUS', keywords: ['risk', 'week', 'danger'] },
    { id: 'ai-decisions',  label: 'Which decisions need my attention?',  icon: Cpu, action: () => askQuestion('Which decisions need my attention right now?'), category: 'Ask NEXUS', keywords: ['decisions', 'attention', 'urgent'] },
    { id: 'ai-projects',   label: 'Summarise the project portfolio',     icon: Cpu, action: () => askQuestion('Give me a brief summary of the project portfolio health.'), category: 'Ask NEXUS', keywords: ['projects', 'portfolio', 'summary'] },
  ]

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords.some(k => k.includes(query.toLowerCase()))
      )
    : COMMANDS

  // Group by category
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  const flatList = filtered
  const handleSelect = async (cmd: Command) => {
    setAnswer(null)
    await cmd.action()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flatList.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && flatList[active]) handleSelect(flatList[active])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-[580px] bg-[#0f0f1a] border border-[#252542] rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#252542]">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Search commands or ask NEXUS..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); setAnswer(null) }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="px-1.5 py-0.5 bg-[#252542] rounded text-[10px] text-slate-500">ESC</kbd>
        </div>

        {/* AI Answer */}
        {(loading === 'ai-answer' || answer) && (
          <div className="px-4 py-3 bg-indigo-500/5 border-b border-indigo-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">NEXUS Answer</span>
            </div>
            {loading === 'ai-answer'
              ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              : <p className="text-xs text-slate-300 leading-relaxed">{answer}</p>
            }
          </div>
        )}

        {/* Process email feedback */}
        {loading === 'process-emails' && (
          <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20">
            <p className="text-xs text-amber-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing emails with AI...
            </p>
          </div>
        )}

        {answer && loading === null && (
          <div className="px-4 py-2 border-b border-[#252542] bg-emerald-500/5">
            <p className="text-[10px] text-emerald-500">Done · Press ESC to close</p>
          </div>
        )}

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto py-2">
          {Object.entries(groups).map(([category, cmds]) => (
            <div key={category}>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{category}</p>
              {cmds.map(cmd => {
                const idx = flatList.indexOf(cmd)
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      idx === active ? 'bg-indigo-500/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    )}
                    onMouseEnter={() => setActive(idx)}
                  >
                    <Icon className={clsx('w-4 h-4 flex-shrink-0', cmd.category === 'Ask NEXUS' ? 'text-indigo-400' : 'text-slate-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cmd.label}</p>
                      {cmd.description && <p className="text-xs text-slate-600">{cmd.description}</p>}
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No commands match "{query}"</p>
              <button
                onClick={() => askQuestion(query)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Ask NEXUS: "{query}"
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#252542] flex items-center gap-4 text-[10px] text-slate-600">
          <span><kbd className="px-1 py-0.5 bg-[#252542] rounded mr-1">↑↓</kbd>Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-[#252542] rounded mr-1">↵</kbd>Select</span>
          <span><kbd className="px-1 py-0.5 bg-[#252542] rounded mr-1">Ctrl+K</kbd>Toggle</span>
        </div>
      </div>
    </div>
  )
}
