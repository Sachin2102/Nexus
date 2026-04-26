"""
NEXUS — Ask NEXUS Chat API
─────────────────────────────────────────────────────────────────────────────
Conversational AI that knows your entire organisation.

Automatically pulls live context from the database:
  - Recent flagged/unread emails
  - All project health statuses
  - Pending/escalated decisions
  - Upcoming meetings + briefings

Then answers any question with full organisational awareness.
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select, func

from core.database import get_session
from core.models import (
    Email, EmailStatus, EmailPriority,
    Meeting, MeetingStatus,
    Project, ProjectHealth,
    Decision, DecisionStatus,
    AgentEvent,
)
from agents.base import call_llm
from core.config import settings

router = APIRouter()


CHAT_SYSTEM = """
You are NEXUS, an autonomous AI Chief of Staff with full visibility into the organisation.
You have access to real-time data on emails, meetings, projects, and decisions.

Your personality:
- Direct and concise — executives don't have time for fluff
- Proactively surface risks and opportunities the user might have missed
- Give specific, actionable answers with references to actual data
- Use bullet points for lists, prose for analysis
- When you don't know something, say so honestly

You have been given a live snapshot of the organisation's current state as context.
Use it to answer questions accurately. If asked for your opinion, give it — you're
not just a retrieval system, you're an intelligent advisor.
"""


def _build_org_context(session: Session) -> str:
    """Pull a rich live snapshot of the org from the database."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Emails
    flagged   = session.exec(select(Email).where(Email.status == EmailStatus.FLAGGED).limit(5)).all()
    unread    = session.exec(select(Email).where(Email.status == EmailStatus.UNREAD).limit(5)).all()
    recent_sent = session.exec(
        select(Email).where(Email.status == EmailStatus.SENT)
        .order_by(Email.processed_at.desc()).limit(3)
    ).all()
    total_emails    = session.exec(select(func.count(Email.id))).one()
    auto_handled    = session.exec(select(func.count(Email.id)).where(
        Email.status.in_([EmailStatus.SENT, EmailStatus.ARCHIVED])
    )).one()

    # Meetings
    upcoming = session.exec(
        select(Meeting).where(Meeting.scheduled_at >= now)
        .order_by(Meeting.scheduled_at.asc()).limit(5)
    ).all()
    recent_completed = session.exec(
        select(Meeting).where(Meeting.status == MeetingStatus.COMPLETED)
        .order_by(Meeting.scheduled_at.desc()).limit(3)
    ).all()

    # Projects
    projects = session.exec(select(Project).order_by(Project.health_score.asc())).all()
    critical = [p for p in projects if p.health == ProjectHealth.CRITICAL]
    at_risk  = [p for p in projects if p.health == ProjectHealth.AT_RISK]

    # Decisions
    pending   = session.exec(select(Decision).where(
        Decision.status.in_([DecisionStatus.PENDING, DecisionStatus.ESCALATED])
    ).order_by(Decision.submitted_at.desc())).all()
    resolved  = session.exec(select(Decision).where(
        Decision.status == DecisionStatus.AI_RESOLVED
    ).order_by(Decision.resolved_at.desc()).limit(5)).all()

    # Recent agent activity
    activity = session.exec(
        select(AgentEvent).order_by(AgentEvent.created_at.desc()).limit(10)
    ).all()

    # Build context string
    ctx_parts = [f"=== NEXUS LIVE ORG SNAPSHOT — {now.strftime('%A %B %d %Y, %H:%M UTC')} ===\n"]

    # Email summary
    ctx_parts.append(f"EMAIL INTELLIGENCE")
    ctx_parts.append(f"Total: {total_emails} | Auto-handled: {auto_handled} | Automation rate: {round(auto_handled/max(total_emails,1)*100)}%")
    if flagged:
        ctx_parts.append("Flagged (needs human review):")
        for e in flagged:
            ctx_parts.append(f"  - [{e.priority.value.upper()}] {e.subject} | From: {e.sender_name} | Reason: {e.routing_reason or 'Flagged'}")
    if unread:
        ctx_parts.append("Unread:")
        for e in unread:
            ctx_parts.append(f"  - {e.subject} | From: {e.sender_name}")

    # Meetings
    ctx_parts.append("\nMEETINGS")
    if upcoming:
        ctx_parts.append("Upcoming:")
        for m in upcoming:
            brief_status = "Brief ready" if m.pre_brief else "No brief yet"
            ctx_parts.append(f"  - {m.title} | {m.scheduled_at.strftime('%b %d %H:%M')} | {m.duration_minutes}min | {brief_status}")
    if recent_completed:
        ctx_parts.append("Recently completed:")
        for m in recent_completed:
            items = json.loads(m.action_items) if m.action_items else []
            ctx_parts.append(f"  - {m.title} | {len(items)} action items | Follow-up {'sent' if m.follow_up_sent else 'pending'}")

    # Projects
    ctx_parts.append("\nPROJECT HEALTH")
    for p in projects:
        risks = json.loads(p.risk_flags) if p.risk_flags else []
        high_risks = [r for r in risks if r.get('severity') == 'high']
        completion = round(p.tasks_done / p.tasks_total * 100) if p.tasks_total > 0 else 0
        ctx_parts.append(
            f"  [{p.health_score}/100 {p.health.value.upper()}] {p.name} | "
            f"{completion}% complete | Trend: {p.velocity_trend} | "
            f"{len(high_risks)} high risks"
            + (f" | Rec: {p.ai_recommendation[:80]}" if p.ai_recommendation else "")
        )

    # Decisions
    ctx_parts.append("\nDECISIONS")
    if pending:
        ctx_parts.append("Pending/Escalated:")
        for d in pending:
            ctx_parts.append(
                f"  - [{d.urgency.value.upper()}] {d.title} | "
                f"Escalated to: {d.escalated_to or 'unassigned'} | "
                f"Submitted by: {d.submitted_by}"
            )
    if resolved:
        ctx_parts.append("Recently auto-resolved:")
        for d in resolved:
            ctx_parts.append(f"  - {d.title} → {d.resolution} ({round((d.confidence_score or 0)*100)}% confidence)")

    # Recent agent activity
    ctx_parts.append("\nRECENT AGENT ACTIVITY (last 10 events)")
    for e in activity:
        ctx_parts.append(f"  [{e.agent_name}] {e.title}")

    return "\n".join(ctx_parts)


