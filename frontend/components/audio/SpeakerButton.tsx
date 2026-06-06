"use client"
import React, { useState } from "react"


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
      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
    >
      {speaking ? "■" : "🔊"}
    </button>
  )
}
