"""
CRUD operations for database models
Helper functions for common database operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List, Type, TypeVar
from uuid import UUID

from .models import User, MasteryScore, QuizAttempt, StudySession, StudyPlan

T = TypeVar("T")


# ── Generic CRUD Operations ────────────────────────────────────────────────────

async def get_by_id(
    db: AsyncSession,
    model: Type[T],
    id: UUID
) -> Optional[T]:
    """Get a record by ID"""
    result = await db.execute(select(model).where(model.id == id))
    return result.scalar_one_or_none()


async def get_all(
    db: AsyncSession,
    model: Type[T],
    skip: int = 0,
    limit: int = 100
) -> List[T]:
    """Get all records with pagination"""
    result = await db.execute(select(model).offset(skip).limit(limit))
    return list(result.scalars().all())


async def create(
    db: AsyncSession,
    instance: T
) -> T:
    """Create a new record"""
    db.add(instance)
    await db.flush()
    await db.refresh(instance)
    return instance


async def delete_by_id(
    db: AsyncSession,
    model: Type[T],
    id: UUID
) -> bool:
    """Delete a record by ID"""
    result = await db.execute(delete(model).where(model.id == id))
    return result.rowcount > 0


# ── User Operations ────────────────────────────────────────────────────────────

async def get_user_by_email(
    db: AsyncSession,
    email: str
) -> Optional[User]:
    """Get user by email"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_with_relations(
    db: AsyncSession,
    user_id: UUID
) -> Optional[User]:
    """Get user with all related data"""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.mastery_scores),
            selectinload(User.quiz_attempts),
            selectinload(User.study_sessions),
            selectinload(User.study_plans)
        )
    )
    return result.scalar_one_or_none()


# ── Mastery Score Operations ───────────────────────────────────────────────────

async def get_mastery_scores_by_user(
    db: AsyncSession,
    user_id: UUID
) -> List[MasteryScore]:
    """Get all mastery scores for a user"""
    result = await db.execute(
        select(MasteryScore)
        .where(MasteryScore.user_id == user_id)
        .order_by(MasteryScore.topic)
    )
    return list(result.scalars().all())


async def get_mastery_score_by_topic(
    db: AsyncSession,
    user_id: UUID,
    topic: str
) -> Optional[MasteryScore]:
    """Get mastery score for a specific topic"""
    result = await db.execute(
        select(MasteryScore)
        .where(MasteryScore.user_id == user_id, MasteryScore.topic == topic)
    )
    return result.scalar_one_or_none()


async def upsert_mastery_score(
    db: AsyncSession,
    user_id: UUID,
    topic: str,
    score: float,
    sessions_done: int
) -> MasteryScore:
    """Create or update mastery score"""
    existing = await get_mastery_score_by_topic(db, user_id, topic)
    
    if existing:
        existing.score = score
        existing.sessions_done = sessions_done
        await db.flush()
        await db.refresh(existing)
        return existing
    else:
        new_score = MasteryScore(
            user_id=user_id,
            topic=topic,
            score=score,
            sessions_done=sessions_done
        )
        return await create(db, new_score)


# ── Quiz Attempt Operations ────────────────────────────────────────────────────

async def get_quiz_attempts_by_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50
) -> List[QuizAttempt]:
    """Get recent quiz attempts for a user"""
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.attempted_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_quiz_attempts_by_topic(
    db: AsyncSession,
    user_id: UUID,
    topic: str
) -> List[QuizAttempt]:
    """Get quiz attempts for a specific topic"""
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user_id, QuizAttempt.topic == topic)
        .order_by(QuizAttempt.attempted_at.desc())
    )
    return list(result.scalars().all())


# ── Study Session Operations ───────────────────────────────────────────────────

async def get_study_sessions_by_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 100
) -> List[StudySession]:
    """Get study sessions for a user"""
    result = await db.execute(
        select(StudySession)
        .where(StudySession.user_id == user_id)
        .order_by(StudySession.date.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_study_sessions_by_date_range(
    db: AsyncSession,
    user_id: UUID,
    start_date,
    end_date
) -> List[StudySession]:
    """Get study sessions within a date range"""
    result = await db.execute(
        select(StudySession)
        .where(
            StudySession.user_id == user_id,
            StudySession.date >= start_date,
            StudySession.date <= end_date
        )
        .order_by(StudySession.date)
    )
    return list(result.scalars().all())


async def update_session_status(
    db: AsyncSession,
    session_id: UUID,
    status: str,
    actual_minutes: Optional[int] = None
) -> Optional[StudySession]:
    """Update study session status"""
    session = await get_by_id(db, StudySession, session_id)
    if session:
        session.status = status
        if actual_minutes is not None:
            session.actual_minutes = actual_minutes
        await db.flush()
        await db.refresh(session)
    return session


# ── Study Plan Operations ──────────────────────────────────────────────────────

async def get_latest_study_plan(
    db: AsyncSession,
    user_id: UUID
) -> Optional[StudyPlan]:
    """Get the most recent study plan for a user"""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user_id)
        .order_by(StudyPlan.generated_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_study_plans_by_user(
    db: AsyncSession,
    user_id: UUID
) -> List[StudyPlan]:
    """Get all study plans for a user"""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user_id)
        .order_by(StudyPlan.generated_at.desc())
    )
    return list(result.scalars().all())
