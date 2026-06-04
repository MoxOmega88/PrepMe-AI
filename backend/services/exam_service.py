"""
CBSE Mock Exam Generation Service
Generates full 80-mark CBSE-pattern exam papers using RAG + Groq
"""
import os
import re
import json
import asyncio
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from services.rag_service import retrieve, groq_chat, get_or_build_index
from config import get_settings

settings = get_settings()

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── PDF resolution ─────────────────────────────────────────────────────────────
def _resolve_pdf(subject: str) -> str:
    s = subject.lower()
    if s == "mathematics":
        raw = os.getenv("PDF_MATHS_PATH", "ncert_maths_8.pdf")
    elif s == "social studies":
        raw = os.getenv("PDF_SOCIAL_PATH", "ncert_social_8.pdf")
    elif s == "english":
        raw = os.getenv("PDF_ENGLISH_PATH", "ncert_english_8.pdf")
    else:  # Science default
        raw = os.getenv("PDF_SCIENCE_PATH", "ncert_science_8.pdf")
    if os.path.isabs(raw):
        return raw
    return os.path.abspath(os.path.join(_PROJECT_ROOT, raw))


# ── CBSE Exam Patterns ─────────────────────────────────────────────────────────
CBSE_PATTERNS = {
    "Science": [
        {"name": "Section A", "type": "MCQ",        "questions": 20, "marks_each": 1,
         "includes_ar": 4, "instructions": "Multiple Choice Questions (includes 4 Assertion-Reason)"},
        {"name": "Section B", "type": "VSA",        "questions": 6,  "marks_each": 2,
         "instructions": "Very Short Answer questions (2 marks each)"},
        {"name": "Section C", "type": "SA",         "questions": 7,  "marks_each": 3,
         "instructions": "Short Answer questions (3 marks each)"},
        {"name": "Section D", "type": "LA",         "questions": 3,  "marks_each": 5,
         "instructions": "Long Answer questions (5 marks each)"},
        {"name": "Section E", "type": "CaseStudy",  "questions": 3,  "marks_each": 4,
         "instructions": "Case-Based questions. Read the passage and answer sub-questions."},
    ],
    "Mathematics": [
        {"name": "Section A", "type": "MCQ",        "questions": 20, "marks_each": 1,
         "includes_ar": 2, "instructions": "Multiple Choice Questions (includes 2 Assertion-Reason)"},
        {"name": "Section B", "type": "VSA",        "questions": 5,  "marks_each": 2,
         "instructions": "Very Short Answer questions (2 marks each)"},
        {"name": "Section C", "type": "SA",         "questions": 6,  "marks_each": 3,
         "instructions": "Short Answer questions (3 marks each)"},
        {"name": "Section D", "type": "LA",         "questions": 4,  "marks_each": 5,
         "instructions": "Long Answer questions (5 marks each)"},
        {"name": "Section E", "type": "CaseStudy",  "questions": 3,  "marks_each": 4,
         "instructions": "Case Study questions with sub-parts (1+1+2 marks)"},
    ],
    "Social Studies": [
        {"name": "Section A", "type": "MCQ",        "questions": 20, "marks_each": 1,
         "includes_ar": 0, "instructions": "Multiple Choice Questions (1 mark each)"},
        {"name": "Section B", "type": "VSA",        "questions": 4,  "marks_each": 2,
         "instructions": "Very Short Answer questions (2 marks each)"},
        {"name": "Section C", "type": "SA",         "questions": 5,  "marks_each": 3,
         "instructions": "Short Answer questions (3 marks each)"},
        {"name": "Section D", "type": "LA",         "questions": 4,  "marks_each": 5,
         "instructions": "Long Answer questions (5 marks each)"},
        {"name": "Section E", "type": "CaseStudy",  "questions": 3,  "marks_each": 4,
         "instructions": "Case Study questions (4 marks each)"},
        {"name": "Section F", "type": "Map",        "questions": 1,  "marks_each": 5,
         "instructions": "Map-based question (5 marks)"},
    ],
    "English": [
        {"name": "Section A", "type": "Reading",    "questions": 2,  "marks_each": 10,
         "instructions": "Reading Comprehension (Discursive passage 10 marks + Factual/data passage 10 marks)"},
        {"name": "Section B", "type": "Writing",    "questions": 3,  "marks_each": 0,
         "instructions": "Writing & Grammar: Grammar (10) + Letter writing (5) + Analytical paragraph (5)"},
        {"name": "Section C", "type": "Literature", "questions": 3,  "marks_each": 0,
         "instructions": "Literature: Reference to Context (10) + Short Answer (18) + Long Answer (12)"},
    ],
}

