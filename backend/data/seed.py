"""
NEXUS — Demo Data Seeder
Populates the database with realistic organizational data for demo/portfolio purposes.
Runs automatically on first startup if the DB is empty.
"""

import json
import logging
from datetime import datetime, timedelta

from sqlmodel import Session, select, func

from core.database import engine
from core.models import (
    Email, EmailStatus, EmailPriority, EmailCategory,
    Meeting, MeetingStatus,
    Project, ProjectHealth,
    Decision, DecisionStatus, DecisionUrgency,
    AgentEvent, AgentEventType,
)

logger = logging.getLogger("nexus.seed")

NOW = datetime.utcnow()


def seed_if_empty():
    with Session(engine) as session:
        count = session.exec(select(func.count(Email.id))).one()
        if count > 0:
            logger.info("Database already seeded — skipping.")
            return
        logger.info("Seeding demo data...")
        _seed_emails(session)
        _seed_meetings(session)
        _seed_projects(session)
        _seed_decisions(session)
        _seed_agent_events(session)
        logger.info("Demo data seeded successfully.")


# ─────────────────────────────────────────────────
# Emails
# ─────────────────────────────────────────────────

def _seed_emails(session: Session):
    emails = [
        Email(
            subject="URGENT: Production outage — payments service down",
            sender_name="Alex Chen", sender_email="alex.chen@acmecorp.com",
            body="Hi, we're seeing a complete outage of the payments service since 14:32 UTC. "
                 "Transaction failure rate is 100%. Impacting ~3,000 customers. "
                 "Root cause suspected to be the deployment we pushed at 14:15. "
                 "Engineering is on it but need executive visibility and a decision on rollback.",
            received_at=NOW - timedelta(minutes=12),
            status=EmailStatus.FLAGGED, priority=EmailPriority.CRITICAL,
            category=EmailCategory.ACTION_REQUIRED,
            summary="Production payments outage affecting 3,000 customers since 14:32 UTC. Rollback decision needed.",
            sentiment="negative", confidence_score=0.97, requires_human=True,
            routing_reason="Critical production incident requiring executive decision on rollback",
            processed_at=NOW - timedelta(minutes=11),
        ),
        Email(
            subject="Re: Q3 Marketing Budget Approval — $480k",
            sender_name="Sarah Mitchell", sender_email="s.mitchell@acmecorp.com",
            body="Following our discussion last Thursday, I'm formally requesting approval for the Q3 "
                 "marketing budget of $480,000. This covers: digital ads ($220k), event sponsorships ($140k), "
                 "content production ($80k), and tooling ($40k). ROI projections show 3.2x return based "
                 "on Q2 benchmarks. Attached is the full breakdown. Happy to jump on a call to discuss.",
            received_at=NOW - timedelta(hours=2),
            status=EmailStatus.DRAFTED, priority=EmailPriority.HIGH,
            category=EmailCategory.DECISION,
            summary="Formal request for $480k Q3 marketing budget with 3.2x projected ROI.",
            sentiment="positive", confidence_score=0.81, requires_human=True,
            routing_reason="Budget commitment >$50k requires executive sign-off",
            ai_draft_reply="Thanks Sarah — I've reviewed the Q3 breakdown. The allocation looks well-considered "
                           "given Q2 benchmarks. I'm approving the $480k budget. Please proceed with vendor "
                           "commitments and send me a mid-quarter performance update by August 15th.",
            processed_at=NOW - timedelta(hours=1, minutes=55),
        ),
        Email(
            subject="Customer Escalation — TechFlow Inc. threatening churn",
            sender_name="Jordan Park", sender_email="j.park@acmecorp.com",
            body="Heads up — TechFlow's CTO reached out directly saying they're evaluating competitors. "
                 "Their main complaints: API latency has been 3x higher than SLA for 6 weeks, "
                 "and the onboarding of their new EU data centre still isn't complete. "
                 "They're a $240k ARR account. I've looped in the CSM team but wanted you to be aware. "
                 "A personal outreach from you could help retain them.",
            received_at=NOW - timedelta(hours=4),
            status=EmailStatus.SENT, priority=EmailPriority.HIGH,
            category=EmailCategory.CUSTOMER,
            summary="$240k ARR customer TechFlow threatening churn due to SLA breaches and incomplete onboarding.",
            sentiment="negative", confidence_score=0.91, requires_human=False,
            ai_draft_reply="Jordan — thanks for the flag. TechFlow is a priority account and this needs immediate action. "
                           "I'm scheduling a personal call with their CTO for this week. In parallel, please have "
                           "the CSM team prepare a remediation timeline for both the latency issue and EU migration "
                           "by EOD tomorrow. I'll also loop in the engineering lead on the SLA breach.",
            processed_at=NOW - timedelta(hours=3, minutes=50),
        ),
        Email(
            subject="Interview Feedback — Senior Product Manager, Priya Nair",
            sender_name="Chris Danford", sender_email="c.danford@acmecorp.com",
            body="Panel feedback from today's interview with Priya Nair (Sr PM candidate): "
                 "Myself: Strong hire — exceptional product sense, clear 0→1 experience. "
                 "Emma (Eng): Strong hire — understood technical trade-offs well. "
                 "Marcus (Design): Lean hire — good instincts but felt rushed on design critique. "
                 "Recommendation: Move to offer. Proposed comp: $165k base + $45k equity. "
                 "She has competing offers — need a decision by Friday.",
            received_at=NOW - timedelta(hours=6),
            status=EmailStatus.FLAGGED, priority=EmailPriority.HIGH,
            category=EmailCategory.HR,
            summary="3/3 panel recommends hiring Sr PM Priya Nair at $165k base. Competing offers — decision needed by Friday.",
            sentiment="positive", confidence_score=0.88, requires_human=True,
            routing_reason="Hiring decision with compensation package requires executive approval",
            processed_at=NOW - timedelta(hours=5, minutes=45),
        ),
        Email(
            subject="Weekly OKR Digest — Week 28",
            sender_name="NEXUS Reporting", sender_email="reports@nexus.acmecorp.com",
            body="OKR Progress Summary W28:\n"
                 "• Revenue OKR: 73% to target (on track)\n"
                 "• Product OKR: 58% to target (at risk — see Project Sentinel alerts)\n"
                 "• People OKR: 89% to target (strong)\n"
                 "• Customer OKR: 64% to target (at risk — CSAT dipped 4 points)\n"
                 "Full breakdown attached. Next review: Monday 09:00.",
            received_at=NOW - timedelta(days=1),
            status=EmailStatus.ARCHIVED, priority=EmailPriority.LOW,
            category=EmailCategory.FYI,
            summary="Weekly OKR digest: Revenue on track (73%), Product and Customer OKRs at risk.",
            sentiment="neutral", confidence_score=0.99, requires_human=False,
            processed_at=NOW - timedelta(days=1),
        ),
        Email(
            subject="Vendor Contract Renewal — Cloudbase Storage ($18k/yr)",
            sender_name="Raj Patel", sender_email="r.patel@cloudbase.io",
            body="Hi, your annual Cloudbase storage contract renews on the 15th. "
                 "We're proposing a 12% price increase to $18,200/yr reflecting infrastructure cost increases. "
                 "We've also added a new 99.99% SLA with penalty credits. "
                 "Happy to negotiate a 2-year lock-in for a 5% discount off the new rate. "
                 "Please let us know how you'd like to proceed.",
            received_at=NOW - timedelta(hours=18),
            status=EmailStatus.SENT, priority=EmailPriority.MEDIUM,
            category=EmailCategory.VENDOR,
            summary="Cloudbase storage renewal at $18.2k/yr (+12%). Offers 5% discount for 2-year commitment.",
            sentiment="neutral", confidence_score=0.93, requires_human=False,
            ai_draft_reply="Hi Raj — thanks for reaching out. We're open to renewal and the improved SLA is appreciated. "
                           "We'd like to proceed with the 2-year lock-in to take advantage of the 5% discount, "
                           "bringing the rate to approximately $17,290/yr. Please send over the updated contract "
                           "and we'll aim to have it signed within 5 business days.",
            processed_at=NOW - timedelta(hours=17),
        ),
        Email(
            subject="All-Hands Prep — CEO Talking Points Request",
            sender_name="Nadia Owens", sender_email="n.owens@acmecorp.com",
            body="Hey! The all-hands is in 3 days (Thursday 11am). "
                 "Could you send me your key talking points by tomorrow EOD so I can build the slide deck? "
                 "Main topics: H2 strategy pivot, recent product wins, culture/values refresh, Q&A guidance. "
                 "Aiming for a 30-min presentation + 15-min Q&A. Let me know if you want a call to align.",
            received_at=NOW - timedelta(hours=9),
            status=EmailStatus.DRAFTED, priority=EmailPriority.MEDIUM,
            category=EmailCategory.ACTION_REQUIRED,
            summary="EA requesting CEO talking points for all-hands in 3 days covering H2 strategy, product wins, and culture.",
            sentiment="neutral", confidence_score=0.89, requires_human=False,
            ai_draft_reply="Hi Nadia — happy to get you those points. Key themes I want to hit: "
                           "(1) H2 strategy: doubling down on enterprise and new EU market entry. "
                           "(2) Product wins: record-breaking feature velocity this quarter — shout out to the team. "
                           "(3) Culture: our manager effectiveness scores hit an all-time high — what we're doing is working. "
                           "(4) Q&A: I'll take live questions, no pre-screening needed. "
                           "Please draft slides around these and share a first cut for my review by Wednesday 5pm.",
            processed_at=NOW - timedelta(hours=8, minutes=45),
        ),
    ]

    for e in emails:
        session.add(e)
    session.commit()
    logger.info("Seeded %d emails", len(emails))


