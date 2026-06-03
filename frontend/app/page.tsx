"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth"
import { ArrowRight, Target, CalendarDays, CheckCircle2, BarChart3, BookOpen, AlertCircle, Compass, Play } from "lucide-react"
import Link from "next/link"

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
      <div className="w-full" style={{ background: "rgba(28,31,58,0.10)", height: "8px" }}>
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${score * 100}%`, background: "#4A6FA5" }} />
      </div>
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
        <div className="flex items-end justify-between border-b border-[rgba(28,31,58,0.08)] pb-4 mb-2 animate-slide-right">
          <div>
            <p className="section-label mb-2 animate-[slide-right_0.5s_ease-out_0.1s_both] text-xs" style={{ background: "rgba(74,111,165,0.12)", color: "#4A6FA5", border: "1px solid rgba(74,111,165,0.25)" }}>Dashboard</p>
            <h1 className="font-serif font-black text-5xl md:text-6xl text-[#1c1f3a] leading-[1.1] tracking-tighter animate-[slide-right_0.5s_ease-out_0.2s_both] drop-shadow-[2px_2px_0px_rgba(74,111,165,0.3)]">
              Welcome back,<br />{profile?.name ?? "Student"}
            </h1>
          </div>
        </div>

        {/* ── Stat cards — dark glass with mini visualisations ────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const shadows = ["neo-card-pink","neo-card-green","neo-card-amber","neo-card-white"]
            const accents = ["#4A6FA5","#2a7d4f","#c47c2b","#1c1f3a"]
            const borderTops = ["3px solid #4A6FA5", "3px solid #2a7d4f", "3px solid #c47c2b", "3px solid #1c1f3a"]
            return (
              <div key={s.label} className={`neo-card group/stat`} style={{ animationDelay: `${0.1 * i}s`, border: "1px solid rgba(28,31,58,0.15)", borderTop: borderTops[i], boxShadow: "3px 3px 0 rgba(28,31,58,0.12)", background: "#eee9e0" }}>
                <div className="retro-titlebar transition-colors duration-300 group-hover/stat:bg-[rgba(28,31,58,0.08)]">
                  <span className="flex items-center gap-2 transition-transform duration-300 group-hover/stat:translate-x-1" style={{ letterSpacing: "0.15em" }}>
                    <span className="flex items-center justify-center w-5 h-5 transition-all duration-300 group-hover/stat:shadow-[0_0_12px_currentColor]"
                      style={{
                        background: `${accents[i]}18`,
                        border: `1px solid ${accents[i]}40`,
                        color: accents[i]
                      }}>
                      <s.icon className="w-3 h-3 transition-transform duration-300 group-hover/stat:scale-110" style={{ color: accents[i] }} />
                    </span>
                    {s.label}
                  </span>
                  <div className="retro-titlebar-dots">
                    <span style={{ background: accents[i] }} className="transition-transform duration-300 group-hover/stat:scale-125" />
                    <span style={{ background: "#3A3A4E" }} />
                    <span style={{ background: "#3A3A4E" }} />
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[40px] font-[800] leading-none transition-all duration-300 group-hover/stat:scale-105 origin-left" style={{ color: accents[i] }}>
                        {s.value}
                      </p>
                      {s.unit && (
                        <p className="font-mono text-[9px] text-[#666680] uppercase tracking-widest mt-1 transition-colors duration-300 group-hover/stat:text-[#8888a0]">{s.unit}</p>
                      )}
                    </div>
                    {/* Mini visualisation widget */}
                    <div className="flex-shrink-0 ml-3 flex items-center gap-2">
                      {i === 0 && (
                        /* Donut gauge for Readiness — large, gold stroke */
                        <>
                          <svg width="56" height="56" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(28,31,58,0.06)" strokeWidth="5" />
                            <circle cx="28" cy="28" r="22" fill="none" stroke="#D4A84B" strokeWidth="5"
                              strokeDasharray={`${(data?.readiness ?? 0) * 1.382} 138.2`}
                              strokeLinecap="butt" transform="rotate(-90 28 28)"
                              style={{ filter: 'drop-shadow(0 0 6px rgba(212,168,75,0.6))' }} />
                            <text x="28" y="29" textAnchor="middle" dominantBaseline="middle"
                              className="font-mono" fill="#FFFFFF" fontSize="13" fontWeight="800">{s.value}</text>
                          </svg>
                          {/* 3×3 dot grid */}
                          <div className="grid grid-cols-3 gap-[3px]">
                            {[accents[i],'#3A3A4E','#3A3A4E',accents[i],accents[i],'#3A3A4E','#3A3A4E','#3A3A4E',accents[i]].map((c,di) => (
                              <div key={di} className="w-[5px] h-[5px]" style={{ background: c }} />
                            ))}
                          </div>
                        </>
                      )}
                      {i === 1 && (
                        /* Full-width progress bar for Days to Exam — rendered below */
                        <></>
                      )}
                      {i === 2 && (
                        /* Segmented bar chart for Sessions — taller, wider */
                        <div className="flex items-end gap-[4px] h-10">
                          {[0.55, 0.85, 0.45, 0.75, 1, 0.65, 0.35].map((h, j) => (
                            <div key={j} className="w-[7px] rounded-sm" style={{
                              height: `${h * 100}%`,
                              background: j < (data?.sessions_done ?? 0) % 8 ? accents[i] : 'rgba(28,31,58,0.08)',
                              boxShadow: j < (data?.sessions_done ?? 0) % 8 ? `0 0 6px ${accents[i]}66` : 'none',
                            }} />
                          ))}
                        </div>
                      )}
                      {i === 3 && (
                        /* Sparkline for Avg Mastery — slightly larger */
                        <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
                          <polyline points="0,24 9,16 18,22 27,12 36,18 45,8 54,14 64,6"
                            stroke="rgba(28,31,58,0.18)" strokeWidth="1.5" fill="none" />
                          <polyline points="0,24 9,16 18,22 27,12 36,18 45,8 54,14 64,6"
                            stroke={accents[i]} strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity="0.6" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Days to Exam full-width bar below number */}
                  {i === 1 && (
                    <div className="mt-2">
                      <div className="h-3 rounded-none overflow-hidden" style={{ background: 'rgba(28,31,58,0.06)' }}>
                        <div className="h-full transition-all duration-700" style={{
                          width: `${Math.min(100, ((data?.days_to_exam ?? 0) / 60) * 100)}%`,
                          background: `linear-gradient(90deg, ${accents[i]}, #4A6FA5)`,
                          boxShadow: `0 0 10px ${accents[i]}55`
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Main content grid — 55/45 asymmetric like reference ────────── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 0.8fr" }}>

          {/* Topic mastery — dark glass window with green left accent */}
          <div className="retro-window neo-card" style={{ animationDelay: "0.3s", background: "#e6dfd4", border: "1px solid rgba(28,31,58,0.15)", borderLeft: "4px solid #4A6FA5", boxShadow: "3px 3px 0 rgba(28,31,58,0.12)" }}>
            <div className="retro-titlebar">
              <span className="section-label flex items-center gap-2" style={{ background: "rgba(74,111,165,0.15)", color: "#4A6FA5" }}><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(74,111,165,0.12)', border: '1px solid rgba(74,111,165,0.35)' }}><BookOpen className="w-3 h-3" style={{ color: '#4A6FA5' }} /></span>Topic Mastery</span>
              <div className="retro-titlebar-dots">
                <span style={{ background: "#4A6FA5" }} />
                <span style={{ background: "#c47c2b" }} />
                <span style={{ background: "#2a7d4f" }} />
              </div>
            </div>
            <div className="retro-body space-y-4">
              {data ? (
                data.topic_performance.map((t) => {
                  const color = t.score < 0.5 ? "#4A6FA5" : t.score < 0.7 ? "#c47c2b" : "#2a7d4f";
                  return (
                    <div key={t.topic} className="group/topic p-2 -mx-2 rounded-sm transition-all duration-300 hover:translate-x-1 border-l-2 border-transparent" style={{ borderLeftColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = color} onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] text-[#8888A0] group-hover/topic:text-[#e0e0e0] uppercase tracking-wider truncate mr-2 transition-colors duration-300">{t.topic}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#8888A0] group-hover/topic:font-bold tabular-nums transition-all duration-300" style={{ color: 'var(--hover-text)' }} onMouseEnter={(e) => e.currentTarget.style.color = color} onMouseLeave={(e) => e.currentTarget.style.color = ''}>{(t.score * 100).toFixed(0)}%</span>
                          <div className="group-hover/topic:scale-105 transition-transform duration-300"><Tag tag={t.tag} /></div>
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
                    </div>
                  );
                })
              ) : (
                <p className="font-mono text-xs text-[#555570]">Loading…</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Study priority — dark glass window with green left accent */}
            <div className="retro-window neo-card" style={{ animationDelay: "0.4s", background: "#e6dfd4", border: "1px solid rgba(28,31,58,0.15)", borderLeft: '4px solid #c47c2b', boxShadow: "3px 3px 0 rgba(28,31,58,0.12)" }}>
              <div className="retro-titlebar">
                <span className="section-label flex items-center gap-2" style={{ background: "rgba(196,124,43,0.15)", color: "#c47c2b" }}><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(196,124,43,0.12)', border: '1px solid rgba(196,124,43,0.35)' }}><AlertCircle className="w-3 h-3" style={{ color: '#c47c2b' }} /></span>Study Priority</span>
                <div className="retro-titlebar-dots">
                  <span style={{ background: "#4A6FA5" }} />
                  <span style={{ background: "#c47c2b" }} />
                  <span style={{ background: "#3A3A4E" }} />
                </div>
              </div>
              <div className="retro-body">
                {top3.length > 0 ? (
                  <ol className="space-y-4">
                    {top3.map((item, i) => (
                      <li key={item.topic} className="flex items-start gap-4 p-3 -mx-3 hover:bg-[rgba(196,124,43,0.05)] transition-all duration-300 group cursor-default" style={{ borderBottom: "1px dashed rgba(28,31,58,0.12)" }}>
                        <span className="font-serif flex-shrink-0" style={{ color: "rgba(28,31,58,0.18)", fontSize: "22px", marginTop: "-4px" }}>0{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-serif leading-tight group-hover:text-[#4A6FA5] transition-colors duration-300" style={{ color: "#1c1f3a", fontWeight: 600 }}>{item.topic}</p>
                          <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(28,31,58,0.50)" }}>{item.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-mono text-xs text-[#555570]">Loading…</p>
                )}
              </div>
            </div>

            {/* CTA card — "What to study next" */}
            {top3[0] && (
              <div className="neo-card neo-card-pink relative overflow-visible animate-float group/cta" style={{ animationDelay: "0.5s" }}>
                <div className="retro-titlebar transition-colors duration-300 group-hover/cta:bg-[rgba(74,111,165,0.15)]" style={{ background: "rgba(74,111,165,0.08)", borderBottomColor: "rgba(74,111,165,0.15)" }}>
                  <span className="section-label pink flex items-center gap-2 transition-transform duration-300 group-hover/cta:scale-105"><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(74,111,165,0.15)', border: '1px solid rgba(74,111,165,0.40)' }}><Compass className="w-3 h-3" style={{ color: '#4A6FA5' }} /></span>What to study next</span>
                  <div className="retro-titlebar-dots">
                    <span style={{ background: "#4A6FA5" }} />
                    <span style={{ background: "#3A3A4E" }} />
                    <span style={{ background: "#3A3A4E" }} />
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-serif font-black text-xl text-[#1c1f3a] leading-tight mb-4 transition-all duration-300 group-hover/cta:text-[#4A6FA5] group-hover/cta:drop-shadow-[0_0_10px_rgba(74,111,165,0.5)]">
                    {top3[0].topic}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Link href="/tutor"
                      className="brut-btn brut-btn-pink group/link inline-flex items-center gap-2 px-6 py-3 text-sm relative overflow-hidden">
                      Start with AI Tutor <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 group-hover/link:scale-110 transition-transform duration-300" />
                    </Link>
                    <StudyNowButton topic={top3[0].topic} />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  )
}
