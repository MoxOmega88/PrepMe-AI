"use client"

import { useEffect, useState, type ReactNode } from "react"

const NAVY = "#0f1b3d"
const GOLD = "#f5a623"

export function BrainIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4c-1.5 0-2.8.8-3.5 2C7.2 5.5 5.5 6.5 5 8.2 4.2 8.5 3.5 9.3 3.5 10.5c0 .8.4 1.5 1 1.9-.3.5-.5 1.1-.5 1.8 0 1.8 1.5 3.2 3.3 3.2.3 1.2 1.3 2.1 2.6 2.1.5 0 1-.1 1.4-.4.6 1.2 1.9 2 3.2 2 2.2 0 4-1.8 4-4v-.3c1.4-.4 2.5-1.7 2.5-3.2 0-1.1-.6-2.1-1.5-2.6.3-.5.5-1.1.5-1.7 0-1.9-1.6-3.5-3.5-3.5-.8 0-1.5.3-2 .7C14.5 4.8 13.3 4 12 4z"
        fill={GOLD}
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AuthSplitLayout({
  promoTitle,
  promoBullets,
  children,
}: {
  promoTitle: string
  promoBullets: string[]
  children: ReactNode
}) {
  useEffect(() => {
    document.body.classList.add("auth-active")
    return () => document.body.classList.remove("auth-active")
  }, [])

  return (
    <div className="auth-page">
      <aside className="auth-promo" aria-hidden={false}>
        <div className="auth-promo-inner">
          <div className="auth-promo-logo">
            <BrainIcon />
            <span>PrepMe.AI</span>
          </div>
          <h1>{promoTitle}</h1>
          <ul>
            {promoBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="auth-form-panel">{children}</div>
    </div>
  )
}

export function AuthToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="auth-toast" role="status">
      {message}
    </div>
  )
}

export function useAuthToast() {
  const [message, setMessage] = useState<string | null>(null)

  const show = (msg: string) => {
    setMessage(msg)
    window.setTimeout(() => setMessage(null), 3200)
  }

  return { message, show }
}

export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" strokeLinecap="round" />
    </svg>
  )
}

export function Spinner() {
  return <span className="auth-spinner" aria-hidden />
}

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const SUBJECTS = [
  "Science",
  "Mathematics",
  "Social Studies",
  "English",
] as const

export const HOBBIES = [
  "Reading",
  "Sports",
  "Music",
  "Art",
  "Gaming",
  "Coding",
  "Science",
  "Travel",
] as const

export function mapSubjectToApi(favourite: string): string {
  const lower = favourite.toLowerCase()
  if (lower.includes("math")) return "maths"
  return "science"
}

export async function fetchProfileUser(token: string) {
  const res = await fetch(`${API}/api/profile/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const profile = await res.json()
  const stored = typeof window !== "undefined"
    ? localStorage.getItem("prepme_user")
  : null
  let onboardingComplete = false
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.onboarding_complete === true) onboardingComplete = true
    } catch { /* ignore */ }
  }
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    subject: profile.subject,
    onboarding_complete: onboardingComplete,
  }
}
