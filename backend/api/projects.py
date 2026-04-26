"""
NEXUS — Projects API
"""

import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from core.database import get_session
from core.models import Project, ProjectCreate, ProjectHealth
from agents.orchestrator import dispatch

router = APIRouter()


@router.get("/")
def list_projects(session: Session = Depends(get_session)):
    projects = session.exec(
        select(Project).order_by(Project.health_score.asc())  # worst first
    ).all()
    return [_serialize(p) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: str, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _serialize(project)


@router.post("/")
def create_project(
    payload: ProjectCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    project = Project(**payload.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    background_tasks.add_task(dispatch, "project", project.id, session)
    return {"id": project.id}


@router.post("/{project_id}/assess")
def assess_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Manually trigger a fresh AI health assessment."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    background_tasks.add_task(dispatch, "project", project_id, session)
    return {"message": "Assessment started"}


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Update project fields and re-run health assessment."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    allowed_fields = {
        "tasks_total", "tasks_done", "milestones_hit", "milestones_total",
        "budget_spent_usd", "last_update", "description",
    }
    for key, value in payload.items():
        if key in allowed_fields:
            setattr(project, key, value)

    session.add(project)
    session.commit()
    background_tasks.add_task(dispatch, "project", project_id, session)
    return {"message": "Updated — re-assessing health"}


def _serialize(p: Project) -> dict:
    try:
        team = json.loads(p.team) if p.team else []
    except Exception:
        team = []
    try:
        risk_flags = json.loads(p.risk_flags) if p.risk_flags else []
    except Exception:
        risk_flags = []
    try:
        blockers = json.loads(p.blockers) if p.blockers else []
    except Exception:
        blockers = []

    completion_pct = round(p.tasks_done / p.tasks_total * 100) if p.tasks_total > 0 else 0
    budget_pct = round(p.budget_spent_usd / p.budget_usd * 100) if (p.budget_usd and p.budget_spent_usd) else None

    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "owner": p.owner,
        "team": team,
        "deadline": p.deadline.isoformat() if p.deadline else None,
        "budget_usd": p.budget_usd,
        "budget_spent_usd": p.budget_spent_usd,
        "budget_pct": budget_pct,
        "health": p.health.value,
        "health_score": p.health_score,
        "risk_flags": risk_flags,
        "blockers": blockers,
        "last_update": p.last_update,
        "ai_recommendation": p.ai_recommendation,
        "velocity_trend": p.velocity_trend,
        "tasks_total": p.tasks_total,
        "tasks_done": p.tasks_done,
        "completion_pct": completion_pct,
        "milestones_hit": p.milestones_hit,
        "milestones_total": p.milestones_total,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }
