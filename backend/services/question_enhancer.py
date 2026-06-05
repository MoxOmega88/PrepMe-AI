"""
Question Enhancement Service
Provides duplicate detection, prerequisite checking, and retry question generation
"""
import json
import re
from typing import Optional
from numpy import dot
from numpy.linalg import norm

from services.rag_service import get_embedder, groq_chat, retrieve

# ── Prerequisite Map (NCERT Class 8 - All Subjects) ───────────────────────────
PREREQUISITES = {
    # ── MATHEMATICS ──────────────────────────────────────────────────────────
    "Linear Equations in One Variable": ["Rational Numbers"],
    "Understanding Quadrilaterals": ["Practical Geometry"],
    "Squares and Square Roots": ["Rational Numbers"],
    "Cube and Cube Roots": ["Squares and Square Roots"],
    "Algebraic Expressions and Identities": ["Linear Equations in One Variable"],
    "Factorization": ["Algebraic Expressions and Identities"],
    "Comparing Quantities": ["Rational Numbers"],
    "Direct and Inverse Proportions": ["Comparing Quantities"],
    "Introduction to Graphs": ["Data Handling"],
    "Mensuration": ["Understanding Quadrilaterals"],
    "Exponents and Powers": ["Squares and Square Roots"],
    
    # ── SCIENCE ──────────────────────────────────────────────────────────────
    "The Invisible Living World: Beyond Our Naked Eye": ["Exploring the Investigative World of Science"],
    "Health: The Ultimate Treasure": ["The Invisible Living World: Beyond Our Naked Eye"],
    "Electricity: Magnetic and Heating Effects": ["Exploring Forces"],
    "Pressure, Winds, Storms, and Cyclones": ["Exploring Forces"],
    "Nature of Matter: Elements, Compounds, and Mixtures": ["Particulate Nature of Matter"],
    "The Amazing World of Solutes, Solvents, and Solutions": [
        "Particulate Nature of Matter",
        "Nature of Matter: Elements, Compounds, and Mixtures"
    ],
    "Light: Mirrors and Lenses": ["Exploring Forces"],
    "How Nature Works in Harmony": ["Keeping Time with the Skies"],
    
    # ── SOCIAL SCIENCE ───────────────────────────────────────────────────────
    "Reshaping India's Political Map": ["Natural Resources and Their"],
    "The Rise of the Marathas": ["Reshaping India's Political Map"],
    "The Colonial Era in India": ["The Rise of the Marathas"],
    "The Parliamentary System: Legislature and Executive": [
        "Universal Franchise and India's Electoral System"
    ],
    "Factors of Production": ["Natural Resources and Their"],
    
    # ── ENGLISH ──────────────────────────────────────────────────────────────
    # (English chapters are mostly independent literary pieces, minimal prerequisites)
    "Verghese Kurien- I Too Had A Dream": ["A Concrete Example"],
    "The Case of the Fifth Word": ["The Wit that Won Hearts"],
    "Bibha Chowdhuri: The Beam of Light that Lit the Path for Women in Indian Science": [
        "Verghese Kurien- I Too Had A Dream"
    ],
    "The Cherry Tree": ["Somebody's Mother"],
    "Waiting for the Rain": ["Harvest Hymn"],
}


# ── 1. Question Fingerprint ────────────────────────────────────────────────────
def get_question_fingerprint(question_text: str) -> list[float]:
    """
    Returns 384-dim embedding vector for the question using sentence-transformers.
    Uses the already-loaded model from rag_service.py.
    """
    embedder = get_embedder()
    embedding = embedder.encode(question_text, convert_to_tensor=False)
    return embedding.tolist()


