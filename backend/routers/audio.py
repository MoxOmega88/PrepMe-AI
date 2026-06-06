"""
Audio transcription router.
Receives uploaded audio, validates it, and forwards to the Whisper service.
"""
import logging
import os

from fastapi import APIRouter, UploadFile, File, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from services.whisper_service import transcribe_audio_file, WhisperServiceError

logger = logging.getLogger(__name__)

router = APIRouter()

# Max upload size (bytes). Default 10 MB, configurable via env.
MAX_AUDIO_BYTES = int(os.getenv("AUDIO_MAX_BYTES", str(10 * 1024 * 1024)))


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Receive an audio file and return the transcribed text.

    Returns JSON: {"transcript": "..."}
    """
    try:
        contents = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded file: %s", e)
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded audio file."
        )

    # --- Input validation ---
    if not contents:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="Empty audio file."
        )

    if len(contents) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Audio file too large ({len(contents)} bytes). Maximum is {MAX_AUDIO_BYTES} bytes."
        )

    logger.debug(
        "Audio upload: filename=%s content_type=%s size=%d",
        file.filename, file.content_type, len(contents)
    )

    # --- Forward to Whisper ---
    try:
        transcript = transcribe_audio_file(
            contents,
            file.filename or "recording.webm"
        )
    except WhisperServiceError as e:
        logger.warning("Whisper transcription failed: %s", e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Unexpected error during transcription")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed unexpectedly."
        )

    return {"transcript": transcript}