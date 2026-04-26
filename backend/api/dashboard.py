"""
NEXUS — Dashboard API
Returns aggregate metrics and recent agent activity for the main dashboard.
"""

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from core.database import get_session
from core.models import (
    Email, EmailStatus, EmailPriority,
    Meeting, MeetingStatus,
    Project, ProjectHealth,
    Decision, DecisionStatus,
    AgentEvent,
)

router = APIRouter()


@router.get("/metrics")
def get_dashboard_metrics(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Aggregate KPIs for the dashboard overview cards."""

    # ── Email metrics ──────────────────────────────────────────────────────
    total_emails   = session.exec(select(func.count(Email.id))).one()
    auto_handled   = session.exec(select(func.count(Email.id)).where(
        Email.status.in_([EmailStatus.SENT, EmailStatus.ARCHIVED])
    )).one()
    flagged_emails = session.exec(select(func.count(Email.id)).where(
        Email.status == EmailStatus.FLAGGED
    )).one()
    unread_emails  = session.exec(select(func.count(Email.id)).where(
        Email.status == EmailStatus.UNREAD
    )).one()

    # ── Meeting metrics ────────────────────────────────────────────────────
    total_meetings    = session.exec(select(func.count(Meeting.id))).one()
    briefings_ready   = session.exec(select(func.count(Meeting.id)).where(
        Meeting.status == MeetingStatus.BRIEFING_READY
    )).one()
    upcoming_meetings = session.exec(select(func.count(Meeting.id)).where(
        Meeting.scheduled_at >= datetime.utcnow()
    )).one()

    # ── Project metrics ────────────────────────────────────────────────────
    total_projects   = session.exec(select(func.count(Project.id))).one()
    healthy_projects = session.exec(select(func.count(Project.id)).where(
        Project.health == ProjectHealth.HEALTHY
    )).one()
    at_risk_projects = session.exec(select(func.count(Project.id)).where(
        Project.health == ProjectHealth.AT_RISK
    )).one()
    critical_projects = session.exec(select(func.count(Project.id)).where(
        Project.health == ProjectHealth.CRITICAL
    )).one()

    # Average health score
    avg_health = session.exec(select(func.avg(Project.health_score))).one() or 0

    # ── Decision metrics ───────────────────────────────────────────────────
    total_decisions  = session.exec(select(func.count(Decision.id))).one()
    ai_resolved      = session.exec(select(func.count(Decision.id)).where(
        Decision.status == DecisionStatus.AI_RESOLVED
    )).one()
    pending_decisions = session.exec(select(func.count(Decision.id)).where(
        Decision.status == DecisionStatus.PENDING
    )).one()

    # ── Automation rate ────────────────────────────────────────────────────
    total_processed = auto_handled + flagged_emails + ai_resolved
    automation_rate = round((auto_handled + ai_resolved) / max(total_processed, 1) * 100)

    return {
        "automation_rate": automation_rate,
        "emails": {
            "total": total_emails,
            "auto_handled": auto_handled,
            "flagged": flagged_emails,
            "unread": unread_emails,
        },
        "meetings": {
            "total": total_meetings,
            "upcoming": upcoming_meetings,
            "briefings_ready": briefings_ready,
        },
        "projects": {
            "total": total_projects,
            "healthy": healthy_projects,
            "at_risk": at_risk_projects,
            "critical": critical_projects,
            "avg_health_score": round(avg_health),
        },
        "decisions": {
            "total": total_decisions,
            "ai_resolved": ai_resolved,
            "pending": pending_decisions,
            "resolution_rate": round(ai_resolved / max(total_decisions, 1) * 100),
        },
    }


@router.get("/activity")
def get_agent_activity(
    limit: int = 20,
    session: Session = Depends(get_session),
) -> list[dict]:
    """Recent agent activity events for the live feed."""
    events = session.exec(
        select(AgentEvent)
        .order_by(AgentEvent.created_at.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": e.id,
            "event_type": e.event_type.value,
            "agent_name": e.agent_name,
            "title": e.title,
            "detail": e.detail,
            "entity_id": e.entity_id,
            "entity_type": e.entity_type,
            "confidence": e.confidence,
            "duration_ms": e.duration_ms,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.get("/org-pulse")
def get_org_pulse(session: Session = Depends(get_session)) -> dict:
    """
    High-level organisational health pulse —
    a single AI-synthesised status read across all domains.
    """
    projects = session.exec(select(Project)).all()
    critical = [p for p in projects if p.health == ProjectHealth.CRITICAL]
    at_risk  = [p for p in projects if p.health == ProjectHealth.AT_RISK]

    pending_dec = session.exec(
        select(Decision).where(Decision.status == DecisionStatus.PENDING)
    ).all()

    urgent_dec = [d for d in pending_dec if d.urgency.value == "immediate"]

    flagged_email_count = session.exec(
        select(func.count(Email.id)).where(Email.status == EmailStatus.FLAGGED)
    ).one()

    # Overall pulse: green / amber / red
    if critical or urgent_dec:
        pulse = "red"
        pulse_message = (
            f"{len(critical)} critical project(s) require immediate attention"
            + (f" | {len(urgent_dec)} urgent decision(s) pending" if urgent_dec else "")
        )
    elif at_risk or flagged_email_count > 2:
        pulse = "amber"
        pulse_message = (
            f"{len(at_risk)} project(s) at risk"
            + (f" | {flagged_email_count} emails need your review" if flagged_email_count else "")
        )
    else:
        pulse = "green"
        pulse_message = "All systems nominal — NEXUS has everything under control"

    return {
        "pulse": pulse,
        "pulse_message": pulse_message,
        "critical_projects": [{"id": p.id, "name": p.name, "score": p.health_score} for p in critical],
        "urgent_decisions": [{"id": d.id, "title": d.title} for d in urgent_dec],
        "flagged_emails": flagged_email_count,
    }
