from __future__ import annotations

from collections import deque
from difflib import SequenceMatcher
import re
from typing import Deque, Dict, List


_RECENT_QUESTION_CACHE: Dict[str, Deque[str]] = {}
_MAX_RECENT_QUESTIONS = 20
_DEFAULT_SIMILARITY_THRESHOLD = 0.84


def _canonical_subject(subject: str | None) -> str:
    value = (subject or "science").lower().strip()
    if value in ("maths", "mathematics"):
        return "maths"
    if value in ("social", "social science", "social studies", "social_studies"):
        return "social"
    if value == "english":
        return "english"
    return "science"


def _history_key(user_id: str | None, subject: str | None, topic: str | None) -> str:
    user_part = user_id or "anonymous"
    topic_part = (topic or "__all__").strip().lower()
    return f"{user_part}:{_canonical_subject(subject)}:{topic_part}"


def _normalize_question(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (text or "").lower())).strip()


def get_recent_questions(
    user_id: str | None,
    subject: str | None,
    topic: str | None,
    limit: int = 10,
) -> List[str]:
    key = _history_key(user_id, subject, topic)
    history = list(_RECENT_QUESTION_CACHE.get(key, deque()))
    return history[-limit:]


def build_recent_questions_context(recent_questions: List[str]) -> str:
    if not recent_questions:
        return ""
    lines = "\n".join(f"- {question}" for question in recent_questions[-10:])
    return (
        "Avoid generating questions similar to these recent questions:\n"
        f"{lines}\n"
    )


def similarity_score(left: str, right: str) -> float:
    return SequenceMatcher(None, _normalize_question(left), _normalize_question(right)).ratio()


def is_question_too_similar(
    new_question: str,
    recent_questions: List[str],
    threshold: float = _DEFAULT_SIMILARITY_THRESHOLD,
) -> bool:
    if not new_question or not recent_questions:
        return False
    return any(similarity_score(new_question, old_question) >= threshold for old_question in recent_questions)


def register_generated_question(
    user_id: str | None,
    subject: str | None,
    topic: str | None,
    question: str,
) -> None:
    if not question:
        return

    key = _history_key(user_id, subject, topic)
    history = _RECENT_QUESTION_CACHE.setdefault(key, deque(maxlen=_MAX_RECENT_QUESTIONS))
    normalized = _normalize_question(question)

    if history and _normalize_question(history[-1]) == normalized:
        return

    if any(similarity_score(question, existing) >= _DEFAULT_SIMILARITY_THRESHOLD for existing in history):
        return

    history.append(question)


def log_recent_question_state(user_id: str | None, subject: str | None, topic: str | None) -> None:
    key = _history_key(user_id, subject, topic)
    print(f"[quiz] recent-history key={key} count={len(_RECENT_QUESTION_CACHE.get(key, []))}")