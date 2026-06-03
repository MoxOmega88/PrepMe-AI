"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"

export function SubjectSwitcher() {
  const { profile, setSubject } = useAuth()
  const [switching, setSwitching] = useState(false)

  const switchSubject = async (subj: "science" | "maths") => {
    if (profile?.subject === subj || switching) return
    setSwitching(true)
    try {
      await setSubject(subj)
    } catch {
      // ignore — setSubject already handles no-op if same subject
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div
      className="w-full flex items-center gap-4"
      style={{ background: "#ddd7cc", padding: "12px 32px", borderBottom: "2px solid rgba(28,31,58,0.15)" }}
    >
      <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#555570] flex-shrink-0">
        ■ SUBJECT
      </span>
      <div className="flex gap-3 items-center">
        <button
          onClick={() => switchSubject("science")}
          disabled={switching}
          className={profile?.subject === "science"
            ? "px-4 py-1.5 font-mono text-[11px] font-black uppercase tracking-widest bg-[#4A6FA5] text-white"
            : "px-4 py-1.5 font-mono text-[11px] font-black uppercase tracking-widest text-[rgba(28,31,58,0.55)] hover:bg-[rgba(28,31,58,0.06)]"}
        >
          • Science
        </button>
        <button
          onClick={() => switchSubject("maths")}
          disabled={switching}
          className={profile?.subject === "maths"
            ? "px-4 py-1.5 font-mono text-[11px] font-black uppercase tracking-widest bg-[#4A6FA5] text-white"
            : "px-4 py-1.5 font-mono text-[11px] font-black uppercase tracking-widest text-[rgba(28,31,58,0.55)] hover:bg-[rgba(28,31,58,0.06)]"}
        >
          Maths
        </button>
      </div>
    </div>
  )
}
