"""
CBSE Mock Exam Generation Service
Generates full 80-mark CBSE-pattern exam papers using RAG + Groq
"""
import os
import re
import json
import asyncio
import traceback
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
def _debug_label(section_name: str, stage: str) -> str:
    return f"[exam:{section_name}:{stage}]"


def _clean_raw_output(raw: str) -> str:
    text = raw if isinstance(raw, str) else str(raw)
    return re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE).strip()


def _log_raw_response(section_name: str, stage: str, raw: str) -> None:
    print(f"\n========== RAW RESPONSE [{section_name} | {stage}] ==========")
    print()
    print(raw[:3000] if isinstance(raw, str) else str(raw)[:3000])
    print("\n=================================\n")


def _extract_json(raw: str, section_name: str = "unknown", stage: str = "parsing"):
    text = _clean_raw_output(raw)

    try:
        return json.loads(text)
    except Exception:
        pass

    array_match = re.search(r"\[[\s\S]*\]", text)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except Exception:
            pass

    object_match = re.search(r"\{[\s\S]*\}", text)
    if object_match:
        try:
            return json.loads(object_match.group(0))
        except Exception:
            pass

    print(f"\n[ERROR] {_debug_label(section_name, stage)} JSON parsing failed")
    print(text[:3000])
    print("\n=================================\n")
    return None


def _validate_required_keys(item: dict, required_keys: list, section_name: str, stage: str, index: int) -> bool:
    missing = [key for key in required_keys if key not in item or item[key] in (None, "")]
    if missing:
        print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} missing required keys: {', '.join(missing)}")
        return False
    return True


def _validate_generated_list(
    data,
    expected_count: int,
    section_name: str,
    stage: str,
    item_validator=None,
) -> bool:
    if not isinstance(data, list):
        print(f"[ERROR] {_debug_label(section_name, stage)} expected a list, got {type(data).__name__}")
        return False

    if len(data) != expected_count:
        print(f"[ERROR] {_debug_label(section_name, stage)} expected {expected_count} items, got {len(data)}")
        return False

    for index, item in enumerate(data):
        if not isinstance(item, dict):
            print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} is {type(item).__name__}, expected dict")
            return False
        if item_validator and not item_validator(item, section_name, stage, index):
            return False

    return True


def _validate_mcq_item(item: dict, section_name: str, stage: str, index: int) -> bool:
    item_type = item.get("type", "mcq")
    if item_type == "assertion_reason":
        return _validate_required_keys(item, ["assertion", "reason", "options", "correct"], section_name, stage, index)
    return _validate_required_keys(item, ["question", "options", "correct"], section_name, stage, index)


def _validate_short_item(item: dict, section_name: str, stage: str, index: int) -> bool:
    return _validate_required_keys(item, ["question", "correct_answer"], section_name, stage, index)


def _validate_case_item(item: dict, section_name: str, stage: str, index: int) -> bool:
    if not _validate_required_keys(item, ["passage", "sub_questions"], section_name, stage, index):
        return False
    if not isinstance(item.get("sub_questions"), list):
        print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} sub_questions must be a list")
        return False
    return True


def _validate_english_item(item: dict, section_name: str, stage: str, index: int) -> bool:
    item_type = item.get("type")
    if not _validate_required_keys(item, ["type"], section_name, stage, index):
        return False

    if item_type == "reading":
        if not _validate_required_keys(item, ["passage", "sub_questions", "section"], section_name, stage, index):
            return False
        return isinstance(item.get("sub_questions"), list)

    if item_type == "grammar":
        if not _validate_required_keys(item, ["questions", "section"], section_name, stage, index):
            return False
        if not isinstance(item.get("questions"), list):
            print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} questions must be a list")
            return False
        return True

    if item_type in ("letter", "paragraph"):
        return _validate_required_keys(item, ["prompt", "sample_answer", "section"], section_name, stage, index)

    if item_type == "rtc":
        if not _validate_required_keys(item, ["extracts", "section"], section_name, stage, index):
            return False
        if not isinstance(item.get("extracts"), list):
            print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} extracts must be a list")
            return False
        return True

    if item_type in ("short_answer", "long_answer"):
        if not _validate_required_keys(item, ["questions", "section"], section_name, stage, index):
            return False
        if not isinstance(item.get("questions"), list):
            print(f"[ERROR] {_debug_label(section_name, stage)} item {index + 1} questions must be a list")
            return False
        return True

    return True


