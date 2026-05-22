"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Calendar, Play, RefreshCw, AlertTriangle, Flame, Clock } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlanSessionGoal {
  text: string;
  done: boolean;
}
interface PlanSession {
  id: string; topic: string; date: string
  duration_minutes: number; session_type: string
  micro_goals: PlanSessionGoal[]; completed: boolean
  priority_score: number; mastery_at_schedule_time: number
}
interface PlanResponse {
  sessions: PlanSession[]; exam_countdown: boolean; days_remaining: number
}
interface StudyNow {
  topic: string; session_type: string; duration_minutes: number
  mastery: number; micro_goals: any[]; exam_countdown: boolean
}

// ── Chip colors ────────────────────────────────────────────────────────────────
const CHIP: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  study:    { bg: "bg-blue-950",   border: "border-blue-700",  label: "STUDY",    dot: "bg-blue-500" },
  practice: { bg: "bg-purple-950", border: "border-purple-700",label: "PRACTICE", dot: "bg-purple-400" },
  revision: { bg: "bg-amber-950",  border: "border-amber-700", label: "REVISION", dot: "bg-amber-500" },
  mock:     { bg: "bg-green-950",  border: "border-green-700", label: "MOCK",     dot: "bg-green-500" },
  break:    { bg: "bg-gray-900",   border: "border-gray-700",  label: "BREAK",    dot: "bg-gray-400" },
}

// ── Week helpers ───────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const day = d.getDay(), diff = (day === 0 ? -6 : 1 - day)
  const m = new Date(d); m.setDate(d.getDate() + diff); m.setHours(0,0,0,0)
  return m
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Session chip ───────────────────────────────────────────────────────────────
function SessionChip({ s, onClick }: { s: PlanSession; onClick: () => void }) {
  const c = CHIP[s.session_type] ?? CHIP.study
  return (
    <button onClick={onClick}
      className={cn(
        "w-full text-left px-1.5 py-1 border text-[9px] font-bold font-mono uppercase tracking-wider mb-1 transition-all",
        c.bg, c.border,
        s.completed ? "opacity-40 line-through" : "hover:opacity-80"
      )}>
      <div className="flex items-center gap-1 mb-0.5">
        <span className={cn("w-1.5 h-1.5 flex-shrink-0", c.dot)} />
        <span>{c.label}</span>
      </div>
      <p className="truncate text-[#E8E8F0] normal-case font-normal" style={{ fontSize: "9px" }}>
        {s.topic.split(":")[0].trim()}
      </p>
      <span className="text-[#666680]">{s.duration_minutes}m</span>
    </button>
  )
}

