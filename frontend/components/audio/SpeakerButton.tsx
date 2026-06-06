"use client"
import React, { useState } from "react"
import { Square, Volume2 } from "lucide-react"


type Props = {
  text: string
  disabled?: boolean
}


export default function SpeakerButton({ text, disabled }: Props) {
  const [speaking, setSpeaking] = useState(false)


  const speak = () => {
    if (disabled) return
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const uttr = new SpeechSynthesisUtterance(text)
    uttr.onend = () => setSpeaking(false)
    uttr.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(uttr)
  }

  const stop = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return (
    <button
      aria-label={speaking ? "Stop audio" : "Play audio"}
      onClick={() => (speaking ? stop() : speak())}
      disabled={disabled}
      title={speaking ? "Stop audio" : "Play audio"}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[rgba(28,31,58,0.18)] bg-slate-100 text-[#1c1f3a] hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  )
}