# ─────────────────────────────────────────────────
# Meetings
# ─────────────────────────────────────────────────

def _seed_meetings(session: Session):
    meetings = [
        Meeting(
            title="Q3 Strategy Review — Executive Team",
            description="Quarterly strategy review covering H2 priorities, resource allocation, and OKR recalibration.",
            scheduled_at=NOW + timedelta(hours=2),
            duration_minutes=90,
            attendees=json.dumps(["CEO", "CFO", "CTO", "CMO", "VP Product", "VP Sales"]),
            organizer="CEO",
            status=MeetingStatus.BRIEFING_READY,
            pre_brief=(
                "OBJECTIVE\nAlign executive team on H2 strategy, resolve resource conflicts, and recalibrate OKRs.\n\n"
                "KEY CONTEXT\n"
                "• Q2 revenue came in at 94% of target — solid but below the 98% stretch goal\n"
                "• Engineering headcount request (8 FTEs) is in conflict with CFO's cost-containment stance\n"
                "• The EU market entry is 6 weeks behind schedule due to GDPR compliance delays\n\n"
                "WATCH POINTS\n"
                "• CTO and CFO are likely to disagree on the headcount ask — mediate early\n"
                "• VP Sales may push to deprioritise product investment for short-term revenue plays\n\n"
                "SUGGESTED AGENDA\n"
                "• [10m] Q2 retrospective — what we learned\n"
                "• [25m] H2 OKR recalibration\n"
                "• [20m] Engineering headcount decision\n"
                "• [20m] EU market entry timeline fix\n"
                "• [15m] Actions & owners\n\n"
                "TALKING POINTS\n"
                "• Frame the headcount ask as revenue-generating, not a cost — model the ARR impact\n"
                "• Acknowledge the EU delay openly; present a concrete 4-week recovery plan\n"
                "• Reinforce that Q3 is a 'land and expand' quarter — depth over breadth"
            ),
            agenda=json.dumps([
                {"item": "Q2 retrospective", "minutes": 10},
                {"item": "H2 OKR recalibration", "minutes": 25},
                {"item": "Engineering headcount decision", "minutes": 20},
                {"item": "EU market entry fix", "minutes": 20},
                {"item": "Actions & owners", "minutes": 15},
            ]),
        ),
        Meeting(
            title="TechFlow Account Recovery Call",
            description="Executive-level call with TechFlow CTO to address SLA breaches and prevent churn.",
            scheduled_at=NOW + timedelta(days=1, hours=3),
            duration_minutes=45,
            attendees=json.dumps(["CEO", "TechFlow CTO", "VP Customer Success", "Eng Lead"]),
            organizer="CEO",
            status=MeetingStatus.BRIEFING_READY,
            pre_brief=(
                "OBJECTIVE\nRetain TechFlow ($240k ARR) by demonstrating commitment and presenting a credible remediation plan.\n\n"
                "KEY CONTEXT\n"
                "• API latency has exceeded SLA by 3x for 6 weeks — root cause: under-provisioned EU cluster\n"
                "• EU data centre migration is 4 weeks overdue due to infrastructure dependency\n"
                "• TechFlow CTO (David Lim) is technically deep — avoid vague assurances\n\n"
                "WATCH POINTS\n"
                "• Do NOT offer a discount without finance approval — offer service credits instead\n"
                "• CTO may ask about competitor feature parity — stay neutral, focus on remediation\n\n"
                "TALKING POINTS\n"
                "• Open with a direct acknowledgement of the failure — no spin\n"
                "• Present the 3-week remediation roadmap with specific milestones\n"
                "• Offer 2 months of service credits as a goodwill gesture"
            ),
        ),
        Meeting(
            title="Hiring Panel Debrief — Sr PM Role",
            description="Panel debrief and final hiring decision for Senior Product Manager candidate Priya Nair.",
            scheduled_at=NOW + timedelta(hours=26),
            duration_minutes=30,
            attendees=json.dumps(["CEO", "VP Product", "Chris Danford", "Emma Ross"]),
            organizer="VP Product",
            status=MeetingStatus.SCHEDULED,
        ),
        Meeting(
            title="Board Meeting — Q2 Results & H2 Outlook",
            description="Quarterly board meeting covering Q2 financial results, key metrics, and H2 plan.",
            scheduled_at=NOW + timedelta(days=7),
            duration_minutes=120,
            attendees=json.dumps(["CEO", "CFO", "Board Chair", "3x Board Members", "Legal Counsel"]),
            organizer="CEO",
            status=MeetingStatus.SCHEDULED,
        ),
        Meeting(
            title="Product Roadmap Review — Q4 Planning",
            description="Engineering and Product alignment on Q4 roadmap priorities and tech debt budget.",
            scheduled_at=NOW - timedelta(days=1),
            duration_minutes=60,
            attendees=json.dumps(["VP Product", "CTO", "4x Senior Engineers", "2x PMs"]),
            organizer="VP Product",
            status=MeetingStatus.COMPLETED,
            summary="Agreed to allocate 20% of Q4 capacity to tech debt. New feature prioritisation: mobile app, EU compliance, and SSO. Next review in 2 weeks.",
            action_items=json.dumps([
                {"task": "Draft Q4 feature roadmap doc", "owner": "VP Product", "deadline": "2024-07-12", "priority": "high"},
                {"task": "Scope mobile app effort estimate", "owner": "Eng Lead", "deadline": "2024-07-10", "priority": "high"},
                {"task": "Identify top 5 tech debt items for Q4", "owner": "CTO", "deadline": "2024-07-10", "priority": "medium"},
            ]),
            follow_up_sent=True,
        ),
    ]

    for m in meetings:
        session.add(m)
    session.commit()
    logger.info("Seeded %d meetings", len(meetings))


