"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth"
import { ArrowRight, Target, CalendarDays, CheckCircle2, BarChart3, BookOpen, AlertCircle, Compass, Play } from "lucide-react"
import Link from "next/link"
import { PencilBar } from "@/components/ui/pencil-bar"

interface Analytics {
  readiness: number; days_to_exam: number; sessions_done: number; avg_mastery: number
  topic_performance: { topic: string; score: number; tag: string }[]
  priority_queue: { topic: string; score: number; reason: string }[]
}

function MasteryBar({ score }: { score: number }) {
  return (
    <div className="flex flex-col gap-1.5 group/bar cursor-default flex-1 mr-4">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[8px] text-[rgba(28,31,58,0.40)] group-hover/bar:text-[rgba(28,31,58,0.55)] transition-colors uppercase tracking-widest">Proficiency</span>
        <span className="font-mono text-[10px] font-black tabular-nums transition-all duration-300 group-hover/bar:scale-110" style={{ color: "#4A6FA5" }}>{(score * 100).toFixed(0)}%</span>
      </div>
      <PencilBar value={score} color="#4A6FA5" height={10} />
    </div>
  )
}

function Tag({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    Weak:     "text-[#4A6FA5] border border-[rgba(74,111,165,0.40)] bg-[rgba(74,111,165,0.10)]",
    Building: "text-[#c47c2b] border border-[rgba(196,124,43,0.40)] bg-[rgba(196,124,43,0.10)]",
    Good:     "text-[#2a7d4f] border border-[rgba(42,125,79,0.40)] bg-[rgba(42,125,79,0.10)]",
  }
  return <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-widest ${styles[tag] ?? ""}`}>{tag}</span>
}

function StudyNowButton({ topic }: { topic: string }) {
  const { authFetch } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const go = async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/planner/study-now")
      if (res.ok) {
        const data = await res.json()
        router.push(`/quiz?topic=${encodeURIComponent(data.topic)}`)
      } else {
        router.push(`/quiz?topic=${encodeURIComponent(topic)}`)
      }
    } catch {
      router.push(`/quiz?topic=${encodeURIComponent(topic)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={go} disabled={loading}
      className="brut-btn group/btn inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold overflow-hidden relative">
      {loading ? "…" : <><Play className="w-4 h-4 fill-current group-hover/btn:scale-125 transition-transform duration-300" /> Study Now</>}
    </button>
  )
}

