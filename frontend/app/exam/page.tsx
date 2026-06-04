"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { AppShell } from "@/components/layout/app-shell"

// ── Types ──────────────────────────────────────────────────────────────────
type Phase = "setup" | "loading" | "active" | "results"

type Question = {
  section: string
  type: string
  marks: number
  question_text: string
  assertion?: string
  reason?: string
  passage?: string
  passage_type?: string
  sub_questions?: any[]
  extracts?: any[]
  questions?: any[]
  options?: string[]
  correct?: string
  correct_answer: string
  hint: string
  explanation: string
  bloom_level: string
  source_pages: string
}

type Section = {
  name: string
  type: string
  instructions: string
  questions_count: number
  marks_per_question: number
  section_marks: number
  questions: Question[]
}

type ExamPaper = {
  subject: string
  class_level: number
  topic_filter: string | null
  total_marks: number
  sections: Section[]
}

type Answer = {
  value: string
  marked_for_review: boolean
}

// ── CBSE Patterns (for preview table) ─────────────────────────────────────
const CBSE_PATTERNS: Record<string, any[]> = {
  Science: [
    { name: "Section A", type: "MCQ (includes 4 A-R)", questions: 20, marks: 20 },
    { name: "Section B", type: "VSA", questions: 6, marks: 12 },
    { name: "Section C", type: "SA", questions: 7, marks: 21 },
    { name: "Section D", type: "LA", questions: 3, marks: 15 },
    { name: "Section E", type: "Case Study", questions: 3, marks: 12 },
  ],
  Mathematics: [
    { name: "Section A", type: "MCQ (includes 2 A-R)", questions: 20, marks: 20 },
    { name: "Section B", type: "VSA", questions: 5, marks: 10 },
    { name: "Section C", type: "SA", questions: 6, marks: 18 },
    { name: "Section D", type: "LA", questions: 4, marks: 20 },
    { name: "Section E", type: "Case Study", questions: 3, marks: 12 },
  ],
  "Social Studies": [
    { name: "Section A", type: "MCQ", questions: 20, marks: 20 },
    { name: "Section B", type: "VSA", questions: 4, marks: 8 },
    { name: "Section C", type: "SA", questions: 5, marks: 15 },
    { name: "Section D", type: "LA", questions: 4, marks: 20 },
    { name: "Section E", type: "Case Study", questions: 3, marks: 12 },
    { name: "Section F", type: "Map", questions: 1, marks: 5 },
  ],
  English: [
    { name: "Section A", type: "Reading", questions: 2, marks: 20 },
    { name: "Section B", type: "Writing + Grammar", questions: 3, marks: 20 },
    { name: "Section C", type: "Literature", questions: 3, marks: 40 },
  ],
}

const CBSE_GRADES = [
  { min: 91, max: 100, grade: "A1" },
  { min: 81, max: 90,  grade: "A2" },
  { min: 71, max: 80,  grade: "B1" },
  { min: 61, max: 70,  grade: "B2" },
  { min: 51, max: 60,  grade: "C1" },
  { min: 41, max: 50,  grade: "C2" },
  { min: 33, max: 40,  grade: "D" },
  { min: 0,  max: 32,  grade: "E" },
]

