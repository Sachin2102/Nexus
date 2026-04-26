"""
NEXUS — LangGraph Orchestrator
─────────────────────────────────────────────────────────────────────────────
The central coordination layer. Routes incoming work items to the appropriate
specialized agent using a LangGraph state machine.

Graph topology:
  START → router → [email_node | meeting_node | project_node | decision_node]
                → log_event → END

Each node is a specialized agent. The router decides which agent handles
the incoming item based on its type and content.
"""

import logging
from typing import Literal, TypedDict, Any

from langgraph.graph import StateGraph, END

from sqlmodel import Session

from core.models import (
    Email, Meeting, Project, Decision,
    EmailStatus, AgentEventType,
)
from agents.base import log_agent_event
from agents.email_agent    import process_email
from agents.meeting_agent  import generate_pre_brief, process_post_meeting
from agents.project_agent  import assess_project_health
from agents.decision_agent import process_decision

logger = logging.getLogger("nexus.orchestrator")


# ─────────────────────────────────────────────────
# State schema
# ─────────────────────────────────────────────────

class NexusState(TypedDict):
    """Shared state flowing through the LangGraph nodes."""
    work_item_type: str          # "email" | "meeting_pre" | "meeting_post" | "project" | "decision"
    work_item_id: str
    result: dict[str, Any]
    error: str | None
    next_node: str


# ─────────────────────────────────────────────────
# Router node — determines which agent handles this
# ─────────────────────────────────────────────────

def router_node(state: NexusState) -> NexusState:
    """Route to the correct specialized agent."""
    item_type = state["work_item_type"]

    routing_map = {
        "email":        "email_node",
        "meeting_pre":  "meeting_node",
        "meeting_post": "meeting_node",
        "project":      "project_node",
        "decision":     "decision_node",
    }

    next_node = routing_map.get(item_type, "email_node")
    logger.info("Router: %s → %s", item_type, next_node)

    return {**state, "next_node": next_node}


def decide_next(state: NexusState) -> str:
    """Conditional edge function for LangGraph."""
    return state.get("next_node", "email_node")


# ─────────────────────────────────────────────────
# Agent nodes — each wraps a specialized agent
# ─────────────────────────────────────────────────

def make_email_node(session: Session):
    def email_node(state: NexusState) -> NexusState:
        try:
            email = session.get(Email, state["work_item_id"])
            if not email:
                return {**state, "error": f"Email {state['work_item_id']} not found", "result": {}}
            updated = process_email(email, session)
            return {
                **state,
                "result": {
                    "status": updated.status.value,
                    "priority": updated.priority.value,
                    "category": updated.category.value,
                    "confidence": updated.confidence_score,
                    "requires_human": updated.requires_human,
                },
                "error": None,
            }
        except Exception as exc:
            logger.error("Email node error: %s", exc)
            return {**state, "result": {}, "error": str(exc)}
    return email_node


def make_meeting_node(session: Session):
    def meeting_node(state: NexusState) -> NexusState:
        try:
            meeting = session.get(Meeting, state["work_item_id"])
            if not meeting:
                return {**state, "error": f"Meeting {state['work_item_id']} not found", "result": {}}

            if state["work_item_type"] == "meeting_pre":
                updated = generate_pre_brief(meeting, session)
                return {**state, "result": {"status": updated.status.value, "brief_length": len(updated.pre_brief or "")}, "error": None}
            else:
                notes = state.get("result", {}).get("notes", "")
                updated = process_post_meeting(meeting, notes, session)
                return {**state, "result": {"status": updated.status.value, "action_items": updated.action_items}, "error": None}
        except Exception as exc:
            logger.error("Meeting node error: %s", exc)
            return {**state, "result": {}, "error": str(exc)}
    return meeting_node


def make_project_node(session: Session):
    def project_node(state: NexusState) -> NexusState:
        try:
            project = session.get(Project, state["work_item_id"])
            if not project:
                return {**state, "error": f"Project {state['work_item_id']} not found", "result": {}}
            updated = assess_project_health(project, session)
            return {
                **state,
                "result": {
                    "health": updated.health.value,
                    "health_score": updated.health_score,
                    "velocity_trend": updated.velocity_trend,
                },
                "error": None,
            }
        except Exception as exc:
            logger.error("Project node error: %s", exc)
            return {**state, "result": {}, "error": str(exc)}
    return project_node


def make_decision_node(session: Session):
    def decision_node(state: NexusState) -> NexusState:
        try:
            decision = session.get(Decision, state["work_item_id"])
            if not decision:
                return {**state, "error": f"Decision {state['work_item_id']} not found", "result": {}}
            updated = process_decision(decision, session)
            return {
                **state,
                "result": {
                    "status": updated.status.value,
                    "confidence": updated.confidence_score,
                    "escalated_to": updated.escalated_to,
                },
                "error": None,
            }
        except Exception as exc:
            logger.error("Decision node error: %s", exc)
            return {**state, "result": {}, "error": str(exc)}
    return decision_node


# ─────────────────────────────────────────────────
# Build the LangGraph
# ─────────────────────────────────────────────────

def build_nexus_graph(session: Session):
    """
    Construct and compile the NEXUS LangGraph state machine.

    Graph:
      router ──conditional──> [email_node | meeting_node | project_node | decision_node]
                               each node → END
    """
    graph = StateGraph(NexusState)

    # Add nodes
    graph.add_node("router",        router_node)
    graph.add_node("email_node",    make_email_node(session))
    graph.add_node("meeting_node",  make_meeting_node(session))
    graph.add_node("project_node",  make_project_node(session))
    graph.add_node("decision_node", make_decision_node(session))

    # Entry point
    graph.set_entry_point("router")

    # Conditional routing from router
    graph.add_conditional_edges(
        "router",
        decide_next,
        {
            "email_node":    "email_node",
            "meeting_node":  "meeting_node",
            "project_node":  "project_node",
            "decision_node": "decision_node",
        },
    )

    # All agent nodes go to END
    for node in ["email_node", "meeting_node", "project_node", "decision_node"]:
        graph.add_edge(node, END)

    return graph.compile()


def dispatch(
    work_item_type: str,
    work_item_id: str,
    session: Session,
    extra: dict | None = None,
) -> dict:
    """
    High-level dispatch function — run the orchestrator for a single item.
    Returns the final state dict.
    """
    graph = build_nexus_graph(session)

    initial_state: NexusState = {
        "work_item_type": work_item_type,
        "work_item_id":   work_item_id,
        "result":         extra or {},
        "error":          None,
        "next_node":      "",
    }

    final_state = graph.invoke(initial_state)
    return final_state
