"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface TopicPerf {
  topic: string; score: number; tag: string; sessions_done: number
  quiz_attempts: number; quiz_accuracy: number | null
}
interface Analytics {
  readiness: number; days_to_exam: number; sessions_done: number; avg_mastery: number
  topic_performance: TopicPerf[]
  priority_queue: { topic: string; score: number; reason: string }[]
}

interface TopicBreakdownItem {
  topic: string
  score: number
  accuracy: number
  mastery: number
  confidence_calibration: number
}

interface ExamPrediction {
  predicted_score: number
  confidence_level: "High" | "Medium" | "Low"
  topic_breakdown: TopicBreakdownItem[]
}

function Tag({ tag }: { tag: string }) {
  const s: Record<string, string> = {
    Weak:     "text-[#4A6FA5] border border-[#4A6FA5]/30",
    Building: "text-[#c47c2b] border border-[#c47c2b]/30",
    Good:     "text-[#2a7d4f] border border-[#2a7d4f]/30",
  }
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-none ${s[tag] ?? ""}`}>{tag}</span>
}

function Gauge({ value }: { value: number }) {
  const r = 54, circ = 2 * Math.PI * r, dash = (value / 100) * circ
  const color = value >= 70 ? "#2a7d4f" : value >= 40 ? "#c47c2b" : "#4A6FA5"
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-[0_0_15px_rgba(42,125,79,0.2)]">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,31,58,0.06)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="square"
        transform="rotate(-90 70 70)" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      <text x="70" y="68" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 24, fontWeight: 900, fill: color, fontFamily: 'JetBrains Mono, monospace' }}>{value.toFixed(0)}</text>
      <text x="70" y="88" textAnchor="middle" style={{ fontSize: 10, fill: "#8888A0", fontFamily: 'monospace' }}>/ 100</text>
    </svg>
  )
}

export default function AnalyticsPage() {
  const { profile, authFetch, subjectVersion } = useAuth()
  const [data, setData] = useState<Analytics | null>(null)
  const [prediction, setPrediction] = useState<ExamPrediction | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(true)
  const [predictionError, setPredictionError] = useState(false)
  const subject = profile?.subject ?? "science"

  useEffect(() => {
    setData(null)
    setPrediction(null)
    setPredictionLoading(true)
    setPredictionError(false)

    authFetch(`/api/analytics/?subject=${subject}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))

    authFetch(`/api/quiz/exam-prediction`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch prediction")
        return r.json()
      })
      .then(d => {
        if (!d || !d.topic_breakdown || d.topic_breakdown.length === 0) {
          setPredictionError(true)
        } else {
          setPrediction(d)
        }
        setPredictionLoading(false)
      })
      .catch(err => {
        console.error("Failed to load exam prediction:", err)
        setPredictionError(true)
        setPredictionLoading(false)
      })
  }, [authFetch, subject, subjectVersion])

  const stats = data ? [
    { label: "Readiness",     value: `${data.readiness.toFixed(0)}`, unit: "/ 100", stripe: "stat-violet" },
    { label: "Days to Exam",  value: `${data.days_to_exam}`,         unit: "days",  stripe: "stat-blue" },
    { label: "Sessions Done", value: `${data.sessions_done}`,        unit: "",      stripe: "stat-green" },
    { label: "Avg Mastery",   value: `${(data.avg_mastery * 100).toFixed(0)}%`, unit: "", stripe: "stat-amber" },
  ] : []

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="section-label pink mb-2">Insights</p>
          <h1 className="font-serif font-black text-3xl text-[#1c1f3a]">Analytics</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`neo-card p-5 border border-[rgba(28,31,58,0.14)] rounded-none group/stat ${s.stripe}`} style={{ animationDelay: `${0.1 * i}s` }}>
              <p className="section-label text-[10px] mb-3 transition-colors group-hover/stat:text-[#1c1f3a]">{s.label}</p>
              <p className="font-mono text-3xl font-black text-[#1c1f3a] transition-transform group-hover/stat:scale-105 origin-left duration-300">
                {s.value}<span className="text-sm font-normal text-[#8888A0] ml-1 group-hover/stat:text-[#A0A0C0] transition-colors">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            {/* Readiness Gauge Card */}
            <div className="neo-card neo-card-green p-6 flex flex-col items-center border border-[rgba(28,31,58,0.14)] rounded-none">
              <p className="section-label green mb-4 self-start">Readiness Score</p>
              {data ? <Gauge value={data.readiness} /> : <p className="text-[#8888A0] text-sm font-mono animate-pulse">Loading…</p>}
              <p className="text-[10px] text-[#8888A0] font-mono mt-4 text-center">60% mastery · 20% adherence · 20% time</p>
            </div>

            {/* Exam Prediction Score Card */}
            <div className="neo-card neo-card-pink p-6 flex flex-col border border-[rgba(28,31,58,0.14)] rounded-none relative overflow-hidden group/pred">
              <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(74,111,165,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
              <div className="relative z-10">
              <p className="section-label pink mb-5">Exam Prediction</p>
              {predictionLoading ? (
                <p className="text-[#8888A0] text-sm font-mono py-8 text-center animate-pulse">Loading prediction…</p>
              ) : predictionError || !prediction ? (
                <div className="border border-[rgba(28,31,58,0.14)] bg-[rgba(28,31,58,0.05)] p-8 rounded-none text-center backdrop-blur-sm">
                  <p className="text-xs text-[#8888A0] font-mono font-bold">Not enough quiz data yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Score and Badge Display */}
                  <div className="flex flex-col items-center justify-center py-6 border border-[rgba(28,31,58,0.14)] bg-[rgba(0,0,0,0.4)] rounded-none transition-transform duration-300 group-hover/pred:scale-[1.02] shadow-[inset_0_0_20px_rgba(74,111,165,0.1)]">
                    <div className="text-center">
                      <span className="font-serif font-black text-7xl text-[#1c1f3a] drop-shadow-[0_0_15px_rgba(74,111,165,0.4)]">{Math.round(prediction.predicted_score)}</span>
                      <span className="font-mono text-sm text-[#8888A0] ml-1">/100</span>
                    </div>
                    
                    {/* Confidence Badge */}
                    <div className="mt-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-none font-mono text-black",
                        prediction.confidence_level === "High" ? "bg-[#2a7d4f]" :
                        prediction.confidence_level === "Medium" ? "bg-[#c47c2b]" : "bg-[#4A6FA5]"
                      )}>
                        {prediction.confidence_level} Confidence
                      </span>
                    </div>
                  </div>

                  {/* Topic Breakdown Table */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8888A0] font-mono">Topic Breakdown</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[10px] text-[#1c1f3a] border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(28,31,58,0.14)]">
                            <th className="pb-2 font-bold uppercase text-[#8888A0]">Topic</th>
                            <th className="pb-2 font-bold uppercase text-right px-2 text-[#8888A0]">Mastery</th>
                            <th className="pb-2 font-bold uppercase text-right px-2 text-[#8888A0]">Accuracy</th>
                            <th className="pb-2 font-bold uppercase text-right text-[#8888A0]">Prediction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(28,31,58,0.06)]">
                          {prediction.topic_breakdown.map((row) => (
                            <tr key={row.topic} className="hover:bg-[rgba(28,31,58,0.04)] transition-colors group/row cursor-default">
                              <td className="py-2.5 pr-2 font-medium truncate max-w-[120px] transition-colors group-hover/row:text-[#1c1f3a]">{row.topic}</td>
                              <td className="py-2.5 text-right px-2 text-[#A0A0C0]">{(row.mastery * 100).toFixed(0)}%</td>
                              <td className="py-2.5 text-right px-2 text-[#A0A0C0]">{(row.accuracy * 100).toFixed(0)}%</td>
                              <td className="py-2.5 text-right font-black text-[#4A6FA5] group-hover/row:scale-110 origin-right transition-transform">{(row.score * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Thin Mastery Bars for each topic */}
                    <div className="space-y-3 pt-4 border-t border-[rgba(28,31,58,0.14)]">
                      {prediction.topic_breakdown.map((row) => (
                        <div key={`bar-${row.topic}`} className="space-y-1.5 group/bar">
                          <div className="flex justify-between text-[8px] font-mono text-[#8888A0]">
                            <span className="truncate max-w-[150px] group-hover/bar:text-[#1c1f3a] transition-colors">{row.topic}</span>
                            <span className="font-bold text-[#1c1f3a] transition-all group-hover/bar:scale-110 origin-right">{(row.score * 100).toFixed(0)}% predicted</span>
                          </div>
                          <div className="h-1.5 bg-[rgba(28,31,58,0.05)] overflow-hidden border border-[rgba(255,255,255,0.1)] rounded-none group-hover/bar:border-[rgba(255,255,255,0.2)] transition-colors">
                            <div className="h-full transition-all duration-500 ease-out rounded-none relative" style={{
                              width: `${row.score * 100}%`,
                              backgroundColor: row.score < 0.5 ? "#4A6FA5" : row.score < 0.7 ? "#c47c2b" : "#2a7d4f"
                            }}>
                              <div className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity" style={{ boxShadow: `0 0 8px ${row.score < 0.5 ? "#4A6FA5" : row.score < 0.7 ? "#c47c2b" : "#2a7d4f"}` }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Topic Performance Card */}
          <div className="neo-card neo-card-amber p-6 border border-[rgba(28,31,58,0.14)] rounded-none">
            <p className="section-label amber mb-5">Topic Performance</p>
            {data ? (
              <div className="space-y-4">
                {data.topic_performance.map(t => (
                  <div key={t.topic} className="space-y-1.5 group/perf hover:translate-x-1 transition-transform duration-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#A0A0C0] group-hover/perf:text-[#1c1f3a] truncate flex-1 font-mono transition-colors">{t.topic}</span>
                      <div className="group-hover/perf:scale-105 transition-transform"><Tag tag={t.tag} /></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-[rgba(28,31,58,0.05)] overflow-hidden border border-[rgba(255,255,255,0.1)] rounded-none group-hover/perf:border-[rgba(255,255,255,0.2)] transition-colors">
                        <div className="h-full transition-all duration-500 ease-out rounded-none relative" style={{
                          width: `${t.score * 100}%`,
                          backgroundColor: t.score < 0.5 ? "#4A6FA5" : t.score < 0.7 ? "#c47c2b" : "#2a7d4f"
                        }}>
                          <div className="absolute inset-0 opacity-0 group-hover/perf:opacity-100 transition-opacity" style={{ boxShadow: `0 0 8px ${t.score < 0.5 ? "#4A6FA5" : t.score < 0.7 ? "#c47c2b" : "#2a7d4f"}` }}></div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#8888A0] w-24 text-right flex-shrink-0 group-hover/perf:text-[#2a7d4f] transition-colors">
                        {t.quiz_attempts}q · {t.quiz_accuracy != null ? `${(t.quiz_accuracy * 100).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-[#8888A0] text-sm font-mono animate-pulse">Loading…</p>}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
