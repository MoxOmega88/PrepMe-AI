"""
core/study_planner.py
Study Plan Generator
─────────────────────
Inputs  : mastery_profile, exam_date, daily_hours, exam_weightage, adherence_rate
Outputs : list of session dicts  { date, subject, topic, duration_min, type, status }

Algorithm:
1. Compute total available hours (days × daily_hours × adherence).
2. Reserve 20 % for revision + mock tests.
3. Allocate remaining hours across topics by priority score.
4. Slot sessions day by day, interleaving subjects (spaced repetition).
5. Surface adaptive recovery notices when sessions are missed.
"""
from __future__ import annotations
import datetime
from typing import Dict, List

from core.personalization import compute_priority_queue


SESSION_DURATION_MIN  = 45     # minutes per session slot
REVISION_FRACTION     = 0.20   # 20 % reserved for revision
MIN_SESSION_MIN       = 30     # don't create sessions shorter than this
INTERLEAVE_WINDOW     = 3      # rotate topic every N days


def _hours_to_sessions(hours: float) -> int:
    return max(1, round(hours * 60 / SESSION_DURATION_MIN))


def generate_study_plan(
    mastery_profile: Dict,
    exam_weightage: Dict[str, float],
    exam_date_str: str,
    daily_hours: float,
    adherence_rate: float,
) -> List[dict]:
    today       = datetime.date.today()
    exam_date   = datetime.date.fromisoformat(exam_date_str)
    days_left   = max((exam_date - today).days, 1)

    # Total usable study hours
    total_hours     = days_left * daily_hours * adherence_rate
    revision_hours  = total_hours * REVISION_FRACTION
    study_hours     = total_hours - revision_hours

    # Priority queue
    priority_queue  = compute_priority_queue(mastery_profile, exam_weightage, days_left)

    # Allocate hours proportional to priority score
    total_priority  = sum(score for _, score, _ in priority_queue) or 1.0
    allocations     = {
        topic: (score / total_priority) * study_hours
        for topic, score, _ in priority_queue
    }

    # Build session list
    sessions: List[dict] = []
    topic_cycle    = [t for t, _, _ in priority_queue]
    topic_ptr      = 0
    current_date   = today
    daily_slots    = max(1, int(daily_hours * 60 / SESSION_DURATION_MIN))

    # Track remaining time per topic
    remaining_min  = {
        topic: max(int(hours * 60), MIN_SESSION_MIN)
        for topic, hours in allocations.items()
    }

    for day_offset in range(days_left):
        current_date = today + datetime.timedelta(days=day_offset)
        if current_date >= exam_date:
            break

        # Last 3 days → revision only
        days_remaining = (exam_date - current_date).days
        if days_remaining <= 3:
            sessions.append({
                "date":         current_date.isoformat(),
                "topic":        "Full Revision",
                "type":         "revision",
                "duration_min": int(daily_hours * 60),
                "status":       "pending",
                "resources":    "Review all chapter summaries + past papers",
            })
            continue

        slots_today = 0
        while slots_today < daily_slots and topic_ptr < len(topic_cycle):
            topic = topic_cycle[topic_ptr % len(topic_cycle)]
            rem   = remaining_min.get(topic, 0)

            if rem <= 0:
                topic_ptr += 1
                if topic_ptr >= len(topic_cycle):
                    break
                continue

            dur = min(rem, SESSION_DURATION_MIN)
            if dur < MIN_SESSION_MIN:
                topic_ptr += 1
                continue

            sessions.append({
                "date":         current_date.isoformat(),
                "topic":        topic,
                "type":         "study",
                "duration_min": dur,
                "status":       "pending",
                "resources":    f"NCERT Chapter on {topic} + AI Tutor Q&A",
            })
            remaining_min[topic] -= dur
            slots_today += 1
            topic_ptr   += 1

        # Add a short revision slot every 3rd day
        if day_offset > 0 and day_offset % INTERLEAVE_WINDOW == 0:
            last_topic = sessions[-1]["topic"] if sessions else "Previous topics"
            sessions.append({
                "date":         current_date.isoformat(),
                "topic":        f"Quick Revision – {last_topic}",
                "type":         "revision",
                "duration_min": 20,
                "status":       "pending",
                "resources":    "Flashcards + quiz",
            })

    # Add mock test one week before exam
    mock_date = exam_date - datetime.timedelta(days=7)
    if mock_date > today:
        sessions.append({
            "date":         mock_date.isoformat(),
            "topic":        "Full Mock Test",
            "type":         "mock",
            "duration_min": int(daily_hours * 60),
            "status":       "pending",
            "resources":    "Past 3 years exam papers",
        })

    return sorted(sessions, key=lambda s: s["date"])


def get_missed_sessions(plan: List[dict]) -> List[dict]:
    today = datetime.date.today().isoformat()
    return [s for s in plan if s["date"] < today and s["status"] == "pending"]


def adaptive_recovery(plan: List[dict], missed: List[dict]) -> dict:
    """
    Returns a recovery summary and compressed plan.
    Strategy: redistribute missed session minutes over next 5 days.
    """
    if not missed:
        return {"missed_count": 0, "message": "", "redistributed_min": 0}

    missed_min = sum(s["duration_min"] for s in missed)
    # Mark missed sessions as 'missed'
    missed_ids = {(s["date"], s["topic"]) for s in missed}
    for s in plan:
        if (s["date"], s["topic"]) in missed_ids:
            s["status"] = "missed"

    return {
        "missed_count":     len(missed),
        "message":          (
            f"You missed **{len(missed)} session(s)** "
            f"({missed_min} min total). "
            "The plan has been updated — priority topics get extra time this week."
        ),
        "redistributed_min": missed_min,
    }


def mark_session_complete(plan: List[dict], date: str, topic: str) -> List[dict]:
    for s in plan:
        if s["date"] == date and s["topic"] == topic:
            s["status"] = "done"
    return plan