"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const SUBJECTS = [
  { id: "science" as const, label: "SCIENCE" },
  { id: "maths" as const, label: "MATHS" },
]

export function SubjectSwitcher() {
  const { profile, setSubject } = useAuth()
  const [switching, setSwitching] = useState(false)
  const active = profile?.subject ?? "science"

  const onSwitch = async (subject: "science" | "maths") => {
    if (active === subject || switching) return
    setSwitching(true)
    try {
      await setSubject(subject)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div
      className="w-full flex items-center gap-4 border-b border-[rgba(255,255,255,0.07)]"
      style={{ background: "#0D0D1A", padding: "12px 32px" }}
    >
      <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#555570] flex-shrink-0">
        ■ SUBJECT
      </span>
      <div className="flex gap-3 items-center">
        {SUBJECTS.map(s => {
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              type="button"
              disabled={switching}
              onClick={() => onSwitch(s.id)}
              className={cn(
                "font-mono text-xs font-black uppercase tracking-widest transition-all duration-200",
                "px-8 py-2.5",
                isActive
                  ? "bg-[#FF4D6D] text-white border border-[#FF4D6D]"
                  : "bg-[rgba(255,255,255,0.05)] text-[#888899] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.09)] hover:text-[#C0C0D0] hover:border-[rgba(255,255,255,0.22)] cursor-pointer"
              )}
              style={isActive ? { boxShadow: "0 0 16px rgba(255,77,109,0.45)" } : undefined}
            >
              {isActive ? `● ${s.label}` : s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
