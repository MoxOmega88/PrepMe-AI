from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
PDF_DIR = BASE_DIR


def _candidate_pdf_paths(raw: str) -> list[Path]:
    raw_path = Path(raw)
    if raw_path.is_absolute():
        return [raw_path]

    filename = raw_path.name
    search_roots = [PDF_DIR, BASE_DIR.parent, BASE_DIR.parent.parent]
    candidates: list[Path] = []
    seen: set[str] = set()

    for root in search_roots:
        candidate = (root / filename).resolve()
        key = str(candidate)
        if key not in seen:
            seen.add(key)
            candidates.append(candidate)

    return candidates


def get_pdf_path(subject: str) -> Path:
    s = (subject or "science").lower().strip()
    if s in ("maths", "mathematics"):
        raw = os.getenv("PDF_MATHS_PATH", "ncert_maths_8.pdf")
    elif s in ("social", "social science", "social studies", "social_studies"):
        raw = os.getenv("PDF_SOCIAL_PATH", "ncert_social_8.pdf")
    elif s == "english":
        raw = os.getenv("PDF_ENGLISH_PATH", "ncert_english_8.pdf")
    else:
        raw = os.getenv("PDF_SCIENCE_PATH", "ncert_science_8.pdf")

    raw_path = Path(raw)
    if raw_path.is_absolute():
        resolved = raw_path.resolve()
    else:
        candidates = _candidate_pdf_paths(raw)
        resolved = next((candidate for candidate in candidates if candidate.exists()), candidates[0])

    print(f"[paths] subject={s} pdf_path={resolved} exists={resolved.exists()}")
    return resolved
