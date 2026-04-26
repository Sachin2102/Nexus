"""
NEXUS — Base Agent
Shared utilities and LLM client for all specialized agents.
Uses NVIDIA NIM via the OpenAI-compatible API.
"""

import json
import logging
from datetime import datetime
from typing import Any

from openai import OpenAI
from sqlmodel import Session

from core.config import settings
from core.models import AgentEvent, AgentEventType

logger = logging.getLogger("nexus.agents")


def get_llm_client() -> OpenAI:
    return OpenAI(
        base_url=settings.NVIDIA_BASE_URL,
        api_key=settings.NVIDIA_API_KEY,
    )


def call_llm(
    system: str,
    user: str,
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.6,
    thinking: bool = False,
) -> str:
    """
    Thin wrapper around the NVIDIA NIM (OpenAI-compatible) API.
    Returns the assistant's text response.
    Set thinking=True to enable DeepSeek chain-of-thought reasoning (slower but smarter).
    """
    client = get_llm_client()

    kwargs = dict(
        model=model or settings.NVIDIA_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=0.95,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )

    if thinking:
        kwargs["extra_body"] = {
            "chat_template_kwargs": {"thinking": True, "reasoning_effort": "high"}
        }
        kwargs["stream"] = True
        # Collect streamed content, skip reasoning tokens
        full = ""
        for chunk in client.chat.completions.create(**kwargs):
            if not getattr(chunk, "choices", None):
                continue
            delta = chunk.choices[0].delta
            if getattr(delta, "content", None):
                full += delta.content
        return full
    else:
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""


def parse_json_response(text: str) -> dict:
    """
    Safely extract JSON from an LLM response.
    Handles markdown code fences and loose text around the JSON.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1])
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        logger.warning("Could not parse JSON from LLM response: %s", text[:200])
        return {}


def log_agent_event(
    session: Session,
    event_type: AgentEventType,
    agent_name: str,
    title: str,
    detail: str,
    entity_id: str | None = None,
    entity_type: str | None = None,
    confidence: float | None = None,
    duration_ms: int | None = None,
) -> AgentEvent:
    """Persist an agent activity event to the database."""
    event = AgentEvent(
        event_type=event_type,
        agent_name=agent_name,
        title=title,
        detail=detail,
        entity_id=entity_id,
        entity_type=entity_type,
        confidence=confidence,
        duration_ms=duration_ms,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event
