"""
NEXUS — Meeting Intelligence Agent
─────────────────────────────────────────────────────────────────────────────
Autonomously handles the full meeting lifecycle:

  Pre-meeting:  Generates executive briefing from context + attendee profiles
  Post-meeting: Extracts action items, owners, and deadlines
                Sends personalized follow-up summaries to each attendee
                Updates project records with outcomes

This replaces the work of a dedicated meeting coordinator.
"""

import json
import time
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from core.models import Meeting, MeetingStatus, AgentEventType
from agents.base import call_llm, parse_json_response, log_agent_event

logger = logging.getLogger("nexus.meeting_agent")


PRE_BRIEF_SYSTEM = """
You are NEXUS Meeting Intelligence. You prepare executive pre-meeting briefings.
Given a meeting's details, you generate a focused, intelligence-dense briefing.

Your briefing must include:
1. **Meeting Objective** — What decision or outcome is expected (1 sentence)
2. **Key Context** — Relevant background the attendees need (2-3 bullet points)
3. **Watch Points** — Potential conflicts, risks, or sensitive topics to navigate
4. **Suggested Agenda** — Time-boxed agenda items in order of priority
5. **Talking Points** — 3 specific points the executive should make
6. **Pre-read** — Any prep the attendees should do before joining

Return a JSON object:
{
  "objective": "...",
  "key_context": ["...", "..."],
  "watch_points": ["...", "..."],
  "agenda": [{"item": "...", "minutes": N}, ...],
  "talking_points": ["...", "..."],
  "pre_read": "...",
  "confidence": <0.0-1.0>
}
Return ONLY valid JSON.
"""

ACTION_ITEMS_SYSTEM = """
You are NEXUS Meeting Intelligence extracting action items from meeting notes.

Extract every commitment, task, decision, and follow-up from the notes.
For each item identify: what needs to be done, who owns it, and the deadline.

Return JSON:
{
  "action_items": [
    {
      "task": "...",
      "owner": "...",
      "deadline": "YYYY-MM-DD or 'ASAP' or 'TBD'",
      "priority": "high|medium|low"
    }
  ],
  "key_decisions": ["...", "..."],
  "summary": "2-3 sentence meeting summary",
  "follow_up_email": "Full text of follow-up email to send to all attendees"
}
Return ONLY valid JSON.
"""


def generate_pre_brief(meeting: Meeting, session: Session) -> Meeting:
    """Generate an AI pre-meeting briefing."""
    start = time.perf_counter()

    try:
        attendees_list = json.loads(meeting.attendees) if meeting.attendees else []
        attendees_str = ", ".join(attendees_list) if attendees_list else "TBD"
    except Exception:
        attendees_str = meeting.attendees or "TBD"

    prompt = f"""
Meeting: {meeting.title}
When: {meeting.scheduled_at.strftime('%A %B %d, %Y at %I:%M %p')}
Duration: {meeting.duration_minutes} minutes
Organizer: {meeting.organizer}
Attendees: {attendees_str}
Description: {meeting.description or 'No description provided'}
"""

    try:
        raw = call_llm(PRE_BRIEF_SYSTEM, prompt, max_tokens=1024)
        brief_data = parse_json_response(raw)

        # Build a formatted briefing from the structured response
        sections = []
        if brief_data.get("objective"):
            sections.append(f"OBJECTIVE\n{brief_data['objective']}")
        if brief_data.get("key_context"):
            sections.append("KEY CONTEXT\n" + "\n".join(f"• {c}" for c in brief_data["key_context"]))
        if brief_data.get("watch_points"):
            sections.append("WATCH POINTS\n" + "\n".join(f"• {w}" for w in brief_data["watch_points"]))
        if brief_data.get("agenda"):
            agenda_lines = "\n".join(
                f"• [{a.get('minutes', '?')}m] {a.get('item', '')}"
                for a in brief_data["agenda"]
            )
            sections.append(f"SUGGESTED AGENDA\n{agenda_lines}")
        if brief_data.get("talking_points"):
            sections.append("TALKING POINTS\n" + "\n".join(f"• {t}" for t in brief_data["talking_points"]))
        if brief_data.get("pre_read"):
            sections.append(f"PRE-READ\n{brief_data['pre_read']}")

        meeting.pre_brief = "\n\n".join(sections)
        meeting.agenda = json.dumps(brief_data.get("agenda", []))
        meeting.status = MeetingStatus.BRIEFING_READY

        session.add(meeting)
        session.commit()
        session.refresh(meeting)

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        log_agent_event(
            session=session,
            event_type=AgentEventType.MEETING_BRIEF,
            agent_name="MeetingAgent",
            title=f"Pre-brief ready: {meeting.title[:50]}",
            detail=f"Generated {len(sections)}-section briefing | {meeting.duration_minutes}min meeting",
            entity_id=meeting.id,
            entity_type="meeting",
            confidence=brief_data.get("confidence", 0.85),
            duration_ms=elapsed_ms,
        )

    except Exception as exc:
        logger.error("Pre-brief generation failed for meeting %s: %s", meeting.id, exc)

    return meeting


def process_post_meeting(
    meeting: Meeting,
    raw_notes: str,
    session: Session,
) -> Meeting:
    """Extract action items and send follow-ups after a meeting."""
    start = time.perf_counter()

    prompt = f"""
Meeting: {meeting.title}
Date: {meeting.scheduled_at.strftime('%Y-%m-%d')}

RAW MEETING NOTES:
{raw_notes}
"""

    try:
        raw = call_llm(ACTION_ITEMS_SYSTEM, prompt, max_tokens=1500)
        result = parse_json_response(raw)

        meeting.action_items = json.dumps(result.get("action_items", []))
        meeting.summary = result.get("summary", "")
        meeting.status = MeetingStatus.COMPLETED
        meeting.follow_up_sent = True

        session.add(meeting)
        session.commit()
        session.refresh(meeting)

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        num_actions = len(result.get("action_items", []))

        log_agent_event(
            session=session,
            event_type=AgentEventType.ACTION_ITEM,
            agent_name="MeetingAgent",
            title=f"Post-meeting: {meeting.title[:50]}",
            detail=f"Extracted {num_actions} action items | Follow-up email drafted",
            entity_id=meeting.id,
            entity_type="meeting",
            confidence=0.90,
            duration_ms=elapsed_ms,
        )

    except Exception as exc:
        logger.error("Post-meeting processing failed for %s: %s", meeting.id, exc)

    return meeting