@router.post("/")
def chat(payload: dict, session: Session = Depends(get_session)):
    """
    Conversational endpoint for Ask NEXUS.
    payload: { "message": str, "history": [{"role": "user"|"assistant", "content": str}] }
    Returns a plain text response.
    """
    user_message = payload.get("message", "").strip()

    if not user_message:
        return PlainTextResponse("Message is required", status_code=400)

    if not settings.NVIDIA_API_KEY:
        return PlainTextResponse("⚠️ NVIDIA_API_KEY is not set in your .env file.")

    try:
        org_context = _build_org_context(session)
    except Exception as e:
        return PlainTextResponse(f"⚠️ Could not load org context: {str(e)}")

    try:
        answer = call_llm(
            system=CHAT_SYSTEM,
            user=f"[Live org snapshot]\n{org_context}\n\n---\n\n{user_message}",
            max_tokens=1024,
            model="meta/llama-3.1-8b-instruct",
        )
        return PlainTextResponse(answer)
    except Exception as e:
        return PlainTextResponse(f"⚠️ AI error: {str(e)}")


@router.post("/quick")
def quick_answer(payload: dict, session: Session = Depends(get_session)):
    """
    Non-streaming quick answer for simple queries.
    Used by the command bar for instant responses.
    """
    question = payload.get("question", "").strip()
    if not question:
        return {"answer": "No question provided"}

    org_context = _build_org_context(session)

    from agents.base import call_llm
    answer = call_llm(
        system=CHAT_SYSTEM,
        user=f"Org context:\n{org_context}\n\nQuestion: {question}\n\nGive a concise answer in 1-3 sentences.",
        max_tokens=256,
        model="meta/llama-3.1-8b-instruct",
    )
    return {"answer": answer}