# ─────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────

def _seed_projects(session: Session):
    projects = [
        Project(
            name="Project Atlas — EU Market Entry",
            description="Full EU market expansion: GDPR compliance, EU data centre, localisation, and go-to-market.",
            owner="VP Product",
            team=json.dumps(["VP Product", "CTO", "Legal", "Marketing Lead", "3x Engineers"]),
            deadline=NOW + timedelta(days=42),
            budget_usd=320000, budget_spent_usd=198000,
            health=ProjectHealth.AT_RISK, health_score=62,
            tasks_total=48, tasks_done=29,
            milestones_hit=3, milestones_total=6,
            velocity_trend="flat",
            risk_flags=json.dumps([
                {"flag": "GDPR certification delayed by 3 weeks", "severity": "high", "action": "Escalate to Legal for fast-track review"},
                {"flag": "EU data centre provisioning 6 weeks behind", "severity": "high", "action": "Engage alternative provider as backup"},
                {"flag": "Localisation team at capacity", "severity": "medium", "action": "Contract 2 freelance translators for German/French"},
            ]),
            blockers=json.dumps(["GDPR certification sign-off pending Legal", "EU infrastructure vendor SLA not finalised"]),
            last_update="EU data centre provisioning started. GDPR audit scheduled for next week. Localisation 40% complete.",
            ai_recommendation="Critical path is GDPR certification. Recommend daily standups with Legal and parallel-track the data centre provisioning to de-risk the deadline.",
        ),
        Project(
            name="Payments V2 — Next-Gen Checkout",
            description="Complete rebuild of the payments flow with support for 12 new payment methods and sub-200ms latency.",
            owner="CTO",
            team=json.dumps(["CTO", "5x Engineers", "QA Lead", "VP Product"]),
            deadline=NOW + timedelta(days=28),
            budget_usd=180000, budget_spent_usd=172000,
            health=ProjectHealth.CRITICAL, health_score=41,
            tasks_total=62, tasks_done=38,
            milestones_hit=4, milestones_total=7,
            velocity_trend="down",
            risk_flags=json.dumps([
                {"flag": "Budget at 96% with 39% tasks remaining", "severity": "high", "action": "Immediate budget review with CFO"},
                {"flag": "P1 bug in 3DS authentication unresolved for 8 days", "severity": "high", "action": "Dedicate senior engineer full-time to fix"},
                {"flag": "Velocity dropped 35% last sprint", "severity": "high", "action": "Investigate root cause — team burnout suspected"},
                {"flag": "Deadline at risk — 28 days, 39% remaining tasks", "severity": "medium", "action": "Scope reduction required — identify MVP vs nice-to-have"},
            ]),
            blockers=json.dumps(["3DS authentication P1 bug blocking QA pipeline", "Budget overage requires CFO approval to continue"]),
            last_update="Core payment flows complete. 3DS bug is blocking QA on 8 payment methods. Team flagging capacity constraints.",
            ai_recommendation="IMMEDIATE: Resolve 3DS bug and present scope reduction plan to stakeholders. At current velocity, full delivery is 6-8 weeks — 2x the remaining deadline.",
        ),
        Project(
            name="Data Platform Modernisation",
            description="Migrate from legacy data warehouse to a modern lakehouse architecture (Snowflake + dbt).",
            owner="VP Engineering",
            team=json.dumps(["VP Engineering", "3x Data Engineers", "Analytics Lead"]),
            deadline=NOW + timedelta(days=75),
            budget_usd=95000, budget_spent_usd=41000,
            health=ProjectHealth.HEALTHY, health_score=84,
            tasks_total=35, tasks_done=22,
            milestones_hit=3, milestones_total=5,
            velocity_trend="up",
            risk_flags=json.dumps([
                {"flag": "Historical data migration volume larger than estimated", "severity": "low", "action": "Schedule extra migration window — low urgency"},
            ]),
            blockers=json.dumps([]),
            last_update="dbt models for 6 of 9 core domains complete. Snowflake migration 63% done. On track.",
            ai_recommendation="On track. Consider scheduling a knowledge transfer session for the analytics team on the new dbt models before go-live.",
        ),
        Project(
            name="Mobile App — iOS & Android",
            description="Native mobile apps for iOS and Android with full feature parity to the web product.",
            owner="VP Product",
            team=json.dumps(["VP Product", "2x iOS Engineers", "2x Android Engineers", "UI Designer"]),
            deadline=NOW + timedelta(days=90),
            budget_usd=250000, budget_spent_usd=62000,
            health=ProjectHealth.HEALTHY, health_score=88,
            tasks_total=55, tasks_done=18,
            milestones_hit=1, milestones_total=5,
            velocity_trend="up",
            risk_flags=json.dumps([]),
            blockers=json.dumps([]),
            last_update="Design system complete. Core navigation and auth flows shipped. iOS 6 weeks ahead of Android.",
            ai_recommendation="Strong start. Ensure Android parity doesn't fall behind iOS — consider pairing one iOS engineer to support Android for sprint 4.",
        ),
        Project(
            name="SOC 2 Type II Compliance",
            description="Achieve SOC 2 Type II certification for enterprise sales enablement.",
            owner="CISO",
            team=json.dumps(["CISO", "Legal", "DevOps Lead", "2x Security Engineers"]),
            deadline=NOW + timedelta(days=110),
            budget_usd=75000, budget_spent_usd=28000,
            health=ProjectHealth.AT_RISK, health_score=68,
            tasks_total=40, tasks_done=18,
            milestones_hit=2, milestones_total=6,
            velocity_trend="flat",
            risk_flags=json.dumps([
                {"flag": "Audit readiness review revealed 3 control gaps", "severity": "medium", "action": "Remediate access control and logging gaps within 2 weeks"},
                {"flag": "External auditor scheduling bottleneck — 4 week wait", "severity": "medium", "action": "Engage backup auditor firm as contingency"},
            ]),
            blockers=json.dumps(["3 control gaps must be remediated before audit can begin"]),
            last_update="Pre-audit gap analysis complete. 3 remediation items in progress. Auditor scheduled for Week 12.",
            ai_recommendation="The 3 control gaps are the critical path. Prioritise access control remediation this week. Also book the backup auditor now — 4-week delays are common.",
        ),
    ]

    for p in projects:
        session.add(p)
    session.commit()
    logger.info("Seeded %d projects", len(projects))