# ── JSON extraction helper ─────────────────────────────────────────────────────
def _extract_json(raw: str):
    # Try direct parse first
    try:
        return json.loads(raw)
    except Exception:
        pass
    # Strip markdown fences
    raw = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    # Find outermost [ ] or { }
    for start_ch, end_ch in [("[", "]"), ("{", "}")]:
        start = raw.find(start_ch)
        end = raw.rfind(end_ch)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(raw[start:end + 1])
            except Exception:
                pass
    return None


# ── Context builder ────────────────────────────────────────────────────────────
def _get_context(subject: str, topic_filter: Optional[str], pdf_path: str, top_k: int = 20) -> str:
    query = topic_filter if topic_filter else subject
    chunks = retrieve(query, pdf_path, top_k=top_k, subject=subject.lower())
    if not chunks:
        # Fall back to full index sample
        all_chunks, _ = get_or_build_index(pdf_path)
        import random
        chunks = random.sample(all_chunks, min(top_k, len(all_chunks)))
    return "\n\n".join(c["text"] for c in chunks[:top_k])


# ── Section generators ─────────────────────────────────────────────────────────

def _gen_mcq_section(section: dict, context: str, subject: str) -> list:
    n_std = section["questions"] - section.get("includes_ar", 0)
    n_ar  = section.get("includes_ar", 0)

    prompt = (
        f"Generate a CBSE Class 8 {subject} exam Section A based ONLY on this textbook content.\n\n"
        f"CONTENT:\n{context[:4000]}\n\n"
        f"Generate {n_std} standard MCQs and {n_ar} Assertion-Reason questions.\n\n"
        "For each standard MCQ return:\n"
        '{"type":"mcq","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"...","bloom_level":"Remember","marks":1}\n\n'
        + (f"For each Assertion-Reason return:\n"
           '{"type":"assertion_reason","assertion":"...","reason":"...","options":["A) Both A and R are true and R is the correct explanation of A","B) Both A and R are true but R is not the correct explanation of A","C) A is true but R is false","D) A is false but R is true"],"correct":"A","explanation":"...","bloom_level":"Analyse","marks":1}\n\n'
           if n_ar > 0 else "") +
        f"Return a JSON array of exactly {section['questions']} question objects. No markdown fences."
    )
    raw = groq_chat([{"role": "user", "content": prompt}], temperature=0.7)
    data = _extract_json(raw)
    if isinstance(data, list):
        for i, q in enumerate(data):
            q["section"] = section["name"]
            q["marks"] = section["marks_each"]
            q["source_pages"] = "—"
        return data
    return []


def _gen_short_section(section: dict, context: str, subject: str) -> list:
    type_label = {
        "VSA": f"Very Short Answer (2 marks, ~30 words each)",
        "SA":  f"Short Answer (3 marks, ~60 words each)",
        "LA":  f"Long Answer (5 marks, ~120 words each)",
        "Map": f"Map-based question (identify/label locations on a map)",
    }.get(section["type"], section["type"])

    prompt = (
        f"Generate {section['questions']} CBSE Class 8 {subject} {type_label} questions "
        f"based ONLY on this textbook content.\n\n"
        f"CONTENT:\n{context[:4000]}\n\n"
        "For each question return:\n"
        '{"type":"' + section["type"].lower() + '","question":"...","correct_answer":"...","hint":"...","bloom_level":"Apply","marks":' + str(section["marks_each"]) + '}\n\n'
        f"Return a JSON array of exactly {section['questions']} objects. No markdown fences."
    )
    raw = groq_chat([{"role": "user", "content": prompt}], temperature=0.6)
    data = _extract_json(raw)
    if isinstance(data, list):
        for i, q in enumerate(data):
            q["section"] = section["name"]
            q["marks"] = section["marks_each"]
            q["source_pages"] = "—"
        return data
    return []


