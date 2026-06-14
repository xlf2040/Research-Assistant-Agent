"""Lightweight Crossref API client for journal metadata retrieval."""

import os
import logging
from typing import Optional, Dict, List

import requests

from .domain_whitelist import is_allowed_url

logger = logging.getLogger(__name__)

CROSSREF_BASE = "https://api.crossref.org"
CROSSREF_TIMEOUT = 15  # seconds


class CrossrefClient:
    """Minimal Crossref API wrapper for journal discovery."""

    def __init__(self):
        self.base_url = CROSSREF_BASE
        self.headers = {
            "User-Agent": "GPTResearcher-PaperSubmission/1.0 "
                          f"(mailto:{os.environ.get('CROSSREF_MAILTO', 'research@example.com')})"
        }

    def search_journals(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Search journals by query string.
        Returns list of journal metadata dicts.
        """
        url = f"{self.base_url}/journals"
        if not is_allowed_url(url):
            logger.warning("Crossref URL blocked by whitelist")
            return []

        params = {
            "query": query,
            "rows": min(max_results, 25),
        }

        try:
            resp = requests.get(
                url, params=params, headers=self.headers, timeout=CROSSREF_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get("message", {}).get("items", [])
            return [self._normalize_journal(item) for item in items]
        except requests.RequestException as e:
            logger.warning(f"Crossref search failed: {e}")
            return []

    def get_journal_by_issn(self, issn: str) -> Optional[Dict]:
        """Get journal details by ISSN."""
        url = f"{self.base_url}/journals/{issn}"
        if not is_allowed_url(url):
            return None

        try:
            resp = requests.get(
                url, headers=self.headers, timeout=CROSSREF_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            return self._normalize_journal(data.get("message", {}))
        except requests.RequestException as e:
            logger.warning(f"Crossref ISSN lookup failed for {issn}: {e}")
            return None

    def _normalize_journal(self, item: Dict) -> Dict:
        """Normalize Crossref journal response to standard format."""
        issn_list = item.get("ISSN", [])
        return {
            "title": item.get("title", "Unknown"),
            "issn": issn_list[0] if issn_list else None,
            "publisher": item.get("publisher", None),
            "subjects": item.get("subjects", []),
            "homepage": item.get("URL", None),
            "is_open_access": False,  # Crossref doesn't reliably provide this
            "counts": item.get("counts", {}),
        }
