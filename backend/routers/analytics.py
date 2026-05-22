"""
Analytics router — readiness score + priority queue
"""
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import User
from db.crud import get_mastery_scores_by_user, get_quiz_attempts_by_user
from routers.deps import get_current_user
from routers.planner import SCIENCE_WEIGHTAGE, MATHS_WEIGHTAGE
from core.personalization import compute_priority_queue, compute_readiness_index

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _weightage_for(user: User) -> dict:
    return SCIENCE_WEIGHTAGE if user.subject == "science" else MATHS_WEIGHTAGE


def _mastery_profile_for_subject(scores: list, user: User) -> dict:
    """Build mastery profile for active subject only; default missing topics to 0.5."""
    weightage = _weightage_for(user)
    by_topic = {s.topic: s for s in scores if s.topic in weightage}
    profile = {}
    for topic in weightage:
        s = by_topic.get(topic)
        if s:
            profile[topic] = {
                "score": s.score,
                "sessions_done": s.sessions_done,
                "last_tested": s.last_tested.isoformat() if s.last_tested else None,
            }
        else:
            profile[topic] = {
                "score": 0.5,
                "sessions_done": 0,
                "last_tested": None,
            }
    return profile


@router.get("/")
async def get_analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scores = await get_mastery_scores_by_user(db, user.id)
    attempts = await get_quiz_attempts_by_user(db, user.id, limit=100)

    weightage = _weightage_for(user)
    subject_topics = set(weightage.keys())
    mastery_profile = _mastery_profile_for_subject(scores, user)

    exam_date = user.exam_date or (datetime.date.today() + datetime.timedelta(days=30))
    days_to_exam = max((exam_date - datetime.date.today()).days, 1)

    priority = compute_priority_queue(mastery_profile, weightage, days_to_exam)

    topic_perf = []
    for topic in sorted(mastery_profile.keys()):
        info = mastery_profile[topic]
        topic_attempts = [a for a in attempts if a.topic == topic]
        correct = sum(1 for a in topic_attempts if a.is_correct)
        total = len(topic_attempts)
        score = info["score"]
        tag = "Weak" if score < 0.5 else ("Building" if score < 0.7 else "Good")
        topic_perf.append({
            "topic": topic,
            "score": score,
            "tag": tag,
            "sessions_done": info["sessions_done"],
            "quiz_attempts": total,
            "quiz_accuracy": round(correct / total, 3) if total else None,
        })

    study_log = {}
    readiness = compute_readiness_index(
        mastery_profile, weightage, days_to_exam, study_log, user.daily_hours * 0.8
    )

    avg_mastery = sum(t["score"] for t in topic_perf) / max(len(topic_perf), 1)
    total_sessions = sum(t["sessions_done"] for t in topic_perf)

    return {
        "readiness": readiness,
        "days_to_exam": days_to_exam,
        "sessions_done": total_sessions,
        "avg_mastery": round(avg_mastery, 3),
        "topic_performance": topic_perf,
        "priority_queue": [
            {"topic": t, "score": s, "reason": r}
            for t, s, r in priority
            if t in subject_topics
        ],
        "subject": user.subject,
    }
