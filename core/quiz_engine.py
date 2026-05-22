"""
core/quiz_engine.py
Quiz Engine – wraps original app.py logic.
Adds topic-aware question generation on top of the full-textbook mode.
"""
from __future__ import annotations

import json
import math
import random
import re

import streamlit as st

from core.config import (
    GROQ_API_KEY, GROQ_MODEL_PRIMARY, GROQ_MODEL_FALLBACK, PDF_PATH, COLAB_WHISPER_URL
)


# ── PDF helpers (cached, identical to original app.py) ────────────────────────

@st.cache_data(show_spinner=False)
def chunk_pdf(pdf_path: str, chunk_pages: int = 15) -> list[str]:
    try:
        import fitz
    except ImportError:
        return []
    try:
        doc = fitz.open(pdf_path)
    except Exception:
        return []

    page_count = doc.page_count
    chunks     = []
    for start in range(0, page_count, chunk_pages):
        end  = min(start + chunk_pages, page_count)
        text = "\n".join(doc.load_page(i).get_text() for i in range(start, end)).strip()
        if len(text) > 100:
            chunks.append(text)
    doc.close()
    return chunks


# ── JSON parsing helpers ───────────────────────────────────────────────────────

def _parse_json_array(raw: str) -> list:
    raw = re.sub(r"```json|```", "", raw).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\[[\s\S]*\]", raw)
        if not m:
            raise
        data = json.loads(m.group(0))
    if not isinstance(data, list):
        raise ValueError("Expected JSON array")
    return data


def _parse_json_object(raw: str) -> dict:
    raw = re.sub(r"```json|```", "", raw).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object")
    return data


# ── Groq client helper ─────────────────────────────────────────────────────────

def _groq_complete(messages: list[dict], model: str, **kwargs) -> str:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    resp   = client.chat.completions.create(
        model=model, messages=messages, temperature=0.4, **kwargs
    )
    return resp.choices[0].message.content.strip()


# ── Question generation ────────────────────────────────────────────────────────

def _gen_questions_from_text(text: str, count: int, topic: str = "") -> list[dict]:
    topic_hint = f" Focus on the topic: {topic}." if topic else ""
    prompt = (
        "You are an NCERT Class 8 Science teacher."
        f" Generate exactly {count} educational questions based ONLY on the text below.{topic_hint}"
        " Vary difficulty levels. Return ONLY a JSON array."
        " Each item must have exactly two keys: \"question\" and \"reference_answer\".\n\n"
        f"Text:\n{text[:4000]}"
    )
    for model in [GROQ_MODEL_PRIMARY, GROQ_MODEL_FALLBACK]:
        try:
            raw  = _groq_complete([{"role": "user", "content": prompt}], model)
            data = _parse_json_array(raw)
            return [
                {
                    "question":         str(d.get("question", "")).strip(),
                    "reference_answer": str(d.get("reference_answer", "")).strip(),
                }
                for d in data
                if isinstance(d, dict)
                and d.get("question") and d.get("reference_answer")
            ][:count]
        except Exception:
            continue
    return []


def generate_questions_full_book(count: int = 5) -> list[dict]:
    """Generate questions spanning the entire PDF (original app.py behaviour)."""
    chunks = chunk_pdf(PDF_PATH)
    if not chunks:
        raise ValueError(f"Could not read PDF at '{PDF_PATH}'.")

    n_sample = min(4, len(chunks))
    sampled  = random.sample(chunks, n_sample)
    base     = count // n_sample
    rem      = count % n_sample
    counts   = [base + (1 if i < rem else 0) for i in range(n_sample)]

    all_qs = []
    for chunk, n in zip(sampled, counts):
        if n <= 0:
            continue
        try:
            all_qs.extend(_gen_questions_from_text(chunk, n))
        except Exception:
            continue

    if len(all_qs) < count:
        for chunk in chunks:
            if len(all_qs) >= count:
                break
            try:
                all_qs.extend(_gen_questions_from_text(chunk, 2))
            except Exception:
                continue

    if not all_qs:
        raise ValueError("Failed to generate questions.")

    random.shuffle(all_qs)
    return all_qs[:count]


def generate_questions_for_topic(topic: str, count: int = 5) -> list[dict]:
    """Generate questions targeting a specific topic (RAG-powered)."""
    from core.rag_tutor import retrieve
    chunks = retrieve(topic, PDF_PATH, top_k=5)
    if not chunks:
        return generate_questions_full_book(count)

    combined = "\n\n".join(c["text"] for c in chunks)
    return _gen_questions_from_text(combined, count, topic=topic)


# ── Answer grading ─────────────────────────────────────────────────────────────

def grade_answer(question: str, reference: str, transcript: str) -> dict:
    """Returns { is_correct, feedback_speech, score_explanation }"""
    prompt = (
        "You are a strict but encouraging Class 8 Science teacher.\n"
        "Evaluate the student's spoken answer against the reference answer.\n"
        "Return ONLY a valid JSON object with keys:\n"
        "  \"is_correct\"        : boolean\n"
        "  \"feedback_speech\"   : short encouraging feedback (1–2 sentences)\n"
        "  \"score_explanation\" : brief explanation of what was right/wrong\n\n"
        f"Question: {question}\n"
        f"Reference Answer: {reference}\n"
        f"Student Answer: {transcript}\n"
    )
    for model in [GROQ_MODEL_PRIMARY, GROQ_MODEL_FALLBACK]:
        try:
            raw    = _groq_complete(
                [{"role": "user", "content": prompt}],
                model,
                response_format={"type": "json_object"},
            )
            result = _parse_json_object(raw)
            return {
                "is_correct":        bool(result.get("is_correct", False)),
                "feedback_speech":   str(result.get("feedback_speech", "Good try!")).strip(),
                "score_explanation": str(result.get("score_explanation", "")).strip(),
            }
        except Exception:
            continue
    return {"is_correct": False, "feedback_speech": "Could not grade — please try again.", "score_explanation": ""}


# ── Transcription via Colab Whisper ───────────────────────────────────────────

def transcribe_audio(audio_bytes: bytes) -> str:
    """Sends audio to the Colab Whisper endpoint and returns transcript."""
    import requests
    if not COLAB_WHISPER_URL:
        raise ValueError("COLAB_WHISPER_URL is not set. See .env file.")

    resp = requests.post(
        COLAB_WHISPER_URL,
        files={"audio": ("student.wav", audio_bytes, "audio/wav")},
        timeout=120,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("status") != "success":
        raise ValueError("Colab transcription failed.")
    transcript = str(payload.get("transcript", "")).strip()
    if not transcript:
        raise ValueError("Empty transcript returned.")
    return transcript