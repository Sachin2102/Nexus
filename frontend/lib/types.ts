// ─────────────────────────────────────────────────
// NEXUS — Shared TypeScript Types
// ─────────────────────────────────────────────────

export type EmailStatus    = 'unread' | 'processing' | 'drafted' | 'sent' | 'archived' | 'flagged'
export type EmailPriority  = 'critical' | 'high' | 'medium' | 'low'
export type EmailCategory  = 'action_required' | 'fyi' | 'decision' | 'vendor' | 'hr' | 'customer' | 'internal' | 'spam'

export interface Email {
  id: string
  subject: string
  sender_name: string
  sender_email: string
  body: string
  received_at: string
  status: EmailStatus
  priority: EmailPriority
  category: EmailCategory
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  ai_draft_reply: string | null
  confidence_score: number | null
  routing_reason: string | null
  requires_human: boolean
  processed_at: string | null
}

export type MeetingStatus = 'scheduled' | 'briefing_ready' | 'in_progress' | 'completed' | 'cancelled'

export interface AgendaItem { item: string; minutes: number }
export interface ActionItem { task: string; owner: string; deadline: string; priority: string }

export interface Meeting {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  attendees: string[]
  organizer: string
  status: MeetingStatus
  agenda: AgendaItem[]
  pre_brief: string | null
  action_items: ActionItem[]
  summary: string | null
  follow_up_sent: boolean
  created_at: string
}

export type ProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'on_hold'

export interface RiskFlag { flag: string; severity: 'high' | 'medium' | 'low'; action: string }

export interface Project {
  id: string
  name: string
  description: string
  owner: string
  team: string[]
  deadline: string | null
  budget_usd: number | null
  budget_spent_usd: number | null
  budget_pct: number | null
  health: ProjectHealth
  health_score: number
  risk_flags: RiskFlag[]
  blockers: string[]
  last_update: string | null
  ai_recommendation: string | null
  velocity_trend: 'up' | 'flat' | 'down' | null
  tasks_total: number
  tasks_done: number
  completion_pct: number
  milestones_hit: number
  milestones_total: number
  created_at: string
  updated_at: string
}

export type DecisionStatus  = 'pending' | 'ai_resolved' | 'escalated' | 'human_resolved'
export type DecisionUrgency = 'immediate' | 'this_week' | 'this_month'

export interface Decision {
  id: string
  title: string
  context: string
  options: string[]
  submitted_by: string
  submitted_at: string
  urgency: DecisionUrgency
  department: string | null
  status: DecisionStatus
  ai_recommendation: string | null
  ai_reasoning: string | null
  confidence_score: number | null
  escalated_to: string | null
  resolved_at: string | null
  resolution: string | null
}

export type AgentEventType =
  | 'email_classified' | 'draft_generated' | 'email_sent'
  | 'meeting_brief' | 'action_item'
  | 'project_risk'
  | 'decision_routed' | 'decision_resolved'
  | 'knowledge_indexed'

export interface AgentEvent {
  id: string
  event_type: AgentEventType
  agent_name: string
  title: string
  detail: string
  entity_id: string | null
  entity_type: string | null
  confidence: number | null
  duration_ms: number | null
  created_at: string
}

export interface DashboardMetrics {
  automation_rate: number
  emails: { total: number; auto_handled: number; flagged: number; unread: number }
  meetings: { total: number; upcoming: number; briefings_ready: number }
  projects: { total: number; healthy: number; at_risk: number; critical: number; avg_health_score: number }
  decisions: { total: number; ai_resolved: number; pending: number; resolution_rate: number }
}

export interface OrgPulse {
  pulse: 'green' | 'amber' | 'red'
  pulse_message: string
  critical_projects: { id: string; name: string; score: number }[]
  urgent_decisions: { id: string; title: string }[]
  flagged_emails: number
}
