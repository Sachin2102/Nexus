"""
NEXUS — Analytics API
Provides chart-ready data for the Analytics dashboard.
"""

import json
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from core.database import get_session
from core.models import (
    Email, EmailStatus, EmailPriority, EmailCategory,
    Meeting, MeetingStatus,
    Project, ProjectHealth,
    Decision, DecisionStatus,
    AgentEvent, AgentEventType,
)

router = APIRouter()


@router.get("/overview")
def get_analytics_overview(session: Session = Depends(get_session)) -> dict:
    """All chart data in one call to minimise round-trips."""

    # ── Email category breakdown ───────────────────────────────────────────
    emails = session.exec(select(Email)).all()
    category_counts: dict[str, int] = defaultdict(int)
    priority_counts: dict[str, int] = defaultdict(int)
    status_counts:   dict[str, int] = defaultdict(int)
    sentiment_counts: dict[str, int] = defaultdict(int)

    for e in emails:
        category_counts[e.category.value] += 1
        priority_counts[e.priority.value] += 1
        status_counts[e.status.value]     += 1
        if e.sentiment:
            sentiment_counts[e.sentiment] += 1

    email_categories = [
        {"name": k.replace("_", " ").title(), "value": v, "key": k}
        for k, v in sorted(category_counts.items(), key=lambda x: -x[1])
    ]
    email_priorities = [
        {"name": k.title(), "value": v}
        for k, v in [("critical", priority_counts["critical"]),
                     ("high", priority_counts["high"]),
                     ("medium", priority_counts["medium"]),
                     ("low", priority_counts["low"])]
        if v > 0
    ]
    email_statuses = [
        {"name": k.title(), "value": v}
        for k, v in status_counts.items() if v > 0
    ]
    email_sentiment = [
        {"name": k.title(), "value": v, "fill":
            "#10b981" if k == "positive" else "#f59e0b" if k == "neutral" else "#ef4444"}
        for k, v in sentiment_counts.items() if v > 0
    ]

    # ── Project health distribution ────────────────────────────────────────
    projects = session.exec(select(Project)).all()
    health_dist = [
        {"name": "Healthy",  "value": sum(1 for p in projects if p.health == ProjectHealth.HEALTHY),  "fill": "#10b981"},
        {"name": "At Risk",  "value": sum(1 for p in projects if p.health == ProjectHealth.AT_RISK),   "fill": "#f59e0b"},
        {"name": "Critical", "value": sum(1 for p in projects if p.health == ProjectHealth.CRITICAL),  "fill": "#ef4444"},
        {"name": "On Hold",  "value": sum(1 for p in projects if p.health == ProjectHealth.ON_HOLD),   "fill": "#64748b"},
    ]
    health_dist = [h for h in health_dist if h["value"] > 0]

    # Project completion data (for bar chart)
    project_completion = [
        {
            "name": p.name[:25] + ("…" if len(p.name) > 25 else ""),
            "completion": round(p.tasks_done / p.tasks_total * 100) if p.tasks_total > 0 else 0,
            "health_score": p.health_score,
            "health": p.health.value,
        }
        for p in sorted(projects, key=lambda x: x.health_score)
    ]

    # ── Decision funnel ────────────────────────────────────────────────────
    decisions = session.exec(select(Decision)).all()
    decision_funnel = [
        {"name": "Submitted",       "value": len(decisions)},
        {"name": "AI Processed",    "value": sum(1 for d in decisions if d.status != DecisionStatus.PENDING)},
        {"name": "Auto-Resolved",   "value": sum(1 for d in decisions if d.status == DecisionStatus.AI_RESOLVED)},
        {"name": "Human Resolved",  "value": sum(1 for d in decisions if d.status == DecisionStatus.HUMAN_RESOLVED)},
    ]

    decision_by_urgency = [
        {"name": "Immediate",   "value": sum(1 for d in decisions if d.urgency.value == "immediate")},
        {"name": "This Week",   "value": sum(1 for d in decisions if d.urgency.value == "this_week")},
        {"name": "This Month",  "value": sum(1 for d in decisions if d.urgency.value == "this_month")},
    ]

    # Avg confidence by agent
    events = session.exec(select(AgentEvent)).all()
    agent_conf: dict[str, list[float]] = defaultdict(list)
    agent_counts: dict[str, int] = defaultdict(int)
    for e in events:
        agent_counts[e.agent_name] += 1
        if e.confidence:
            agent_conf[e.agent_name].append(e.confidence)

    agent_stats = [
        {
            "name": name,
            "actions": agent_counts[name],
            "avg_confidence": round(sum(confs) / len(confs) * 100) if confs else 0,
        }
        for name, confs in agent_conf.items()
    ]

    # ── Automation rate ────────────────────────────────────────────────────
    auto_handled = sum(1 for e in emails if e.status in [EmailStatus.SENT, EmailStatus.ARCHIVED])
    ai_resolved  = sum(1 for d in decisions if d.status == DecisionStatus.AI_RESOLVED)
    total_processed = len(emails) + len(decisions)
    automation_rate = round((auto_handled + ai_resolved) / max(total_processed, 1) * 100)

    # Simulated weekly trend (real systems would store historical snapshots)
    # We generate plausible data based on current state for demo purposes
    weekly_trend = []
    for i in range(7, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        base = max(40, automation_rate - (i * 3))
        weekly_trend.append({
            "day": day.strftime("%a"),
            "automation": min(100, base + (i % 3)),
            "emails": max(1, len(emails) // 7 + (i % 3) - 1),
            "decisions": max(0, len(decisions) // 7),
        })

    return {
        "email_categories":    email_categories,
        "email_priorities":    email_priorities,
        "email_statuses":      email_statuses,
        "email_sentiment":     email_sentiment,
        "health_distribution": health_dist,
        "project_completion":  project_completion,
        "decision_funnel":     decision_funnel,
        "decision_by_urgency": decision_by_urgency,
        "agent_stats":         agent_stats,
        "weekly_trend":        weekly_trend,
        "summary": {
            "total_emails":    len(emails),
            "auto_handled":    auto_handled,
            "total_projects":  len(projects),
            "avg_health":      round(sum(p.health_score for p in projects) / max(len(projects), 1)),
            "total_decisions": len(decisions),
            "ai_resolved":     ai_resolved,
            "automation_rate": automation_rate,
            "total_events":    len(events),
        }
    }
