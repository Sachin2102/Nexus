"""
NEXUS — Emails API
CRUD + AI processing endpoints for the inbox.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from core.database import get_session
from core.models import Email, EmailCreate, EmailStatus
from agents.orchestrator import dispatch

router = APIRouter()


@router.get("/")
def list_emails(
    status: str | None = None,
    limit: int = 50,
    session: Session = Depends(get_session),
):
    query = select(Email).order_by(Email.received_at.desc())
    if status:
        query = query.where(Email.status == status)
    emails = session.exec(query.limit(limit)).all()
    return [_serialize(e) for e in emails]


@router.get("/{email_id}")
def get_email(email_id: str, session: Session = Depends(get_session)):
    email = session.get(Email, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return _serialize(email)


@router.post("/")
def create_email(
    payload: EmailCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Receive a new email and queue it for AI processing."""
    email = Email(**payload.model_dump())
    session.add(email)
    session.commit()
    session.refresh(email)

    # Kick off AI processing asynchronously
    background_tasks.add_task(dispatch, "email", email.id, session)
    return {"id": email.id, "status": "queued"}


@router.post("/{email_id}/process")
def process_email(
    email_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Manually trigger AI processing for an email."""
    email = session.get(Email, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    background_tasks.add_task(dispatch, "email", email_id, session)
    return {"message": "Processing started", "email_id": email_id}


@router.post("/{email_id}/approve-draft")
def approve_draft(email_id: str, session: Session = Depends(get_session)):
    """Human approves an AI-drafted reply → marks as sent."""
    email = session.get(Email, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    if email.status != EmailStatus.DRAFTED:
        raise HTTPException(status_code=400, detail="Email is not in drafted state")

    email.status = EmailStatus.SENT
    session.add(email)
    session.commit()
    return {"message": "Draft approved and sent", "email_id": email_id}


@router.post("/{email_id}/archive")
def archive_email(email_id: str, session: Session = Depends(get_session)):
    email = session.get(Email, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.status = EmailStatus.ARCHIVED
    session.add(email)
    session.commit()
    return {"message": "Archived"}


def _serialize(e: Email) -> dict:
    return {
        "id": e.id,
        "subject": e.subject,
        "sender_name": e.sender_name,
        "sender_email": e.sender_email,
        "body": e.body,
        "received_at": e.received_at.isoformat(),
        "status": e.status.value,
        "priority": e.priority.value,
        "category": e.category.value,
        "summary": e.summary,
        "sentiment": e.sentiment,
        "ai_draft_reply": e.ai_draft_reply,
        "confidence_score": e.confidence_score,
        "routing_reason": e.routing_reason,
        "requires_human": e.requires_human,
        "processed_at": e.processed_at.isoformat() if e.processed_at else None,
    }
