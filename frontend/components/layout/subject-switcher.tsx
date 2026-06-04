"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { SUBJECT_TABS, type AppSubject } from "@/lib/subjects"

export function SubjectSwitcher() {
  const { profile, setSubject } = useAuth()
  const [switching, setSwitching] = useState(false)

  const switchSubject = async (subj: AppSubject) => {
    if (profile?.subject === subj || switching) return
    setSwitching(true)
    try {
      await setSubject(subj)
    } catch {
      /* ignore */
    } finally {
      setSwitching(false)
    }
  }

  const active = profile?.subject ?? "science"

  return (
    <div className="w-full flex items-center px-8 mt-6 mb-2">
      <div className="flex gap-2 items-end border-b-2 border-[#1c1f3a] w-full pl-4 overflow-x-auto">
        {SUBJECT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchSubject(tab.id)}
            disabled={switching}
            className={
              active === tab.id
                ? "px-4 md:px-6 py-2.5 font-mono text-[10px] md:text-xs font-black uppercase tracking-widest bg-[#fcfaf8] text-[#1c1f3a] border-2 border-[#1c1f3a] border-b-0 rounded-t-xl relative z-10 translate-y-[2px] flex-shrink-0"
                : "px-4 md:px-6 py-2 font-mono text-[10px] md:text-xs font-bold uppercase tracking-widest bg-[#e6dfd4] text-[#666680] border-2 border-[rgba(28,31,58,0.15)] border-b-0 rounded-t-xl hover:bg-[#eee9e0] hover:text-[#1c1f3a] transition-colors flex-shrink-0"
            }
            style={
              active === tab.id
                ? { boxShadow: `inset 0 4px 0px ${tab.accent}66` }
                : {}
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
