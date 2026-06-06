"use client"
import React, { useEffect, useRef, useState } from "react"
import { Recorder, transcribeBlob } from "@/services/audioService"
import { Loader2, Mic, MicOff, RotateCcw } from "lucide-react"

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
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => (state === "recording" ? stop() : start())}
        aria-label={state === "recording" ? "Stop recording" : "Record audio"}
        title={state === "recording" ? "Stop recording" : "Record audio"}
        className="inline-flex h-9 w-9 items-center justify-center rounded border border-[rgba(28,31,58,0.18)] bg-red-100 text-[#1c1f3a] hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={actionDisabled}
      >
        {state === "recording" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
      <button
        onClick={rerecord}
        aria-label="Re-record"
        title="Re-record"
        className="inline-flex h-9 w-9 items-center justify-center rounded border border-[rgba(28,31,58,0.18)] bg-yellow-100 text-[#1c1f3a] hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state === "recording" || actionDisabled}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="min-w-0 text-sm">
        {state === "uploading" && <span className="inline-flex items-center gap-1 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</span>}
        {state === "transcribing" && <span className="inline-flex items-center gap-1 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Transcribing...</span>}
        {state === "completed" && <span className="text-sm text-green-600">Done</span>}
        {state === "error" && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

