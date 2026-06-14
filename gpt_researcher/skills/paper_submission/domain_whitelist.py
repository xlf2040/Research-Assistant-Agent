"""Domain whitelist for SSRF protection when fetching journal guidelines."""

import ipaddress
import socket
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Allowed academic domains for fetching journal guidelines
ALLOWED_DOMAINS = {
    "openalex.org",
    "api.openalex.org",
    "api.crossref.org",
    "crossref.org",
    "doaj.org",
    "www.doaj.org",
    "scimagojr.com",
    "www.scimagojr.com",
    # Major publishers
    "springer.com",
    "link.springer.com",
    "elsevier.com",
    "www.elsevier.com",
    "sciencedirect.com",
    "www.sciencedirect.com",
    "wiley.com",
    "onlinelibrary.wiley.com",
    "nature.com",
    "www.nature.com",
    "mdpi.com",
    "www.mdpi.com",
    "ieee.org",
    "ieeexplore.ieee.org",
    "acm.org",
    "dl.acm.org",
    "tandfonline.com",
    "www.tandfonline.com",
    "sagepub.com",
    "journals.sagepub.com",
    "oup.com",
    "academic.oup.com",
    "frontiersin.org",
    "www.frontiersin.org",
    "plos.org",
    "journals.plos.org",
    "cell.com",
    "www.cell.com",
    "science.org",
    "www.science.org",
    "acs.org",
    "pubs.acs.org",
    "rsc.org",
    "pubs.rsc.org",
    "taylor",
}

# Blocked private/internal IP ranges
BLOCKED_IP_PREFIXES = [
    "9.", "10.", "11.", "21.", "30.",
    "127.", "169.254.",
    "192.168.",
]


def _is_private_ip(ip_str: str) -> bool:
    """Check if an IP address is in a blocked private range."""
    for prefix in BLOCKED_IP_PREFIXES:
        if ip_str.startswith(prefix):
            return True
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return True
        # Check 172.16.0.0/12
        if ipaddress.ip_address("172.16.0.0") <= ip <= ipaddress.ip_address("172.31.255.255"):
            return True
    except ValueError:
        return True
    return False


def _domain_matches_whitelist(domain: str) -> bool:
    """Check if domain is in whitelist (supports subdomain matching)."""
    domain = domain.lower().strip(".")
    for allowed in ALLOWED_DOMAINS:
        if domain == allowed or domain.endswith("." + allowed):
            return True
    return False


# DNS resolution timeout (seconds) — keep it short to avoid blocking
_DNS_TIMEOUT = 3

# Domains we never need to DNS-check (well-known public APIs, fast-path)
_SKIP_DNS_DOMAINS = {
    "openalex.org", "api.openalex.org",
    "crossref.org", "api.crossref.org",
}


def _resolve_hostname(hostname: str, timeout: float = _DNS_TIMEOUT) -> str | None:
    """Resolve hostname with timeout, returns IP string or None on failure."""
    import threading

    result = {}

    def _resolve():
        try:
            result["ip"] = socket.gethostbyname(hostname)
        except Exception:
            result["error"] = True

    t = threading.Thread(target=_resolve, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        logger.warning(f"DNS resolution timed out ({timeout}s) for: {hostname}")
        return None
    if "error" in result:
        return None
    return result.get("ip")


def is_allowed_url(url: str) -> bool:
    """
    Validate whether a URL is safe to fetch (SSRF protection).
    
    Returns True only if:
    1. URL uses http/https scheme
    2. Domain is in the academic whitelist
    3. Resolved IP is not in blocked private ranges (best-effort, with timeout)
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            logger.warning(f"Blocked non-HTTP scheme: {parsed.scheme}")
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # Check domain whitelist
        if not _domain_matches_whitelist(hostname):
            logger.warning(f"Domain not in whitelist: {hostname}")
            return False

        # Fast-path: skip DNS for known public API domains
        if hostname.lower().strip(".") in _SKIP_DNS_DOMAINS:
            return True

        # Resolve and check IP (with timeout to avoid blocking)
        try:
            ip = _resolve_hostname(hostname)
            if ip and _is_private_ip(ip):
                logger.warning(f"Blocked private IP {ip} for domain {hostname}")
                return False
            # DNS timeout/failure is acceptable if domain is whitelisted
        except Exception:
            # DNS resolution soft-fail — allow if domain is whitelisted
            pass

        return True
    except Exception as e:
        logger.warning(f"URL validation error: {e}")
        return False
