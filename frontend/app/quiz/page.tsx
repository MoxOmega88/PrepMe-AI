"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ── Topic lists ────────────────────────────────────────────────────────────────
const SCIENCE_TOPICS = [
  "Exploring the Investigative World of Science",
  "The Invisible Living World: Beyond Our Naked Eye",
  "Health: The Ultimate Treasure",
  "Electricity: Magnetic and Heating Effects",
  "Exploring Forces",
  "Pressure, Winds, Storms, and Cyclones",
  "Particulate Nature of Matter",
  "Nature of Matter: Elements, Compounds, and Mixtures",
  "The Amazing World of Solutes, Solvents, and Solutions",
  "Light: Mirrors and Lenses",
  "Keeping Time with the Skies",
]
const MATHS_TOPICS = [
  "Rational Numbers",
  "Linear Equations in One Variable",
  "Understanding Quadrilaterals",
  "Practical Geometry",
  "Data Handling",
  "Squares and Square Roots",
  "Cubes and Cube Roots",
  "Comparing Quantities",
  "Algebraic Expressions and Identities",
  "Mensuration",
  "Exponents and Powers",
  "Direct and Inverse Proportions",
  "Factorisation",
  "Introduction to Graphs",
]

// ── Types ──────────────────────────────────────────────────────────────────────
type QType      = "mcq" | "truefalse" | "fillblank" | "short" | "mixed" | "teach_back"
type Mode       = "practice" | "exam"
type Confidence = "sure" | "unsure" | "guessing"
type Phase      = "setup" | "question" | "feedback" | "results" | "journal"

interface QuizQuestion {
  type: string; question: string
  options?: string[]; correct?: string | boolean
  answer?: string; reference_answer?: string
  explanation?: string; topic: string; difficulty: number
  concept?: string
}
interface Assessment {
  overall_score: number; score_percentage: number; correctness: string
  feedback_for_student: string; key_points_covered: string[]
  key_points_missed: string[]; model_answer: string; misconception?: string
  accuracy?: number; completeness?: number; clarity?: number; teach_back?: boolean
}
interface AttemptRecord {
  question: QuizQuestion; studentAnswer: string
  assessment: Assessment; xpEarned: number; confidence: Confidence
}
interface Mistake {
  id: string; topic: string; question: string
  student_answer: string; correct_answer: string
  misconception?: string; confidence: string; created_at: string
}

// ── XP / Streak helpers ────────────────────────────────────────────────────────
const getXP  = () => parseInt(localStorage.getItem("quiz_xp") || "0")
const addXP  = (n: number) => localStorage.setItem("quiz_xp", String(getXP() + n))
function getStreak() {
  const last = localStorage.getItem("quiz_streak_date"), today = new Date().toDateString()
  if (last === today) return parseInt(localStorage.getItem("quiz_streak") || "0")
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (last === yesterday) return parseInt(localStorage.getItem("quiz_streak") || "0")
  return 0
}
function bumpStreak() {
  const today = new Date().toDateString(), last = localStorage.getItem("quiz_streak_date")
  if (last === today) return
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const cur = last === yesterday ? parseInt(localStorage.getItem("quiz_streak") || "0") : 0
  localStorage.setItem("quiz_streak", String(cur + 1))
  localStorage.setItem("quiz_streak_date", today)
}

// ── Difficulty helpers ─────────────────────────────────────────────────────────
const diffLabel = (d: number) => d <= 0.35 ? "Easy" : d <= 0.65 ? "Medium" : "Hard"
const diffTier  = (d: number): 0 | 1 | 2 => d <= 0.35 ? 0 : d <= 0.65 ? 1 : 2

function adaptDifficulty(cur: number, correct: boolean, conf: Confidence): number {
  let delta = 0
  if (correct  && conf === "sure")     delta = +0.08
  else if (correct  && conf === "unsure")  delta = +0.03
  else if (!correct && conf === "guessing") delta = -0.03
  else if (!correct && conf === "sure")    delta = -0.10
  return Math.min(1.0, Math.max(0.1, parseFloat((cur + delta).toFixed(2))))
}

// ── Difficulty Meter ───────────────────────────────────────────────────────────
function DifficultyMeter({ value, prevValue }: { value: number; prevValue: number }) {
  const tier = diffTier(value)
  const prevTier = diffTier(prevValue)
  const changed = tier !== prevTier
  const up = tier > prevTier
  const labels = ["Easy", "Medium", "Hard"]
  const colors = ["bg-[#2a7d4f]", "bg-[#c47c2b]", "bg-[#4A6FA5]"]
  const textColors = ["text-[#2a7d4f]", "text-[#c47c2b]", "text-[#4A6FA5]"]

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className={cn(
            "h-1.5 w-7 transition-all duration-500 rounded-none",
            i === tier ? colors[i] : "bg-[#2A2A2A]"
          )} />
        ))}
      </div>
      <span className={cn("text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-300", textColors[tier])}>
        {changed && <span className="mr-0.5">{up ? "▲" : "▼"}</span>}
        {labels[tier]}
      </span>
    </div>
  )
}

// ── Toast notification ─────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 bg-[#4A6FA5] text-white text-xs font-bold font-mono uppercase tracking-wider px-4 py-3 border border-[#4A6FA5] rounded-none",
      "transition-all duration-300",
      visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
    )}>
      {message}
    </div>
  )
}

// ── Floating XP badge ──────────────────────────────────────────────────────────
function XPFloat({ amount, visible }: { amount: number; visible: boolean }) {
  return (
    <div className={cn(
      "absolute bottom-14 left-1/2 -translate-x-1/2 font-mono font-black text-lg text-[#2a7d4f]",
      "pointer-events-none transition-all duration-700",
      visible ? "opacity-100 -translate-y-8" : "opacity-0 translate-y-0"
    )}>
      +{amount} XP
    </div>
  )
}

// ── Animated XP counter ────────────────────────────────────────────────────────
function XPCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    if (target === prev.current) return
    const start = prev.current, diff = target - start, steps = 20
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplay(Math.round(start + (diff * i) / steps))
      if (i >= steps) { clearInterval(id); prev.current = target }
    }, 30)
    return () => clearInterval(id)
  }, [target])
  return <span className="font-mono font-black text-[#2a7d4f]">⚡ {display} XP</span>
}

