'use client'

import { useState } from 'react'
import {
  FileText, Loader2, Sparkles, Copy, CheckCircle2,
  Mail, CalendarDays, FolderKanban, GitBranch, Zap,
} from 'lucide-react'

interface DigestStats {
  emails_handled: number
  meetings_completed: number
  action_items_extracted: number
  decisions_resolved: number
  projects_monitored: number
  avg_project_health: number
  automation_rate: number
  nexus_actions: number
}

interface DigestData {
  digest: string
  generated_at: string
  stats: DigestStats
}

export default function DigestPage() {
  const [data, setData]       = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res  = await fetch(`${BACKEND}/api/digest/generate`, { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        setError(`Backend error ${res.status}: ${text}`)
        return
      }
      const json = await res.json()
      if (!json.stats) {
        setError('Unexpected response from backend. Check the backend terminal for errors.')
        return
      }
      setData(json)
    } catch (e: any) {
      setError('Could not reach backend. Make sure it is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (!data) return
    navigator.clipboard.writeText(data.digest)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Render markdown-like digest (simple conversion)
  const renderDigest = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-sm font-bold text-white mt-6 mb-2 pb-1.5 border-b border-[#252542] first:mt-0">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xs font-semibold text-indigo-400 mt-3 mb-1">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
            <p className="text-xs text-slate-300 leading-relaxed">{line.replace(/^[-•]\s/, '')}</p>
          </div>
        )
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-xs font-semibold text-slate-200 mt-2">{line.replace(/\*\*/g, '')}</p>
      }
      if (line === '') return <div key={i} className="h-1" />
      return <p key={i} className="text-xs text-slate-400 leading-relaxed">{line}</p>
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Weekly Executive Digest</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-generated summary of your organisation's performance, risks, and priorities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button onClick={copy} className="btn-ghost text-xs">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              : <><Sparkles className="w-3.5 h-3.5" /> Generate Digest</>
            }
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="card border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-3">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-400 mb-1">Failed to generate digest</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-white mb-2">No digest generated yet</h2>
          <p className="text-xs text-slate-500 max-w-xs mb-5">
            NEXUS will analyse all emails, projects, meetings, and decisions to write
            your weekly executive briefing.
          </p>
          <button onClick={generate} className="btn-primary">
            <Sparkles className="w-3.5 h-3.5" /> Generate Now
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm font-medium text-white mb-1">Analysing your organisation...</p>
          <p className="text-xs text-slate-500">NEXUS is reading emails, projects, decisions, and meetings</p>
        </div>
      )}

      {/* Stats strip */}
      {data && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Mail,         label: 'Emails handled',     value: data.stats.emails_handled },
              { icon: CalendarDays, label: 'Meetings processed', value: data.stats.meetings_completed },
              { icon: GitBranch,    label: 'Decisions resolved', value: data.stats.decisions_resolved },
              { icon: Zap,          label: 'Automation rate',    value: `${data.stats.automation_rate}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="card p