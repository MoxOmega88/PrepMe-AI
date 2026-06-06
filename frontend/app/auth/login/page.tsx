"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { saveSession, type PrepMeUser } from "../../../lib/auth.ts"
import {
  AuthSplitLayout,
  AuthToast,
  useAuthToast,
  GoogleIcon,
  PhoneIcon,
  Spinner,
  API,
  fetchProfileUser,
} from "../shared"

const PROMO_BULLETS = [
  "Adaptive quizzes grounded in your NCERT textbook",
  "AI tutor that explains concepts step by step",
  "Study planner and mastery tracking for board exams",
]

export default function LoginPage() {
  const router = useRouter()
  const { message: toastMsg, show: showToast } = useAuthToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid email or password. Please try again."
        )
      }

      const token = data.access_token as string
      let user: PrepMeUser =
        data.user && typeof data.user === "object"
          ? { ...data.user, onboarding_complete: !!data.user.onboarding_complete }
          : {}

      if (!user.email) {
        const profileUser = await fetchProfileUser(token)
        if (profileUser) user = profileUser
      }

      saveSession(token, user)

      if (user.onboarding_complete === true) {
        router.replace("/home")
      } else {
        router.replace("/onboarding")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      promoTitle="Welcome back! Ready to continue your prep?"
      promoBullets={PROMO_BULLETS}
    >
      <AuthToast message={toastMsg} />
      <div className="auth-card-wrap">
        <div className="auth-card">
          <h2>Login to PrepMe.AI</h2>

          <button
            type="button"
            className="auth-social-btn"
            onClick={() => showToast("Coming soon — use email for now")}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            className="auth-social-btn"
            onClick={() => showToast("Coming soon — use email for now")}
          >
            <PhoneIcon />
            Continue with Phone
          </button>

          <div className="auth-divider">
            <span>— or login with email —</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Email address
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="auth-label">
              Password
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="auth-forgot-row">
              <a href="#" className="auth-link-small" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="auth-btn-gold" disabled={loading}>
              {loading ? (
                <>
                  <Spinner /> Logging in…
                </>
              ) : (
                "Login"
              )}
            </button>

            {error && <p className="auth-error">{error}</p>}
          </form>

          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register">Register here →</Link>
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  )
}
