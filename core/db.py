"""Database for PrepMeAI - SQLite with student profiles, quiz history, tutor sessions"""
import sqlite3
import hashlib
import json
from datetime import datetime
from typing import Optional, List, Dict
from contextlib import contextmanager

DATABASE_PATH = "prepmeai.db"

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_database():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            grade INTEGER NOT NULL,
            board TEXT NOT NULL,
            subjects TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP)""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            chapter TEXT NOT NULL,
            topic TEXT,
            total_questions INTEGER NOT NULL,
            score_percentage REAL NOT NULL,
            time_taken_seconds INTEGER NOT NULL,
            difficulty_start REAL NOT NULL,
            difficulty_end REAL NOT NULL,
            strong_topics TEXT,
            weak_topics TEXT,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id))""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS tutor_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            chapter TEXT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            sources TEXT,
            mastery_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id))""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS study_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            chapter TEXT NOT NULL,
            topic TEXT NOT NULL,
            priority INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            recommended_duration_minutes INTEGER,
            mastery_level REAL,
            last_practiced TIMESTAMP,
            next_review_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id))""")
        print("✅ Database initialized")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_student(email: str, password: str, name: str, grade: int, board: str, subjects: List[str]) -> Optional[int]:
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO students (email, password_hash, name, grade, board, subjects) VALUES (?, ?, ?, ?, ?, ?)",
                          (email, hash_password(password), name, grade, board, json.dumps(subjects)))
            return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None

def authenticate_student(email: str, password: str) -> Optional[Dict]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, grade, board, subjects, created_at FROM students WHERE email = ? AND password_hash = ?",
                      (email, hash_password(password)))
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE students SET last_login = ? WHERE id = ?", (datetime.now(), row['id']))
            student = dict(row)
            student['subjects'] = json.loads(student['subjects'])
            return student
        return None

def get_student_profile(student_id: int) -> Optional[Dict]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, grade, board, subjects, created_at, last_login FROM students WHERE id = ?", (student_id,))
        row = cursor.fetchone()
        if row:
            student = dict(row)
            student['subjects'] = json.loads(student['subjects'])
            return student
        return None

def save_quiz_attempt(student_id: int, subject: str, chapter: str, topic: str, total_questions: int, 
                      score_percentage: float, time_taken_seconds: int, difficulty_start: float,
                      difficulty_end: float, strong_topics: List[str], weak_topics: List[str], tags: List[str]) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""INSERT INTO quiz_attempts (student_id, subject, chapter, topic, total_questions, score_percentage,
                          time_taken_seconds, difficulty_start, difficulty_end, strong_topics, weak_topics, tags)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                      (student_id, subject, chapter, topic, total_questions, score_percentage, time_taken_seconds,
                       difficulty_start, difficulty_end, json.dumps(strong_topics), json.dumps(weak_topics), json.dumps(tags)))
        return cursor.lastrowid

def get_student_quiz_history(student_id: int, subject: str = None, limit: int = 10) -> List[Dict]:
    with get_db() as conn:
        cursor = conn.cursor()
        if subject:
            cursor.execute("SELECT * FROM quiz_attempts WHERE student_id = ? AND subject = ? ORDER BY created_at DESC LIMIT ?",
                          (student_id, subject, limit))
        else:
            cursor.execute("SELECT * FROM quiz_attempts WHERE student_id = ? ORDER BY created_at DESC LIMIT ?", (student_id, limit))
        return [dict(row) for row in cursor.fetchall()]

def save_tutor_session(student_id: int, subject: str, chapter: str, question: str, answer: str, 
                       sources: List[str], mastery_score: float = None) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO tutor_sessions (student_id, subject, chapter, question, answer, sources, mastery_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
                      (student_id, subject, chapter, question, answer, json.dumps(sources), mastery_score))
        return cursor.lastrowid

def get_study_plan(student_id: int, subject: str = None) -> List[Dict]:
    with get_db() as conn:
        cursor = conn.cursor()
        if subject:
            cursor.execute("SELECT * FROM study_plans WHERE student_id = ? AND subject = ? ORDER BY priority ASC, mastery_level ASC",
                          (student_id, subject))
        else:
            cursor.execute("SELECT * FROM study_plans WHERE student_id = ? ORDER BY priority ASC, mastery_level ASC", (student_id,))
        return [dict(row) for row in cursor.fetchall()]

def get_dashboard_stats(student_id: int) -> Dict:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total_quizzes, AVG(score_percentage) as avg_score, SUM(total_questions) as total_questions FROM quiz_attempts WHERE student_id = ?", (student_id,))
        quiz_stats = dict(cursor.fetchone())
        cursor.execute("SELECT COUNT(*) as total_doubts FROM tutor_sessions WHERE student_id = ?", (student_id,))
        tutor_stats = dict(cursor.fetchone())
        cursor.execute("SELECT COUNT(*) as total_items, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending FROM study_plans WHERE student_id = ?", (student_id,))
        plan_stats = dict(cursor.fetchone())
        return {**quiz_stats, **tutor_stats, **plan_stats}

if __name__ == "__main__":
    init_database()
