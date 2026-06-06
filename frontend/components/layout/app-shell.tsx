"use client"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { TopNav } from "@/components/layout/topnav"
import { SubjectSwitcher } from "@/components/layout/subject-switcher"

const SUBJECT_BAR_PAGES = ["/home", "/tutor", "/quiz", "/planner", "/analytics", "/exam"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSubjectBar = SUBJECT_BAR_PAGES.includes(pathname)

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col relative">
        <TopNav />
        <main className="flex-1 w-full relative z-10">
          {showSubjectBar && <SubjectSwitcher />}
          <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
