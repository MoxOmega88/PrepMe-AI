"use client"

import Link from "next/link"
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
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const nav = [
  { name: "Dashboard",  href: "/", icon: LayoutDashboard },
  { name: "AI Tutor",   href: "/tutor", icon: Sparkles },
  { name: "Quiz",       href: "/quiz", icon: PenTool },
  { name: "Planner",    href: "/planner", icon: CalendarDays },
  { name: "Analytics",  href: "/analytics", icon: LineChart },
]

export function TopNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, logout } = useAuth()

  const handleLogout = () => { logout(); router.push("/login") }

  const daysLeft = profile?.days_to_exam ?? 30
  const initials = profile?.name?.slice(0, 2).toUpperCase() ?? "ST"

  return (
    <>
      {/* Pink Top Banner */}
      <div className="bg-[#FF4D6D] text-white font-mono text-[11px] font-bold text-center py-2 px-4 border-b border-[rgba(255,255,255,0.15)] flex items-center justify-center relative z-50">
        <span>PrepMeAI-4 is now live: Real-time learning with emotional intelligence. <a href="#" className="underline hover:text-[#ffe0e6] transition-colors">Learn more.</a></span>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 border border-[rgba(255,255,255,0.40)] hover:bg-[rgba(255,255,255,0.15)] transition-colors flex items-center justify-center w-5 h-5">
          <span className="text-[10px] leading-none" style={{ marginTop: '-1px' }}>✕</span>
        </button>
      </div>

      {/* Navbar Container */}
      <div className="px-4 py-3 sticky top-0 z-40 bg-transparent pointer-events-none">
        <header className="bg-[rgba(20,20,34,0.95)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] h-[52px] flex items-stretch mx-auto pointer-events-auto transition-all duration-300 hover:-translate-y-0.5"
          style={{ boxShadow: "8px 8px 0px 0px #2A2A40, inset 0 1px 0 rgba(255,255,255,0.06)", maxWidth: "1600px" }}>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 px-6 border-r border-[rgba(255,255,255,0.10)] flex-shrink-0 hover:bg-[rgba(255,255,255,0.05)] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#FF4D6D] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
            <span className="relative z-10 text-white font-serif font-black text-2xl tracking-tight group-hover:text-white transition-colors duration-300 flex items-center">
              <span className="font-mono text-lg mr-2">■</span>
              PrepMeAI
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-stretch overflow-x-auto hide-scrollbar bg-transparent">
            {nav.map(({ name, href, icon: Icon }) => {
              const active = pathname === href
              return (
                  <Link key={href} href={href}
                  className={cn("flex items-center px-6 border-r border-[rgba(255,255,255,0.08)] font-mono text-[11px] font-black uppercase tracking-widest relative overflow-hidden group",
                  active ? "text-[#FF4D6D] bg-[rgba(255,255,255,0.06)]" : "text-[#A0A0B8] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
                  )}>
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#FF4D6D] translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out z-10" />
                  {active && <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#FF4D6D] z-10" />}
                  <span className={cn("relative z-20 flex items-center transition-transform duration-200", "group-hover:-translate-y-0.5")}>
                    <Icon className={cn("w-3.5 h-3.5 mr-2", active ? "text-[#FF4D6D]" : "text-[#A0A0B8] group-hover:text-white transition-colors")} />
                    {name}
                  </span>
                </Link>
              )
            })}
          </nav>

          <div className="flex-1 border-r border-[rgba(255,255,255,0.08)] bg-transparent" />

          {/* Right cluster */}
          <div className="flex items-stretch flex-shrink-0 bg-transparent">
            {/* Exam Countdown */}
            <div className="flex items-center px-6 border-r border-[rgba(255,255,255,0.08)] gap-2 hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-default">
               <Activity className="w-3.5 h-3.5 text-[#39FF6A]" />
               <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#A0A0B8]">Exam</span>
               <span className="font-mono text-sm font-black text-[#FF4D6D]">{daysLeft}d</span>
            </div>

            {/* Profile */}
            <Link href="/profile" className="flex items-center justify-center px-8 border-r border-[rgba(255,255,255,0.08)] font-mono text-[11px] font-black uppercase tracking-widest hover:bg-[rgba(255,255,255,0.05)] transition-all text-[#A0A0B8] hover:text-white group relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[rgba(255,255,255,0.3)] translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out" />
               <span className="flex items-center group-hover:-translate-y-0.5 transition-transform duration-200">
                <User className="w-3.5 h-3.5 mr-2" />
                Profile
              </span>
            </Link>
            
            {/* Logout */}
            <button onClick={handleLogout} className="flex items-center justify-center px-8 bg-[#FF4D6D] font-mono text-[11px] font-black uppercase tracking-widest text-white group relative overflow-hidden hover:bg-[#ff3355] transition-colors" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}>
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
