import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "PrepMeAI – Smart Study Companion",
  description: "AI-powered personalized study platform for NCERT Class 8",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased" style={{ backgroundColor: '#E8E3D9' }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
