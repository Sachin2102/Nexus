"""
NEXUS — Decision Routing & Resolution Agent
─────────────────────────────────────────────────────────────────────────────
Handles incoming decisions autonomously:

  1. Classifies complexity and risk level
  2. For routine decisions: resolves autonomously with full reasoning trail
  3. For complex decisions: routes to the correct stakeholder with a briefing
  4. Provides confidence scores and explainability for every resolution

This is the hardest class of tasks people believe AI cannot do:
making organizational judgment calls. NEXUS does it with full transparency.
"""

import json
import time
import logging
from datetime import datetime

from sqlmodel import Session

from core.models import Decision, DecisionStatus, AgentEventType
from agents.base import call_llm, parse_json_response, log_agent_event

logger = logging.getLogger("nexus.decision_agent")

# Confidence threshold for autonomous resolution
AUTO_RESOLVE_THRESHOLD = 0.82

DECISION_SYSTEM = """
You are NEXUS Decision Intelligence, an autonomous organizational decision engine.

You assess incoming decisions and either:
(A) Resolve them autonomously if they're within standard operating parameters
(B) Route them to the right human stakeholder with a full briefing

Decision resolution framework:
- AUTONOMOUS if: budget <$25k, policy-based, reversible, precedent exists, low political risk
- ESCALATE if: >$25k financial commitment, legal exposure, people management, strategic pivots,
  irreversible decisions, politically sensitive, cross-department conflict

Return a JSON object:
{
  "should_auto_resolve": true|false,
  "recommended_option": "...",
  "reasoning": "2-3 sentences explaining the recommendation with specific rationale",
  "escalate_to": "CEO|CFO|CTO|CHRO|Legal|Department Head|null",
  "escalation_context": "Brief for the escalated stakeholder (null if auto-resolving)",
  "risk_level": "low|medium|high",
  "precedent": "similar past decision or policy that applies (or null)",
  "confidence": <0.0-1.0>,
  "caveats": ["any important caveats or conditions to the decision"]
}

Return ONLY valid JSON.
"""


def process_decision(decision: Decision, session: Session) -> Decision:
    """Autonomously process an incoming organizational decision."""
    start = time.perf_counter()

    try:
        options_list = json.loads(decision.options) if decision.options else []
    except Exception:
        options_list = [decision.options] if decision.options else []

    options_str = "\n".join(f"  - {o}" for o in options_list) if options_list else "  (open-ended)"

    prompt = f"""
Decision Title: {decision.title}
Submitted By: {decision.submitted_by}
Department: {decision.department or 'Not specified'}
Urgency: {decision.urgency.value}

Context:
{decision.context}

Available Options:
{options_str}
"""

    try:
        raw = call_llm(DECISION_SYSTEM, prompt, max_tokens=1024, thinking=True)
        data = parse_json_response(raw)

        confidence = float(data.get("confidence", 0.7))
        should_auto = data.get("should_auto_resolve", False)
        risk_level  = data.get("risk_level", "medium")

        # Override to escalate if confidence is too low or risk is high
        if confidence < AUTO_RESOLVE_THRESHOLD or risk_level == "high":
            should_auto = False

        decision.ai_recommendation = data.get("recommended_option", "")
        decision.ai_reasoning = data.get("reasoning", "")
        decision.confidence_score = confidence

        if should_auto:
            decision.status = DecisionStatus.AI_RESOLVED
            decision.resolution = data.get("recommended_option", "")
            decision.resolved_at = datetime.utcnow()
        else:
            decision.status = DecisionStatus.ESCALATED
            decision.escalated_to = data.get("escalate_to", "CEO")

        session.add(decision)
        session.commit()
        session.refresh(decision)

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if should_auto:
            event_type = AgentEventType.DECISION_RESOLVED
            action = f"Auto-resolved → {decision.resolution[:60]}"
        else:
            event_type = AgentEventType.DECISION_ROUTED
            action = f"Escalated to {decision.escalated_to} (risk: {risk_level})"

        log_agent_event(
            session=session,
            event_type=event_type,
            agent_name="DecisionAgent",
            title=f"Decision: {decision.title[:50]}",
            detail=f"{action} | Confidence: {confidence:.0%}",
            entity_id=decision.id,
            entity_type="decision",
            confidence=confidence,
            duration_ms=elapsed_ms,
        )

    except Exception as exc:
        logger.error("Decision processing failed for %s: %s", decision.id, exc)
        decision.status = DecisionStatus.ESCALATED
        decision.escalated_to = "CEO"
        decision.ai_reasoning = f"Processing error — escalated for human review: {str(exc)}"
        session.add(decision)
        session.commit()

    return decision
