"""
core/config.py
Centralised configuration loader.
Reads from:  .env  →  environment variables  →  st.secrets (Streamlit Cloud).
"""
import os
import streamlit as st


def _load_env_file(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    env = {}
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key   = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                env[key] = value
    return env


def _secret(key: str) -> str:
    try:
        return str(st.secrets[key])
    except Exception:
        return ""


def _get_env_path():
    """Get the .env file path"""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


def get(key: str, default: str = "") -> str:
    """Return the value for *key*, checking env file → OS env → Streamlit secrets."""
    # Load fresh each time to avoid Streamlit caching issues
    env_path = _get_env_path()
    file_env = _load_env_file(env_path)
    
    return (
        file_env.get(key)
        or os.getenv(key)
        or _secret(key)
        or default
    )


# ── Convenience constants (loaded dynamically) ─────────────────────────────────
@st.cache_data(ttl=None)
def _load_config():
    """Load config once per session"""
    return {
        "GROQ_API_KEY":       get("GROQ_API_KEY"),
        "OPENAI_API_KEY":     get("OPENAI_API_KEY"),
        "COLAB_WHISPER_URL":  get("COLAB_WHISPER_URL"),
        "CHROMA_PERSIST_DIR": get("CHROMA_PERSIST_DIR", "./data/chroma_db"),
        "PDF_PATH":           get("PDF_PATH", "ncert_science_8.pdf"),
        "GROQ_MODEL_PRIMARY": get("GROQ_MODEL_PRIMARY", "llama-3.3-70b-versatile"),
        "GROQ_MODEL_FALLBACK": get("GROQ_MODEL_FALLBACK", "llama3-70b-8192"),
        "EMBED_MODEL":        get("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
    }

# Load config
_config = _load_config()

GROQ_API_KEY       = _config["GROQ_API_KEY"]
OPENAI_API_KEY     = _config["OPENAI_API_KEY"]
COLAB_WHISPER_URL  = _config["COLAB_WHISPER_URL"]
CHROMA_PERSIST_DIR = _config["CHROMA_PERSIST_DIR"]
PDF_PATH           = _config["PDF_PATH"]
GROQ_MODEL_PRIMARY = _config["GROQ_MODEL_PRIMARY"]
GROQ_MODEL_FALLBACK = _config["GROQ_MODEL_FALLBACK"]
EMBED_MODEL        = _config["EMBED_MODEL"]