def _groq_generate_json(
    prompt: str,
    section_name: str,
    stage: str,
    expected_count: int,
    temperature: float,
    item_validator=None,
):
    for attempt in range(2):
        current_temperature = temperature if attempt == 0 else max(0.1, temperature - 0.3)
        attempt_label = f"attempt {attempt + 1}/2"
        print(f"[exam:{section_name}:{stage}] {attempt_label} temperature={current_temperature}")
        try:
            raw = groq_chat([{"role": "user", "content": prompt}], temperature=current_temperature)
            _log_raw_response(section_name, stage, raw)
            data = _extract_json(raw, section_name, stage)

            if _validate_generated_list(data, expected_count, section_name, stage, item_validator):
                return data

            print(f"[exam:{section_name}:{stage}] validation failed on {attempt_label}")
            if attempt == 0:
                print(f"[exam:{section_name}:{stage}] retrying with lower temperature")
        except Exception:
            print(f"\n[ERROR] {_debug_label(section_name, stage)} generation {attempt_label} failed")
            traceback.print_exc()
            if attempt == 0:
                print(f"[exam:{section_name}:{stage}] retrying with lower temperature after exception")

    return []


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

    def _build_prompt(question_type: str, batch_size: int) -> str:
        if question_type == "standard":
            return (
                f"Generate {batch_size} CBSE Class 8 {subject} standard MCQs based ONLY on this textbook content.\n\n"
                f"CONTENT:\n{context[:1500]}\n\n"
                "For each standard MCQ return:\n"
                '{"type":"mcq","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"...","bloom_level":"Remember","marks":1}\n\n'
                f"Return a JSON array of exactly {batch_size} standard MCQ objects. No markdown fences."
            )

        return (
            f"Generate {batch_size} CBSE Class 8 {subject} Assertion-Reason questions based ONLY on this textbook content.\n\n"
            f"CONTENT:\n{context[:1500]}\n\n"
            "For each Assertion-Reason return:\n"
            '{"type":"assertion_reason","assertion":"...","reason":"...","options":["A) Both A and R are true and R is the correct explanation of A","B) Both A and R are true but R is not the correct explanation of A","C) A is true but R is false","D) A is false but R is true"],"correct":"A","explanation":"...","bloom_level":"Analyse","marks":1}\n\n'
            f"Return a JSON array of exactly {batch_size} Assertion-Reason objects. No markdown fences."
        )

    questions = []

    std_remaining = n_std
    std_batch = 1
    while std_remaining > 0:
        batch_size = min(5, std_remaining)
        batch = _groq_generate_json(
            _build_prompt("standard", batch_size),
            section["name"],
            f"mcq-standard-batch-{std_batch}",
            batch_size,
            0.7,
            _validate_mcq_item,
        )
        if not batch:
            return []
        for q in batch:
            q["section"] = section["name"]
            q["marks"] = section["marks_each"]
            q["source_pages"] = "—"
        questions.extend(batch)
        std_remaining -= batch_size
        std_batch += 1

    ar_remaining = n_ar
    ar_batch = 1
    while ar_remaining > 0:
        batch_size = min(5, ar_remaining)
        batch = _groq_generate_json(
            _build_prompt("assertion_reason", batch_size),
            section["name"],
            f"mcq-assertion-batch-{ar_batch}",
            batch_size,
            0.7,
            _validate_mcq_item,
        )
        if not batch:
            return []
        for q in batch:
            q["section"] = section["name"]
            q["marks"] = section["marks_each"]
            q["source_pages"] = "—"
        questions.extend(batch)
        ar_remaining -= batch_size
        ar_batch += 1

    return questions


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
        f"CONTENT:\n{context[:1500]}\n\n"
        "For each question return:\n"
        '{"type":"' + section["type"].lower() + '","question":"...","correct_answer":"...","hint":"...","bloom_level":"Apply","marks":' + str(section["marks_each"]) + '}\n\n'
        f"Return a JSON array of exactly {section['questions']} objects. No markdown fences."
    )
    data = _groq_generate_json(prompt, section["name"], "short-section", section["questions"], 0.6, _validate_short_item)
    if not data:
        return []
    for i, q in enumerate(data):
        q["section"] = section["name"]
        q["marks"] = section["marks_each"]
        q["source_pages"] = "—"
    return data


def _gen_case_study_section(section: dict, context: str, subject: str) -> list:
    prompt = (
        f"Generate {section['questions']} CBSE Class 8 {subject} Case Study questions "
        f"based ONLY on this textbook content.\n\n"
        f"CONTENT:\n{context[:1500]}\n\n"
        "Each case study must have:\n"
        '{"type":"case_study","passage":"100-150 word passage from the content","sub_questions":[{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."},{"question":"...","marks":1,"correct_answer":"..."}],"section":"' + section["name"] + '","marks":4,"source_pages":"—","bloom_level":"Analyse"}\n\n'
        f"Return a JSON array of exactly {section['questions']} case study objects. No markdown fences."
    )
    data = _groq_generate_json(prompt, section["name"], "case-study", section["questions"], 0.6, _validate_case_item)
    if not data:
        return []
    for q in data:
        q["section"] = section["name"]
        q["marks"] = section["marks_each"]
        q["source_pages"] = "—"
    return data


def _gen_english_section(section: dict, context: str) -> list:
    if section["type"] == "Reading":
        prompt = (
            "Generate 2 CBSE Class 8 English reading comprehension passages.\n"
            "Passage 1: A discursive/argumentative passage (~250 words) with 5 sub-questions (10 marks total).\n"
            "Passage 2: A factual/data-based passage (~200 words) with 5 sub-questions (10 marks total).\n\n"
            "Based loosely on this content or general Class 8 themes:\n" + context[:1500] + "\n\n"
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

    data = _groq_generate_json(prompt, section["name"], "english-section", section["questions"], 0.6, _validate_english_item)
    return data if data else []


# ── Fallback question builder ─────────────────────────────────────────────────
def _fallback_questions(section: dict) -> list:
    print(f"[exam:{section['name']}:fallback] using fallback questions")
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
                print(f"[exam:{sec['name']}:fallback] unsupported section type, using fallback")
                questions = _fallback_questions(sec)

            if not questions:
                print(f"[exam:{sec['name']}:fallback] generator returned no questions, using fallback")
                questions = _fallback_questions(sec)

        except Exception:
            print(f"\n[ERROR] [exam:{sec['name']}:generation] section generation failed")
            traceback.print_exc()
            
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
