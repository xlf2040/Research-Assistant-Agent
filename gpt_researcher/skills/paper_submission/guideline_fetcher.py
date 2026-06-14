"""Journal Author Guideline Fetcher with disk caching."""

import os
import json
import time
import asyncio
import logging
from typing import Optional
from pathlib import Path

import requests

from .schemas import GuidelineDoc
from .domain_whitelist import is_allowed_url

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join("outputs", ".cache", "journals")
CACHE_TTL_SECONDS = 24 * 3600  # 24 hours
WEB_FETCH_TIMEOUT = 8  # seconds — keep short to avoid blocking the whole pipeline



class GuidelineFetcher:
    """Fetch and cache journal author guidelines."""

    def __init__(self):
        os.makedirs(CACHE_DIR, exist_ok=True)

    async def fetch(self, journal_name: str, issn: Optional[str], homepage: Optional[str]) -> GuidelineDoc:
        """
        Fetch author guidelines for a journal.
        
        Strategy:
        1. Check disk cache (24h TTL)
        2. Try to fetch from journal homepage (non-blocking via thread)
        3. Fallback to constructing from available metadata
        """
        cache_key = issn or journal_name.lower().replace(" ", "_")
        cached = self._load_cache(cache_key)
        if cached:
            logger.info(f"Using cached guideline for {journal_name}")
            return cached

        # Try fetching from homepage (run in thread to avoid blocking)
        raw_text = ""
        if homepage and is_allowed_url(homepage):
            logger.info(f"Fetching guideline from homepage: {homepage}")
            try:
                raw_text = await asyncio.to_thread(self._fetch_webpage, homepage)
            except Exception as e:
                logger.warning(f"Homepage fetch error for {journal_name}: {e}")

        # If no content from homepage, create a placeholder
        if not raw_text:
            logger.info(f"No guidelines fetched for {journal_name}, using LLM knowledge base")
            raw_text = f"[No author guidelines fetched for {journal_name}. Using LLM knowledge base for recommendations.]"

        guideline = GuidelineDoc(
            journal_name=journal_name,
            issn=issn,
            homepage=homepage,
            raw_text=raw_text,
            sections=self._parse_guideline_sections(raw_text),
            fetched_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

        self._save_cache(cache_key, guideline)
        return guideline

    def _fetch_webpage(self, url: str) -> str:
        """Fetch webpage content as text (with SSRF protection)."""
        if not is_allowed_url(url):
            logger.warning(f"URL blocked by whitelist: {url}")
            return ""

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; GPTResearcher/1.0; Academic Research)"
            }
            resp = requests.get(url, headers=headers, timeout=WEB_FETCH_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()

            # Basic HTML to text extraction
            content = resp.text
            # Remove script and style tags
            import re
            content = re.sub(r"<script[^>]*>.*?</script>", "", content, flags=re.DOTALL)
            content = re.sub(r"<style[^>]*>.*?</style>", "", content, flags=re.DOTALL)
            # Remove HTML tags
            content = re.sub(r"<[^>]+>", " ", content)
            # Clean whitespace
            content = re.sub(r"\s+", " ", content).strip()

            # Limit content length
            if len(content) > 30000:
                content = content[:30000]

            return content
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch guideline from {url}: {e}")
            return ""

    def _parse_guideline_sections(self, text: str) -> dict:
        """Parse guideline text into rough sections."""
        sections = {}
        # Common guideline section markers
        markers = [
            "manuscript format", "submission", "word limit", "page limit",
            "references", "citation", "figures", "tables", "abstract",
            "cover letter", "peer review", "ethics", "open access",
            "author guidelines", "formatting", "style",
        ]
        # Simple extraction: just return the full text under a general key
        if text and not text.startswith("[No author"):
            sections["full_guidelines"] = text
        return sections

    def _load_cache(self, key: str) -> Optional[GuidelineDoc]:
        """Load cached guideline if fresh."""
        cache_path = os.path.join(CACHE_DIR, f"{key}.json")
        if not os.path.exists(cache_path):
            return None

        try:
            # Check age
            mtime = os.path.getmtime(cache_path)
            if time.time() - mtime > CACHE_TTL_SECONDS:
                os.remove(cache_path)
                return None

            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return GuidelineDoc(**data)
        except (json.JSONDecodeError, OSError, ValueError) as e:
            logger.warning(f"Cache read error for {key}: {e}")
            return None

    def _save_cache(self, key: str, guideline: GuidelineDoc):
        """Save guideline to disk cache."""
        cache_path = os.path.join(CACHE_DIR, f"{key}.json")
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(guideline.model_dump(), f, ensure_ascii=False, indent=2)
        except OSError as e:
            logger.warning(f"Cache write error for {key}: {e}")