export default function Dashboard() {
  const { profile, authFetch, refreshProfile, subjectVersion } = useAuth()
  const [data, setData] = useState<Analytics | null>(null)
  const subject = profile?.subject ?? "science"
  const fullText = `Welcome back,\n${profile?.name ?? "Student"}`
  const [displayed, setDisplayed] = useState("")
  const [doneTyping, setDoneTyping] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDoneTyping(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(interval)
        setDoneTyping(true)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [fullText])

  const fetchAnalytics = useCallback(async () => {
    const subjectParam = profile?.subject ?? "science"
    const res = await authFetch(`/api/analytics/?subject=${subjectParam}`)
    if (res.ok) setData(await res.json())
  }, [authFetch, profile?.subject])

  useEffect(() => {
    setData(null)
    fetchAnalytics()
  }, [authFetch, subject, subjectVersion])

  useEffect(() => {
    const handleFocus = () => { refreshProfile(); fetchAnalytics() }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [refreshProfile, fetchAnalytics])

  const stats = [
    { label: "Readiness", value: data ? `${data.readiness.toFixed(0)}` : "—", unit: "/ 100", stripe: "stat-violet", icon: Target },
    { label: "Days to Exam", value: data ? `${data.days_to_exam}` : profile?.days_to_exam ?? "—", unit: "days", stripe: "stat-blue", icon: CalendarDays },
    { label: "Sessions Done", value: data ? `${data.sessions_done}` : "—", unit: "", stripe: "stat-green", icon: CheckCircle2 },
    { label: "Avg Mastery", value: data ? `${(data.avg_mastery * 100).toFixed(0)}%` : "—", unit: "", stripe: "stat-amber", icon: BarChart3 },
  ]

  const top3 = data?.priority_queue.slice(0, 3) ?? []

  return (
    <AppShell>
      <div className="space-y-7">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="border-b border-[rgba(28,31,58,0.08)] pb-8 mb-4 animate-slide-right w-full">
          <div className="w-full flex flex-col items-center justify-center animate-[slide-right_0.5s_ease-out_0.2s_both]">
            <p className="section-label mb-2 text-xs self-start" style={{ background: "rgba(74,111,165,0.12)", color: "#4A6FA5", border: "1px solid rgba(74,111,165,0.25)" }}>Dashboard</p>
            <div className="torn-scrap">
              <div className="scrap-pin" />
              <h1 className="font-serif font-black text-5xl md:text-6xl text-[#1c1f3a] leading-[1.1] tracking-tighter drop-shadow-[2px_2px_0px_rgba(74,111,165,0.3)]">
                {displayed.split("\n").map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
                {!doneTyping && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "3px",
                      height: "0.85em",
                      background: "#4A6FA5",
                      marginLeft: "2px",
                      verticalAlign: "middle",
                      animation: "cursor-blink 0.7s steps(1) infinite",
                    }}
                  />
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* ── Stat cards — Mini Chalkboards ────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const chalkColors = ["blue", "green", "red", "yellow"]
            return (
              <div key={s.label} className="group/stat relative animate-slide-up" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="chalkboard w-full h-full flex flex-col transition-transform duration-300">
                  <div className="border-b-[1px] border-[rgba(255,255,255,0.15)] pb-2 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-[900] tracking-widest text-white opacity-80">
                      <s.icon className="w-3 h-3 text-white" />
                      {s.label}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-5">
                    <div className="relative">
                      <span className={`chalk-text ${chalkColors[i]} text-4xl md:text-5xl transition-transform duration-300 group-hover/stat:scale-110`}>
                        {s.value}
                      </span>
                    </div>
                    {s.unit && (
                      <p className="font-mono text-[10px] text-white opacity-60 uppercase tracking-widest mt-3 text-center transition-opacity duration-300 group-hover/stat:opacity-90">
                        {s.unit}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Main content grid — 55/45 asymmetric like reference ────────── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 0.8fr" }}>

          {/* Topic mastery — Clipboard */}
          <div className="clipboard-board mt-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="clipboard-clip" />
            <div className="clipboard-paper border-l-[4px] border-[#4A6FA5]">
              <div className="flex items-center justify-between border-b-2 border-dashed border-[rgba(28,31,58,0.15)] pb-4 mb-6">
                <span className="section-label flex items-center gap-2" style={{ background: "rgba(74,111,165,0.15)", color: "#4A6FA5" }}><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(74,111,165,0.12)', border: '1px solid rgba(74,111,165,0.35)' }}><BookOpen className="w-3 h-3" style={{ color: '#4A6FA5' }} /></span>Topic Mastery</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A6FA5" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#c47c2b" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2a7d4f" }} />
                </div>
              </div>
              <div className="space-y-4 notebook-ruled">
              {data ? (
                data.topic_performance.map((t) => {
                  const color = t.score < 0.5 ? "#4A6FA5" : t.score < 0.7 ? "#c47c2b" : "#2a7d4f";
                  return (
                    <div key={t.topic} className="group/topic relative p-2 -mx-2 rounded-sm transition-all duration-300 hover:translate-x-1 border-l-2 border-transparent" style={{ borderLeftColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = color} onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span 
                          className="font-serif text-[15px] font-black text-[#1c1f3a] tracking-tight truncate mr-2 transition-colors duration-300" 
                          onMouseEnter={(e) => e.currentTarget.style.color = color} 
                          onMouseLeave={(e) => e.currentTarget.style.color = '#1c1f3a'}
                        >
                          {t.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-mono text-[13px] font-black text-[#1c1f3a] tabular-nums transition-colors duration-300" 
                            onMouseEnter={(e) => e.currentTarget.style.color = color} 
                            onMouseLeave={(e) => e.currentTarget.style.color = '#1c1f3a'}
                          >
                            {(t.score * 100).toFixed(0)}%
                          </span>
                          <div className="group-hover/topic:scale-110 transition-transform duration-300"><Tag tag={t.tag} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MasteryBar score={t.score} />
                        {/* Mini sparkline per topic */}
                        <svg width="36" height="14" viewBox="0 0 36 14" fill="none" className="flex-shrink-0 transition-all duration-300 group-hover/topic:-translate-y-0.5">
                          <polyline points="0,10 6,7 12,11 18,5 24,8 30,3 36,6"
                            stroke="rgba(28,31,58,0.18)" strokeWidth="1" fill="none" />
                          <polyline points="0,10 6,7 12,11 18,5 24,8 30,3 36,6"
                            stroke={color} strokeWidth="1" fill="none" className="opacity-0 group-hover/topic:opacity-100 transition-opacity duration-300" style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
                        </svg>
                      </div>
                      <div className="sticky-note-popup">
                        <p className="font-black uppercase tracking-wider mb-1" style={{ color: t.score < 0.5 ? "#4A6FA5" : t.score < 0.7 ? "#c47c2b" : "#2a7d4f" }}>
                          {t.tag === "Weak" ? "Needs Work" : t.tag === "Building" ? "Making Progress" : "Strong Topic"}
                        </p>
                        <p style={{ color: "rgba(28,31,58,0.70)" }}>
                          {t.score < 0.5
                            ? "Prioritise this topic — low mastery detected."
                            : t.score < 0.7
                            ? "Keep practising to build confidence."
                            : "You're doing great here. Keep it up!"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="font-mono text-xs text-[#555570]">Loading…</p>
              )}
            </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Study priority — Clipboard */}
            <div className="clipboard-board mt-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <div className="clipboard-clip" />
              <div className="clipboard-paper border-l-[4px] border-[#c47c2b]">
                <div className="flex items-center justify-between border-b-2 border-dashed border-[rgba(28,31,58,0.15)] pb-4 mb-6">
                  <span className="section-label flex items-center gap-2" style={{ background: "rgba(196,124,43,0.15)", color: "#c47c2b" }}><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(196,124,43,0.12)', border: '1px solid rgba(196,124,43,0.35)' }}><AlertCircle className="w-3 h-3" style={{ color: '#c47c2b' }} /></span>Study Priority</span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A6FA5" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#c47c2b" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3A3A4E" }} />
                  </div>
                </div>
                <div className="notebook-ruled">
                {top3.length > 0 ? (
                  <ol className="space-y-4">
                    {top3.map((item, i) => (
                      <li key={item.topic} className="flex items-start gap-4 p-3 -mx-3 hover:bg-[rgba(196,124,43,0.05)] transition-all duration-300 group/priority relative cursor-default" style={{ borderBottom: "1px dashed rgba(28,31,58,0.12)" }}>
                        <span className="font-serif flex-shrink-0" style={{ color: "rgba(28,31,58,0.18)", fontSize: "22px", marginTop: "-4px" }}>0{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-serif leading-tight group-hover:text-[#4A6FA5] transition-colors duration-300" style={{ color: "#1c1f3a", fontWeight: 600 }}>{item.topic}</p>
                          <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(28,31,58,0.50)" }}>{item.reason}</p>
                          <div className="sticky-note-popup" style={{ transform: "rotate(1.5deg)" }}>
                            <p className="font-black uppercase tracking-wider mb-1" style={{ color: "#c47c2b" }}>
                              Study Priority #{i + 1}
                            </p>
                            <p style={{ color: "rgba(28,31,58,0.70)" }}>{item.reason}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-mono text-xs text-[#555570]">Loading…</p>
                )}
              </div>
              </div>
            </div>

            {/* CTA card — "What to study next" */}
            {top3[0] && (
              <div className="legal-pad mt-6 animate-float group/cta" style={{ animationDelay: "0.5s" }}>
                <div className="legal-pad-binding" />
                <div className="legal-pad-tear" />
                
                <div className="mb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-[#e87b7b] font-black flex items-center gap-2 transition-transform duration-300 group-hover/cta:translate-x-1">
                    <Compass className="w-4 h-4" /> What to study next
                  </span>
                </div>
                
                <p className="font-serif font-black text-2xl text-[#1c1f3a] leading-tight mb-6 transition-all duration-300 group-hover/cta:text-[#4A6FA5]">
                  {top3[0].topic}
                </p>
                
                <div className="flex gap-3 flex-wrap relative z-20">
                  <Link href="/tutor"
                    className="brut-btn group/link inline-flex items-center gap-2 px-6 py-3 text-sm relative overflow-hidden transition-transform duration-300 hover:scale-105"
                    style={{ background: "#4A6FA5", color: "white", borderRadius: "8px", border: "2px solid #1c1f3a", boxShadow: "3px 3px 0 #1c1f3a" }}>
                    Start with AI Tutor <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 group-hover/link:scale-110 transition-transform duration-300" />
                  </Link>
                  <StudyNowButton topic={top3[0].topic} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  )
}