// ── Detail panel ───────────────────────────────────────────────────────────────
function DetailPanel({ session, onClose, onComplete, onToggleGoal }: {
  session: PlanSession; onClose: () => void
  onComplete: (id: string, topic: string) => Promise<void>
  onToggleGoal: (sessionId: string, goalIndex: number, done: boolean) => Promise<void>
}) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const c = CHIP[session.session_type] ?? CHIP.study

  const goals = Array.isArray(session.micro_goals) ? session.micro_goals.map((g: any) => {
    if (typeof g === 'string') {
      return { text: g, done: false };
    }
    return { text: g.text || "", done: !!g.done };
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-[380px] bg-[#12121E] border-l border-[rgba(255,255,255,0.14)] h-full overflow-y-auto shadow-2xl transition-all"
        style={{ width: "380px" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.10)]">
          <div className="flex items-center gap-2">
            <span className={cn("w-2.5 h-2.5", c.dot)} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#777790]">{c.label}</span>
          </div>
          <button onClick={onClose} className="text-[#777790] hover:text-white font-mono text-sm">✕</button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="font-serif font-black text-xl text-white leading-tight">{session.topic}</p>
            <p className="font-mono text-[10px] text-[#666680] mt-1 uppercase tracking-wider">
              {new Date(session.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
              &nbsp;·&nbsp;{session.duration_minutes}min
            </p>
          </div>

          {/* Mastery bar */}
          <div>
            <p className="section-label mb-1.5">Mastery at scheduling</p>
            <div className="neo-progress">
              <div className="neo-progress-fill" style={{
                width: `${session.mastery_at_schedule_time * 100}%`,
                backgroundColor: session.mastery_at_schedule_time < 0.5 ? "#FF4D6D"
                  : session.mastery_at_schedule_time < 0.7 ? "#F5A623" : "#39FF6A"
              }} />
            </div>
            <p className="font-mono text-[10px] text-[#666680] mt-1">
              {(session.mastery_at_schedule_time * 100).toFixed(0)}%
            </p>
          </div>

          {/* Micro-goals */}
          <div>
            <p className="section-label mb-2">Micro-goals</p>
            <div className="space-y-2">
              {goals.length === 0 ? (
                <p className="text-xs text-[#666680] font-mono">No micro-goals for this session</p>
              ) : (
                goals.map((g, i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={g.done}
                      onChange={(e) => onToggleGoal(session.id, i, e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-[#FF4D6D] h-4 w-4 border border-[rgba(255,255,255,0.14)] rounded-none focus:ring-0 cursor-pointer"
                    />
                    <span className={cn(
                      "text-xs text-[#E8E8F0] font-mono leading-relaxed transition-all",
                      g.done && "line-through opacity-50"
                    )}>
                      {g.text}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => router.push(`/quiz?topic=${encodeURIComponent(session.topic)}`)}
              className="brut-btn brut-btn-pink w-full py-2.5 text-xs font-bold font-mono">
              Take Quiz →
            </button>
            <button
              onClick={() => router.push(`/tutor?topic=${encodeURIComponent(session.topic)}`)}
              className="brut-btn brut-btn-outline w-full py-2.5 text-xs font-bold font-mono">
              Open in AI Tutor →
            </button>
            {!session.completed && (
              <button
                disabled={completing}
                onClick={async () => {
                  setCompleting(true)
                  await onComplete(session.id, session.topic)
                  setCompleting(false)
                  onClose()
                }}
                className="brut-btn brut-btn-outline w-full py-2.5 text-xs font-bold font-mono">
                {completing ? "Saving…" : "Mark Complete ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Study Now modal ────────────────────────────────────────────────────────────
function StudyNowModal({ data, onClose }: { data: StudyNow; onClose: () => void }) {
  const router = useRouter()
  const c = CHIP[data.session_type] ?? CHIP.study
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[#12121E] border border-[rgba(255,255,255,0.14)] w-full max-w-md mx-4 p-6 space-y-4"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div>
          <p className="section-label pink mb-1">Study this now</p>
          <p className="font-serif font-black text-2xl text-white leading-tight">{data.topic}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 border", c.bg, c.border)}>
              {c.label}
            </span>
            <span className="font-mono text-[10px] text-[#666680]">{data.duration_minutes}min</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push(`/quiz?topic=${encodeURIComponent(data.topic)}`)}
            className="brut-btn brut-btn-pink flex-1 py-2.5 text-xs">
            Start Quiz →
          </button>
          <button onClick={() => { onClose(); router.push("/planner") }}
            className="brut-btn brut-btn-outline flex-1 py-2.5 text-xs">
            Open in Planner
          </button>
        </div>
        <button onClick={onClose} className="text-[10px] text-[#666680] font-mono w-full text-center hover:text-white">
          dismiss
        </button>
      </div>
    </div>
  )
}

// ── Main Planner Page ──────────────────────────────────────────────────────────
export default function PlannerPage() {
  const { profile, authFetch, refreshProfile, subjectVersion } = useAuth()
  const subject = profile?.subject ?? "science"
  const [plan, setPlan]           = useState<PlanResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))
  const [filter, setFilter]       = useState("all")
  const [selected, setSelected]   = useState<PlanSession | null>(null)
  const [studyNow, setStudyNow]   = useState<StudyNow | null>(null)
  const [regenerating, setRegen]  = useState(false)
  const [burnoutWarnings, setBurnoutWarnings] = useState<any[]>([])
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])

  const fetchPlan = useCallback(async () => {
    setLoading(true); setError("")
    setPlan(null)
    try {
      const res = await authFetch(`/api/planner/?subject=${subject}`)
      if (!res.ok) throw new Error("Failed to load plan")
      setPlan(await res.json())
    } catch {
      setError("Unable to load plan. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [authFetch, subject])

  const fetchBurnoutCheck = useCallback(async () => {
    try {
      const res = await authFetch("/api/planner/burnout-check")
      if (res.ok) {
        const data = await res.json()
        if (data.has_warning) {
          setBurnoutWarnings(data.warnings)
        } else {
          setBurnoutWarnings([])
        }
      }
    } catch (err) {
      console.error("Failed to fetch burnout check:", err)
    }
  }, [authFetch])

  useEffect(() => {
    fetchPlan()
    fetchBurnoutCheck()
  }, [fetchPlan, fetchBurnoutCheck, subject, subjectVersion])

  useEffect(() => {
    const handleFocus = () => {
      refreshProfile()
      fetchPlan()
      fetchBurnoutCheck()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [fetchPlan, fetchBurnoutCheck, refreshProfile])

  const handleToggleGoal = async (sessionId: string, goalIndex: number, done: boolean) => {
    try {
      const res = await authFetch(`/api/planner/session/${sessionId}/goals`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ goal_index: goalIndex, done })
      })
      if (res.ok) {
        const updatedSession = await res.json()
        setPlan(p => p ? {
          ...p,
          sessions: p.sessions.map(s => s.id === sessionId ? {
            ...s,
            micro_goals: updatedSession.micro_goals
          } : s)
        } : p)
        if (selected && selected.id === sessionId) {
          setSelected(prev => prev ? {
            ...prev,
            micro_goals: updatedSession.micro_goals
          } : null)
        }
      }
    } catch (err) {
      console.error("Failed to toggle goal:", err)
    }
  }

  const handleComplete = async (id: string, topic: string) => {
    await authFetch("/api/planner/complete-session", {
      method: "POST",
      body: JSON.stringify({ session_id: id, topic, subject: profile?.subject ?? "science" }),
    })
    // Optimistically mark done, then re-fetch so session_type reflects updated mastery
    setPlan(p => p ? {
      ...p,
      sessions: p.sessions.map(s => s.id === id ? { ...s, completed: true } : s)
    } : p)
    await refreshProfile()
    fetchPlan()
  }

  const handleStudyNow = async () => {
    const res = await authFetch("/api/planner/study-now")
    if (res.ok) setStudyNow(await res.json())
  }

  const handleRegenerate = async () => {
    setRegen(true)
    const res = await authFetch("/api/planner/regenerate", { method: "POST" })
    if (res.ok) setPlan(await res.json())
    setRegen(false)
  }

  // Build week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Filter sessions
  const filtered = (plan?.sessions ?? []).filter(s =>
    filter === "all" || s.session_type === filter
  )

  // Sessions by date
  const byDate: Record<string, PlanSession[]> = {}
  filtered.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })

  // Stats for this week
  const weekSessions = filtered.filter(s => {
    const d = s.date
    return d >= isoDate(weekStart) && d <= isoDate(addDays(weekStart, 6))
  })
  const completedToday = filtered.filter(s => s.date === isoDate(new Date()) && s.completed).length
  const hoursPlanned   = weekSessions.reduce((a, s) => a + s.duration_minutes, 0) / 60
  const weakest = (() => {
    const mastery = profile?.mastery
    if (!mastery || Object.keys(mastery).length === 0) return "—"
    let minTopic = "—"
    let minScore = 2
    for (const [topic, info] of Object.entries(mastery)) {
      if (info.score < minScore) {
        minScore = info.score
        minTopic = topic
      }
    }
    return minTopic
  })()

  // Burnout detection
  const burnoutDays = weekDays.filter(d => {
    const mins = (byDate[isoDate(d)] ?? []).reduce((a, s) => a + s.duration_minutes, 0)
    return mins >= 240
  }).length
  const burnoutWarning = burnoutDays >= 5

  return (
    <AppShell>
      <div className="space-y-5">

        {/* Exam countdown banner */}
        {plan?.exam_countdown && (
          <div className="border-2 border-[#FF4D6D] bg-[#FF4D6D]/5 px-5 py-3 flex items-center gap-3">
            <Flame className="w-6 h-6 text-[#FF4D6D]" />
            <p className="font-mono text-xs font-bold text-[#FF4D6D] uppercase tracking-wider">
              EXAM IN {plan.days_remaining} DAYS — Revision mode active. Only revision and mock sessions scheduled.
            </p>
          </div>
        )}

        {/* Burnout warning */}
        {burnoutWarning && (
          <div className="border border-[#F5A623] bg-[#F5A623]/5 px-5 py-3">
            <p className="font-mono text-xs text-[#D4880A] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Heavy study week detected. A break day has been added automatically.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between animate-slide-right">
          <div>
            <p className="section-label pink mb-1.5 animate-[slide-right_0.5s_ease-out_0.1s_both] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </p>
            <h1 className="font-serif font-black text-[2.2rem] text-white leading-none animate-[slide-right_0.5s_ease-out_0.2s_both]">Study Planner</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleStudyNow}
              className="brut-btn brut-btn-pink px-4 py-2 text-xs flex items-center gap-1.5 font-bold">
              <Play className="w-3 h-3 fill-current" /> Study Now
            </button>
            <button onClick={handleRegenerate} disabled={regenerating}
              className="brut-btn brut-btn-outline px-4 py-2 text-xs flex items-center gap-1.5 font-bold">
              <RefreshCw className={cn("w-3.5 h-3.5", regenerating && "animate-spin")} /> {regenerating ? "Rebuilding…" : "Regenerate"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "This week", value: weekSessions.length, unit: "sessions", small: false },
            { label: "Completed today", value: completedToday, unit: "", small: false },
            { label: "Hours planned", value: hoursPlanned.toFixed(1), unit: "hrs", small: false },
            { label: "Weakest topic", value: weakest ?? "—", unit: "", small: true },
          ].map((s, i) => (
            <div key={s.label} className="neo-card neo-card-white px-4 py-3" style={{ animationDelay: `${0.1 * i}s` }}>
              <p className="font-mono text-[9px] text-[#666680] uppercase tracking-widest mb-1">{s.label}</p>
              {s.small ? (
                <p className="font-mono text-xs font-bold text-white leading-snug break-words">{s.value}</p>
              ) : (
                <p className="font-mono text-lg font-black text-white leading-none">
                  {s.value}<span className="text-xs font-normal text-[#666680] ml-1">{s.unit}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {["all","study","practice","revision","mock","break"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider font-mono border transition-colors",
                filter === f
                  ? "bg-[#FF4D6D] text-white border-[#FF4D6D]"
                  : "border-[rgba(255,255,255,0.10)] text-[#777790] hover:border-[rgba(255,255,255,0.30)] hover:text-white"
              )}>
              {f}
            </button>
          ))}
        </div>

        {/* Burnout Check Warning Cards */}
        {burnoutWarnings
          .filter(w => !dismissedWarnings.includes(w.type))
          .map(w => {
            let bg = "#E8E4DC"
            if (w.type === "overstudy") bg = "#FF4D6D"
            else if (w.type === "monotony") bg = "#FFD600"
            else if (w.type === "fatigue") bg = "#FF8C00"

            return (
              <div
                key={w.type}
                className="border border-[rgba(255,255,255,0.14)] p-4 flex justify-between items-start transition-all"
                style={{ backgroundColor: bg, borderRadius: 0, color: "#1A1A1A" }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#1A1A1A]" />
                  <p className="font-mono text-xs font-bold uppercase tracking-wide leading-normal text-[#1A1A1A]">
                    {w.message}
                  </p>
                </div>
                <button
                  onClick={() => setDismissedWarnings(prev => [...prev, w.type])}
                  className="font-mono text-sm font-bold ml-4 hover:opacity-75 focus:outline-none"
                  style={{ color: "#1A1A1A" }}
                >
                  ✕
                </button>
              </div>
            )
          })}

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(d => addDays(d, -7))}
            className="font-mono text-xs text-[#777790] hover:text-white uppercase tracking-wider">
            ← Prev Week
          </button>
          <p className="font-mono text-xs text-[#777790] uppercase tracking-wider">
            {weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            &nbsp;–&nbsp;
            {addDays(weekStart, 6).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="font-mono text-xs text-[#777790] hover:text-white uppercase tracking-wider">
            Next Week →
          </button>
        </div>

        {/* Calendar grid */}
        {loading ? (
          <p className="font-mono text-xs text-[#666680]">Loading plan…</p>
        ) : error ? (
          <div className="border border-[#FF4D6D] bg-[#FF4D6D]/5 px-4 py-3">
            <p className="font-mono text-xs text-[#FF4D6D]">{error}</p>
            <button onClick={fetchPlan} className="font-mono text-[10px] text-[#FF4D6D] underline mt-1">Retry</button>
          </div>
        ) : (
          <div className="border border-[rgba(255,255,255,0.10)] bg-[rgba(16,16,32,0.85)] overflow-hidden" style={{ animationDelay: "0.4s" }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.10)]">
              {weekDays.map(d => {
                const isToday = isoDate(d) === isoDate(new Date())
                return (
                  <div key={isoDate(d)}
                    className={cn(
                      "px-2 py-2 border-r border-[rgba(255,255,255,0.10)] last:border-r-0 text-center",
                      isToday ? "bg-[#FF4D6D]/5" : ""
                    )}>
                    <p className="font-mono text-[9px] text-[#666680] uppercase tracking-wider">
                      {d.toLocaleDateString("en-IN", { weekday: "short" })}
                    </p>
                    <p className={cn("font-mono text-sm font-black", isToday ? "text-[#FF4D6D]" : "text-white")}>
                      {d.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Session chips */}
            <div className="grid grid-cols-7 min-h-[200px]">
              {weekDays.map(d => {
                const key = isoDate(d)
                const daySessions = byDate[key] ?? []
                return (
                  <div key={key}
                    className="border-r border-[rgba(255,255,255,0.10)] last:border-r-0 p-1.5 min-h-[200px] align-top">
                    {daySessions.length === 0 ? (
                      <p className="font-mono text-[8px] text-[#DDD] text-center mt-4">—</p>
                    ) : (
                      daySessions.map(s => (
                        <SessionChip key={s.id} s={s} onClick={() => setSelected(s)} />
                      ))
                    )}
                  </div>
                )
              })}
            </div>

            {/* Empty week message */}
            {weekSessions.length === 0 && !loading && (
              <div className="col-span-7 py-6 text-center border-t border-[rgba(255,255,255,0.10)]">
                <p className="font-mono text-xs text-[#666680]">No sessions scheduled this week</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          session={selected}
          onClose={() => setSelected(null)}
          onComplete={handleComplete}
          onToggleGoal={handleToggleGoal}
        />
      )}

      {/* Study Now modal */}
      {studyNow && (
        <StudyNowModal data={studyNow} onClose={() => setStudyNow(null)} />
      )}
    </AppShell>
  )
}
