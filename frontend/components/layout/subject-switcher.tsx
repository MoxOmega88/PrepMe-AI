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
      className="w-full flex items-center px-8 mt-6 mb-2"
    >
      <div className="flex gap-2 items-end border-b-2 border-[#1c1f3a] w-full pl-4">
        <button
          onClick={() => switchSubject("science")}
          disabled={switching}
          className={profile?.subject === "science"
            ? "px-6 py-2.5 font-mono text-xs font-black uppercase tracking-widest bg-[#fcfaf8] text-[#1c1f3a] border-2 border-[#1c1f3a] border-b-0 rounded-t-xl relative z-10 translate-y-[2px]"
            : "px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest bg-[#e6dfd4] text-[#666680] border-2 border-[rgba(28,31,58,0.15)] border-b-0 rounded-t-xl hover:bg-[#eee9e0] hover:text-[#1c1f3a] transition-colors"}
          style={profile?.subject === "science" ? { boxShadow: "inset 0 4px 0px rgba(74,111,165,0.4)" } : {}}
        >
          SCIENCE
        </button>
        <button
          onClick={() => switchSubject("maths")}
          disabled={switching}
          className={profile?.subject === "maths"
            ? "px-6 py-2.5 font-mono text-xs font-black uppercase tracking-widest bg-[#fcfaf8] text-[#1c1f3a] border-2 border-[#1c1f3a] border-b-0 rounded-t-xl relative z-10 translate-y-[2px]"
            : "px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest bg-[#e6dfd4] text-[#666680] border-2 border-[rgba(28,31,58,0.15)] border-b-0 rounded-t-xl hover:bg-[#eee9e0] hover:text-[#1c1f3a] transition-colors"}
          style={profile?.subject === "maths" ? { boxShadow: "inset 0 4px 0px rgba(74,111,165,0.4)" } : {}}
        >
          MATHS
        </button>
      </div>
    </div>
  )
}
