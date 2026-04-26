"""
NEXUS — Project Sentinel Agent
─────────────────────────────────────────────────────────────────────────────
Continuously monitors all active projects and:
  • Computes a health score (0-100) with explainability
  • Identifies and categorizes risk flags proactively
  • Detects velocity trends (up / flat / down)
  • Generates specific, actionable recommendations
  • Auto-escalates critical projects to stakeholders

This replaces the need for weekly PMO status meetings.
"""

import json
import time
import logging
from datetime import datetime, timedelta

from sqlmodel import Session, select

from core.models import Project, ProjectHealth, AgentEventType
from agents.base import call_llm, parse_json_response, log_agent_event

logger = logging.getLogger("nexus.project_agent")


HEALTH_SYSTEM = """
You are NEXUS Project Sentinel, an AI PMO (Project Management Officer).
Analyze the project data and compute a comprehensive health assessment.

Return a JSON object:
{
  "health_score": <integer 0-100>,
  "health_status": "healthy|at_risk|critical|on_hold",
  "risk_flags": [
    {"flag": "...", "severity": "high|medium|low", "action": "..."}
  ],
  "blockers": ["...", "..."],
  "velocity_trend": "up|flat|down",
  "recommendation": "1-2 sentence specific, actionable recommendation",
  "confidence": <0.0-1.0>
}

Scoring rubric (100 = perfect):
- Deduct 5-15 per unresolved blocker
- Deduct 10-20 if deadline is within 2 weeks with <80% task completion
- Deduct 15 if budget_spent > 90% of budget
- Deduct 5-10 per high-severity risk flag
- Deduct 20 if velocity_trend is "down" two cycles running
- Add 5 if tasks_done/tasks_total > 0.9
- Add 5 if milestones_hit == milestones_total (all milestones on track)

health_status mapping:
- 80-100 → healthy
- 55-79  → at_risk
- 0-54   → critical
- Override to on_hold if explicitly stated

Return ONLY valid JSON.
"""


def assess_project_health(project: Project, session: Session) -> Project:
    """Run the AI health assessment on a single project."""
    start = time.perf_counter()

    now = datetime.utcnow()
    days_to_deadline = (
        (project.deadline - now).days if project.deadline else None
    )
    completion_pct = (
        round(project.tasks_done / project.tasks_total * 100)
        if project.tasks_total > 0 else 0
    )
    budget_pct = (
        round(project.budget_spent_usd / project.budget_usd * 100)
        if (project.budget_usd and project.budget_spent_usd) else None
    )

    prompt = f"""
Project: {project.name}
Owner: {project.owner}
Description: {project.description}

Progress:
- Tasks: {project.tasks_done}/{project.tasks_total} complete ({completion_pct}%)
- Milestones: {project.milestones_hit}/{project.milestones_total} hit
- Deadline: {project.deadline.strftime('%Y-%m-%d') if project.deadline else 'Not set'} ({days_to_deadline} days away)

Budget:
- Budget: ${project.budget_usd:,.0f} | Spent: ${project.budget_spent_usd:,.0f} ({budget_pct}%)

Team: {project.team}

Last update: {project.last_update or 'No recent update'}
Current health: {project.health.value} (score: {project.health_score})
"""

    try:
        raw = call_llm(HEALTH_SYSTEM, prompt, max_tokens=1024)
        data = parse_json_response(raw)

        project.health_score    = max(0, min(100, int(data.get("health_score", project.health_score))))
        project.health          = ProjectHealth(data.get("health_status", project.health.value))
        project.risk_flags      = json.dumps(data.get("risk_flags", []))
        project.blockers        = json.dumps(data.get("blockers", []))
        project.velocity_trend  = data.get("velocity_trend", "flat")
        project.ai_recommendation = data.get("recommendation", "")
        project.updated_at      = now

        session.add(project)
        session.commit()
        session.refresh(project)

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        risk_count = len(data.get("risk_flags", []))

        log_agent_event(
            session=session,
            event_type=AgentEventType.PROJECT_RISK,
            agent_name="ProjectSentinel",
            title=f"Health check: {project.name[:40]} → {project.health_score}/100",
            detail=(
                f"Status: {project.health.value} | "
                f"{risk_count} risk flags | "
                f"Trend: {project.velocity_trend} | "
                f"{completion_pct}% complete"
            ),
            entity_id=project.id,
            entity_type="project",
            confidence=data.get("confidence", 0.85),
            duration_ms=elapsed_ms,
        )

    except Exception as exc:
        logger.error("Health assessment failed for project %s: %s", project.id, exc)

    return project


def run_health_sweep(session: Session) -> list[Project]:
    """Assess health for all non-completed projects."""
    projects = session.exec(
        select(Project).where(Project.health != ProjectHealth.ON_HOLD)
    ).all()

    updated = []
    for project in projects:
        try:
            updated.append(assess_project_health(project, session))
        except Exception as exc:
            logger.error("Failed to assess project %s: %s", project.id, exc)

    return updated
