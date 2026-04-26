"""
NEXUS — Decisions API
"""

import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from core.database import get_session
from core.models import Decision, DecisionCreate, DecisionStatus
from agents.orchestrator import dispatch

router = APIRouter()


@router.get("/")
def list_decisions(
    status: str | None = None,
    session: Session = Depends(get_session),
):
    query = select(Decision).order_by(Decision.submitted_at.desc())
    if status:
        query = query.where(Decision.status == status)
    decisions = session.exec(query).all()
    return [_serialize(d) for d in decisions]


@router.get("/{decision_id}")
def get_decision(decision_id: str, session: Session = Depends(get_session)):
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return _serialize(decision)


@router.post("/")
def submit_decision(
    payload: DecisionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Submit a decision for AI processing."""
    decision = Decision(**payload.model_dump())
    session.add(decision)
    session.commit()
    session.refresh(decision)
    background_tasks.add_task(dispatch, "decision", decision.id, session)
    return {"id": decision.id, "status": "processing"}


@router.post("/{decision_id}/resolve")
def human_resolve(
    decision_id: str,
    payload: dict,
    session: Session = Depends(get_session),
):
    """Human overrides and resolves a decision manually."""
    from datetime import datetime
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    decision.status = DecisionStatus.HUMAN_RESOLVED
    decision.resolution = payload.get("resolution", "")
    decision.resolved_at = datetime.utcnow()
    session.add(decision)
    session.commit()
    return {"message": "Decision resolved by human"}


def _serialize(d: Decision) -> dict:
    try:
        options = json.loads(d.options) if d.options else []
    except Exception:
        options = [d.options] if d.options else []

    return {
        "id": d.id,
        "title": d.title,
        "context": d.context,
        "options": options,
        "submitted_by": d.submitted_by,
        "submitted_at": d.submitted_at.isoformat(),
        "urgency": d.urgency.value,
        "department": d.department,
        "status": d.status.value,
        "ai_recommendation": d.ai_recommendation,
        "ai_reasoning": d.ai_reasoning,
        "confidence_score": d.confidence_score,
        "escalated_to": d.escalated_to,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        "resolution": d.resolution,
    }
