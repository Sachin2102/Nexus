'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, FunnelChart, Funnel,
  LabelList, AreaChart, Area,
} from 'recharts'
import { Loader2, BarChart2, Zap, Mail, FolderKanban, GitBranch } from 'lucide-react'
import clsx from 'clsx'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const tooltipStyle = {
  contentStyle: { background: '#16162a', border: '1px solid #252542', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#94a3b8' },
  itemStyle:    { color: '#e2e8f0' },
}

export default function AnalyticsPage() {
  const { data, isLoading } = useSWR('/api/analytics/overview', fetcher, { refreshInterval: 30000 })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap,          label: 'Automation Rate',      value: `${data.summary.automation_rate}%`,    sub: `${data.summary.auto_handled} auto-handled` },
          { icon: Mail,         label: 'Total Emails',         value: data.summary.total_emails,              sub: `${data.summary.auto_handled} autonomous` },
          { icon: FolderKanban, label: 'Avg Project Health',   value: `${data.summary.avg_health}/100`,       sub: `${data.summary.total_projects} projects` },
          { icon: GitBranch,    label: 'AI Decision Rate',     value: `${Math.round(data.summary.ai_resolved / Math.max(data.summary.total_decisions, 1) * 100)}%`, sub: `${data.summary.ai_resolved} resolved` },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Weekly trend + Email categories */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Automation Trend (Last 7 Days)" subtitle="Emails auto-handled per day">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.weekly_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="autoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="automation" stroke="#6366f1" fill="url(#autoGrad)" strokeWidth={2} name="Automation %" dot={false} />
              <Area type="monotone" dataKey="emails" stroke="#06b6d4" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Emails" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Email Categories" subtitle="Distribution by classification">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.email_categories.slice(0, 7)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" name="Emails" radius={[3, 3, 0, 0]}>
                {data.email_categories.slice(0, 7).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Project health + Decision funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard title="Project Health" subtitle="Distribution by status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.health_distribution}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.health_distribution.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Decision Funnel" subtitle="AI resolution pipeline" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.decision_funnel} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" name="Decisions" radius={[0, 4, 4, 0]}>
                {data.decision_funnel.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Project completion + Agent stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Project Completion" subtitle="Tasks done vs total per project">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.project_completion} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, 'Completion']} />
              <Bar dataKey="completion" name="Completion %" radius={[3, 3, 0, 0]}>
                {data.project_completion.map((entry: any, i: number) => (
                  <Cell key={i} fill={
                    entry.health === 'critical' ? '#ef4444' :
                    entry.health === 'at_risk'  ? '#f59e0b' : '#10b981'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Agent Performance" subtitle="Actions taken and average confidence per agent">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.agent_stats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar yAxisId="left"  dataKey="actions"         name="Actions"     fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="avg_confidence"  name="Confidence%" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Email sentiment + Priority */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Email Sentiment" subtitle="Overall tone of incoming emails">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.email_sentiment} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={4}>
                {data.email_sentiment.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Email Priority Distribution" subtitle="How NEXUS classified incoming emails">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.email_priorities} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" name="Emails" radius={[3, 3, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#eab308" />
                <Cell fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children, className }: {
  title: string; subtitle: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={clsx('card p-4', className)}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
