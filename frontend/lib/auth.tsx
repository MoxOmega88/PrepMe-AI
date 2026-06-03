"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Profile {
  id: string
  name: string
  email: string
  subject: "science" | "maths"
  exam_date: string | null
  days_to_exam: number
  daily_hours: number
  mastery: Record<string, { score: number; sessions_done: number; last_tested: string | null }>
}

interface AuthCtx {
  token: string | null
  profile: Profile | null
  loading: boolean
  /** Increments on every subject switch — use as useEffect dependency to re-fetch page data */
  subjectVersion: number
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, subject: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  setSubject: (subject: "science" | "maths") => Promise<void>
  authFetch: (path: string, init?: RequestInit) => Promise<Response>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjectVersion, setSubjectVersion] = useState(0)

  const authFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers || {}),
      },
    })
  }, [token])

  const fetchProfile = useCallback(async (t: string) => {
    const res = await fetch(`${API}/api/profile/`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(data)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("token")
    if (stored) {
      // Unblock the guard immediately — token is known synchronously
      setToken(stored)
      setLoading(false)
      // Fetch profile in the background; pages will re-render when it arrives
      fetchProfile(stored)
    } else {
      setLoading(false)
    }
  }, [fetchProfile])

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Login failed")
    }
    const { access_token } = await res.json()
    localStorage.setItem("token", access_token)
    setToken(access_token)
    await fetchProfile(access_token)
  }

  const signup = async (name: string, email: string, password: string, subject: string) => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, subject }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Signup failed")
    }
    const { access_token } = await res.json()
    localStorage.setItem("token", access_token)
    setToken(access_token)
    await fetchProfile(access_token)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setProfile(null)
    setSubjectVersion(0)
  }

  const refreshProfile = useCallback(async () => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)
    if (t) await fetchProfile(t)
  }, [token, fetchProfile])

  const setSubject = useCallback(async (subject: "science" | "maths") => {
    if (profile?.subject === subject) return
    const res = await authFetch("/api/profile/", {
      method: "PATCH",
      body: JSON.stringify({ subject }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to switch subject")
    }
    await refreshProfile()
    setSubjectVersion(v => v + 1)
  }, [profile?.subject, authFetch, refreshProfile])

  return (
    <Ctx.Provider value={{
      token, profile, loading, subjectVersion,
      login, signup, logout, refreshProfile, setSubject, authFetch,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
