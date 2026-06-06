"use client"
import React, { useEffect, useRef, useState } from "react"
import { Recorder, transcribeBlob } from "@/services/audioService"

type Props = {
  onTranscribed?: (text: string) => void
  maxDurationSec?: number
}

type State = "idle" | "recording" | "uploading" | "transcribing" | "completed" | "error"

export default function AudioRecorder({ onTranscribed, maxDurationSec = 45 }: Props) {
  const [state, setState] = useState<State>("idle")
  const [error, setError] = useState<string | null>(null)
  // Guard against rapid double-clicks during async transitions
  const [busy, setBusy] = useState(false)
  const recorderRef = useRef<Recorder | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      recorderRef.current?.cancel()
    }
  }, [])

  const start = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    console.log("[AudioRecorder] start: requesting microphone")
    const r = new Recorder()
    recorderRef.current = r
    try {
      await r.start()
      setState("recording")
      console.log("[AudioRecorder] recording started")
      // limit duration
      timeoutRef.current = window.setTimeout(() => {
        console.log(`[AudioRecorder] max duration (${maxDurationSec}s) reached, auto-stopping`)
        stop()
      }, maxDurationSec * 1000)
    } catch (e: any) {
      console.error("[AudioRecorder] start failed:", e?.message || e)
      setError(String(e?.message || e))
      setState("error")
      r.cleanup()
      recorderRef.current = null
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    const r = recorderRef.current
    if (!r || busy) return
    setBusy(true)
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setState("uploading")
    console.log("[AudioRecorder] stop: processing recording")
    try {
      const blob = await r.stop()
      console.log(`[AudioRecorder] blob created: size=${blob.size} type=${blob.type}`)
      setState("transcribing")
      try {
        const text = await transcribeBlob(blob, 60000)
        console.log(`[AudioRecorder] transcription received: ${text.length} chars`)
        onTranscribed?.(text)
        setState("completed")
      } catch (e: any) {
        console.error("[AudioRecorder] transcription failed:", e?.message || e)
        setError(String(e?.message || e))
        setState("error")
      }
    } catch (e: any) {
      console.error("[AudioRecorder] stop/blob failed:", e?.message || e)
      setError(String(e?.message || e))
      setState("error")
    } finally {
      r.cleanup()
      recorderRef.current = null
      setBusy(false)
    }
  }

  const rerecord = async () => {
    if (busy) return
    // cancel any existing and start fresh
    try { recorderRef.current?.cancel() } catch (e) {}
    setState("idle")
    setError(null)
    await start()
  }

  const actionDisabled = busy || state === "uploading" || state === "transcribing"

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => (state === "recording" ? stop() : start())}
        className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={actionDisabled}
      >
        {state === "recording" ? "Stop" : "Record"}
      </button>
      <button onClick={rerecord} className="px-2 py-1 rounded bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={state === "recording" || actionDisabled}>
        Re-record
      </button>
      <div>
        {state === "uploading" && <span className="text-sm">Uploading...</span>}
        {state === "transcribing" && <span className="text-sm">Transcribing...</span>}
        {state === "completed" && <span className="text-sm text-green-600">Done</span>}
        {state === "error" && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