// ── In-quiz streak dots ────────────────────────────────────────────────────────
function StreakDots({ attempts }: { attempts: AttemptRecord[] }) {
  const last4 = attempts.slice(-4)
  const consec = (() => {
    let n = 0
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].assessment.correctness === "correct") n++; else break
    }
    return n
  })()
  const lastTwo = attempts.slice(-2)
  const twoWrong = lastTwo.length === 2 && lastTwo.every(a => a.assessment.correctness !== "correct")
  const lastWrongSure = attempts.length > 0 &&
    attempts[attempts.length-1].assessment.correctness !== "correct" &&
    attempts[attempts.length-1].confidence === "sure"

  let msg = ""
  if (consec >= 3) msg = "You're on a roll! 🔥"
  else if (twoWrong) msg = "Take a breath, read carefully 🧘"
  else if (lastWrongSure) msg = "Careful — review this concept"

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {last4.map((a, i) => (
          <div key={i} className={cn(
            "w-2 h-2 transition-all rounded-none",
            a.assessment.correctness === "correct" ? "bg-[#2a7d4f]" : "bg-[#4A6FA5]"
          )} />
        ))}
      </div>
      {msg && <span className="text-[10px] text-[#8888A0] font-mono italic">{msg}</span>}
    </div>
  )
}

