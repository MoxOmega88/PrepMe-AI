"use client"

import { useEffect, useState } from "react"

// Fixed positions for the 12 background icon slots — mirrors the existing layout
const POSITIONS = [
  { top: "6%",  left: "3%",  size: 40, rotate: -15 },
  { top: "14%", left: "91%", size: 36, rotate: 12 },
  { top: "28%", left: "7%",  size: 32, rotate: 8 },
  { top: "38%", left: "88%", size: 44, rotate: -8 },
  { top: "52%", left: "2%",  size: 38, rotate: 20 },
  { top: "60%", left: "93%", size: 34, rotate: -18 },
  { top: "72%", left: "5%",  size: 42, rotate: 5 },
  { top: "80%", left: "89%", size: 36, rotate: -10 },
  { top: "88%", left: "10%", size: 30, rotate: 15 },
  { top: "20%", left: "50%", size: 28, rotate: -5 },
  { top: "45%", left: "45%", size: 32, rotate: 10 },
  { top: "70%", left: "55%", size: 26, rotate: -12 },
]

// ── Icon path sets per subject ──────────────────────────────────────────────

const SCIENCE_ICONS = [
  // Atom
  <svg key="atom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>,
  // Flask
  <svg key="flask" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3h6M9 3v7L5 20h14L15 10V3" /><path d="M6 17h12" /></svg>,
  // Microscope
  <svg key="micro" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 18h12M10 18v-3M10 3v12M14 3v4M8 3h8M6 14a4 4 0 0 1 4-4" /></svg>,
  // DNA helix
  <svg key="dna" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3c4 2 10 2 14 4S5 13 5 13M19 21c-4-2-10-2-14-4s14-6 14-6" /><line x1="8" y1="5.5" x2="16" y2="8.5" /><line x1="8" y1="15.5" x2="16" y2="12.5" /></svg>,
  // Magnet
  <svg key="magnet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3v8a6 6 0 0 0 12 0V3" /><line x1="6" y1="3" x2="6" y2="8" /><line x1="18" y1="3" x2="18" y2="8" /></svg>,
  // Test tube
  <svg key="tube" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3l8 0M9 3v13a3 3 0 0 0 6 0V3" /></svg>,
  ...Array(6).fill(null).map((_, i) => (
    <svg key={`s${i}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="2" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /></svg>
  )),
]

const MATHS_ICONS = [
  // Pi
  <svg key="pi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="7" x2="20" y2="7" /><path d="M9 7v10M15 7v4a3 3 0 0 0 3 3" /></svg>,
  // Sigma
  <svg key="sigma" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 4H6l6 8-6 8h12" /></svg>,
  // Calculator
  <svg key="calc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2" /><rect x="7" y="5" width="10" height="4" rx="1" /><circle cx="8" cy="13" r="1" fill="currentColor" /><circle cx="12" cy="13" r="1" fill="currentColor" /><circle cx="16" cy="13" r="1" fill="currentColor" /><circle cx="8" cy="17" r="1" fill="currentColor" /><circle cx="12" cy="17" r="1" fill="currentColor" /><circle cx="16" cy="17" r="1" fill="currentColor" /></svg>,
  // Ruler
  <svg key="ruler" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="8" width="20" height="8" rx="1" transform="rotate(-45 2 8)" /><line x1="9" y1="9" x2="9" y2="12" /><line x1="13" y1="5" x2="13" y2="8" /><line x1="17" y1="9" x2="17" y2="12" /></svg>,
  // Compass
  <svg key="compass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
  // Triangle (geometric)
  <svg key="tri" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,3 22,21 2,21" /></svg>,
  ...Array(6).fill(null).map((_, i) => (
    <svg key={`m${i}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
  )),
]

const SOCIAL_ICONS = [
  // Globe
  <svg key="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>,
  // Book
  <svg key="book" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
  // Map
  <svg key="map" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
  // Compass rose
  <svg key="comprose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polygon points="12,3 14,12 12,21 10,12" fill="currentColor" opacity="0.3" /><polygon points="3,12 12,10 21,12 12,14" fill="currentColor" opacity="0.3" /></svg>,
  // Monument
  <svg key="monument" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2 L18 8 L18 22 L6 22 L6 8 Z" /><line x1="6" y1="22" x2="18" y2="22" /><line x1="9" y1="12" x2="15" y2="12" /></svg>,
  // Flag
  <svg key="flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
  ...Array(6).fill(null).map((_, i) => (
    <svg key={`ss${i}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /></svg>
  )),
]

const ENGLISH_ICONS = [
  // Open book
  <svg key="openbook" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  // Quote marks
  <svg key="quote" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c0-2.5 1.5-4.5 3-6L4 9h6l-1 6c0 2-1.5 4-3 6H3zm12 0c0-2.5 1.5-4.5 3-6L16 9h6l-1 6c0 2-1.5 4-3 6h-3z" opacity="0.6" /></svg>,
  // Quill pen
  <svg key="quill" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 2c0 0-8 2-12 12l4 4c2-3 4-6 8-8" /><path d="M9 17l-5 5M13 11l2 2" /></svg>,
  // Letter A
  <svg key="letterA" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20L12 4L20 20M7 14h10" /></svg>,
  // Letter B
  <svg key="letterB" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" /></svg>,
  // Letter C
  <svg key="letterC" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7A9 9 0 1 0 20 17" /></svg>,
  ...Array(6).fill(null).map((_, i) => (
    <svg key={`en${i}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 10h16M4 14h8" /></svg>
  )),
]

const SUBJECT_ICONS: Record<string, typeof SCIENCE_ICONS> = {
  Science: SCIENCE_ICONS,
  Mathematics: MATHS_ICONS,
  "Social Studies": SOCIAL_ICONS,
  English: ENGLISH_ICONS,
}

export default function SubjectBackground() {
  const [subject, setSubject] = useState("Science")

  useEffect(() => {
    const stored = localStorage.getItem("active_subject") || "Science"
    setSubject(stored)

    function onStorage(e: StorageEvent) {
      if (e.key === "active_subject" && e.newValue) setSubject(e.newValue)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const icons = SUBJECT_ICONS[subject] ?? SCIENCE_ICONS

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {POSITIONS.map((pos, i) => {
        const icon = icons[i % icons.length]
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              width: pos.size,
              height: pos.size,
              transform: `rotate(${pos.rotate}deg)`,
              opacity: 0.06,
              color: "#1c1f3a",
            }}
          >
            {icon}
          </div>
        )
      })}
    </div>
  )
}
