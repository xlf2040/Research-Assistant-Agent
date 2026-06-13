# ── Load .env FIRST, using absolute path so it always works regardless of CWD ──
import os as _os
from pathlib import Path as _Path
from dotenv import load_dotenv as _load_dotenv

_ENV_FILE = _Path(__file__).resolve().parent / '.env'
if _ENV_FILE.exists():
    _load_dotenv(_ENV_FILE, override=True)
    import sys as _sys
    print(f"[OK] Loaded .env: {_ENV_FILE}", file=_sys.stderr)
else:
    print(f"[WARN] .env NOT FOUND at: {_ENV_FILE}", file=_sys.stderr)

# ── Ensure critical env vars ALWAYS exist, even if .env failed ──
_CRITICAL_DEFAULTS = {
    "OLLAMA_BASE_URL": "http://localhost:11434",
    "TAVILY_API_KEY": "",
    "DEEPSEEK_API_KEY": "",
}
for _key, _default in _CRITICAL_DEFAULTS.items():
    if _key not in _os.environ:
        _os.environ[_key] = _default

import logging
import sys
import io
from pathlib import Path

# Fix Windows console encoding for emoji/unicode characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Create logs directory if it doesn't exist
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        # File handler for general application logs (UTF-8)
        logging.FileHandler('logs/app.log', encoding='utf-8'),
        # Stream handler for console output
        logging.StreamHandler(stream=sys.stdout)
    ]
)

# Suppress verbose fontTools logging
logging.getLogger('fontTools').setLevel(logging.WARNING)
logging.getLogger('fontTools.subset').setLevel(logging.WARNING)
logging.getLogger('fontTools.ttLib').setLevel(logging.WARNING)

# Create logger instance
logger = logging.getLogger(__name__)

from backend.server.app import app

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
