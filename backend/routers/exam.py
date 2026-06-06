"""
Exam router — CBSE mock exam generation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from services.exam_service import generate_exam_paper
from db.database import get_db
from routers.deps import get_current_user
from db.models import User

router = APIRouter(prefix="/api/exam", tags=["Exam"])

VALID_SUBJECTS = {"Science", "Mathematics", "Social Studies", "English"}
VALID_CLASSES  = {8, 9, 10}


class ExamRequest(BaseModel):
    subject: str
    class_level: int
    topic_filter: Optional[str] = None


@router.post("/generate")
async def generate_exam(
    request: ExamRequest,
    current_student: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.class_level not in VALID_CLASSES:
        raise HTTPException(status_code=400, detail="Exam mode only for Classes 8–10")
    if request.subject not in VALID_SUBJECTS:
        raise HTTPException(status_code=400, detail="Invalid subject")

    paper = await generate_exam_paper(
        request.subject,
        request.class_level,
        request.topic_filter,
    )
    return paper
