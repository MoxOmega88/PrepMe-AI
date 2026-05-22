"""Quick test to verify config loading"""
from core.config import GROQ_API_KEY, PDF_PATH, _ENV_PATH, _FILE_ENV

print(f"ENV file path: {_ENV_PATH}")
print(f"ENV file exists: {_FILE_ENV}")
print(f"GROQ_API_KEY loaded: {bool(GROQ_API_KEY)}")
if GROQ_API_KEY:
    print(f"GROQ_API_KEY length: {len(GROQ_API_KEY)}")
    print(f"GROQ_API_KEY starts with: {GROQ_API_KEY[:10]}...")
else:
    print("GROQ_API_KEY is empty!")
print(f"PDF_PATH: {PDF_PATH}")
