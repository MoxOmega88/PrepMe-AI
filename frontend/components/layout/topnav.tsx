"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  LayoutDashboard,
  Sparkles,
  PenTool,
  CalendarDays,
  LineChart,
  User,
  Activity
} from "lucide-react"
import { useAuth } from "@/lib/auth"

const nav = [
  { name: "Dashboard", href: "/",          icon: LayoutDashboard },
  { name: "AI Tutor",  href: "/tutor",      icon: Sparkles },
  { name: "Quiz",      href: "/quiz",       icon: PenTool },
  { name: "Planner",   href: "/planner",    icon: CalendarDays },
  { name: "Analytics", href: "/analytics",  icon: LineChart },
]

const BriefcaseNavItem = ({
  name, href, icon: Icon
}: {
  name: string
  href: string
  icon: React.ElementType
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const active = pathname === href
  const [phase, setPhase] = useState<"idle"|"shake"|"open">("idle")
  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    if (phase !== "idle") return
    setPhase("shake")
    setTimeout(() => setPhase("open"), 300)
    setTimeout(() => {
      router.push(href)
      setTimeout(() => setPhase("idle"), 400)
    }, 700)
  }

  const accentColor = "#4A6FA5"
  const borderColor = active ? accentColor
    : hovered ? "rgba(28,31,58,0.45)"
    : "rgba(28,31,58,0.25)"

  return (
    <motion.div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={phase === "shake" ? {
        x: [0, -4, 4, -3, 3, -2, 2, 0],
        transition: { duration: 0.3, ease: "easeInOut" }
      } : {}}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 6px",
        height: "100%",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* HANDLE */}
      <motion.div
        animate={{ y: phase === "open" ? -6 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        style={{
          width: "30px",
          height: "12px",
          borderTop: `2.5px solid ${borderColor}`,
          borderLeft: `2.5px solid ${borderColor}`,
          borderRight: `2.5px solid ${borderColor}`,
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          marginBottom: "-2px",
          position: "relative",
          zIndex: 3,
          transition: "border-color 0.2s",
        }}
      />

      {/* BRIEFCASE BODY */}
      <div style={{
        position: "relative",
        width: "108px",
        borderRadius: "6px",
        border: `2.5px solid ${borderColor}`,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        transform: hovered && !active && phase === "idle" ? "translateY(-2px)" : "translateY(0)",
        boxShadow: active
          ? "0 0 0 2px #4A6FA5, 3px 3px 0 rgba(28,31,58,0.15)"
          : "2px 2px 0 #1A1A2E",
        overflow: "hidden",
      }}>

        {/* TOP LID — slides UP on open */}
        <motion.div
          animate={{ y: phase === "open" ? "-100%" : "0%" }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            height: "38px",
            background: active
              ? "linear-gradient(160deg, #c8d8f0 0%, #b8ccec 100%)"
              : "linear-gradient(160deg, #ddd7cc 0%, #d0c9be 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            borderBottom: `2px dashed ${active
              ? "rgba(74,111,165,0.7)"
              : "rgba(28,31,58,0.12)"}`,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Icon style={{
            width: 12, height: 12,
            color: active ? accentColor : "rgba(28,31,58,0.55)",
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            color: active ? accentColor : "rgba(28,31,58,0.55)",
          }}>
            {name}
          </span>
        </motion.div>

        {/* BOTTOM PANEL — slides DOWN on open */}
        <motion.div
          animate={{ y: phase === "open" ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            height: "22px",
            background: "#ccc6bc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            position: "relative",
          }}
        >
          <span style={{
            position: "absolute", left: 5, top: "50%",
            transform: "translateY(-50%)",
            width: 4, height: 4, borderRadius: "50%",
            background: "rgba(28,31,58,0.20)",
          }} />
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: active ? accentColor : "rgba(28,31,58,0.20)",
            boxShadow: active ? `0 0 6px ${accentColor}` : "none",
            transition: "all 0.2s",
          }} />
          <span style={{
            width: 18, height: 4, borderRadius: "2px",
            background: active ? "#c47c2b" : "rgba(28,31,58,0.20)",
            boxShadow: active ? "0 0 6px rgba(196,124,43,0.6)" : "none",
            transition: "all 0.2s",
          }} />
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: active ? accentColor : "rgba(28,31,58,0.20)",
            boxShadow: active ? `0 0 6px ${accentColor}` : "none",
            transition: "all 0.2s",
          }} />
          <span style={{
            position: "absolute", right: 5, top: "50%",
            transform: "translateY(-50%)",
            width: 4, height: 4, borderRadius: "50%",
            background: "rgba(28,31,58,0.20)",
          }} />
        </motion.div>

      </div>
    </motion.div>
  )
}

export function TopNav() {
  const router = useRouter()
  const { profile, logout } = useAuth()

  const handleLogout = () => { logout(); router.push("/login") }

  const daysLeft = profile?.days_to_exam ?? 30

  return (
    <>
      {/* Pink Top Banner */}
      <div className="bg-[#4A6FA5] text-white font-mono text-[11px] font-bold text-center py-2 px-4 border-b border-[rgba(28,31,58,0.15)] flex items-center justify-center relative z-50">
        <span>PrepMeAI-4 is now live: Real-time learning with emotional intelligence.{" "}
          <a href="#" className="underline hover:text-[#ffe0e6] transition-colors">Learn more.</a>
        </span>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 border border-[rgba(28,31,58,0.40)] hover:bg-[rgba(28,31,58,0.15)] transition-colors flex items-center justify-center w-5 h-5">
          <span className="text-[10px] leading-none" style={{ marginTop: "-1px" }}>✕</span>
        </button>
      </div>

      {/* Navbar */}
      <div className="px-4 py-3 sticky top-0 z-40 bg-transparent pointer-events-none">
        <header
          className="bg-[#e8e2d6] backdrop-blur-sm flex items-stretch mx-auto pointer-events-auto transition-all duration-300 hover:-translate-y-0.5"
          style={{
            height: "68px",
            borderBottom: "2px solid rgba(28,31,58,0.15)",
            boxShadow: "3px 3px 0 rgba(28,31,58,0.12)",
            maxWidth: "1600px",
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 px-6 border-r border-[rgba(28,31,58,0.10)] flex-shrink-0 hover:bg-[rgba(28,31,58,0.05)] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#4A6FA5] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
            <span className="relative z-10 text-[#1c1f3a] font-serif font-black text-2xl tracking-tight group-hover:text-[#1c1f3a] transition-colors duration-300 flex items-center">
              <span className="font-mono text-lg mr-2">■</span>
              PrepMeAI
            </span>
          </Link>

          {/* Briefcase Nav Items */}
          <nav className="flex items-center gap-2 px-4">
            {nav.map(({ name, href, icon }) => (
              <BriefcaseNavItem key={href} name={name} href={href} icon={icon} />
            ))}
          </nav>

          <div className="flex-1 border-r border-[rgba(28,31,58,0.10)]" />

          {/* Right cluster */}
          <div className="flex items-stretch flex-shrink-0">
            <div className="flex items-center px-6 border-r border-[rgba(28,31,58,0.12)] gap-2 hover:bg-[rgba(28,31,58,0.05)] transition-colors cursor-default">
              <Activity className="w-3.5 h-3.5 text-[#2a7d4f]" />
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[rgba(28,31,58,0.55)]">Exam</span>
              <span className="font-mono text-sm font-black text-[#4A6FA5]">{daysLeft}d</span>
            </div>
            <Link href="/profile" className="flex items-center justify-center px-8 border-r border-[rgba(28,31,58,0.12)] font-mono text-[11px] font-black uppercase tracking-widest hover:bg-[rgba(28,31,58,0.05)] transition-all text-[rgba(28,31,58,0.55)] hover:text-[#1c1f3a] group relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1c1f3a] translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out" />
              <span className="flex items-center group-hover:-translate-y-0.5 transition-transform duration-200">
                <User className="w-3.5 h-3.5 mr-2" />
                Profile
              </span>
            </Link>
            <button onClick={handleLogout}
              className="flex items-center justify-center px-8 bg-[#1c1f3a] font-mono text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#3d5f8f] transition-colors"
              style={{ boxShadow: "inset 0 1px 0 rgba(28,31,58,0.15)" }}>
              <span className="flex items-center group-hover:-translate-y-0.5 transition-transform duration-200">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Logout
              </span>
            </button>
          </div>
        </header>
      </div>
    </>
  )
}
