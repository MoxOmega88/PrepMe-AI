"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login")
    }
  }, [token, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8E3D9]">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-[#FF4D6D] font-mono font-black text-sm">■</span>
            <span className="font-serif font-black text-[#1A1A1A] text-xl">PrepMeAI</span>
          </div>
          <p className="font-mono text-[10px] text-[#AAA] uppercase tracking-widest">Loading…</p>
        </div>
      </div>
    )
  }

  if (!token) return null
  return <>{children}</>
}
