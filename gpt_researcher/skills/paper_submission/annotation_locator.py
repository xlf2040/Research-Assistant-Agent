"""Annotation Locator - refine Finding positions using fuzzy matching."""

import logging
from typing import List

from .schemas import Finding, PaperStructure
from .paper_parser import locate_snippet

logger = logging.getLogger(__name__)


def refine_annotations(findings: List[Finding], paper: PaperStructure) -> List[Finding]:
    """
    Post-process findings to ensure all have accurate location info.
    Uses fuzzy matching to verify/correct snippet positions.
    """
    refined = []
    for f in findings:
        if f.snippet and (not f.line_range or not f.section):
            # Try to locate the snippet more precisely
            section, para_idx, line_range = locate_snippet(
                paper, f.snippet, section_hint=f.section
            )
            refined.append(Finding(
                dimension=f.dimension,
                severity=f.severity,
                section=section or f.section,
                paragraph_idx=para_idx if para_idx is not None else f.paragraph_idx,
                line_range=line_range or f.line_range,
                snippet=f.snippet,
                issue=f.issue,
                suggestion=f.suggestion,
            ))
        else:
            refined.append(f)

    return refined
