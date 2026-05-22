"""
AI Tutor API endpoints
Features: conversation memory, mastery-aware tone, suggested follow-ups, bold term hints
"""
import os
import re
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from services.rag_service import retrieve, groq_chat, get_depth_instructions
from config import get_settings
from db.database import get_db
from db.models import User
from routers.deps import get_current_user

router = APIRouter(prefix="/api/tutor", tags=["Tutor"])
settings = get_settings()

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _resolve_pdf(subject: str) -> str:
    if subject == "maths":
        raw = os.getenv("PDF_MATHS_PATH", "ncert_maths_8.pdf")
    else:
        raw = os.getenv("PDF_SCIENCE_PATH", "ncert_science_8.pdf")
    if os.path.isabs(raw):
        resolved = raw
    else:
        resolved = os.path.abspath(os.path.join(_PROJECT_ROOT, raw))
    print(f"[tutor] subject={subject} pdf_path={resolved} exists={os.path.exists(resolved)}")
    return resolved


def _mastery_tone(mastery: float) -> str:
    if mastery < 0.4:
        return (
            "The student is a BEGINNER on this topic. "
            "Explain simply, use everyday analogies, avoid jargon. "
            "Break concepts into small numbered steps."
        )
    elif mastery <= 0.7:
        return (
            "The student has MODERATE understanding. "
            "Give clear explanations with one worked example. "
            "Use standard terminology but explain technical words."
        )
    else:
        return (
            "The student is ADVANCED on this topic. "
            "Go deeper — include edge cases, nuances, and common misconceptions. "
            "Challenge them with a harder follow-up question."
        )


def _parse_suggestions(raw_answer: str) -> tuple[str, list]:
    """
    Extract SUGGESTIONS: [...] from the end of the answer.
    Returns (clean_answer, suggestions_list).
    """
    pattern = re.compile(
        r'SUGGESTIONS:\s*(\[.*?\])\s*$',
        re.DOTALL | re.IGNORECASE
    )
    m = pattern.search(raw_answer)
    if not m:
        return raw_answer.strip(), []

    clean = raw_answer[:m.start()].strip()
    try:
        # Replace single quotes with double quotes for valid JSON
        json_str = m.group(1).replace("'", '"')
        suggestions = json.loads(json_str)
        if isinstance(suggestions, list):
            return clean, [str(s).strip() for s in suggestions[:3]]
    except Exception:
        pass
    return clean, []


class TutorRequest(BaseModel):
    question: str
    mastery_score: Optional[float] = 0.5
    subject: Optional[str] = None
    topic: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = []  # {role, content}


@router.post("/ask")
async def ask_tutor(
    req: TutorRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subject = (req.subject or user.subject or "science").lower()
    pdf_path = _resolve_pdf(subject)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail=f"PDF not found: {pdf_path}")
    if not req.question or len(req.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question too short")

    mastery = max(0.0, min(1.0, req.mastery_score or 0.5))
    subject_label = "Maths" if subject == "maths" else "Science"

    # ── RAG retrieval ──────────────────────────────────────────────────────────
    chunks = retrieve(req.question, pdf_path, top_k=5, topic=req.topic)
    if chunks:
        context = "\n\n".join(f"[Page {c['pages']}]\n{c['text']}" for c in chunks)
        citations = [f"Pages {c['pages']}" for c in chunks[:3]]
    else:
        context = "No specific context found — answer from general NCERT Class 8 knowledge."
        citations = []

    # ── System prompt ──────────────────────────────────────────────────────────
    tone = _mastery_tone(mastery)
    system_prompt = f"""You are PrepMeAI, an expert NCERT Class 8 {subject_label} tutor.
Answer ONLY based on the provided textbook context. If context doesn't cover the question, say so honestly.

{tone}

FORMATTING RULES:
- Wrap important terms and key concepts in **double asterisks** (e.g. **photosynthesis**)
- Use numbered steps for processes
- Keep answers focused and clear

After your answer, on a new line write exactly:
SUGGESTIONS: ['follow-up question 1', 'follow-up question 2', 'follow-up question 3']
Make the suggestions specific to what was just discussed.

Textbook context:
{context}
"""

    # ── Build messages with conversation history ───────────────────────────────
    history = (req.conversation_history or [])[-10:]  # cap at last 10 messages
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": req.question})

    # ── Generate ───────────────────────────────────────────────────────────────
    try:
        raw = groq_chat(messages, model=settings.groq_model_primary, temperature=0.35)
    except Exception:
        try:
            raw = groq_chat(messages, model=settings.groq_model_fallback, temperature=0.35)
        except Exception as e:
            raw = f"⚠️ Generation failed: {e}"

    answer, suggestions = _parse_suggestions(raw)

    return {
        "answer": answer,
        "suggested_questions": suggestions,
        "citations": citations,
        "sources": [{"pages": c["pages"], "preview": c["text"][:120] + "..."} for c in chunks[:3]],
        "retrieved_chunks": len(chunks),
    }
