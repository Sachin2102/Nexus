"""
NEXUS — FastAPI Application Entry Point
Autonomous Organizational Intelligence Platform
"""

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.database import create_db_and_tables
from api import emails, meetings, projects, decisions, dashboard, chat, digest, analytics


# ─────────────────────────────────────────────────
# WebSocket connection manager (real-time agent feed)
# ─────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


# ─────────────────────────────────────────────────
# Lifespan — startup / shutdown
# ─────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()

    # Seed demo data on first run
    from data.seed import seed_if_empty
    seed_if_empty()

    yield  # app runs

    # Shutdown (nothing to clean up for SQLite)


# ─────────────────────────────────────────────────
# App definition
# ─────────────────────────────────────────────────

app = FastAPI(
    title="NEXUS API",
    description="Autonomous Organizational Intelligence — AI Chief of Staff",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(emails.router,     prefix="/api/emails",     tags=["Emails"])
app.include_router(meetings.router,   prefix="/api/meetings",   tags=["Meetings"])
app.include_router(projects.router,   prefix="/api/projects",   tags=["Projects"])
app.include_router(decisions.router,  prefix="/api/decisions",  tags=["Decisions"])
app.include_router(chat.router,       prefix="/api/chat",       tags=["Ask NEXUS"])
app.include_router(digest.router,     prefix="/api/digest",     tags=["Digest"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])


# ─────────────────────────────────────────────────
# WebSocket — real-time agent activity stream
# ─────────────────────────────────────────────────

@app.websocket("/ws/agents")
async def agent_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive ping every 30 s
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Expose manager so agents can broadcast
app.state.ws_manager = manager


# ─────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "org": settings.ORG_NAME,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/")
async def root():
    return {
        "name": "NEXUS",
        "tagline": "Autonomous Organizational Intelligence",
        "docs": "/docs",
    }
