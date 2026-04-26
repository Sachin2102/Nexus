'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'

const titles: Record<string, { title: string; subtitle: string }> = {
  '/':           { title: 'Command Center',  subtitle: 'Autonomous organizational intelligence overview' },
  '/inbox':      { title: 'Smart Inbox',     subtitle: 'AI-classified and handled emails' },
  '/meetings':   { title: 'Meetings',        subtitle: 'AI-prepared briefings and action items' },
  '/projects':   { title: 'Project Sentinel', subtitle: 'Real-time project health monitoring' },
  '/decisions':  { title: 'Decision Engine',   subtitle: 'Autonomous routing and resolution' },
  '/analytics':  { title: 'Analytics',         subtitle: 'Performance metrics and AI insights' },
  '/digest':     { title: 'Weekly Digest',      subtitle: 'AI-generated executive briefing' },
}

export default function TopBar() {
  const path = usePathname()
  const meta = titles[path] ?? { title: 'NEXUS', subtitle: '' }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#252542] bg-[#0d0d1f]/60 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-semibold text-white">{meta.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search hint */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1a1a30] border border-[#252542] rounded-lg text-xs text-slate-500">
          <Search className="w-3 h-3" />
          <span>Quick search</span>
          <kbd className="px-1 py-0.5 bg-[#252542] rounded text-[10px]">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
          CE
        </div>
      </div>
    </header>
  )
}