# ─────────────────────────────────────────────────
# Decisions
# ─────────────────────────────────────────────────

def _seed_decisions(session: Session):
    decisions = [
        Decision(
            title="Approve 2-year Cloudbase storage contract renewal",
            context="Cloudbase is proposing a 12% price increase ($18.2k/yr) with improved SLA. "
                    "They offer a 5% discount for a 2-year commitment (~$17.3k/yr). "
                    "Switching costs are high — 14TB of data, 3-month migration. "
                    "Current contract expires in 12 days.",
            options=json.dumps(["Sign 1-year at new price ($18.2k)", "Sign 2-year with 5% discount ($17.3k/yr)", "Negotiate further and risk expiry gap", "Begin competitive evaluation"]),
            submitted_by="VP Operations",
            urgency=DecisionUrgency.THIS_WEEK,
            department="Operations",
            status=DecisionStatus.AI_RESOLVED,
            ai_recommendation="Sign 2-year contract with 5% discount ($17.3k/yr)",
            ai_reasoning="The 2-year commitment saves ~$1,800/yr and the improved SLA adds concrete value. "
                         "Switching costs (14TB migration, 3 months) outweigh any competitive benefit. "
                         "Time-pressure from the 12-day expiry makes negotiation risky. Recommend signing.",
            confidence_score=0.93,
            resolved_at=NOW - timedelta(hours=3),
            resolution="Sign 2-year contract with 5% discount ($17.3k/yr)",
        ),
        Decision(
            title="Office lease renewal vs. remote-first transition",
            context="Our 3-year office lease expires in 90 days. Options: renew at $28k/month (same space), "
                    "downsize to hot-desk model at $14k/month, or go fully remote. "
                    "Employee survey: 58% prefer hybrid, 31% remote-only, 11% office-first. "
                    "We've grown from 45 to 78 employees since signing the current lease. "
                    "CFO is pushing for cost savings. Culture team warns remote transition needs careful handling.",
            options=json.dumps(["Renew full office ($28k/mo)", "Downsize to hybrid hot-desk ($14k/mo)", "Go fully remote", "Delay decision 30 days for deeper analysis"]),
            submitted_by="COO",
            urgency=DecisionUrgency.THIS_WEEK,
            department="Operations",
            status=DecisionStatus.ESCALATED,
            ai_recommendation="Downsize to hybrid hot-desk model ($14k/mo)",
            ai_reasoning="The hybrid option saves $168k/yr annually, aligns with employee preference (58% hybrid), "
                         "and avoids the cultural risk of forced remote. Full remote at 78 employees with no prior "
                         "remote culture is high risk. Escalated for CEO/COO final call given strategic culture implications.",
            confidence_score=0.74,
            escalated_to="CEO",
        ),
        Decision(
            title="Extend Payments V2 deadline or scope-cut to ship on time",
            context="Payments V2 is 6-8 weeks behind with budget nearly exhausted. "
                    "Two options: (A) Extend deadline 8 weeks + approve $40k budget extension — ships complete. "
                    "(B) Cut scope to core 6 payment methods, ship on time — adds remaining 6 in Q4. "
                    "Enterprise customers are waiting on the new payment methods for contract renewals.",
            options=json.dumps(["Extend deadline 8 weeks + $40k budget", "Scope-cut and ship MVP on time", "Pause project and reassess"]),
            submitted_by="CTO",
            urgency=DecisionUrgency.IMMEDIATE,
            department="Engineering",
            status=DecisionStatus.ESCALATED,
            ai_recommendation="Scope-cut and ship MVP on time",
            ai_reasoning="With budget at 96%, a $40k extension adds financial risk. Shipping 6 core payment methods "
                         "on time preserves customer trust and revenue. The remaining 6 methods in Q4 is a credible "
                         "promise. However, this has significant revenue implications — escalated for CEO/CTO joint decision.",
            confidence_score=0.71,
            escalated_to="CEO",
        ),
        Decision(
            title="Approve $4,200 conference sponsorship — TechCrunch Disrupt",
            context="Marketing wants to sponsor TechCrunch Disrupt (booth + 2 speaker slots) for $4,200. "
                    "Last year's sponsorship generated 47 qualified leads. Similar investment this year "
                    "is expected to generate 50-60 leads based on our improved brand recognition.",
            options=json.dumps(["Approve $4,200 sponsorship", "Approve at reduced tier ($1,800 — booth only)", "Decline"]),
            submitted_by="Marketing Lead",
            urgency=DecisionUrgency.THIS_WEEK,
            department="Marketing",
            status=DecisionStatus.AI_RESOLVED,
            ai_recommendation="Approve $4,200 sponsorship",
            ai_reasoning="Clear positive ROI precedent (47 leads last year at lower brand recognition). "
                         "$4,200 is well within policy for marketing spend. Expected 50-60 leads aligns with "
                         "pipeline targets. Approved autonomously — within standard marketing budget authority.",
            confidence_score=0.95,
            resolved_at=NOW - timedelta(hours=8),
            resolution="Approve $4,200 sponsorship",
        ),
        Decision(
            title="Performance Improvement Plan — underperforming engineer",
            context="A senior engineer has missed two consecutive sprint commitments, received critical "
                    "feedback from 3 peers in the 360 review, and had a prior verbal warning 6 weeks ago. "
                    "Engineering Manager recommends formal PIP. HR advises caution — engineer has 4 years tenure. "
                    "Team morale is reportedly affected.",
            options=json.dumps(["Issue formal 30-day PIP", "Second verbal warning with 4-week check-in", "Reassign to different team first", "Initiate separation process"]),
            submitted_by="VP Engineering",
            urgency=DecisionUrgency.THIS_WEEK,
            department="Engineering",
            status=DecisionStatus.ESCALATED,
            ai_recommendation="Issue formal 30-day PIP",
            ai_reasoning="Pattern of missed commitments and peer feedback, combined with a prior verbal warning, "
                         "meets the threshold for a formal PIP per standard HR policy. However, given 4-year tenure "
                         "and morale implications, this requires HR and executive alignment. Escalated to CHRO.",
            confidence_score=0.78,
            escalated_to="CHRO",
        ),
    ]

    for d in decisions:
        session.add(d)
    session.commit()
    logger.info("Seeded %d decisions", len(decisions))