def _gen_case_study_section(section: dict, context: str, subject: str) -> list:
    prompt = (
        f"Generate {section['questions']} CBSE Class 8 {subject} Case Study questions "
        f"based ONLY on this textbook content.\n\n"
        f"CONTENT:\n{context[:4000]}\n\n"
        "Each case study must have:\n"
        '{"type":"case_study","passage":"100-150 word passage from the content","sub_questions":[{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."}],"section":"' + section["name"] + '","marks":4,"source_pages":"—","bloom_level":"Analyse"}\n\n'
        f"Return a JSON array of exactly {section['questions']} case study objects. No markdown fences."
    )
    raw = groq_chat([{"role": "user", "content": prompt}], temperature=0.6)
    data = _extract_json(raw)
    if isinstance(data, list):
        for q in data:
            q["section"] = section["name"]
            q["marks"] = section["marks_each"]
            q["source_pages"] = "—"
        return data
    return []


def _gen_english_section(section: dict, context: str) -> list:
    if section["type"] == "Reading":
        prompt = (
            "Generate 2 CBSE Class 8 English reading comprehension passages.\n"
            "Passage 1: A discursive/argumentative passage (~250 words) with 5 sub-questions (10 marks total).\n"
            "Passage 2: A factual/data-based passage (~200 words) with 5 sub-questions (10 marks total).\n\n"
            "Based loosely on this content or general Class 8 themes:\n" + context[:2000] + "\n\n"
            "Return JSON array of 2 objects:\n"
            '[{"type":"reading","passage_type":"discursive","passage":"...","sub_questions":[{"question":"...","marks":2,"correct_answer":"..."},...5 items],"section":"Section A","marks":10,"bloom_level":"Understand"},'
            '{"type":"reading","passage_type":"factual","passage":"...","sub_questions":[{"question":"...","marks":2,"correct_answer":"..."},...5 items],"section":"Section A","marks":10,"bloom_level":"Understand"}]'
            "\nNo markdown fences."
        )
    elif section["type"] == "Writing":
        prompt = (
            "Generate CBSE Class 8 English Writing & Grammar questions:\n"
            "1. Grammar section: 5 grammar tasks (fill blanks, error correction, transformation) 2 marks each = 10 marks\n"
            "2. Letter writing task = 5 marks\n"
            "3. Analytical paragraph task = 5 marks\n\n"
            "Return JSON array of 3 objects:\n"
            '[{"type":"grammar","questions":[{"question":"...","marks":2,"correct_answer":"..."},...5 items],"section":"Section B","marks":10,"bloom_level":"Apply"},'
            '{"type":"letter","prompt":"...","sample_answer":"...","section":"Section B","marks":5,"bloom_level":"Create"},'
            '{"type":"paragraph","prompt":"...","sample_answer":"...","section":"Section B","marks":5,"bloom_level":"Create"}]'
            "\nNo markdown fences."
        )
    else:  # Literature
        prompt = (
            "Generate CBSE Class 8 English Literature questions:\n"
            "1. Reference to Context (RTC): 2 extracts × 5 marks each = 10 marks\n"
            "2. Short Answer: 6 questions × 3 marks = 18 marks\n"
            "3. Long Answer: 2 questions × 6 marks = 12 marks\n\n"
            "Based on general NCERT Class 8 English (Honeydew/It So Happened) themes.\n\n"
            "Return JSON array of 3 objects:\n"
            '[{"type":"rtc","extracts":[{"extract":"...","questions":[{"question":"...","marks":2,"correct_answer":"..."},...]}],"section":"Section C","marks":10,"bloom_level":"Analyse"},'
            '{"type":"short_answer","questions":[{"question":"...","marks":3,"correct_answer":"..."},...6 items],"section":"Section C","marks":18,"bloom_level":"Understand"},'
            '{"type":"long_answer","questions":[{"question":"...","marks":6,"correct_answer":"..."},...2 items],"section":"Section C","marks":12,"bloom_level":"Evaluate"}]'
            "\nNo markdown fences."
        )

    raw = groq_chat([{"role": "user", "content": prompt}], temperature=0.6)
    data = _extract_json(raw)
    if isinstance(data, list):
        return data
    return []


