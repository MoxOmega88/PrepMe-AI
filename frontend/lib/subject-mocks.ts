import type { Profile } from "@/lib/auth"
import type { AppSubject } from "@/lib/subjects"

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const SOCIAL_TOPICS = [
  { topic: "The Indian Constitution", score: 0.45, tag: "Building" },
  { topic: "Natural Resources", score: 0.38, tag: "Weak" },
  { topic: "The Mughal Empire", score: 0.52, tag: "Building" },
  { topic: "Climate and Weather", score: 0.41, tag: "Weak" },
]

const ENGLISH_TOPICS = [
  { topic: "Grammar: Tenses", score: 0.55, tag: "Building" },
  { topic: "Reading Comprehension", score: 0.48, tag: "Building" },
  { topic: "Letter Writing", score: 0.35, tag: "Weak" },
  { topic: "Poetry Analysis", score: 0.42, tag: "Weak" },
]

export function buildPlaceholderProfile(
  base: Profile | null,
  subject: AppSubject
): Profile {
  const mastery: Profile["mastery"] = {}
  const topics = subject === "social_studies" ? SOCIAL_TOPICS : ENGLISH_TOPICS
  topics.forEach((t) => {
    mastery[t.topic] = {
      score: t.score,
      sessions_done: 2,
      last_tested: null,
    }
  })

  return {
    id: base?.id ?? "local",
    name: base?.name ?? "Student",
    email: base?.email ?? "",
    subject,
    exam_date: base?.exam_date ?? null,
    days_to_exam: base?.days_to_exam ?? 30,
    daily_hours: base?.daily_hours ?? 2.5,
    mastery,
  }
}

function analyticsPayload(subject: AppSubject) {
  const topics = subject === "social_studies" ? SOCIAL_TOPICS : ENGLISH_TOPICS
  const avg =
    topics.reduce((s, t) => s + t.score, 0) / Math.max(topics.length, 1)
  return {
    readiness: Math.round(avg * 100),
    days_to_exam: 45,
    sessions_done: 3,
    avg_mastery: avg,
    topic_performance: topics.map((t) => ({
      ...t,
      sessions_done: 2,
      quiz_attempts: 1,
      quiz_accuracy: 0.55,
    })),
    priority_queue: topics.slice(0, 3).map((t) => ({
      topic: t.topic,
      score: t.score,
      reason: "Placeholder — full content coming soon",
    })),
  }
}

export function getMockResponse(
  path: string,
  init: RequestInit,
  subject: AppSubject
): Response | null {
  const method = (init.method ?? "GET").toUpperCase()

  if (path.startsWith("/api/analytics/")) {
    return jsonResponse(analyticsPayload(subject))
  }

  if (path === "/api/quiz/exam-prediction" && method === "GET") {
    const topics =
      subject === "social_studies" ? SOCIAL_TOPICS : ENGLISH_TOPICS
    return jsonResponse({
      predicted_score: 68,
      confidence_level: "Medium",
      topic_breakdown: topics.map((t) => ({
        topic: t.topic,
        score: t.score * 100,
        accuracy: 0.55,
        mastery: t.score,
        confidence_calibration: 0.5,
      })),
    })
  }

  if (path.startsWith("/api/planner")) {
    if (path === "/api/planner/study-now" && method === "GET") {
      const topic =
        subject === "social_studies"
          ? SOCIAL_TOPICS[0].topic
          : ENGLISH_TOPICS[0].topic
      return jsonResponse({ topic, subject })
    }
    if (path === "/api/planner/burnout-check") {
      return jsonResponse({ burnout: false, message: null })
    }
    if (path === "/api/planner/regenerate" && method === "POST") {
      return jsonResponse({ ok: true })
    }
    if (path === "/api/planner/complete-session" && method === "POST") {
      return jsonResponse({ ok: true })
    }
    if (path.includes("/goals") && method === "PATCH") {
      return jsonResponse({ ok: true })
    }
    return jsonResponse({
      days_remaining: 45,
      exam_countdown: false,
      sessions: [
        {
          id: "ph-1",
          day: "Monday",
          date: new Date().toISOString().slice(0, 10),
          topic:
            subject === "social_studies"
              ? SOCIAL_TOPICS[0].topic
              : ENGLISH_TOPICS[0].topic,
          duration_hours: 1,
          type: "study",
          completed: false,
          goals: [],
        },
      ],
      weakest_topic:
        subject === "social_studies"
          ? SOCIAL_TOPICS[1].topic
          : ENGLISH_TOPICS[1].topic,
    })
  }

  if (path.startsWith("/api/quiz/")) {
    if (path === "/api/quiz/mistakes") {
      return jsonResponse([])
    }
    if (path === "/api/quiz/generate-question" && method === "POST") {
      return jsonResponse({
        question:
          subject === "social_studies"
            ? "Which part of the Constitution lists Fundamental Rights?"
            : "Identify the figure of speech in: 'The wind whispered through the trees.'",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_index: 1,
        explanation: "Placeholder content — NCERT PDFs coming soon.",
        topic:
          subject === "social_studies"
            ? SOCIAL_TOPICS[0].topic
            : ENGLISH_TOPICS[0].topic,
      })
    }
    if (path.includes("/prerequisites")) {
      return jsonResponse({ prerequisites: [], ready: true })
    }
    if (path === "/api/quiz/assess" || path === "/api/quiz/assess-teachback") {
      return jsonResponse({
        correct: true,
        score: 0.75,
        feedback: "Good effort! Placeholder assessment.",
        mastery_delta: 0.05,
      })
    }
    if (path === "/api/quiz/mistakes" && method === "POST") {
      return jsonResponse({ ok: true })
    }
  }

  if (path === "/api/tutor/ask" && method === "POST") {
    return jsonResponse({
      answer:
        "This is a preview response for " +
        (subject === "social_studies" ? "Social Studies" : "English") +
        ". Full NCERT-grounded tutoring is coming soon.",
      sources: [],
    })
  }

  if (path === "/api/profile/mastery" && method === "POST") {
    return jsonResponse({ ok: true })
  }

  if (path === "/api/profile/" && method === "PATCH") {
    return jsonResponse({ ok: true })
  }

  if (path === "/api/profile/" && method === "GET") {
    return jsonResponse(buildPlaceholderProfile(null, subject))
  }

  return null
}
