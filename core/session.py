"""
core/session.py
Central session-state bootstrap so every page gets a consistent initial state.
Topics reflect the actual PDF: "Keeping Time with the Skies" (NCERT Class 8 Science).
"""
import datetime
import streamlit as st


DEFAULT_MASTERY = {
    "Celestial Bodies & Motion":     0.50,
    "Solar System & Planets":        0.45,
    "Earth's Rotation & Revolution": 0.40,
    "Moon Phases & Lunar Calendar":  0.35,
    "Seasons & Solstices":           0.55,
    "Time Zones & Standard Time":    0.30,
    "Calendars (Solar & Lunar)":     0.60,
    "Eclipses (Solar & Lunar)":      0.40,
    "Stars & Constellations":        0.50,
    "Historical Astronomy":          0.65,
}

DEFAULT_EXAM_WEIGHTAGE = {
    "Celestial Bodies & Motion":     0.12,
    "Solar System & Planets":        0.10,
    "Earth's Rotation & Revolution": 0.12,
    "Moon Phases & Lunar Calendar":  0.10,
    "Seasons & Solstices":           0.10,
    "Time Zones & Standard Time":    0.10,
    "Calendars (Solar & Lunar)":     0.08,
    "Eclipses (Solar & Lunar)":      0.10,
    "Stars & Constellations":        0.10,
    "Historical Astronomy":          0.08,
}


def init_session():
    """Call once at the top of every page to ensure defaults exist."""

    if "student_profile" not in st.session_state:
        st.session_state.student_profile = {
            "name":          "Student",
            "subject":       "NCERT Science – Keeping Time with the Skies",
            "exam_date":     (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
            "days_to_exam":  30,
            "daily_hours":   3,
            "adherence_rate": 0.80,
        }

    if "mastery_profile" not in st.session_state:
        st.session_state.mastery_profile = {
            topic: {
                "score":        score,
                "last_tested":  None,
                "sessions_done": 0,
            }
            for topic, score in DEFAULT_MASTERY.items()
        }

    if "exam_weightage" not in st.session_state:
        st.session_state.exam_weightage = DEFAULT_EXAM_WEIGHTAGE.copy()

    if "study_plan" not in st.session_state:
        st.session_state.study_plan = []

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    if "current_q_index" not in st.session_state:
        st.session_state.current_q_index = 0
    if "questions" not in st.session_state:
        st.session_state.questions = []
    if "total_score" not in st.session_state:
        st.session_state.total_score = 0
    if "quiz_complete" not in st.session_state:
        st.session_state.quiz_complete = False
    if "feedback_history" not in st.session_state:
        st.session_state.feedback_history = []
    if "evaluations" not in st.session_state:
        st.session_state.evaluations = {}
    if "play_feedback" not in st.session_state:
        st.session_state.play_feedback = False

    if "streak" not in st.session_state:
        st.session_state.streak = 0
    if "study_log" not in st.session_state:
        st.session_state.study_log = {}