# ─────────────────────────────────────────────────
# Agent Events
# ─────────────────────────────────────────────────

def _seed_agent_events(session: Session):
    events = [
        AgentEvent(event_type=AgentEventType.EMAIL_CLASSIFIED, agent_name="EmailAgent",
                   title="Email processed: URGENT: Production outage — payments service down",
                   detail="Escalated to human: Critical production incident | action_required | critical priority",
                   entity_type="email", confidence=0.97, duration_ms=1240,
                   created_at=NOW - timedelta(minutes=11)),
        AgentEvent(event_type=AgentEventType.DRAFT_GENERATED, agent_name="EmailAgent",
                   title="Draft generated: Customer Escalation — TechFlow Inc.",
                   detail="Auto-sent reply (confidence: 91%) | customer | high priority",
                   entity_type="email", confidence=0.91, duration_ms=2180,
                   created_at=NOW - timedelta(hours=3, minutes=50)),
        AgentEvent(event_type=AgentEventType.DECISION_RESOLVED, agent_name="DecisionAgent",
                   title="Decision: Approve $4,200 TechCrunch Disrupt sponsorship",
                   detail="Auto-resolved → Approve $4,200 sponsorship | Confidence: 95%",
                   entity_type="decision", confidence=0.95, duration_ms=1870,
                   created_at=NOW - timedelta(hours=8)),
        AgentEvent(event_type=AgentEventType.DECISION_RESOLVED, agent_name="DecisionAgent",
                   title="Decision: Approve 2-year Cloudbase contract renewal",
                   detail="Auto-resolved → Sign 2-year with 5% discount | Confidence: 93%",
                   entity_type="decision", confidence=0.93, duration_ms=2050,
                   created_at=NOW - timedelta(hours=3)),
        AgentEvent(event_type=AgentEventType.DECISION_ROUTED, agent_name="DecisionAgent",
                   title="Decision: Office lease renewal vs. remote-first",
                   detail="Escalated to CEO (risk: high) | Confidence: 74%",
                   entity_type="decision", confidence=0.74, duration_ms=2340,
                   created_at=NOW - timedelta(hours=1, minutes=30)),
        AgentEvent(event_type=AgentEventType.MEETING_BRIEF, agent_name="MeetingAgent",
                   title="Pre-brief ready: Q3 Strategy Review — Executive Team",
                   detail="Generated 5-section briefing | 90min meeting",
                   entity_type="meeting", confidence=0.88, duration_ms=3120,
                   created_at=NOW - timedelta(hours=1)),
        AgentEvent(event_type=AgentEventType.PROJECT_RISK, agent_name="ProjectSentinel",
                   title="Health check: Payments V2 — Next-Gen Checkout → 41/100",
                   detail="Status: critical | 4 risk flags | Trend: down | 61% complete",
                   entity_type="project", confidence=0.91, duration_ms=1680,
                   created_at=NOW - timedelta(minutes=45)),
        AgentEvent(event_type=AgentEventType.PROJECT_RISK, agent_name="ProjectSentinel",
                   title="Health check: Project Atlas — EU Market Entry → 62/100",
                   detail="Status: at_risk | 3 risk flags | Trend: flat | 60% complete",
                   entity_type="project", confidence=0.87, duration_ms=1540,
                   created_at=NOW - timedelta(minutes=43)),
        AgentEvent(event_type=AgentEventType.EMAIL_CLASSIFIED, agent_name="EmailAgent",
                   title="Email processed: Vendor Contract Renewal — Cloudbase Storage",
                   detail="Auto-sent reply (confidence: 93%) | vendor | medium priority",
                   entity_type="email", confidence=0.93, duration_ms=2280,
                   created_at=NOW - timedelta(hours=17)),
        AgentEvent(event_type=AgentEventType.ACTION_ITEM, agent_name="MeetingAgent",
                   title="Post-meeting: Product Roadmap Review — Q4 Planning",
                   detail="Extracted 3 action items | Follow-up email drafted",
                   entity_type="meeting", confidence=0.90, duration_ms=2890,
                   created_at=NOW - timedelta(hours=22)),
    ]

    for e in events:
        session.add(e)
    session.commit()
    logger.info("Seeded %d agent events", len(events))