# ── 2. Duplicate Detection ─────────────────────────────────────────────────────
def is_question_duplicate(
    new_question: str,
    question_history: list[dict],
    threshold: float = 0.82
) -> bool:
    """
    Checks if new_question is too similar to any question in history.
    
    Args:
        new_question: The question text to check
        question_history: List of dicts with {"text": str, "embedding": list[float]}
        threshold: Cosine similarity threshold (default 0.82)
    
    Returns:
        True if any similarity > threshold, False otherwise
    """
    if not question_history:
        return False
    
    embedder = get_embedder()
    new_embedding = embedder.encode(new_question, convert_to_tensor=False)
    
    for item in question_history:
        stored_embedding = item.get("embedding")
        if not stored_embedding:
            continue
        
        # Cosine similarity
        similarity = dot(new_embedding, stored_embedding) / (
            norm(new_embedding) * norm(stored_embedding)
        )
        
        if similarity > threshold:
            print(f"[enhancer] duplicate detected: similarity={similarity:.3f}")
            return True
    
    return False


# ── 3. Prerequisites Check ─────────────────────────────────────────────────────
def check_prerequisites(
    topic: str,
    class_level: int,
    subject: str,
    mastery_scores: dict
) -> dict:
    """
    Checks if student has mastered prerequisite topics.
    
    Args:
        topic: The topic to check prerequisites for
        class_level: Student's class (8-10)
        subject: Subject name
        mastery_scores: Dict of {topic_name: score} where score is 0.0-1.0
    
    Returns:
        {
            "can_proceed": bool,
            "prerequisites": list[str],
            "weak_prerequisites": list[str] (only if can_proceed is False),
            "suggested_action": str (only if can_proceed is False)
        }
    """
    # Get prerequisites for this topic
    prereqs = PREREQUISITES.get(topic, [])
    
    if not prereqs:
        return {
            "can_proceed": True,
            "prerequisites": []
        }
    
    # Check mastery for each prerequisite
    weak_prereqs = []
    for prereq in prereqs:
        mastery_data = mastery_scores.get(prereq, 0.5)
        # Handle both dict format {"score": 0.8} and float format 0.8
        if isinstance(mastery_data, dict):
            score = mastery_data.get("score", 0.5)
        else:
            score = mastery_data if isinstance(mastery_data, (int, float)) else 0.5
        
        if score < 0.50:
            weak_prereqs.append(prereq)
    
    if weak_prereqs:
        weak_list = ", ".join(weak_prereqs)
        return {
            "can_proceed": False,
            "prerequisites": prereqs,
            "weak_prerequisites": weak_prereqs,
            "suggested_action": f"Review {weak_list} first before attempting {topic} questions."
        }
    
    return {
        "can_proceed": True,
        "prerequisites": prereqs
    }


# ── 4. Retry Question Generation ───────────────────────────────────────────────
def generate_retry_question(
    original_question: str,
    student_wrong_answer: str,
    correct_answer: str,
    topic: str,
    retrieved_chunks: list[str]
) -> dict:
    """
    Generates a new question targeting the student's misconception.
    
    Args:
        original_question: The question they got wrong
        student_wrong_answer: Their incorrect answer
        correct_answer: The correct answer
        topic: The topic being tested
        retrieved_chunks: List of textbook content strings
    
    Returns:
        {
            "question": str,
            "expected_answer": str,
            "targets_misconception": True,
            "bloom_level": str
        }
    """
    context = "\n\n".join(retrieved_chunks[:5])  # Use top 5 chunks
    
    prompt = f"""A student was asked: '{original_question}'
They answered: '{student_wrong_answer}'
The correct answer is: '{correct_answer}'

Generate ONE new question specifically targeting the misconception revealed by their wrong answer. The new question should test the same concept but from a different angle so they must engage with the part they got wrong.

Use ONLY content from this textbook context:
{context}

Return JSON only (no markdown fences):
{{
  "question": "...",
  "expected_answer": "...",
  "targets_misconception": true,
  "bloom_level": "..."
}}"""
    
    try:
        raw = groq_chat([{"role": "user", "content": prompt}], temperature=0.7)
        
        # Strip markdown fences
        raw = re.sub(r"```json|```", "", raw).strip()
        
        # Parse JSON
        data = json.loads(raw)
        data["targets_misconception"] = True
        
        return data
        
    except Exception as e:
        print(f"[enhancer] retry question generation failed: {e}")
        # Fallback
        return {
            "question": f"Can you explain the concept tested in: {original_question}?",
            "expected_answer": correct_answer,
            "targets_misconception": True,
            "bloom_level": "Understand"
        }
