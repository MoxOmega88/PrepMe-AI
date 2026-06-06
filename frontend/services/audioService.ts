const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


// Minimum audio blob size (bytes) to avoid sending empty/corrupt recordings.
const MIN_AUDIO_BLOB_BYTES = 100;

export async function transcribeBlob(
  blob: Blob,
  timeoutMs = 60000
): Promise<string> {
  // Guard: reject obviously empty or corrupt recordings
  if (!blob || blob.size < MIN_AUDIO_BLOB_BYTES) {
    console.warn(
      `[audio] Blob too small (${blob?.size ?? 0} bytes), skipping transcription`
    );
    throw new Error(
      "Recording too short or empty. Please try again and speak clearly."
    );
  }

  console.log(
    `[audio] transcribeBlob: size=${blob.size} type=${blob.type} timeout=${timeoutMs}ms`
  );

  const fd = new FormData();

  fd.append("file", blob, "recording.webm");

  const ctrl = new AbortController();

  const id = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const resp = await fetch(
      `${API_BASE}/api/audio/transcribe`,
      {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      }
    );

    if (!resp.ok) {
      let errorMessage = "Transcription failed";

      try {
        const contentType = resp.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const err = await resp.json();
          errorMessage = err?.detail || JSON.stringify(err);
        } else {
          errorMessage = `HTTP ${resp.status}`;
        }
      } catch (_) {}

      console.error(`[audio] transcribeBlob failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await resp.json();

    console.log(
      `[audio] transcribeBlob success: ${(data?.transcript || "").length} chars`
    );

    return data?.transcript || "";
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(`[audio] transcribeBlob timed out after ${timeoutMs}ms`);
      throw new Error("Transcription timed out");
    }

    throw err;
  } finally {
    clearTimeout(id);
  }
}

let _currentUtterance: SpeechSynthesisUtterance | null = null
export function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    _currentUtterance = new SpeechSynthesisUtterance(text)
    _currentUtterance.onend = () => { _currentUtterance = null }
    _currentUtterance.onerror = () => { _currentUtterance = null }
    window.speechSynthesis.speak(_currentUtterance)
  } catch (e) {
    // swallow to avoid UI crashes
    _currentUtterance = null
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch (e) {}
  _currentUtterance = null
}

// Lightweight Recorder utility to centralize MediaRecorder handling
export type RecorderState = "idle" | "recording" | "stopped" | "error"

export class Recorder {
  mediaRecorder: MediaRecorder | null = null
  stream: MediaStream | null = null
  chunks: Blob[] = []
  state: RecorderState = "idle"

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.state = "error"
      throw new Error("Browser does not support getUserMedia")
    }
    if (this.state === "recording") return
    this.chunks = []
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(this.stream)
      this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data) }
      this.mediaRecorder.start()
      this.state = "recording"
    } catch (e) {
      this.state = "error"
      this.cleanup()
      throw e
    }
  }

  async stop(): Promise<Blob> {
    if (this.state !== "recording" || !this.mediaRecorder) {
      throw new Error("Not recording")
    }
    return await new Promise<Blob>((resolve, reject) => {
      const mr = this.mediaRecorder!
      const onStop = () => {
        try {
          const blob = new Blob(this.chunks, { type: "audio/webm" })
          this.state = "stopped"
          this.cleanup()
          resolve(blob)
        } catch (err) { reject(err) }
      }
      mr.onstop = onStop
      try {
        mr.stop()
      } catch (e) {
        reject(e)
      }
    })
  }

  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try { this.mediaRecorder.stop() } catch (e) {}
    }
    this.state = "idle"
    this.cleanup()
  }

  cleanup() {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop())
      }
    } catch (e) {}
    this.mediaRecorder = null
    this.stream = null
    this.chunks = []
  }
}
