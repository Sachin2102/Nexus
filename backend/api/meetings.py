"""
NEXUS — Meetings API
"""

import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from core.database import get_session
from core.models import Meeting, MeetingCreate, MeetingStatus
from agents.orchestrator import dispatch

router = APIRouter()


@router.get("/")
def list_meetings(session: Session = Depends(get_session)):
    meetings = session.exec(
        select(Meeting).order_by(Meeting.scheduled_at.asc())
    ).all()
    return [_serialize(m) for m in meetings]


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, session: Session = Depends(get_session)):
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _serialize(meeting)


@router.post("/")
def create_meeting(
    payload: MeetingCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    meeting = Meeting(**payload.model_dump())
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    # Auto-generate pre-brief
    background_tasks.add_task(dispatch, "meeting_pre", meeting.id, session)
    return {"id": meeting.id, "status": "scheduled"}


@router.post("/{meeting_id}/generate-brief")
def generate_brief(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Trigger AI pre-meeting briefing generation."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    background_tasks.add_task(dispatch, "meeting_pre", meeting_id, session)
    return {"message": "Briefing generation started"}


@router.post("/{meeting_id}/post-meeting")
def post_meeting(
    meeting_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Submit meeting notes → AI extracts action items and sends follow-ups."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    notes = payload.get("notes", "")
    background_tasks.add_task(dispatch, "meeting_post", meeting_id, session, {"notes": notes})
    return {"message": "Post-meeting processing started"}


def _serialize(m: Meeting) -> dict:
    try:
        attendees = json.loads(m.attendees) if m.attendees else []
    except Exception:
        attendees = []

    try:
        action_items = json.loads(m.action_items) if m.action_items else []
    except Exception:
        action_items = []

    try:
        agenda = json.loads(m.agenda) if m.agenda else []
    except Exception:
        agenda = []

    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "scheduled_at": m.scheduled_at.isoformat(),
        "duration_minutes": m.duration_minutes,
        "attendees": attendees,
        "organizer": m.organizer,
        "status": m.status.value,
        "agenda": agenda,
        "pre_brief": m.pre_brief,
        "action_items": action_items,
        "summary": m.summary,
        "follow_up_sent": m.follow_up_sent,
        "created_at": m.created_at.isoformat(),
    }
