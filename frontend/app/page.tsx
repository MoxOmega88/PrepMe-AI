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
  const color = score < 0.5 ? "#FF4D6D" : score < 0.7 ? "#F5A623" : "#39FF6A"
  const segments = 12
  const activeSegments = Math.round(score * segments)
  
  return (
    <div className="flex flex-col gap-1.5 group/bar cursor-default flex-1 mr-4">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[8px] text-[#777790] group-hover/bar:text-[#A0A0B8] transition-colors uppercase tracking-widest">Proficiency</span>
        <span className="font-mono text-[10px] font-black tabular-nums transition-all duration-300 group-hover/bar:scale-110 group-hover/bar:drop-shadow-[0_0_8px_currentColor]" style={{ color }}>{(score * 100).toFixed(0)}%</span>
      </div>
      <div className="flex gap-[3px] h-[10px]">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments
          return (
            <div key={i} className="flex-1 skew-x-[-15deg] border transition-all duration-500 ease-out"
              style={{
                backgroundColor: isActive ? color : "rgba(255,255,255,0.03)",
                borderColor: isActive ? color : "rgba(255,255,255,0.08)",
                boxShadow: isActive ? `0 0 8px ${color}60, inset 0 0 4px rgba(255,255,255,0.4)` : "none",
                opacity: isActive ? 1 : 0.6,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function Tag({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    Weak:     "text-[#FF4D6D] border border-[rgba(255,77,109,0.40)] bg-[rgba(255,77,109,0.10)]",
    Building: "text-[#F5A623] border border-[rgba(245,166,35,0.40)] bg-[rgba(245,166,35,0.10)]",
    Good:     "text-[#39FF6A] border border-[rgba(57,255,106,0.40)] bg-[rgba(57,255,106,0.10)]",
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
        <div className="flex items-end justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-2 animate-slide-right">
          <div>
            <p className="section-label pink mb-2 animate-[slide-right_0.5s_ease-out_0.1s_both] text-xs">Dashboard</p>
            <h1 className="font-serif font-black text-5xl md:text-6xl text-white leading-[1.1] tracking-tighter animate-[slide-right_0.5s_ease-out_0.2s_both] drop-shadow-[2px_2px_0px_rgba(255,77,109,0.3)]">
              Welcome back,<br />{profile?.name ?? "Student"}
            </h1>
          </div>
        </div>

        {/* ── Stat cards — dark glass with mini visualisations ────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const shadows = ["neo-card-pink","neo-card-green","neo-card-amber","neo-card-white"]
            const accents = ["#FF4D6D","#39FF6A","#F5A623","#888"]
            return (
              <div key={s.label} className={`neo-card ${shadows[i]} group/stat`} style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="retro-titlebar transition-colors duration-300 group-hover/stat:bg-[rgba(255,255,255,0.08)]">
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
                      <p className="font-mono text-2xl font-black leading-none transition-all duration-300 group-hover/stat:scale-105 group-hover/stat:drop-shadow-[0_0_8px_currentColor] origin-left" style={{ color: accents[i] }}>
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
                            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
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
                              background: j < (data?.sessions_done ?? 0) % 8 ? accents[i] : 'rgba(255,255,255,0.08)',
                              boxShadow: j < (data?.sessions_done ?? 0) % 8 ? `0 0 6px ${accents[i]}66` : 'none',
                            }} />
                          ))}
                        </div>
                      )}
                      {i === 3 && (
                        /* Sparkline for Avg Mastery — slightly larger */
                        <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
                          <polyline points="0,24 9,16 18,22 27,12 36,18 45,8 54,14 64,6"
                            stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />
                          <polyline points="0,24 9,16 18,22 27,12 36,18 45,8 54,14 64,6"
                            stroke={accents[i]} strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity="0.6" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Days to Exam full-width bar below number */}
                  {i === 1 && (
                    <div className="mt-2">
                      <div className="h-3 rounded-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full transition-all duration-700" style={{
                          width: `${Math.min(100, ((data?.days_to_exam ?? 0) / 60) * 100)}%`,
                          background: `linear-gradient(90deg, ${accents[i]}, #FF4D6D)`,
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
          <div className="retro-window neo-card neo-card-green" style={{ animationDelay: "0.3s", borderLeft: '2px solid rgba(57,255,106,0.50)' }}>
            <div className="retro-titlebar">
              <span className="section-label green flex items-center gap-2"><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(57,255,106,0.12)', border: '1px solid rgba(57,255,106,0.35)' }}><BookOpen className="w-3 h-3" style={{ color: '#39FF6A' }} /></span>Topic Mastery</span>
              <div className="retro-titlebar-dots">
                <span style={{ background: "#FF4D6D" }} />
                <span style={{ background: "#F5A623" }} />
                <span style={{ background: "#39FF6A" }} />
              </div>
            </div>
            <div className="retro-body space-y-4">
              {data ? (
                data.topic_performance.map((t) => {
                  const color = t.score < 0.5 ? "#FF4D6D" : t.score < 0.7 ? "#F5A623" : "#39FF6A";
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
                            stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
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
            <div className="retro-window neo-card neo-card-amber" style={{ animationDelay: "0.4s", borderLeft: '2px solid rgba(57,255,106,0.50)' }}>
              <div className="retro-titlebar">
                <span className="section-label amber flex items-center gap-2"><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.35)' }}><AlertCircle className="w-3 h-3" style={{ color: '#F5A623' }} /></span>Study Priority</span>
                <div className="retro-titlebar-dots">
                  <span style={{ background: "#FF4D6D" }} />
                  <span style={{ background: "#F5A623" }} />
                  <span style={{ background: "#3A3A4E" }} />
                </div>
              </div>
              <div className="retro-body">
                {top3.length > 0 ? (
                  <ol className="space-y-4">
                    {top3.map((item, i) => (
                      <li key={item.topic} className="flex items-start gap-4 p-3 -mx-3 hover:bg-gradient-to-r hover:from-[rgba(245,166,35,0.1)] hover:to-transparent rounded-sm transition-all duration-300 group cursor-default hover:translate-x-2 border-l-2 border-transparent hover:border-[#F5A623]">
                        {/* Amber circle badge */}
                        <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-xs font-black bg-[#D4A84B] text-[#0D0D1A] group-hover:scale-125 group-hover:bg-[#FF4D6D] group-hover:text-white group-hover:shadow-[0_0_12px_rgba(255,77,109,0.6)] transition-all duration-300" style={{ borderRadius: '50%' }}>{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-serif font-bold text-[15px] text-white leading-tight group-hover:text-[#FF4D6D] transition-colors duration-300 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(255,77,109,0.4)]">{item.topic}</p>
                          <p className="font-mono text-[11px] text-[#777790] mt-1 leading-relaxed group-hover:text-[#aaaabc] transition-colors duration-300">{item.reason}</p>
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
                <div className="retro-titlebar transition-colors duration-300 group-hover/cta:bg-[rgba(255,77,109,0.15)]" style={{ background: "rgba(255,77,109,0.08)", borderBottomColor: "rgba(255,77,109,0.15)" }}>
                  <span className="section-label pink flex items-center gap-2 transition-transform duration-300 group-hover/cta:scale-105"><span className="flex items-center justify-center w-5 h-5" style={{ background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.40)' }}><Compass className="w-3 h-3" style={{ color: '#FF4D6D' }} /></span>What to study next</span>
                  <div className="retro-titlebar-dots">
                    <span style={{ background: "#FF4D6D" }} />
                    <span style={{ background: "#3A3A4E" }} />
                    <span style={{ background: "#3A3A4E" }} />
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-serif font-black text-xl text-white leading-tight mb-4 transition-all duration-300 group-hover/cta:text-[#FF4D6D] group-hover/cta:drop-shadow-[0_0_10px_rgba(255,77,109,0.5)]">
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
