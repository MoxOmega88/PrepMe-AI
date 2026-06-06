"""
core/rag_tutor.py
RAG Tutor Engine
─────────────────
• Ingests a PDF (or uses cached chunks) into an in-memory vector store
  (sentence-transformers + numpy cosine similarity — no paid API required).
• Hybrid retrieval: dense cosine + BM25-style keyword fallback.
• Mastery-aware prompt: adjusts explanation depth (basic / balanced / advanced).
• Uses Groq (llama-3.3-70b) for generation.
"""
from __future__ import annotations

import re
import json
import math
import hashlib
import numpy as np
import streamlit as st

from core.config import GROQ_API_KEY, GROQ_MODEL_PRIMARY, GROQ_MODEL_FALLBACK, PDF_PATH
from core.personalization import get_depth_flag


# ── PDF text extraction ────────────────────────────────────────────────────────

@st.cache_data(show_spinner=False)
def _extract_chunks(pdf_path: str, chunk_pages: int = 3) -> list[dict]:
    """Split PDF into paragraph-level chunks with metadata."""
    try:
        import fitz
    except ImportError:
        return []

    try:
        doc     = fitz.open(pdf_path)
    except Exception:
        return []

    chunks   = []
    page_count = doc.page_count
    for start in range(0, page_count, chunk_pages):
        end   = min(start + chunk_pages, page_count)
        text  = "\n".join(doc.load_page(i).get_text() for i in range(start, end)).strip()
        if len(text) < 80:
            continue
        # Split into paragraphs
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 60]
        for para in paragraphs:
            chunks.append({
                "text":       para,
                "pages":      f"{start+1}–{end}",
                "chunk_hash": hashlib.md5(para.encode()).hexdigest()[:8],
            })
    doc.close()
    return chunks


# ── Embeddings (sentence-transformers, cached) ─────────────────────────────────

@st.cache_resource(show_spinner="Loading embedding model…")
def _load_embedder():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


@st.cache_data(show_spinner="Building vector index…")
def _build_index(pdf_path: str) -> tuple[list[dict], np.ndarray | None]:
    chunks   = _extract_chunks(pdf_path)
    embedder = _load_embedder()
    if not chunks or embedder is None:
        return chunks, None
    texts  = [c["text"] for c in chunks]
    embs   = embedder.encode(texts, batch_size=64, show_progress_bar=False,
                              normalize_embeddings=True)
    return chunks, embs.astype("float32")


def _cosine_scores(query_emb: np.ndarray, corpus_embs: np.ndarray) -> np.ndarray:
    """Both already L2-normalised, so dot product == cosine similarity."""
    return corpus_embs @ query_emb


def _bm25_scores(query: str, chunks: list[dict], k1: float = 1.5, b: float = 0.75) -> np.ndarray:
    """Lightweight BM25 implementation over chunk texts."""
    tokens_q  = set(query.lower().split())
    avgdl     = sum(len(c["text"].split()) for c in chunks) / max(len(chunks), 1)
    scores    = []
    for c in chunks:
        tokens_d = c["text"].lower().split()
        dl       = len(tokens_d)
        freq     = {t: tokens_d.count(t) for t in tokens_q if t in tokens_d}
        s        = sum(
            f * (k1 + 1) / (f + k1 * (1 - b + b * dl / avgdl))
            for f in freq.values()
        )
        scores.append(s)
    return np.array(scores, dtype="float32")


def retrieve(query: str, pdf_path: str, top_k: int = 5) -> list[dict]:
    """
    Hybrid retrieval: 70 % dense + 30 % BM25.
    Falls back to BM25-only if embeddings unavailable.
    """
    chunks, embs = _build_index(pdf_path)
    if not chunks:
        return []

    bm25  = _bm25_scores(query, chunks)
    # normalise BM25
    bm25_norm = bm25 / (bm25.max() + 1e-9)

    if embs is not None:
        embedder  = _load_embedder()
        q_emb     = embedder.encode([query], normalize_embeddings=True)[0].astype("float32")
        dense     = _cosine_scores(q_emb, embs)
        hybrid    = 0.7 * dense + 0.3 * bm25_norm
    else:
        hybrid = bm25_norm

    top_idx = np.argsort(hybrid)[::-1][:top_k]
    return [chunks[i] for i in top_idx]


# ── Groq generation ────────────────────────────────────────────────────────────

def _groq_chat(messages: list[dict], model: str) -> str:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    resp   = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.4,
        max_tokens=900,
    )
    return resp.choices[0].message.content.strip()