# ── Fallback question builder ─────────────────────────────────────────────────
def _fallback_questions(section: dict) -> list:
    questions = []
    for i in range(section["questions"]):
        questions.append({
            "section": section["name"],
            "type": section["type"].lower(),
            "marks": section["marks_each"],
            "question_text": f"[Question {i+1} — could not be generated. Please retry.]",
            "correct_answer": "",
            "hint": "",
            "bloom_level": "Remember",
            "source_pages": "—",
        })
    return questions


# ── Normalise question structure ───────────────────────────────────────────────
def _normalise(q: dict) -> dict:
    """Ensure every question has the expected keys."""
    return {
        "section":       q.get("section", ""),
        "type":          q.get("type", ""),
        "marks":         q.get("marks", 1),
        "question_text": q.get("question") or q.get("question_text") or q.get("prompt", ""),
        "assertion":     q.get("assertion"),
        "reason":        q.get("reason"),
        "passage":       q.get("passage"),
        "passage_type":  q.get("passage_type"),
        "sub_questions": q.get("sub_questions"),
        "extracts":      q.get("extracts"),
        "questions":     q.get("questions"),  # grammar sub-questions
        "options":       q.get("options"),
        "correct":       q.get("correct"),
        "correct_answer":q.get("correct_answer") or q.get("sample_answer", ""),
        "hint":          q.get("hint", ""),
        "explanation":   q.get("explanation", ""),
        "bloom_level":   q.get("bloom_level", "Remember"),
        "source_pages":  q.get("source_pages", "—"),
    }


# ── Main entry point ───────────────────────────────────────────────────────────
async def generate_exam_paper(
    subject: str,
    class_level: int,
    topic_filter: Optional[str] = None,
) -> dict:
    pdf_path = _resolve_pdf(subject)
    pattern = CBSE_PATTERNS.get(subject, CBSE_PATTERNS["Science"])

    # Retrieve context once (reused across all sections)
    loop = asyncio.get_event_loop()
    context = await loop.run_in_executor(
        None,
        _get_context,
        subject, topic_filter, pdf_path, 25,
    )

    sections_out = []
    total_marks = 0

    # Generate each section sequentially (max 6 Groq calls, one per section)
    for sec in pattern:
        try:
            if sec["type"] == "MCQ":
                questions = await loop.run_in_executor(
                    None, _gen_mcq_section, sec, context, subject
                )
            elif sec["type"] in ("VSA", "SA", "LA", "Map"):
                questions = await loop.run_in_executor(
                    None, _gen_short_section, sec, context, subject
                )
            elif sec["type"] == "CaseStudy":
                questions = await loop.run_in_executor(
                    None, _gen_case_study_section, sec, context, subject
                )
            elif sec["type"] in ("Reading", "Writing", "Literature"):
                questions = await loop.run_in_executor(
                    None, _gen_english_section, sec, context
                )
            else:
                questions = _fallback_questions(sec)

            if not questions:
                questions = _fallback_questions(sec)

        except Exception as e:
            print(f"[exam] section {sec['name']} generation failed: {e}")
            questions = _fallback_questions(sec)

        # Compute section marks
        if sec["type"] in ("Reading", "Writing", "Literature"):
            sec_marks = sum(q.get("marks", 0) for q in questions)
        else:
            sec_marks = sec["questions"] * sec["marks_each"]

        total_marks += sec_marks

        sections_out.append({
            "name":         sec["name"],
            "type":         sec["type"],
            "instructions": sec["instructions"],
            "questions_count": sec["questions"],
            "marks_per_question": sec.get("marks_each", 0),
            "section_marks": sec_marks,
            "questions":    [_normalise(q) for q in questions],
        })

    return {
        "subject":      subject,
        "class_level":  class_level,
        "topic_filter": topic_filter,
        "total_marks":  80,
        "sections":     sections_out,
    }
