"""
NEXUS — Weekly Digest Generator
─────────────────────────────────────────────────────────────────────────────
Generates a comprehensive AI executive digest covering the past 7 days.
Sections: Overview, Email Intelligence, Project Status, Decisions, Meetings,
          Key Risks, Recommended Actions for next week.
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from core.database import get_session
from core.models import (
    Email, EmailStatus,
    Meeting, MeetingStatus,
    Project, ProjectHealth,
    Decision, DecisionStatus,
    AgentEvent,
)
from agents.base import call_llm
from core.config import settings

router = APIRouter()


DIGEST_SYSTEM = """
You are NEXUS, writing a weekly executive digest for the CEO/executive.

The digest should be:
- Professional and structured with clear section headers
- Data-driven — reference specific numbers and names
- Forward-looking — end with clear recommended priorities for next week
- Honest about risks — don't sugarcoat problems
- Written in second person ("Your team shipped...", "You have 3 decisions...")

Format using markdown with ## headers for each section.
Tone: confident, direct, like a trusted chief of staff briefing their executive.
"""


@router.post("/generate")
def generate_digest(session: Session = Depends(get_session)) -> dict:
    """Generate a comprehensive AI weekly digest."""
    now      = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # ── Gather all data ────────────────────────────────────────────────────

    # Emails
    all_emails     = session.exec(select(Email)).all()
    week_emails    = [e for e in all_emails if e.received_at >= week_ago]
    auto_sent      = [e for e in all_emails if e.status == EmailStatus.SENT]
    flagged        = [e for e in all_emails if e.status == EmailStatus.FLAGGED]
    email_auto_pct = round(len(auto_sent) / max(len(all_emails), 1) * 100)

    # Meetings
    all_meetings       = session.exec(select(Meeting)).all()
    completed_meetings = [m for m in all_meetings if m.status == MeetingStatus.COMPLETED]
    upcoming_meetings  = [m for m in all_meetings if m.scheduled_at >= now]
    total_action_items = 0
    for m in completed_meetings:
        try:
            items = json.loads(m.action_items) if m.action_items else []
            total_action_items += len(items)
        except Exception:
            pass

    # Projects
    projects         = session.exec(select(Project)).all()
    critical_projs   = [p for p in projects if p.health == ProjectHealth.CRITICAL]
    at_risk_projs    = [p for p in projects if p.health == ProjectHealth.AT_RISK]
    healthy_projs    = [p for p in projects if p.health == ProjectHealth.HEALTHY]
    avg_health       = round(sum(p.health_score for p in projects) / max(len(projects), 1))

    # Decisions
    all_decisions   = session.exec(select(Decision)).all()
    ai_resolved     = [d for d in all_decisions if d.status == DecisionStatus.AI_RESOLVED]
    escalated       = [d for d in all_decisions if d.status == DecisionStatus.ESCALATED]
    pending         = [d for d in all_decisions if d.status == DecisionStatus.PENDING]
    resolution_rate = round(len(ai_resolved) / max(len(all_decisions), 1) * 100)

    # Agent activity
    events = session.exec(
        select(AgentEvent).order_by(AgentEvent.created_at.desc()).limit(20)
    ).all()
    total_events = session.exec(select(func.count(AgentEvent.id))).one()

    # ── Build data summary for the LLM ────────────────────────────────────

    data_summary = f"""
PERIOD: {week_ago.strftime('%B %d')} – {now.strftime('%B %d, %Y')}

EMAIL STATS
- Total emails in inbox: {len(all_emails)}
- Emails this week: {len(week_emails)}
- Auto-handled (sent/archived): {len(auto_sent)} ({email_auto_pct}%)
- Flagged for human review: {len(flagged)}
- Flagged emails:
{chr(10).join(f'  • [{e.priority.value}] {e.subject} — {e.sender_name}' for e in flagged[:3])}

MEETINGS
- Total meetings: {len(all_meetings)}
- Completed: {len(completed_meetings)}
- Upcoming: {len(upcoming_meetings)}
- Total action items extracted: {total_action_items}
- Completed meeting summaries:
{chr(10).join(f'  • {m.title}: {(m.summary or "No summary")[:60]}' for m in completed_meetings[:3])}
- Next week's meetings:
{chr(10).join(f'  • {m.title} on {m.scheduled_at.strftime("%b %d")}' for m in upcoming_meetings[:3])}

PROJECT PORTFOLIO (avg health: {avg_health}/100)
- Healthy: {len(healthy_projs)} | At Risk: {len(at_risk_projs)} | Critical: {len(critical_projs)}

Critical projects:
{chr(10).join(f'  • {p.name} [{p.health_score}/100] — {(p.ai_recommendation or "")[:80]}' for p in critical_projs[:3])}

At-risk projects:
{chr(10).join(f'  • {p.name} [{p.health_score}/100] — {(p.ai_recommendation or "")[:80]}' for p in at_risk_projs[:3])}

Healthy projects:
{chr(10).join(f'  • {p.name} [{p.health_score}/100]' for p in healthy_projs[:3])}

DECISION ENGINE
- Total decisions: {len(all_decisions)}
- Auto-resolved by AI: {len(ai_resolved)} ({resolution_rate}%)
- Escalated (awaiting human): {len(escalated)}
- Pending: {len(pending)}

Decisions needing your attention:
{chr(10).join(f'  • [{d.urgency.value}] {d.title} → escalated to {d.escalated_to}' for d in escalated[:3])}

Recently auto-resolved:
{chr(10).join(f'  • {d.title} → {d.resolution}' for d in ai_resolved[:3])}

NEXUS ACTIVITY
- Total autonomous actions taken: {total_events}
- Recent actions: {chr(10).join(f'  • [{e.agent_name}] {e.title}' for e in events[:5])}
"""

    prompt = f"""Write a concise weekly executive digest. Be brief — 3-4 sentences per section max.

DATA:
{data_summary}

Sections (keep each short):
## Executive Summary
## Key Risks
## Recommended Priorities

Reference specific names and numbers from the data."""

    digest_text = call_llm(
        system=DIGEST_SYSTEM,
        user=prompt,
        max_tokens=1000,
        temperature=0.6,
        thinking=False,
        model="meta/llama-3.1-8b-instruct",
    )

    return {
        "digest": digest_text,
        "generated_at": now.isoformat(),
        "period_start": week_ago.isoformat(),
        "period_end": now.isoformat(),
        "stats": {
            "emails_handled": len(auto_sent),
            "meetings_completed": len(completed_meetings),
            "action_items_extracted": total_action_items,
            "decisions_resolved": len(ai_resolved),
            "projects_monitored": len(projects),
            "avg_project_health": avg_health,
            "automation_rate": email_auto_pct,
            "nexus_actions": total_events,
        }
    }
