"""
Pydantic schemas for API requests/responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date


# ── Student Profile ────────────────────────────────────────────────────────────
class StudentProfile(BaseModel):
    name: str = "Student"
    subject: str = "NCERT Science – Keeping Time with the Skies"
    exam_date: str
    days_to_exam: int
    daily_hours: float = 3.0
    adherence_rate: float = 0.8


# ── Mastery ────────────────────────────────────────────────────────────────────
class TopicMastery(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    last_tested: Optional[str] = None
    sessions_done: int = 0


class MasteryProfile(BaseModel):
    topics: Dict[str, TopicMastery]


class MasteryUpdate(BaseModel):
    topic: str
    correct: int
    total: int


# ── Quiz ───────────────────────────────────────────────────────────────────────
class Question(BaseModel):
    question: str
    reference_answer: str
    difficulty: Optional[str] = None


class QuizRequest(BaseModel):
    mode: str = "full_book"  # "full_book" or "topic_specific"
    topic: Optional[str] = None
    count: int = Field(default=5, ge=1, le=10)


class AnswerSubmission(BaseModel):
    question: str
    reference_answer: str
    student_answer: str


class GradingResult(BaseModel):
    is_correct: bool
    feedback_speech: str
    score_explanation: str


# ── AI Tutor ───────────────────────────────────────────────────────────────────
class TutorQuestion(BaseModel):
    question: str
    chat_history: List[Dict[str, str]] = []
    mastery_score: float = 0.5
    topic: Optional[str] = None


class TutorResponse(BaseModel):
    answer: str
    citations: List[str]
    followup: str


class PracticeQuestionsRequest(BaseModel):
    topic: str
    mastery_score: float
    count: int = 3


# ── Study Planner ──────────────────────────────────────────────────────────────
class StudySession(BaseModel):
    date: str
    topic: str
    type: str  # "study", "revision", "mock"
    duration_min: int
    status: str = "pending"  # "pending", "done", "missed"
    resources: str


class PlanRequest(BaseModel):
    mastery_profile: Dict[str, TopicMastery]
    exam_weightage: Dict[str, float]
    exam_date: str
    daily_hours: float
    adherence_rate: float


class SessionComplete(BaseModel):
    date: str
    topic: str


# ── Analytics ──────────────────────────────────────────────────────────────────
class ReadinessIndex(BaseModel):
    index: float
    weighted_mastery: float
    adherence: float
    time_buffer: float


class PriorityItem(BaseModel):
    topic: str
    score: float
    reason: str