// ── Result Banner ─────────────────────────────────────────────────────────────
function ResultBanner({ correctness, confidence, xpEarned, diffDelta }: {
  correctness: string; confidence: Confidence; xpEarned: number; diffDelta: number
}) {
  const correct = correctness === "correct"
  const partial = correctness === "partially_correct"

  let bg = "", icon = "", title = "", sub = ""
  if (correct && confidence === "sure") {
    bg = "bg-[#2a7d4f] text-[#0A0A0A]"; icon = "💪"; title = "Solid Knowledge!"
    sub = diffDelta > 0 ? "Difficulty increasing — keep it up!" : ""
  } else if (correct && confidence === "unsure") {
    bg = "bg-[#2a7d4f]/80 text-[#0A0A0A]"; icon = "✨"; title = "Nice!"
    sub = "Build more confidence on this topic."
  } else if (correct && confidence === "guessing") {
    bg = "bg-[#2a7d4f]/60 text-[#0A0A0A]"; icon = "🎯"; title = "Lucky guess!"
    sub = "Make sure you understand why this is correct."
  } else if (!correct && !partial && confidence === "sure") {
    bg = "bg-[#4A6FA5] text-white"; icon = "⚠️"; title = "Misconception Alert!"
    sub = "You were sure but incorrect — this is important to fix."
  } else if (!correct && !partial && confidence === "guessing") {
    bg = "bg-[#c47c2b] text-[#0A0A0A]"; icon = "📖"; title = "Need more study here."
    sub = "Review this topic before your next session."
  } else if (partial) {
    bg = "bg-[#c47c2b]/80 text-[#0A0A0A]"; icon = "⚡"; title = "Partial credit!"
    sub = "Close — refine your understanding."
  } else {
    bg = "bg-[#4A6FA5]/80 text-white"; icon = "❌"; title = "Incorrect"
    sub = "Review the explanation below."
  }

  return (
    <div className={cn("p-4 border-l-4 border-white/30 transition-all duration-500 animate-in slide-in-from-top-2 rounded-none", bg)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black text-base uppercase tracking-wide">{icon} {title}</p>
          {sub && <p className="text-xs opacity-80 mt-0.5 font-mono">{sub}</p>}
        </div>
        {xpEarned > 0 && (
          <div className="text-center border border-black/20 px-3 py-1.5 rounded-none">
            <p className="font-mono text-xl font-black">{xpEarned}</p>
            <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold">XP</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Misconception slide-in ─────────────────────────────────────────────────────
function MisconceptionBox({ text, visible, onJournal }: {
  text: string; visible: boolean; onJournal: () => void
}) {
  return (
    <div className={cn(
      "border-l-4 border-[#c47c2b] bg-[#c47c2b]/5 p-4 space-y-2 rounded-none",
      "transition-all duration-500",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden p-0"
    )}>
      <p className="section-label amber">What went wrong:</p>
      <p className="text-sm text-[#1c1f3a] font-mono leading-relaxed">{text}</p>
      <button onClick={onJournal} className="text-[10px] text-[#c47c2b] font-bold uppercase tracking-wider hover:underline rounded-none">
        ■ Saved to Mistake Journal →
      </button>
    </div>
  )
}

// ── Setup Screen ───────────────────────────────────────────────────────────────
function SetupScreen({ subject, onStart, onJournal, initialTopic }: {
  subject: string
  onStart: (cfg: { topic: string; qType: QType; mode: Mode; count: number; difficulty: number }) => void
  onJournal: () => void
  initialTopic?: string
}) {
  const topics = subject === "maths" ? MATHS_TOPICS : SCIENCE_TOPICS
  const [topic, setTopic]       = useState(initialTopic && topics.includes(initialTopic) ? initialTopic : topics[0])
  const [qType, setQType]       = useState<QType>("mixed")
  const [mode, setMode]         = useState<Mode>("practice")
  const [count, setCount]       = useState(5)
  const [difficulty, setDifficulty] = useState(0.5)
  useEffect(() => {
    const list = subject === "maths" ? MATHS_TOPICS : SCIENCE_TOPICS
    setTopic(initialTopic && list.includes(initialTopic) ? initialTopic : list[0])
  }, [subject, initialTopic])

  const selectCls = "w-full bg-[#F5F0E8] border border-[#C0BAB0] text-[#1c1f3a] px-3 py-2.5 text-xs font-mono outline-none focus:border-[#4A6FA5] transition-colors rounded-none"

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-slide-right">
        <div>
          <p className="section-label pink mb-2 animate-[slide-right_0.5s_ease-out_0.1s_both]">Quiz</p>
          <h1 className="font-serif font-black text-3xl text-[#1c1f3a] animate-[slide-right_0.5s_ease-out_0.2s_both]">Configure Session</h1>
        </div>
        <button onClick={onJournal} className="text-[10px] text-[#8888A0] font-bold uppercase tracking-wider hover:text-[#c47c2b] transition-colors animate-[slide-right_0.5s_ease-out_0.3s_both] rounded-none">
          ■ Mistake Journal
        </button>
      </div>

      {/* Mode */}
      <div className="neo-card neo-card-amber p-5 border border-[rgba(28,31,58,0.14)] rounded-none" style={{ animationDelay: "0.2s" }}>
        <p className="section-label mb-3">Mode</p>
        <div className="flex gap-2">
          {(["practice","exam"] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors rounded-none",
                mode === m ? "bg-[#4A6FA5] text-white shadow-[0_0_15px_rgba(74,111,165,0.4)]" : "bg-[rgba(28,31,58,0.06)] text-[#8888A0] hover:text-[#1c1f3a] border border-[rgba(28,31,58,0.14)] hover:border-[#4A6FA5]")}>
              {m === "practice" ? "🎯 Practice" : "⏱ Exam"}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#8888A0] font-mono mt-3">
          {mode === "practice" ? "Instant feedback · No timer" : "30s timer · Results at end"}
        </p>
      </div>

      {/* Settings */}
      <div className="neo-card neo-card-pink p-5 space-y-5 border border-[rgba(28,31,58,0.14)] rounded-none relative overflow-hidden group/settings" style={{ animationDelay: "0.3s" }}>
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(74,111,165,0.4) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 space-y-5">
          <div>
            <p className="section-label mb-2">Topic</p>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-full bg-[rgba(16,16,32,0.82)] border-[rgba(28,31,58,0.14)] text-[#1c1f3a] font-mono text-xs hover:border-[#4A6FA5] transition-colors focus:ring-[#4A6FA5] py-3 h-auto shadow-md hover:shadow-[0_0_12px_rgba(74,111,165,0.3)]">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent className="bg-[rgba(255,255,255,0.88)] border-[rgba(28,31,58,0.18)] text-[#1c1f3a] font-mono shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-md max-h-64">
                {topics.map(t => (
                  <SelectItem key={t} value={t} className="focus:bg-[#4A6FA5] focus:text-white cursor-pointer text-xs transition-colors py-2">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="section-label mb-2">Question Type</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(["mixed","mcq","truefalse","fillblank","short","teach_back"] as QType[]).map(t => (
                <button key={t} onClick={() => setQType(t)}
                  className={cn("py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none",
                    qType === t ? "bg-[#2a7d4f] text-[#0A0A0A] shadow-[0_0_15px_rgba(42,125,79,0.3)]" : "bg-[rgba(28,31,58,0.06)] text-[#8888A0] hover:text-[#1c1f3a] border border-[rgba(28,31,58,0.14)] hover:border-[#2a7d4f]")}>
                  {t === "mixed" ? "Mix" : t === "mcq" ? "MCQ" : t === "truefalse" ? "T/F" : t === "fillblank" ? "Fill" : t === "short" ? "Short" : "Teach Back"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="section-label mb-2">Questions</p>
            <div className="flex gap-2">
              {[5,10,15].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={cn("flex-1 py-3 text-xs font-black transition-colors rounded-none",
                    count === n ? "bg-[#4A6FA5] text-white shadow-[0_0_15px_rgba(74,111,165,0.3)]" : "bg-[rgba(28,31,58,0.06)] text-[#8888A0] hover:text-[#1c1f3a] border border-[rgba(28,31,58,0.14)] hover:border-[#4A6FA5]")}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="section-label">Difficulty</p>
              <DifficultyMeter value={difficulty} prevValue={difficulty} />
            </div>
            <div className="px-1 py-2">
              <Slider
                min={0.1} max={1} step={0.1}
                value={[difficulty]}
                onValueChange={(val) => setDifficulty(val[0])}
                fillColor={diffTier(difficulty) === 0 ? "#2a7d4f" : diffTier(difficulty) === 1 ? "#c47c2b" : "#4A6FA5"}
              />
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => onStart({ topic, qType, mode, count, difficulty })}
        className="brut-btn brut-btn-pink w-full py-3.5 text-sm font-bold animate-float rounded-none shadow-[0_0_15px_rgba(74,111,165,0.4)]" style={{ animationDelay: "0.4s" }}>
        Start Quiz →
      </button>
    </div>
  )
}

// ── Circle Timer ───────────────────────────────────────────────────────────────
function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 22, circ = 2 * Math.PI * r, frac = seconds / total
  const color = seconds <= 5 ? "#DC2626" : seconds <= 10 ? "#D97706" : "#5B6CF8"
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E8ECF4" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${frac * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute font-mono text-sm font-bold" style={{ color }}>{seconds}</span>
    </div>
  )
}

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({ q, chapterTopic, idx, total, mode, curDiff, prevDiff, attempts, onSubmit, busy, elapsedSeconds }: {
  q: QuizQuestion; chapterTopic: string; idx: number; total: number; mode: Mode
  curDiff: number; prevDiff: number; attempts: AttemptRecord[]
  onSubmit: (answer: string, confidence: Confidence) => void; busy: boolean; elapsedSeconds: number
}) {
  const [selected, setSelected]     = useState<string>("")
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  const [timeLeft, setTimeLeft]     = useState(30)
  const [showXP, setShowXP]         = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSelected(""); setConfidence(null); setTimeLeft(30); setShowXP(false)
    if (mode === "exam") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); onSubmit("", "guessing"); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [q.question])

  const submit = () => {
    if (q.type !== "teach_back" && !confidence) return
    if (timerRef.current) clearInterval(timerRef.current)
    onSubmit(selected, confidence ?? "guessing")
  }

  const canSubmit = selected.trim() !== "" && (q.type === "teach_back" || confidence !== null) && !busy
  const progress  = (idx / total) * 100

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remaining = secs % 60
    return `${mins}:${String(remaining).padStart(2, "0")}`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs font-black text-[rgba(28,31,58,0.40)]">Q{idx + 1} / {total}</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#4A6FA5]/10 text-[#4A6FA5] font-bold uppercase tracking-wider border border-[#4A6FA5]/20 rounded-none">{q.type}</span>
          <DifficultyMeter value={curDiff} prevValue={prevDiff} />
        </div>
        <div className="flex items-center gap-4">
          {mode === "exam" && <CircleTimer seconds={timeLeft} total={30} />}
        </div>
      </div>

      <div className="h-0.5 bg-[#C0BAB0] overflow-hidden rounded-none">
        <div className="h-full bg-[#4A6FA5] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {attempts.length > 0 && <StreakDots attempts={attempts} />}

      <div className="neo-card neo-card-green p-6 space-y-5 relative border border-[rgba(28,31,58,0.14)] rounded-none overflow-hidden group/qcard">
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(42,125,79,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="relative z-10 space-y-5">
          {/* Top-right live timer */}
          <div className="absolute top-0 right-0 font-mono text-xs font-bold text-[#2a7d4f] bg-[rgba(42,125,79,0.1)] px-3 py-1 border border-[rgba(42,125,79,0.3)] rounded-none">
            {formatTime(elapsedSeconds)}
          </div>

          {chapterTopic && (
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#666680]">
              ■ CHAPTER: {chapterTopic}
            </p>
          )}
          <p className="text-base text-[#1c1f3a] font-mono leading-relaxed pr-16">{q.question}</p>

          {q.type === "mcq" && q.options && (
            <div className="space-y-3 mt-2">
              {q.options.map((opt, i) => {
                const letter = ["A","B","C","D"][i]
                return (
                  <button key={i} onClick={() => setSelected(letter)}
                    className={cn("w-full text-left px-5 py-4 border text-xs font-mono transition-all duration-300 rounded-none shadow-sm hover:translate-x-1",
                      selected === letter
                        ? "border-[#4A6FA5] bg-[#4A6FA5]/15 text-[#4A6FA5] font-bold shadow-[inset_4px_0_0_#4A6FA5]"
                        : "border-[rgba(255,255,255,0.1)] text-[#1c1f3a] hover:border-[#4A6FA5]/50 hover:bg-[rgba(28,31,58,0.05)] bg-[rgba(16,16,32,0.6)]")}>
                    <span className={cn("font-black mr-3", selected === letter ? "text-[#4A6FA5]" : "text-[rgba(28,31,58,0.40)]")}>{letter})</span>{opt.replace(/^[A-D]\)\s*/,"")}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === "truefalse" && (
            <div className="flex gap-4 mt-2">
              {["true","false"].map(v => (
                <button key={v} onClick={() => setSelected(v)}
                  className={cn("flex-1 py-4 border text-xs font-black uppercase tracking-wider transition-all duration-300 rounded-none hover:-translate-y-1 shadow-md",
                    selected === v
                      ? "border-[#2a7d4f] bg-[#2a7d4f]/15 text-[#2a7d4f] shadow-[0_0_15px_rgba(42,125,79,0.2)]"
                      : "border-[rgba(255,255,255,0.1)] text-[#1c1f3a] hover:border-[#2a7d4f]/50 hover:bg-[rgba(28,31,58,0.05)] bg-[rgba(16,16,32,0.6)]")}>
                  {v === "true" ? "✓ True" : "✗ False"}
                </button>
              ))}
            </div>
          )}

          {q.type === "fillblank" && (
            <input value={selected} onChange={e => setSelected(e.target.value)}
              placeholder="Type the missing word…"
              className="w-full bg-[rgba(16,16,32,0.8)] border border-[rgba(28,31,58,0.14)] text-[#1c1f3a] px-4 py-3 text-sm font-mono outline-none focus:border-[#4A6FA5] focus:shadow-[0_0_15px_rgba(74,111,165,0.2)] transition-all rounded-none mt-2" />
          )}

          {q.type === "short" && (
            <textarea value={selected} onChange={e => setSelected(e.target.value)}
              placeholder="Write your answer…" rows={4}
              className="w-full bg-[rgba(16,16,32,0.8)] border border-[rgba(28,31,58,0.14)] text-[#1c1f3a] px-4 py-3 text-sm font-mono outline-none focus:border-[#4A6FA5] focus:shadow-[0_0_15px_rgba(74,111,165,0.2)] transition-all resize-none rounded-none mt-2" />
          )}

          {q.type === "teach_back" && (
            <textarea
              value={selected}
              onChange={e => setSelected(e.target.value)}
              placeholder="Explain in your own words — aim for 3+ sentences"
              style={{ minHeight: "140px" }}
              className="w-full bg-[rgba(16,16,32,0.8)] border border-[rgba(28,31,58,0.14)] text-[#1c1f3a] px-4 py-3 text-sm font-mono outline-none focus:border-[#4A6FA5] focus:shadow-[0_0_15px_rgba(74,111,165,0.2)] transition-all resize-none rounded-none mt-2"
            />
          )}

          {q.type !== "teach_back" && (
            <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 mt-6">
              <p className="section-label mb-3">How confident are you?</p>
              <div className="flex gap-3">
                {([["sure","😎 Sure"],["unsure","🤔 Unsure"],["guessing","🎲 Guessing"]] as [Confidence,string][]).map(([val,label]) => (
                  <button key={val} onClick={() => setConfidence(val)}
                    className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-wider border transition-all duration-300 rounded-none hover:-translate-y-1",
                      confidence === val
                        ? "border-[#2a7d4f] bg-[#2a7d4f]/15 text-[#2a7d4f] shadow-[0_0_15px_rgba(42,125,79,0.2)]"
                        : "border-[rgba(255,255,255,0.1)] text-[rgba(28,31,58,0.40)] hover:border-[rgba(255,255,255,0.3)] hover:text-[#1c1f3a] bg-[rgba(16,16,32,0.6)]")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative mt-6">
            <button onClick={submit} disabled={!canSubmit}
              className="brut-btn brut-btn-pink w-full py-3.5 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none rounded-none overflow-hidden group/submit">
              <span className="relative z-10 transition-transform duration-300 group-hover/submit:translate-x-1 inline-block">
                {busy ? "Checking…" : (q.type !== "teach_back" && !confidence) ? "Select confidence to submit" : "Submit Answer →"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feedback Card ──────────────────────────────────────────────────────────────
function FeedbackCard({ q, assessment, studentAnswer, xpEarned, confidence, onNext, isLast, onJournal }: {
  q: QuizQuestion; assessment: Assessment; studentAnswer: string
  xpEarned: number; confidence: Confidence; onNext: () => void; isLast: boolean; onJournal: () => void
}) {
  const correct = assessment.correctness === "correct"
  const partial = assessment.correctness === "partially_correct"
  const showMisconception = !correct && !partial && !!assessment.misconception
  const [showXP, setShowXP] = useState(false)
  useEffect(() => {
    if (xpEarned > 0) { setShowXP(true); setTimeout(() => setShowXP(false), 900) }
  }, [])

  if (q.type === "teach_back" || assessment.teach_back) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="p-5 space-y-4 border border-[rgba(28,31,58,0.14)] rounded-none bg-[rgba(255,255,255,0.88)]">
          <p className="section-label pink mb-3">Teach-Back Rubric</p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center p-2.5 border border-[rgba(28,31,58,0.14)] bg-[#1E1E2E] rounded-none">
              <span className="font-bold text-[#1c1f3a]">Accuracy</span>
              <span className="font-black text-sm text-[#2a7d4f]">{assessment.accuracy ?? 0}/10</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border border-[rgba(28,31,58,0.14)] bg-[#1E1E2E] rounded-none">
              <span className="font-bold text-[#1c1f3a]">Completeness</span>
              <span className="font-black text-sm text-[#c47c2b]">{assessment.completeness ?? 0}/10</span>
            </div>
            <div className="flex justify-between items-center p-2.5 border border-[rgba(28,31,58,0.14)] bg-[#1E1E2E] rounded-none">
              <span className="font-bold text-[#1c1f3a]">Clarity</span>
              <span className="font-black text-sm text-[#4A6FA5]">{assessment.clarity ?? 0}/10</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 border border-[rgba(28,31,58,0.14)] bg-[#1E1E2E] rounded-none">
            <p className="text-[10px] text-[#8888A0] uppercase tracking-wider font-mono">Overall Score</p>
            <p className="font-serif font-black text-5xl text-[#1c1f3a] mt-1">{assessment.score_percentage}</p>
            <p className="text-[10px] text-[#8888A0] font-mono mt-1">/ 100</p>
          </div>

          <div className="pt-2">
            <p className="section-label green mb-2">Teacher Feedback</p>
            <p className="text-sm text-[#1c1f3a] font-mono leading-relaxed">{assessment.feedback_for_student}</p>
          </div>

          {assessment.key_points_missed && assessment.key_points_missed.length > 0 && (
            <div className="pt-2 border-t border-[rgba(255,255,255,0.1)]">
              <p className="section-label pink mb-2">Missed points:</p>
              <ul className="list-disc pl-5 text-sm text-[#1c1f3a] font-mono space-y-1">
                {assessment.key_points_missed.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button onClick={onNext} className="brut-btn brut-btn-pink w-full py-2.5 text-xs rounded-none">
          {isLast ? "See Results →" : "Next Question →"}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 duration-300">
      <div className="relative">
        <XPFloat amount={xpEarned} visible={showXP} />
        <ResultBanner correctness={assessment.correctness} confidence={confidence} xpEarned={xpEarned} diffDelta={0} />
      </div>
      <MisconceptionBox text={assessment.misconception ?? ""} visible={showMisconception} onJournal={onJournal} />

      {q.type === "mcq" && q.options && (
        <div className="p-4 space-y-2 border border-[rgba(28,31,58,0.14)] rounded-none bg-[rgba(255,255,255,0.88)]">
          {q.options.map((opt, i) => {
            const letter = ["A","B","C","D"][i]
            const isCorrect = letter === String(q.correct).toUpperCase()
            const isStudent = letter === studentAnswer.toUpperCase()
            return (
              <div key={i} className={cn("px-4 py-2.5 border text-xs font-mono transition-all rounded-none",
                isCorrect ? "border-[#2a7d4f] bg-[#2a7d4f]/10 text-[#2a7d4f] font-bold"
                  : isStudent && !isCorrect ? "border-[#4A6FA5] bg-[#4A6FA5]/10 text-[#4A6FA5]"
                  : "border-[rgba(255,255,255,0.1)] text-[#8888A0]")}>
                <span className="font-black mr-2">{letter})</span>
                {opt.replace(/^[A-D]\)\s*/,"")}
                {isCorrect && " ✓"}
              </div>
            )
          })}
        </div>
      )}

      {(q.type === "short" || q.type === "fillblank") && assessment.model_answer && (
        <div className="p-4 border border-[rgba(28,31,58,0.14)] rounded-none bg-[rgba(255,255,255,0.88)]">
          <p className="section-label green mb-1">Model Answer</p>
          <p className="text-sm text-[#1c1f3a] font-mono mt-2">{assessment.model_answer}</p>
        </div>
      )}

      {q.explanation && (
        <div className="border-l-4 border-[#2a7d4f] bg-[#2a7d4f]/5 p-4 rounded-none">
          <p className="section-label green mb-1">Explanation</p>
          <p className="text-sm text-[#1c1f3a] font-mono mt-2">{q.explanation}</p>
        </div>
      )}

      <button onClick={onNext} className="brut-btn brut-btn-pink w-full py-2.5 text-xs rounded-none">
        {isLast ? "See Results →" : "Next Question →"}
      </button>
    </div>
  )
}

// ── Results Screen ─────────────────────────────────────────────────────────────
function ResultsScreen({ attempts, totalXP, topic, authFetch, onRetake }: {
  attempts: AttemptRecord[]; totalXP: number; topic: string
  authFetch: Function; onRetake: () => void
}) {
  const correct = attempts.filter(a => a.assessment.correctness === "correct").length
  const partial = attempts.filter(a => a.assessment.correctness === "partially_correct").length
  const total   = attempts.length
  const pct     = Math.round(((correct + partial * 0.5) / total) * 100)
  const color   = pct >= 70 ? "#2a7d4f" : pct >= 40 ? "#c47c2b" : "#4A6FA5"

  const sureCorrect   = attempts.filter(a => a.confidence === "sure"     && a.assessment.correctness === "correct").length
  const sureWrong     = attempts.filter(a => a.confidence === "sure"     && a.assessment.correctness !== "correct").length
  const unsureCorrect = attempts.filter(a => a.confidence === "unsure"   && a.assessment.correctness === "correct").length
  const guessWrong    = attempts.filter(a => a.confidence === "guessing" && a.assessment.correctness !== "correct").length

  const [insight, setInsight] = useState("")
  useEffect(() => {
    authFetch("/api/tutor/ask", {
      method: "POST",
      body: JSON.stringify({
        question: `Based on this quiz performance, give ONE sentence of personalized study advice. Topic: ${topic}. Sure+Correct: ${sureCorrect}, Sure+Wrong: ${sureWrong}, Unsure+Correct: ${unsureCorrect}, Guessing+Wrong: ${guessWrong}. Total: ${total}. Be specific.`,
        mastery_score: pct / 100, subject: "science", chat_history: [],
      }),
    }).then((r: Response) => r.ok ? r.json() : null)
      .then((d: any) => d?.answer && setInsight(d.answer.split(".")[0] + "."))
  }, [])

  const confCards = [
    { label: "Sure & Correct",  count: sureCorrect,   icon: "🏆", border: "border-[#2a7d4f]", text: "text-[#2a7d4f]" },
    { label: "Sure & Wrong",    count: sureWrong,     icon: "⚠️", border: "border-[#4A6FA5]", text: "text-[#4A6FA5]", danger: true },
    { label: "Unsure & Correct",count: unsureCorrect, icon: "💡", border: "border-[#c47c2b]", text: "text-[#c47c2b]" },
    { label: "Guessing & Wrong",count: guessWrong,    icon: "📖", border: "border-[#555]",    text: "text-[#8888A0]" },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <p className="section-label pink mb-2">Results</p>
        <h1 className="font-serif font-black text-4xl" style={{ color }}>{correct}/{total}</h1>
        <p className="text-[rgba(28,31,58,0.40)] font-mono text-sm mt-1">{pct}% accuracy</p>
        <div className="flex gap-6 mt-3">
          <div><p className="font-mono font-black text-[#2a7d4f]">+{totalXP}</p><p className="text-[10px] text-[#8888A0] uppercase tracking-wider font-bold">XP earned</p></div>
          <div><p className="font-mono font-black text-[#c47c2b]">{getStreak()}</p><p className="text-[10px] text-[#8888A0] uppercase tracking-wider font-bold">day streak</p></div>
        </div>
      </div>

      {/* Confidence 2x2 grid */}
      <div>
        <p className="section-label amber mb-3">Confidence vs Accuracy</p>
        <div className="grid grid-cols-2 gap-2">
          {confCards.map(c => (
            <div key={c.label} className={cn("brut-card p-4 border rounded-none", c.border, c.danger ? "ring-1 ring-[#4A6FA5]" : "")}>
              <p className="text-xl mb-1">{c.icon}</p>
              <p className={cn("font-mono text-3xl font-black", c.text)}>{c.count}</p>
              <p className="text-[10px] text-[#8888A0] mt-1 uppercase tracking-wider font-bold">{c.label}</p>
            </div>
          ))}
        </div>
        {insight && (
          <div className="border-l-4 border-[#4A6FA5] bg-[#4A6FA5]/5 p-3 mt-3 rounded-none">
            <p className="section-label pink mb-1">AI Insight</p>
            <p className="text-xs text-[#1c1f3a] font-mono mt-1">{insight}</p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="p-4 space-y-3 border border-[rgba(28,31,58,0.14)] rounded-none bg-[rgba(255,255,255,0.88)]">
        <p className="section-label mb-2">Question Breakdown</p>
        {attempts.map((a, i) => {
          const c = a.assessment.correctness
          const icon = c === "correct" ? "✅" : c === "partially_correct" ? "⚡" : "❌"
          const confEmoji = a.confidence === "sure" ? "😎" : a.confidence === "unsure" ? "🤔" : "🎲"
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-[rgba(28,31,58,0.08)] last:border-0">
              <span className="text-base flex-shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#1c1f3a] font-mono truncate">{a.question.question}</p>
                <p className="text-[10px] text-[#8888A0] mt-0.5 font-mono">
                  {confEmoji} {a.confidence} · {a.studentAnswer || "—"}
                  {a.assessment.model_answer && c !== "correct" && (
                    <> · <span className="text-[#2a7d4f]">{a.assessment.model_answer}</span></>
                  )}
                </p>
              </div>
              <span className="font-mono text-[10px] text-[#8888A0] flex-shrink-0">+{a.xpEarned}xp</span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetake} className="brut-btn brut-btn-pink flex-1 py-2.5 text-xs rounded-none">Retake Quiz</button>
        <Link href="/planner" className="flex-1">
          <button className="brut-btn brut-btn-outline w-full py-2.5 text-xs rounded-none">Go to Planner</button>
        </Link>
      </div>
    </div>
  )
}

// ── Mistake Journal ────────────────────────────────────────────────────────────
function JournalScreen({ authFetch, onBack, onRetry }: {
  authFetch: Function; onBack: () => void; onRetry: (topic: string) => void
}) {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState("")

  useEffect(() => {
    const url = filter ? `/api/quiz/mistakes?topic=${encodeURIComponent(filter)}` : "/api/quiz/mistakes"
    authFetch(url).then((r: Response) => r.ok ? r.json() : []).then((d: Mistake[]) => {
      setMistakes(d); setLoading(false)
    })
  }, [filter])

  const topics = mistakes.map(m => m.topic).filter((v, i, self) => self.indexOf(v) === i)
  const grouped: Record<string, Mistake[]> = {}
  mistakes.forEach(m => { if (!grouped[m.topic]) grouped[m.topic] = []; grouped[m.topic].push(m) })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[10px] text-[rgba(28,31,58,0.40)] font-bold uppercase tracking-wider hover:text-[#1c1f3a] transition-colors rounded-none">← Back</button>
        <div>
          <p className="section-label amber mb-1">History</p>
          <h1 className="font-serif font-black text-2xl text-[#1c1f3a]">Mistake Journal</h1>
        </div>
      </div>

      <select value={filter} onChange={e => setFilter(e.target.value)}
        className="w-full bg-[#1E1E2E] border border-[rgba(28,31,58,0.14)] text-[#1c1f3a] px-3 py-2.5 text-xs font-mono outline-none focus:border-[#4A6FA5] transition-colors rounded-none">
        <option value="">All topics</option>
        {topics.map(t => <option key={t}>{t}</option>)}
      </select>

      {loading ? <p className="text-[#8888A0] text-xs font-mono">Loading…</p>
        : mistakes.length === 0 ? <p className="text-[#8888A0] text-xs font-mono">No mistakes yet — keep quizzing!</p>
        : Object.entries(grouped).map(([topic, items]) => (
          <div key={topic} className="p-4 space-y-3 border border-[rgba(28,31,58,0.14)] rounded-none bg-[rgba(255,255,255,0.88)]">
            <div className="flex items-center justify-between">
              <p className="section-label green">{topic}</p>
              <button onClick={() => onRetry(topic)} className="text-[10px] text-[#4A6FA5] font-bold uppercase tracking-wider hover:underline rounded-none">
                Retry →
              </button>
            </div>
            {items.map(m => (
              <div key={m.id} className="border-t border-[rgba(28,31,58,0.08)] pt-3 space-y-1 rounded-none">
                <p className="text-xs text-[#1c1f3a] font-mono">{m.question}</p>
                <p className="text-[10px] text-[#4A6FA5] font-mono">Your answer: {m.student_answer}</p>
                <p className="text-[10px] text-[#2a7d4f] font-mono">Correct: {m.correct_answer}</p>
                {m.misconception && (
                  <p className="text-[10px] text-[#c47c2b] bg-[#c47c2b]/5 border-l-2 border-[#c47c2b] px-2 py-1 font-mono">⚠️ {m.misconception}</p>
                )}
                <p className="text-[10px] text-[#8888A0] font-mono">{m.confidence} · {new Date(m.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ))
      }
    </div>
  )
}

// ── Main Quiz Page ─────────────────────────────────────────────────────────────
function QuizPageInner() {
  const { profile, authFetch, refreshProfile, subjectVersion } = useAuth()
  const subject = profile?.subject ?? "science"
  const searchParams = useSearchParams()
  const urlTopic = searchParams.get("topic") ?? null

  console.log("QuizPageInner render:", { subject, subjectVersion, profileNull: !profile })

  const [phase, setPhase]           = useState<Phase>("setup")
  const [config, setConfig]         = useState<{ topic: string; qType: QType; mode: Mode; count: number; difficulty: number } | null>(null)
  const [questions, setQuestions]   = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx]             = useState(0)
  const [attempts, setAttempts]     = useState<AttemptRecord[]>([])
  const [prevQs, setPrevQs]         = useState<string[]>([])
  const [curDiff, setCurDiff]       = useState(0.5)
  const [prevDiff, setPrevDiff]     = useState(0.5)
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null)
  const [currentAnswer, setCurrentAnswer]         = useState("")
  const [currentConfidence, setCurrentConfidence] = useState<Confidence>("guessing")
  const [busy, setBusy]             = useState(false)
  const [totalXP, setTotalXP]       = useState(0)
  const [xp, setXp]                 = useState(0)
  const [streak, setStreak]         = useState(0)
  const [toast, setToast]           = useState("")
  const [toastVisible, setToastVisible] = useState(false)
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)

  // Timer States
  const questionStartRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Prerequisites States
  const [prereqGap, setPrereqGap] = useState<string[]>([])
  const [showPrereqBanner, setShowPrereqBanner] = useState(false)

  useEffect(() => { setXp(getXP()); setStreak(getStreak()) }, [])

  // Keep track of subject and subjectVersion to only reset when they actually change
  const prevSubjectRef = useRef<string | null>(null)
  const prevSubjectVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevSubjectRef.current !== null && prevSubjectVersionRef.current !== null) {
      if (prevSubjectRef.current !== subject || prevSubjectVersionRef.current !== subjectVersion) {
        console.log("QuizPageInner reset useEffect triggered!", { subject, subjectVersion })
        setPhase("setup")
        setConfig(null)
        setQuestions([])
        setAttempts([])
        setQIdx(0)
        setCurrentAssessment(null)
        setPrereqGap([])
        setShowPrereqBanner(false)
      }
    }
    prevSubjectRef.current = subject
    prevSubjectVersionRef.current = subjectVersion
  }, [subject, subjectVersion])

  // Timer effect
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null
    const currentQ = questions[qIdx]
    if (phase === "question" && currentQ) {
      questionStartRef.current = Date.now()
      setElapsedSeconds(0)
      timerId = setInterval(() => {
        if (questionStartRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - questionStartRef.current) / 1000))
        }
      }, 1000)
    } else {
      questionStartRef.current = null
      setElapsedSeconds(0)
    }
    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [phase, qIdx, questions])

  const showToast = (msg: string) => {
    setToast(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  const QTYPES: QType[] = ["mcq", "truefalse", "fillblank", "short"]

  const fetchQ = useCallback(async (
    cfg: typeof config, index: number, pqs: string[], difficulty: number
  ): Promise<QuizQuestion | null> => {
    if (!cfg) return null
    const qType = cfg.qType === "mixed" ? QTYPES[index % QTYPES.length] : cfg.qType
    console.log(`[quiz] Q${index + 1} difficulty=${difficulty} type=${qType}`)
    try {
      const res = await authFetch("/api/quiz/generate-question", {
        method: "POST",
        body: JSON.stringify({
          topic: cfg.topic, difficulty, question_type: qType,
          question_index: index, subject, previous_questions: pqs,
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return { ...data, topic: cfg.topic }
    } catch { return null }
  }, [authFetch, subject])

  const handleStart = async (cfg: { topic: string; qType: QType; mode: Mode; count: number; difficulty: number }) => {
    setConfig(cfg); setAttempts([]); setQIdx(0); setTotalXP(0)
    setPrevQs([]); setCurDiff(cfg.difficulty); setPrevDiff(cfg.difficulty)
    setConsecutiveCorrect(0)
    setBusy(true); setPhase("question")

    // Fetch prerequisites gap
    try {
      const res = await authFetch(`/api/quiz/prerequisites?topic=${encodeURIComponent(cfg.topic)}&subject=${encodeURIComponent(subject)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.mastery_gap && data.mastery_gap.length > 0) {
          setPrereqGap(data.mastery_gap)
          setShowPrereqBanner(true)
        } else {
          setPrereqGap([])
          setShowPrereqBanner(false)
        }
      } else {
        setPrereqGap([])
        setShowPrereqBanner(false)
      }
    } catch (err) {
      console.error("Failed to fetch prerequisites:", err)
      setPrereqGap([])
      setShowPrereqBanner(false)
    }

    const q = await fetchQ(cfg, 0, [], cfg.difficulty)
    if (q) { setQuestions([q]); setPrevQs([q.question]) }
    setBusy(false)
  }

  const handleSubmit = async (answer: string, confidence: Confidence) => {
    const q = questions[qIdx]
    if (!q || !config) return
    setBusy(true); setCurrentConfidence(confidence)

    // Calculate time taken
    const time_taken_seconds = questionStartRef.current
      ? Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000))
      : 0

    let assessment: Assessment
    let isCorrect = false
    let xpEarned = 0

    if (q.type === "teach_back") {
      const res = await authFetch("/api/quiz/assess-teachback", {
        method: "POST",
        body: JSON.stringify({
          topic: config.topic,
          subject: subject,
          concept: q.concept || config.topic,
          student_answer: answer,
          mastery_score: profile?.mastery?.[config.topic]?.score ?? 0.5
        })
      })
      if (res.ok) {
        const data = await res.json()
        assessment = {
          overall_score: (data.score ?? 0) / 100,
          score_percentage: data.score ?? 0,
          correctness: (data.score ?? 0) >= 50 ? "correct" : "incorrect",
          feedback_for_student: data.feedback ?? "",
          key_points_covered: [],
          key_points_missed: data.missed_points ?? [],
          model_answer: "",
          misconception: "",
          accuracy: data.accuracy ?? 0,
          completeness: data.completeness ?? 0,
          clarity: data.clarity ?? 0,
          teach_back: true
        }
      } else {
        assessment = {
          overall_score: 0, score_percentage: 0, correctness: "incorrect",
          feedback_for_student: "Could not grade teach-back.", key_points_covered: [],
          key_points_missed: [], model_answer: "", misconception: "",
          accuracy: 0, completeness: 0, clarity: 0, teach_back: true
        }
      }
      isCorrect = assessment.correctness === "correct"
      xpEarned = isCorrect ? 10 : 0
    } else {
      let correctAnswer: string | undefined
      if (q.type === "mcq")            correctAnswer = String(q.correct)
      else if (q.type === "truefalse") correctAnswer = String(q.correct)
      else if (q.type === "fillblank") {
        const raw = q.answer ?? q.correct ?? q.reference_answer ?? ""
        correctAnswer = String(raw)
        console.log("[fillblank] correct:", correctAnswer, "| full q:", q)
      }

      const res = await authFetch("/api/quiz/assess", {
        method: "POST",
        body: JSON.stringify({
          question: q.question, question_type: q.type,
          answer: answer || "", correct_answer: correctAnswer,
          difficulty: curDiff, subject,
          topic: config?.topic,
          time_taken_seconds: time_taken_seconds,
        }),
      })
      assessment = res.ok ? await res.json() : {
        overall_score: 0, score_percentage: 0, correctness: "incorrect",
        feedback_for_student: "Could not grade.", key_points_covered: [],
        key_points_missed: [], model_answer: "", misconception: "",
      }
      isCorrect = assessment.correctness === "correct"
      xpEarned = isCorrect ? 10 : assessment.correctness === "partially_correct" ? 5 : 0
    }

    // Streak bonus
    const newConsec = isCorrect ? consecutiveCorrect + 1 : 0
    setConsecutiveCorrect(newConsec)
    if (newConsec === 3) {
      xpEarned += 5
      showToast("🔥 On Fire! +5 bonus XP")
    }

    addXP(xpEarned); if (xpEarned > 0) bumpStreak()
    setXp(getXP()); setStreak(getStreak()); setTotalXP(p => p + xpEarned)

    // Adaptive difficulty with toast
    const nextDiff = adaptDifficulty(curDiff, isCorrect, confidence)
    const oldTier = diffTier(curDiff), newTier = diffTier(nextDiff)
    setPrevDiff(curDiff); setCurDiff(nextDiff)
    console.log(`[quiz] difficulty: ${curDiff} → ${nextDiff} (correct=${isCorrect}, conf=${confidence})`)
    if (newTier > oldTier) showToast(`📈 Difficulty raised to ${diffLabel(nextDiff)} — you're doing great!`)
    else if (newTier < oldTier) showToast(`📉 Difficulty adjusted to ${diffLabel(nextDiff)} — let's rebuild confidence`)

    const record: AttemptRecord = { question: q, studentAnswer: answer, assessment, xpEarned, confidence }
    const newAttempts = [...attempts, record]
    setAttempts(newAttempts)
    setCurrentAssessment(assessment); setCurrentAnswer(answer)

    // Save mistake
    if (!isCorrect && q.type !== "teach_back") {
      let correctAnswer: string | undefined
      if (q.type === "mcq")            correctAnswer = String(q.correct)
      else if (q.type === "truefalse") correctAnswer = String(q.correct)
      else if (q.type === "fillblank") correctAnswer = String(q.answer ?? q.correct ?? q.reference_answer ?? "")

      authFetch("/api/quiz/mistakes", {
        method: "POST",
        body: JSON.stringify({
          subject, topic: config.topic, question: q.question,
          student_answer: answer || "(no answer)",
          correct_answer: correctAnswer ?? assessment.model_answer ?? "",
          misconception: assessment.misconception ?? "",
          confidence,
        }),
      }).then((r: Response) => r.json()).then((d: any) => console.log("[quiz] mistake saved:", d))
    }

    const activeSubject = subject
    const currentTopic = config.topic

    if (config.mode === "exam") {
      if (qIdx + 1 >= config.count) {
        // Last question — compute final score from all attempts
        const finalCorrect = newAttempts.filter(a => a.assessment.correctness === "correct").length
        const finalPartial = newAttempts.filter(a => a.assessment.correctness === "partially_correct").length
        const finalTotal = newAttempts.length
        const finalScore = Math.round(((finalCorrect + finalPartial * 0.5) / Math.max(finalTotal, 1)) * 100) / 100
        console.log(`[quiz] final mastery: topic=${currentTopic} score=${finalScore} (${finalCorrect}+${finalPartial*0.5}/${finalTotal})`)
        await authFetch("/api/profile/mastery", {
          method: "POST",
          body: JSON.stringify({ subject: activeSubject, topic: currentTopic, score: finalScore }),
        })
        setPhase("results")
        await refreshProfile()
      }
      else {
        const nextIdx = qIdx + 1; setQIdx(nextIdx)
        fetchQ(config, nextIdx, prevQs, nextDiff).then(nq => {
          if (nq) { setQuestions(p => [...p, nq]); setPrevQs(p => [...p, nq.question]) }
        })
        setPhase("question")
      }
    } else {
      setPhase("feedback")
    }
    setBusy(false)
  }

  const handleNext = async () => {
    if (!config) return
    const nextIdx = qIdx + 1
    if (nextIdx >= config.count) {
      // Last question in practice mode — compute final score from all attempts
      const finalCorrect = attempts.filter(a => a.assessment.correctness === "correct").length
      const finalPartial = attempts.filter(a => a.assessment.correctness === "partially_correct").length
      const finalTotal = attempts.length
      const finalScore = Math.round(((finalCorrect + finalPartial * 0.5) / Math.max(finalTotal, 1)) * 100) / 100
      console.log(`[quiz] final mastery: topic=${config.topic} score=${finalScore} (${finalCorrect}+${finalPartial*0.5}/${finalTotal})`)
      await authFetch("/api/profile/mastery", {
        method: "POST",
        body: JSON.stringify({ subject, topic: config.topic, score: finalScore }),
      })
      setPhase("results")
      await refreshProfile()
      return
    }
    setBusy(true); setQIdx(nextIdx)
    if (!questions[nextIdx]) {
      const nq = await fetchQ(config, nextIdx, prevQs, curDiff)
      if (nq) { setQuestions(p => [...p, nq]); setPrevQs(p => [...p, nq.question]) }
    }
    setCurrentAssessment(null); setPhase("question"); setBusy(false)
  }

  const handleRetake = () => {
    setPhase("setup"); setQuestions([]); setAttempts([])
    setQIdx(0); setPrevQs([]); setCurrentAssessment(null); setConsecutiveCorrect(0)
    setPrereqGap([])
    setShowPrereqBanner(false)
  }

  const currentQ = questions[qIdx]

  return (
    <AppShell>
      <Toast message={toast} visible={toastVisible} />

      {phase !== "setup" && phase !== "journal" && (
        <div className="flex items-center gap-4 mb-5 text-sm border-b border-[#C0BAB0] pb-4 rounded-none">
          <XPCounter target={xp} />
          <span className="font-mono font-black text-[#c47c2b]">🔥 {streak} day streak</span>
          {config && <span className="text-[#8888A0] text-xs font-mono uppercase tracking-wider">{config.mode} · {config.topic}</span>}
        </div>
      )}

      {phase === "setup" && (
        <SetupScreen subject={subject} onStart={handleStart} onJournal={() => setPhase("journal")} initialTopic={urlTopic ?? undefined} />
      )}

      {phase === "question" && config && (
        busy && !currentQ ? (
          <div className="flex items-center gap-3 text-[#8888A0] text-xs font-mono">
            <div className="w-3 h-3 border border-[#4A6FA5] border-t-transparent animate-spin" />
            Generating question…
          </div>
        ) : currentQ ? (
          <>
            {showPrereqBanner && prereqGap.length > 0 && (
              <div className="max-w-3xl mx-auto mb-4 bg-[#FFD600] border border-[#1A1A1A] rounded-none p-3 text-white relative pr-10 animate-in slide-in-from-top-2">
                <span className="font-mono text-xs font-bold">
                  ⚠ Review first: {prereqGap.join(", ")}
                </span>
                <button 
                  onClick={() => setShowPrereqBanner(false)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center border border-[#1A1A1A] bg-[#FFD600] text-sm font-bold font-mono hover:bg-black/10 active:translate-x-0.5 active:translate-y-0.5 rounded-none"
                  style={{ boxShadow: "2px 2px 0 #1A1A1A" }}
                >
                  ×
                </button>
              </div>
            )}
            <QuestionCard
              q={currentQ} chapterTopic={config.topic} idx={qIdx} total={config.count}
              mode={config.mode} curDiff={curDiff} prevDiff={prevDiff}
              attempts={attempts} onSubmit={handleSubmit} busy={busy}
              elapsedSeconds={elapsedSeconds}
            />
          </>
        ) : null
      )}

      {phase === "feedback" && currentQ && currentAssessment && (
        <FeedbackCard
          q={currentQ} assessment={currentAssessment}
          studentAnswer={currentAnswer} xpEarned={attempts[attempts.length-1]?.xpEarned ?? 0}
          confidence={currentConfidence}
          onNext={handleNext} isLast={qIdx + 1 >= (config?.count ?? 5)}
          onJournal={() => setPhase("journal")}
        />
      )}

      {phase === "results" && config && (
        <ResultsScreen
          attempts={attempts} totalXP={totalXP}
          topic={config.topic} authFetch={authFetch}
          onRetake={handleRetake}
        />
      )}

      {phase === "journal" && (
        <JournalScreen
          authFetch={authFetch}
          onBack={() => setPhase("setup")}
          onRetry={(topic) => { setPhase("setup") }}
        />
      )}
    </AppShell>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E8E3D9] flex items-center justify-center"><p className="font-mono text-xs text-[#666680]">Loading…</p></div>}>
      <QuizPageInner />
    </Suspense>
  )
}