export default function ExamPage() {
  const router = useRouter()
  const { profile, authFetch } = useAuth()

  const [phase, setPhase] = useState<Phase>("setup")
  const [subject, setSubject] = useState("Science")
  const [classLevel, setClassLevel] = useState(8)
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [useTopicFilter, setUseTopicFilter] = useState(false)

  const [paper, setPaper] = useState<ExamPaper | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60) // 3 hours
  const [currentSection, setCurrentSection] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")

  // Timer countdown
  useEffect(() => {
    if (phase !== "active") return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleStartExam = async () => {
    setError("")
    setPhase("loading")
    try {
      const res = await authFetch("/api/exam/generate", {
        method: "POST",
        body: JSON.stringify({
          subject,
          class_level: classLevel,
          topic_filter: useTopicFilter ? topicFilter : null,
        }),
      })
      if (!res.ok) throw new Error("Failed to generate exam")
      const data = await res.json()
      setPaper(data)
      setPhase("active")
    } catch (e: any) {
      setError(e.message)
      setPhase("setup")
    }
  }

  const handleAnswerChange = (qIndex: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: { value, marked_for_review: prev[qIndex]?.marked_for_review || false },
    }))
  }

  const toggleReview = (qIndex: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: {
        value: prev[qIndex]?.value || "",
        marked_for_review: !prev[qIndex]?.marked_for_review,
      },
    }))
  }

  const handleSubmit = () => {
    if (!paper) return
    let score = 0
    const sectionResults: any[] = []

    paper.sections.forEach((sec) => {
      let attempted = 0
      let correct = 0
      let marksObtained = 0

      sec.questions.forEach((q, idx) => {
        const qKey = `${sec.name}-${idx}`
        const ans = answers[qKey]?.value || ""
        if (ans.trim()) attempted++

        // MCQ/AR grading
        if (q.type === "mcq" || q.type === "assertion_reason") {
          if (ans.toUpperCase() === (q.correct || "").toUpperCase()) {
            correct++
            marksObtained += q.marks
          }
        }
        // Subjective - assume full marks if answered (demo grading)
        else if (ans.trim()) {
          marksObtained += q.marks
          correct++
        }
      })

      sectionResults.push({
        name: sec.name,
        attempted,
        correct,
        marksObtained,
        maxMarks: sec.section_marks,
      })
      score += marksObtained
    })

    const percentage = Math.round((score / 80) * 100)
    const gradeObj = CBSE_GRADES.find((g) => percentage >= g.min && percentage <= g.max)

    setResults({
      score,
      percentage,
      grade: gradeObj?.grade || "E",
      sections: sectionResults,
    })
    setPhase("results")
  }

  const totalQuestions = paper ? paper.sections.reduce((sum, s) => sum + s.questions.length, 0) : 0
  const answeredCount = Object.keys(answers).filter((k) => answers[k].value.trim()).length
  const canSubmit = answeredCount >= totalQuestions * 0.5

  // ── PHASE 1: Setup Screen ─────────────────────────────────────────────────
  if (phase === "setup") {
    const pattern = CBSE_PATTERNS[subject] || []
    const totalQ = pattern.reduce((sum, s) => sum + s.questions, 0)

    return (
      <AppShell>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-6">
            <h1 className="text-3xl font-bold mb-2 text-center">CBSE Board Exam Simulation</h1>
            <p className="text-center text-sm mb-6 text-amber-700 font-semibold">
              ⚠️ This simulates a real CBSE exam paper. Once started, a 3-hour timer begins.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Subject selector */}
              <div>
                <label className="block font-bold mb-2">Subject</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* Class selector */}
              <div>
                <label className="block font-bold mb-2">Class</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded"
                  value={classLevel}
                  onChange={(e) => setClassLevel(Number(e.target.value))}
                >
                  <option value={8}>Class 8</option>
                  <option value={9}>Class 9</option>
                  <option value={10}>Class 10</option>
                </select>
              </div>

              {/* Topic filter toggle */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useTopicFilter}
                    onChange={(e) => setUseTopicFilter(e.target.checked)}
                  />
                  <span className="font-bold">Use Topic Filter (optional)</span>
                </label>
                {useTopicFilter && (
                  <input
                    type="text"
                    className="w-full mt-2 p-2 border border-gray-300 rounded"
                    placeholder="e.g., Force and Pressure"
                    value={topicFilter || ""}
                    onChange={(e) => setTopicFilter(e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Exam structure preview */}
          <div className="neo-card p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Exam Structure</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left p-2">Section</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-center p-2">Questions</th>
                  <th className="text-center p-2">Marks</th>
                </tr>
              </thead>
              <tbody>
                {pattern.map((s, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="p-2 font-semibold">{s.name}</td>
                    <td className="p-2">{s.type}</td>
                    <td className="p-2 text-center">{s.questions}</td>
                    <td className="p-2 text-center">{s.marks}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="p-2">Total</td>
                  <td className="p-2">—</td>
                  <td className="p-2 text-center">{totalQ}</td>
                  <td className="p-2 text-center">80</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              className="brut-btn brut-btn-outline px-6 py-3"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </button>
            <button className="brut-btn brut-btn-red px-6 py-3" onClick={handleStartExam}>
              Start Exam →
            </button>
          </div>
        </div>
      </div>
      </AppShell>
    )
  }

  // ── PHASE 2: Loading ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <div className="neo-card p-12 text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold mb-2">Generating Your Exam Paper</h2>
          <p className="text-gray-600 mb-4">This may take 30–60 seconds...</p>
          <div className="flex gap-2 justify-center">
            <span className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <span className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
      </AppShell>
    )
  }

  // ── PHASE 3: Active Exam ──────────────────────────────────────────────────
  if (phase === "active" && paper) {
    const allQuestions: { section: string; q: Question; idx: number }[] = []
    paper.sections.forEach((sec) => {
      sec.questions.forEach((q, idx) => {
        allQuestions.push({ section: sec.name, q, idx })
      })
    })

    return (
      <AppShell>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="sticky top-0 z-50 bg-white border-b-2 border-gray-300 p-4 flex justify-between items-center shadow">
          <div className="font-bold text-lg">
            CBSE Class {paper.class_level} {paper.subject} — Mock Exam
          </div>
          <div
            className={`text-2xl font-mono font-bold ${
              timeLeft < 15 * 60 ? "text-red-600" : "text-gray-800"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">
              {answeredCount} / {totalQuestions} answered
            </span>
            <button
              className={`brut-btn brut-btn-red px-4 py-2 ${!canSubmit ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Submit Paper
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Left sidebar */}
          <div className="w-64 bg-white border-r-2 border-gray-300 p-4 sticky top-20 h-screen overflow-y-auto">
            <h3 className="font-bold mb-3 text-sm uppercase">Sections</h3>
            <div className="space-y-2 mb-6">
              {paper.sections.map((sec, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-2 rounded border ${
                    currentSection === i ? "bg-blue-100 border-blue-500" : "border-gray-300"
                  }`}
                  onClick={() => setCurrentSection(i)}
                >
                  {sec.name}
                </button>
              ))}
            </div>

            <h3 className="font-bold mb-3 text-sm uppercase">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {allQuestions.map((item, gIdx) => {
                const qKey = `${item.section}-${item.idx}`
                const ans = answers[qKey]
                const status = ans?.marked_for_review
                  ? "bg-yellow-300"
                  : ans?.value.trim()
                  ? "bg-green-300"
                  : "bg-white"
                return (
                  <button
                    key={gIdx}
                    className={`w-8 h-8 border border-gray-400 text-xs font-bold ${status}`}
                    onClick={() => {
                      const secIdx = paper.sections.findIndex((s) => s.name === item.section)
                      setCurrentSection(secIdx)
                    }}
                  >
                    {gIdx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-8">
            {paper.sections.map((sec, secIdx) => {
              if (secIdx !== currentSection) return null
              return (
                <div key={secIdx} className="neo-card p-8 mb-8">
                  <h2 className="text-2xl font-bold mb-2 border-b-2 border-gray-400 pb-2">
                    {sec.name}
                  </h2>
                  <p className="text-sm mb-6 text-gray-600">{sec.instructions}</p>

                  {sec.questions.map((q, qIdx) => {
                    const qKey = `${sec.name}-${qIdx}`
                    const ans = answers[qKey]

                    return (
                      <div key={qIdx} className="mb-8 pb-6 border-b border-gray-300">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <span className="font-bold text-lg">Q{qIdx + 1}. </span>
                            {q.type === "assertion_reason" ? (
                              <div className="ml-6">
                                <p className="mb-2">
                                  <strong>Assertion (A):</strong> {q.assertion}
                                </p>
                                <p className="mb-2">
                                  <strong>Reason (R):</strong> {q.reason}
                                </p>
                              </div>
                            ) : q.type === "case_study" ? (
                              <div className="ml-6">
                                <blockquote className="p-4 bg-gray-100 border-l-4 border-gray-400 italic mb-4">
                                  {q.passage}
                                </blockquote>
                                {q.sub_questions?.map((sub: any, subIdx: number) => (
                                  <p key={subIdx} className="mb-2">
                                    <strong>
                                      ({String.fromCharCode(97 + subIdx)}) [{sub.marks} mark
                                      {sub.marks > 1 ? "s" : ""}]
                                    </strong>{" "}
                                    {sub.question}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="ml-1">{q.question_text}</span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-600 ml-4">
                            [{q.marks} mark{q.marks > 1 ? "s" : ""}]
                          </span>
                        </div>

                        {/* MCQ / AR options */}
                        {(q.type === "mcq" || q.type === "assertion_reason") && q.options && (
                          <div className="ml-8 space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name={qKey}
                                  value={String.fromCharCode(65 + oIdx)}
                                  checked={ans?.value === String.fromCharCode(65 + oIdx)}
                                  onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                                  className="w-4 h-4"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Short/long answer text area */}
                        {q.type !== "mcq" && q.type !== "assertion_reason" && q.type !== "case_study" && (
                          <textarea
                            className="w-full p-3 border border-gray-300 rounded mt-3"
                            rows={q.marks >= 5 ? 8 : q.marks >= 3 ? 5 : 3}
                            placeholder={`Write your answer here (approx ${
                              q.marks * 30
                            } words)...`}
                            value={ans?.value || ""}
                            onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                          />
                        )}

                        {/* Case study sub-answer */}
                        {q.type === "case_study" && (
                          <textarea
                            className="w-full p-3 border border-gray-300 rounded mt-3"
                            rows={5}
                            placeholder="Answer all sub-questions..."
                            value={ans?.value || ""}
                            onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                          />
                        )}

                        {/* Mark for review */}
                        <div className="mt-3 flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ans?.marked_for_review || false}
                              onChange={() => toggleReview(qKey)}
                            />
                            <span className="text-sm font-semibold text-yellow-700">
                              Mark for Review
                            </span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </AppShell>
    )
  }

  // ── PHASE 4: Results ──────────────────────────────────────────────────────
  if (phase === "results" && results) {
    return (
      <AppShell>
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-6">
            <h1 className="text-3xl font-bold mb-6 text-center">Exam Results</h1>

            <div className="bg-gradient-to-r from-blue-100 to-green-100 p-8 rounded-lg mb-6 text-center">
              <div className="text-5xl font-bold mb-2">
                {results.score} / 80
              </div>
              <div className="text-2xl mb-2">
                {results.percentage}%
              </div>
              <div className="text-3xl font-bold text-green-700">
                Grade: {results.grade}
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">Section-wise Breakdown</h2>
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left p-2">Section</th>
                  <th className="text-center p-2">Attempted</th>
                  <th className="text-center p-2">Correct</th>
                  <th className="text-center p-2">Marks Obtained</th>
                  <th className="text-center p-2">Max Marks</th>
                </tr>
              </thead>
              <tbody>
                {results.sections.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="p-2 font-semibold">{s.name}</td>
                    <td className="p-2 text-center">{s.attempted}</td>
                    <td className="p-2 text-center">{s.correct}</td>
                    <td className="p-2 text-center">{s.marksObtained}</td>
                    <td className="p-2 text-center">{s.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-4 justify-center">
              <button
                className="brut-btn brut-btn-outline px-6 py-3"
                onClick={() => {
                  const text = `CBSE Mock Exam Results\nSubject: ${paper?.subject}\nClass: ${paper?.class_level}\n\nScore: ${results.score}/80\nPercentage: ${results.percentage}%\nGrade: ${results.grade}\n\nSection Breakdown:\n${results.sections
                    .map((s: any) => `${s.name}: ${s.marksObtained}/${s.maxMarks}`)
                    .join("\n")}`
                  const blob = new Blob([text], { type: "text/plain" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `exam-result-${Date.now()}.txt`
                  a.click()
                }}
              >
                Download Result
              </button>
              <button
                className="brut-btn brut-btn-red px-6 py-3"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
      </AppShell>
    )
  }

  return null
}
