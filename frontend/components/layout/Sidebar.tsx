'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Inbox, CalendarDays,
  FolderKanban, GitBranch, Cpu, BarChart2, FileText,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/inbox',      label: 'Inbox',      icon: Inbox },
  { href: '/meetings',   label: 'Meetings',   icon: CalendarDays },
  { href: '/projects',   label: 'Projects',   icon: FolderKanban },
  { href: '/decisions',  label: 'Decisions',  icon: GitBranch },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart2 },
  { href: '/digest',     label: 'Digest',     icon: FileText },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0d0d1f] border-r border-[#252542]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#252542]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-wide">NEXUS</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">AI Chief of Staff</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="section-title px-2 mb-3">Workspace</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* AI Status */}
      <div className="px-4 py-4 border-t border-[#252542]">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
          <div>
            <p className="text-xs font-semibold text-emerald-400">NEXUS Active</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">4 agents running</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
