"""
NEXUS — Database Models
SQLModel models (SQLAlchemy + Pydantic hybrid) for all entities.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────

class EmailStatus(str, Enum):
    UNREAD = "unread"
    PROCESSING = "processing"
    DRAFTED = "drafted"
    SENT = "sent"
    ARCHIVED = "archived"
    FLAGGED = "flagged"

class EmailPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EmailCategory(str, Enum):
    ACTION_REQUIRED = "action_required"
    FYI = "fyi"
    DECISION = "decision"
    VENDOR = "vendor"
    HR = "hr"
    CUSTOMER = "customer"
    INTERNAL = "internal"
    SPAM = "spam"

class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    BRIEFING_READY = "briefing_ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProjectHealth(str, Enum):
    HEALTHY = "healthy"
    AT_RISK = "at_risk"
    CRITICAL = "critical"
    ON_HOLD = "on_hold"

class DecisionStatus(str, Enum):
    PENDING = "pending"
    AI_RESOLVED = "ai_resolved"
    ESCALATED = "escalated"
    HUMAN_RESOLVED = "human_resolved"

class DecisionUrgency(str, Enum):
    IMMEDIATE = "immediate"
    THIS_WEEK = "this_week"
    THIS_MONTH = "this_month"

class AgentEventType(str, Enum):
    EMAIL_CLASSIFIED = "email_classified"
    DRAFT_GENERATED = "draft_generated"
    EMAIL_SENT = "email_sent"
    MEETING_BRIEF = "meeting_brief"
    ACTION_ITEM = "action_item"
    PROJECT_RISK = "project_risk"
    DECISION_ROUTED = "decision_routed"
    DECISION_RESOLVED = "decision_resolved"
    KNOWLEDGE_INDEXED = "knowledge_indexed"


# ─────────────────────────────────────────────────
# Email
# ─────────────────────────────────────────────────

class Email(SQLModel, table=True):
    __tablename__ = "emails"

    id: str = Field(default_factory=new_id, primary_key=True)
    subject: str
    sender_name: str
    sender_email: str
    recipient_email: str = "ceo@acmecorp.com"
    body: str
    received_at: datetime = Field(default_factory=datetime.utcnow)

    # AI-generated fields
    status: EmailStatus = EmailStatus.UNREAD
    priority: EmailPriority = EmailPriority.MEDIUM
    category: EmailCategory = EmailCategory.INTERNAL
    summary: Optional[str] = None
    sentiment: Optional[str] = None          # positive / neutral / negative
    ai_draft_reply: Optional[str] = None
    confidence_score: Optional[float] = None  # 0-1
    routing_reason: Optional[str] = None
    requires_human: bool = False
    processed_at: Optional[datetime] = None
    thread_id: Optional[str] = None


class EmailCreate(SQLModel):
    subject: str
    sender_name: str
    sender_email: str
    body: str


# ─────────────────────────────────────────────────
# Meeting
# ─────────────────────────────────────────────────

class Meeting(SQLModel, table=True):
    __tablename__ = "meetings"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 60
    attendees: str = ""           # JSON-serialized list
    organizer: str

    # AI-generated
    status: MeetingStatus = MeetingStatus.SCHEDULED
    agenda: Optional[str] = None
    pre_brief: Optional[str] = None           # AI pre-meeting brief
    action_items: Optional[str] = None        # JSON list post-meeting
    summary: Optional[str] = None
    follow_up_sent: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingCreate(SQLModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 60
    attendees: str = ""
    organizer: str


# ─────────────────────────────────────────────────
# Project
# ─────────────────────────────────────────────────

class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(default_factory=new_id, primary_key=True)
    name: str
    description: str
    owner: str
    team: str = ""                 # JSON list of team members
    deadline: Optional[datetime] = None
    budget_usd: Optional[float] = None
    budget_spent_usd: Optional[float] = None

    # Health tracking
    health: ProjectHealth = ProjectHealth.HEALTHY
    health_score: int = 100        # 0-100
    risk_flags: Optional[str] = None          # JSON list
    blockers: Optional[str] = None            # JSON list
    last_update: Optional[str] = None
    ai_recommendation: Optional[str] = None
    velocity_trend: Optional[str] = None      # up / flat / down

    # Progress
    tasks_total: int = 0
    tasks_done: int = 0
    milestones_hit: int = 0
    milestones_total: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectCreate(SQLModel):
    name: str
    description: str
    owner: str
    team: str = ""
    deadline: Optional[datetime] = None
    budget_usd: Optional[float] = None


# ─────────────────────────────────────────────────
# Decision
# ─────────────────────────────────────────────────

class Decision(SQLModel, table=True):
    __tablename__ = "decisions"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str
    context: str
    options: str = ""             # JSON list of options
    submitted_by: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    urgency: DecisionUrgency = DecisionUrgency.THIS_WEEK
    department: Optional[str] = None

    # AI resolution
    status: DecisionStatus = DecisionStatus.PENDING
    ai_recommendation: Optional[str] = None
    ai_reasoning: Optional[str] = None
    confidence_score: Optional[float] = None
    escalated_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None


class DecisionCreate(SQLModel):
    title: str
    context: str
    options: str = ""
    submitted_by: str
    urgency: DecisionUrgency = DecisionUrgency.THIS_WEEK
    department: Optional[str] = None


# ─────────────────────────────────────────────────
# Agent Activity Log
# ─────────────────────────────────────────────────

class AgentEvent(SQLModel, table=True):
    __tablename__ = "agent_events"

    id: str = Field(default_factory=new_id, primary_key=True)
    event_type: AgentEventType
    agent_name: str
    title: str
    detail: str
    entity_id: Optional[str] = None      # related email/meeting/project id
    entity_type: Optional[str] = None
    confidence: Optional[float] = None
    duration_ms: Optional[int] = None    # how long the agent took
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────
# Knowledge Base Document
# ─────────────────────────────────────────────────

class KnowledgeDoc(SQLModel, table=True):
    __tablename__ = "knowledge_docs"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str
    content: str
    doc_type: str = "policy"       # policy / sop / reference / history
    department: Optional[str] = None
    tags: Optional[str] = None     # comma-separated
    indexed_at: datetime = Field(default_factory=datetime.utcnow)
    chroma_id: Optional[str] = None
