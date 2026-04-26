"""
NEXUS — Email Intelligence Agent
─────────────────────────────────────────────────────────────────────────────
Autonomous email processing pipeline powered by Claude.

Capabilities:
  1. Classify email: priority, category, sentiment
  2. Summarize the email in 1-2 sentences
  3. Generate a contextually appropriate draft reply
  4. Decide whether to auto-send or escalate to human review
  5. Log all decisions with confidence scores + reasoning

This is the kind of work that requires a human EA / Chief of Staff.
NEXUS does it autonomously in seconds.
"""

import json
import time
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from core.models import (
    Email, EmailStatus, EmailPriority, EmailCategory,
    AgentEventType,
)
from agents.base import call_llm, parse_json_response, log_agent_event

logger = logging.getLogger("nexus.email_agent")

# ── Confidence thresholds ──────────────────────────────────────────────────
AUTO_SEND_THRESHOLD   = 0.88   # auto-send if confidence >= this
HUMAN_REVIEW_THRESHOLD = 0.60  # escalate to human if confidence < this


CLASSIFY_SYSTEM = """
You are NEXUS Email Intelligence, an AI chief-of-staff responsible for processing
incoming organizational emails. You have deep understanding of business context,
urgency, and appropriate response patterns.

Analyze the provided email and return a JSON object with exactly these keys:
{
  "priority": "critical|high|medium|low",
  "category": "action_required|fyi|decision|vendor|hr|customer|internal|spam",
  "sentiment": "positive|neutral|negative",
  "summary": "<1-2 sentence plain-English summary>",
  "requires_human": true|false,
  "requires_human_reason": "<brief reason if true, else null>",
  "confidence": <float 0.0-1.0>
}

Rules for priority:
- critical: legal/compliance issues, executive escalations, system outages, deal-breakers
- high: customer complaints, deadline risks, hiring decisions, budget approvals
- medium: project updates, vendor follow-ups, routine requests
- low: newsletters, FYIs, cold outreach, informational

Rules for requires_human:
- true if: involves sensitive HR matters, legal liability, large financial commitments (>$50k),
  personal conflict, or ambiguous context requiring judgment
- false otherwise — NEXUS handles it autonomously

Return ONLY valid JSON. No prose, no markdown.
"""

DRAFT_SYSTEM = """
You are NEXUS, an AI chief-of-staff drafting email replies on behalf of the CEO/executive.

Your replies must:
- Be professional, concise, and action-oriented (3-5 sentences max for routine emails)
- Match the tone of the original email
- Make specific commitments or next steps where appropriate
- Never over-promise or give away information not appropriate for the context
- Sound like they were written by a senior executive, not a robot

Return ONLY the email body text. No subject line. No "Dear X". No sign-off.
Just the body paragraphs.
"""


def process_email(email: Email, session: Session) -> Email:
    """
    Full autonomous email processing pipeline.
    Mutates and persists the email record. Returns updated email.
    """
    start = time.perf_counter()

    # ── Step 1: Classify ──────────────────────────────────────────────────
    email.status = EmailStatus.PROCESSING
    session.add(email)
    session.commit()

    classify_prompt = f"""
From: {email.sender_name} <{email.sender_email}>
Subject: {email.subject}
Date: {email.received_at.strftime('%Y-%m-%d %H:%M')}

{email.body}
"""
    try:
        raw = call_llm(CLASSIFY_SYSTEM, classify_prompt, max_tokens=512)
        classification = parse_json_response(raw)

        email.priority    = EmailPriority(classification.get("priority", "medium"))
        email.category    = EmailCategory(classification.get("category", "internal"))
        email.sentiment   = classification.get("sentiment", "neutral")
        email.summary     = classification.get("summary", "")
        email.requires_human = classification.get("requires_human", False)
        email.routing_reason = classification.get("requires_human_reason")
        email.confidence_score = float(classification.get("confidence", 0.75))

    except Exception as exc:
        logger.error("Classification failed for email %s: %s", email.id, exc)
        email.priority = EmailPriority.MEDIUM
        email.category = EmailCategory.INTERNAL
        email.confidence_score = 0.5
        email.requires_human = True
        email.routing_reason = "Classification error — flagged for human review"

    # ── Step 2: Draft Reply (if actionable) ───────────────────────────────
    needs_reply = email.category in (
        EmailCategory.ACTION_REQUIRED,
        EmailCategory.DECISION,
        EmailCategory.CUSTOMER,
        EmailCategory.VENDOR,
        EmailCategory.HR,
    )

    if needs_reply and not email.requires_human:
        draft_prompt = f"""
You are replying to this email on behalf of the executive:

ORIGINAL EMAIL:
From: {email.sender_name}
Subject: {email.subject}
Body: {email.body}

Classification context:
- Priority: {email.priority.value}
- Category: {email.category.value}
- Summary: {email.summary}

Write a concise, professional reply.
"""
        try:
            draft = call_llm(DRAFT_SYSTEM, draft_prompt, max_tokens=512)
            email.ai_draft_reply = draft.strip()
        except Exception as exc:
            logger.error("Draft generation failed: %s", exc)
            email.requires_human = True

    # ── Step 3: Decide status ─────────────────────────────────────────────
    elapsed_ms = int((time.perf_counter() - start) * 1000)

    if email.requires_human or email.category == EmailCategory.SPAM:
        email.status = EmailStatus.FLAGGED if email.category != EmailCategory.SPAM else EmailStatus.ARCHIVED
    elif email.ai_draft_reply and (email.confidence_score or 0) >= AUTO_SEND_THRESHOLD:
        email.status = EmailStatus.SENT   # autonomous send
    elif email.ai_draft_reply:
        email.status = EmailStatus.DRAFTED
    else:
        email.status = EmailStatus.ARCHIVED

    email.processed_at = datetime.utcnow()
    session.add(email)
    session.commit()
    session.refresh(email)

    # ── Step 4: Log agent event ───────────────────────────────────────────
    action_taken = {
        EmailStatus.SENT:     f"Auto-sent reply (confidence: {email.confidence_score:.0%})",
        EmailStatus.DRAFTED:  f"Draft ready for review (confidence: {email.confidence_score:.0%})",
        EmailStatus.FLAGGED:  f"Escalated to human: {email.routing_reason}",
        EmailStatus.ARCHIVED: "Archived — no action needed",
    }.get(email.status, "Processed")

    log_agent_event(
        session=session,
        event_type=AgentEventType.EMAIL_CLASSIFIED,
        agent_name="EmailAgent",
        title=f"Email processed: {email.subject[:50]}",
        detail=f"{action_taken} | {email.category.value} | {email.priority.value} priority",
        entity_id=email.id,
        entity_type="email",
        confidence=email.confidence_score,
        duration_ms=elapsed_ms,
    )

    logger.info(
        "Email %s processed in %dms → status=%s confidence=%.2f",
        email.id, elapsed_ms, email.status, email.confidence_score or 0,
    )
    return email


def batch_process_unread(session: Session) -> list[Email]:
    """Process all unread emails in the inbox."""
    unread = session.exec(
        select(Email).where(Email.status == EmailStatus.UNREAD)
    ).all()

    processed = []
    for email in unread:
        try:
            processed.append(process_email(email, session))
        except Exception as exc:
            logger.error("Failed to process email %s: %s", email.id, exc)

    return processed
