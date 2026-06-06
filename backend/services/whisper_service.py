"""
Whisper transcription service.
Forwards audio bytes to a remote Whisper/WhisperX endpoint and returns the transcript.
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

# Timeout for the Whisper HTTP call (seconds).
# Checks WHISPER_TIMEOUT first, then legacy WHISPERX_TIMEOUT, default 60s.
WHISPER_TIMEOUT = int(
    os.getenv("WHISPER_TIMEOUT", os.getenv("WHISPERX_TIMEOUT", "60"))
)


class WhisperServiceError(Exception):
    """Raised when the Whisper transcription service fails."""
    pass


def _resolve_whisper_url() -> str | None:
    """Return the configured Whisper endpoint URL, checking multiple env var names."""
    return (
        os.getenv("WHISPER_API_URL")
        or os.getenv("WHISPERX_API_URL")   # legacy name used in some .env files
        or os.getenv("WHISPERX_URL")       # another legacy variant
    )


def transcribe_audio_file(
    file_bytes: bytes,
    filename: str = "recording.webm"
) -> str:
    """Send audio bytes to the Whisper service and return the transcript string.

    Raises WhisperServiceError on any failure.
    """
    whisper_url = _resolve_whisper_url()
    if not whisper_url:
        raise WhisperServiceError(
            "Whisper endpoint not configured. "
            "Set WHISPER_API_URL in your .env file."
        )

    logger.debug("Whisper URL: %s | file: %s | size: %d bytes", whisper_url, filename, len(file_bytes))

    files = {
        "audio": (
        filename,
        file_bytes,
        "audio/webm"
    )
    }

    try:
        with httpx.Client(timeout=WHISPER_TIMEOUT) as client:
            resp = client.post(whisper_url, files=files)
    except httpx.TimeoutException as e:
        raise WhisperServiceError(f"Whisper service timed out after {WHISPER_TIMEOUT}s: {e}")
    except httpx.RequestError as e:
        raise WhisperServiceError(
            f"Failed to reach Whisper service at {whisper_url}. "
            f"Check that the Colab notebook is running and the ngrok URL "
            f"in WHISPER_API_URL / WHISPERX_API_URL is current. Detail: {e}"
        )

    logger.debug("Whisper response: status=%d body=%s", resp.status_code, resp.text[:300])

    if resp.status_code != 200:
        raise WhisperServiceError(
            f"Whisper service returned HTTP {resp.status_code}: {resp.text[:200]}"
        )

    try:
        data = resp.json()
    except Exception:
        raise WhisperServiceError(
            f"Whisper returned non-JSON response: {resp.text[:200]}"
        )

    # Support both {"transcript": "..."} and {"text": "..."} response shapes
    transcript = data.get("transcript") or data.get("text")
    if not transcript:
        raise WhisperServiceError(
            f"Unexpected Whisper response shape (no 'transcript' or 'text' key): {data}"
        )

    return transcript.strip()