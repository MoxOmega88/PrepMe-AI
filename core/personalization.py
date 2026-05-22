"""
core/personalization.py
Personalization Engine – computes topic priority queue and explanation depth flag.

Priority score = (1 - mastery) × exam_weightage × urgency_factor
urgency_factor  = 1 + (1 / max(days_to_exam, 1)) × 10   (rises as exam approaches)

Depth flag:
  < 0.50  → "basic"    (analogies, step-by-step, no jargon)
  0.50–0.75 → "balanced" (worked examples)
  > 0.75  → "advanced" (edge cases, misconceptions, tricky variants)
"""
from __future__ import annotations
from typing import Dict, List, Tuple
import math


TOPIC_DEPENDENCIES: Dict[str, List[str]] = {
    "Celestial Bodies & Motion":     [],
    "Solar System & Planets":        ["Celestial Bodies & Motion"],
    "Earth's Rotation & Revolution": ["Celestial Bodies & Motion"],
    "Moon Phases & Lunar Calendar":  ["Earth's Rotation & Revolution"],
    "Seasons & Solstices":           ["Earth's Rotation & Revolution"],
    "Time Zones & Standard Time":    ["Earth's Rotation & Revolution"],
    "Calendars (Solar & Lunar)":     ["Moon Phases & Lunar Calendar", "Seasons & Solstices"],
    "Eclipses (Solar & Lunar)":      ["Moon Phases & Lunar Calendar", "Solar System & Planets"],
    "Stars & Constellations":        ["Celestial Bodies & Motion"],
    "Historical Astronomy":          [],
}


def _dependency_penalty(topic: str, mastery_map: Dict[str, float]) -> float:
    """
    Returns a multiplier (0.5–1.0).  If prerequisite topics are weak, studying
    this topic is less effective → lower priority (we should fix prereqs first).
    """
    deps = TOPIC_DEPENDENCIES.get(topic, [])
    if not deps:
        return 1.0
    avg_dep_mastery = sum(mastery_map.get(d, 0.5) for d in deps) / len(deps)
    # If avg dep mastery < 0.4 → heavy penalty; above 0.7 → no penalty
    return 0.5 + 0.5 * min(avg_dep_mastery / 0.7, 1.0)


def compute_priority_queue(
    mastery_profile: Dict,
    exam_weightage: Dict[str, float],
    days_to_exam: int,
) -> List[Tuple[str, float, str]]:
    """
    Returns a sorted list of (topic, priority_score, reason_string).
    Higher priority_score = should study sooner.
    """
    mastery_map = {t: v["score"] for t, v in mastery_profile.items()}
    urgency     = 1.0 + 10.0 / max(days_to_exam, 1)

    results = []
    for topic, info in mastery_profile.items():
        m      = info["score"]
        weight = exam_weightage.get(topic, 0.1)
        dep_ok = _dependency_penalty(topic, mastery_map)
        score  = (1.0 - m) * weight * urgency * dep_ok

        deps     = TOPIC_DEPENDENCIES.get(topic, [])
        weak_dep = [d for d in deps if mastery_map.get(d, 1) < 0.5]
        reason_parts = []
        if m < 0.4:
            reason_parts.append("low mastery")
        elif m < 0.6:
            reason_parts.append("moderate mastery")
        if weight >= 0.12:
            reason_parts.append("high exam weight")
        if weak_dep:
            reason_parts.append(f"prereq gap: {', '.join(weak_dep)}")
        if days_to_exam <= 7:
            reason_parts.append("exam very close")
        reason = "; ".join(reason_parts) if reason_parts else "steady progress"

        results.append((topic, round(score, 4), reason))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def get_depth_flag(mastery_score: float) -> str:
    if mastery_score < 0.50:
        return "basic"
    elif mastery_score <= 0.75:
        return "balanced"
    else:
        return "advanced"


def update_mastery_after_quiz(
    mastery_profile: Dict,
    topic: str,
    correct: int,
    total: int,
    alpha: float = 0.3,
) -> Dict:
    """
    Bayesian-style update:  new_score = (1 - alpha) × old + alpha × quiz_accuracy
    alpha controls how quickly new evidence overrides prior.
    Returns the updated mastery_profile dict.
    """
    import datetime
    if topic not in mastery_profile:
        mastery_profile[topic] = {"score": 0.5, "last_tested": None, "sessions_done": 0}

    old_score = mastery_profile[topic]["score"]
    accuracy  = correct / max(total, 1)
    new_score = (1 - alpha) * old_score + alpha * accuracy

    mastery_profile[topic]["score"]        = round(min(max(new_score, 0.0), 1.0), 3)
    mastery_profile[topic]["last_tested"]  = datetime.date.today().isoformat()
    mastery_profile[topic]["sessions_done"] = mastery_profile[topic].get("sessions_done", 0) + 1
    return mastery_profile


def compute_readiness_index(
    mastery_profile: Dict,
    exam_weightage: Dict[str, float],
    days_to_exam: int,
    study_log: Dict,
    plan_hours: float,
) -> float:
    """
    Composite readiness index (0–100).
    Components:
      • Weighted mastery score        (60 %)
      • Study adherence               (20 %)
      • Time buffer factor            (20 %)
    """
    # Weighted mastery
    total_weight  = sum(exam_weightage.values()) or 1
    weighted_m    = sum(
        mastery_profile[t]["score"] * exam_weightage.get(t, 0)
        for t in mastery_profile
    ) / total_weight

    # Study adherence (hours studied vs planned in last 7 days)
    studied_hours = sum(list(study_log.values())[-7:]) if study_log else 0
    target_hours  = max(plan_hours * 7, 1)
    adherence     = min(studied_hours / target_hours, 1.0)

    # Time buffer  (more days = more buffer)
    time_buffer   = min(days_to_exam / 30, 1.0)

    index = (0.60 * weighted_m + 0.20 * adherence + 0.20 * time_buffer) * 100
    return round(index, 1)