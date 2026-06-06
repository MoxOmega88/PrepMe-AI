import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { SubjectThemeProvider } from "@/context/ThemeContext"
import SubjectBackground from "@/components/SubjectBackground"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "PrepMeAI – Smart Study Companion",
  description: "AI-powered personalized study platform for NCERT Class 8",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased" style={{ backgroundColor: '#E8E3D9' }}>
        <SubjectThemeProvider>
          <SubjectBackground />
          <AuthProvider>{children}</AuthProvider>
        </SubjectThemeProvider>
      </body>
    </html>
  )
}