def _depth_instructions(flag: str) -> str:
    if flag == "basic":
        return (
            "The student's mastery of this topic is LOW. "
            "Use simple language, everyday analogies, avoid jargon. "
            "Break every explanation into clear numbered steps. "
            "End with a very easy check-question."
        )
    elif flag == "balanced":
        return (
            "The student has MODERATE mastery. "
            "Give a clear explanation with one worked example. "
            "Use standard terminology but explain any technical words. "
            "End with a medium-difficulty practice question."
        )
    else:  # advanced
        return (
            "The student has HIGH mastery. "
            "Skip basics; focus on edge cases, common misconceptions, "
            "and tricky exam variations. Challenge the student. "
            "End with an application-level or analysis question."
        )


def ask_tutor(
    question: str,
    chat_history: list[dict],
    mastery_score: float,
    pdf_path: str = PDF_PATH,
) -> dict:
    """
    Main entry point for the RAG tutor.
    Returns { "answer": str, "citations": list[str], "followup": str }
    """
    if not GROQ_API_KEY:
        return {
            "answer":   "⚠️ GROQ_API_KEY not set. Please add it to your .env file.",
            "citations": [],
            "followup":  "",
        }

    depth_flag    = get_depth_flag(mastery_score)
    depth_instr   = _depth_instructions(depth_flag)

    # Retrieve relevant chunks
    context_chunks = retrieve(question, pdf_path)
    if context_chunks:
        context_text = "\n\n---\n\n".join(
            f"[Pages {c['pages']}]\n{c['text']}" for c in context_chunks
        )
        citations = [f"Pages {c['pages']}" for c in context_chunks]
    else:
        context_text = "No specific context found — answer from general NCERT Class 8 knowledge."
        citations    = ["General knowledge"]

    system_prompt = f"""You are PrepMeAI, an expert NCERT Class 8 Science tutor.
Answer ONLY based on the provided context. If the context does not cover the question, say so honestly.
Always cite which pages your answer comes from using [Pages X–Y] notation.

Depth instruction: {depth_instr}

Context from textbook:
{context_text}
"""

    # Build messages (last 6 turns of history for context window efficiency)
    messages = [{"role": "system", "content": system_prompt}]
    for turn in chat_history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": question})

    try:
        answer = _groq_chat(messages, GROQ_MODEL_PRIMARY)
    except Exception:
        try:
            answer = _groq_chat(messages, GROQ_MODEL_FALLBACK)
        except Exception as e:
            answer = f"⚠️ Generation failed: {e}"

    # Extract follow-up question if present (last sentence ending in ?)
    sentences  = re.split(r'(?<=[.!?])\s+', answer.strip())
    followup   = ""
    body_lines = []
    for s in sentences:
        if s.endswith("?") and len(s) > 20:
            followup = s
        else:
            body_lines.append(s)
    body = " ".join(body_lines).strip() or answer

    return {"answer": body, "citations": citations, "followup": followup}


def generate_practice_questions(
    topic: str,
    mastery_score: float,
    pdf_path: str = PDF_PATH,
    n: int = 3,
) -> list[dict]:
    """
    Generate Bloom's taxonomy-tagged practice questions for a topic.
    Returns list of { question, bloom_level, reference_answer }
    """
    if not GROQ_API_KEY:
        return []

    depth_flag = get_depth_flag(mastery_score)
    bloom_map  = {
        "basic":    ["Remember", "Understand"],
        "balanced": ["Understand", "Apply"],
        "advanced": ["Apply", "Analyse", "Evaluate"],
    }
    bloom_levels = bloom_map[depth_flag]

    chunks = retrieve(topic, pdf_path, top_k=4)
    context = "\n\n".join(c["text"] for c in chunks) if chunks else f"Topic: {topic}"

    prompt = f"""You are an NCERT Class 8 Science teacher.
Based on the context, generate exactly {n} practice questions for the topic: "{topic}".
Focus on Bloom's levels: {', '.join(bloom_levels)}.

Return ONLY a valid JSON array. Each item must have:
  "question"        : string
  "bloom_level"     : one of {bloom_levels}
  "reference_answer": string (2–4 sentences)

Context:
{context[:3000]}
"""
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp   = client.chat.completions.create(
            model=GROQ_MODEL_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw  = resp.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw  = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        if isinstance(data, list):
            return data[:n]
    except Exception:
        pass
    return []