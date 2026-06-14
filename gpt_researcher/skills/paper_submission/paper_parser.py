"""Paper Parser - 从文档加载器输出重建结构化论文。"""

import re
import logging
import difflib
from typing import Optional, List, Tuple

from .schemas import PaperStructure, PaperSection

logger = logging.getLogger(__name__)

# Common section heading patterns in academic papers
SECTION_PATTERNS = [
    r"^#+\s+(.+)",  # Markdown headings
    r"^(\d+\.?\s+[A-Z].+)",  # Numbered sections: "1. Introduction"
    r"^(Abstract|Introduction|Background|Related Work|Literature Review|"
    r"Methodology|Methods?|Materials?\s+and\s+Methods?|"
    r"Experimental?\s*(?:Setup|Design)?|Results?|"
    r"Discussion|Conclusion|Conclusions?|"
    r"Acknowledgm?ents?|References?|Bibliography|"
    r"Appendix|Supplementary|Funding|"
    r"Data\s+Availability|Ethics|Declarations?|"
    r"Author\s+Contributions?|Conflicts?\s+of\s+Interest)",
]


def parse_paper_from_text(raw_text: str, filename: Optional[str] = None) -> PaperStructure:
    """
    Parse raw paper text into a structured PaperStructure.
    
    Extracts title, abstract, keywords, sections with paragraph-level granularity,
    and maintains line number mapping for annotation locating.
    """
    lines = raw_text.split("\n")
    total_lines = len(lines)

    title = _extract_title(lines)
    abstract = _extract_abstract(lines)
    keywords = _extract_keywords(lines)
    sections = _extract_sections(lines)

    # Infer primary field from keywords and title
    primary_field = None
    if keywords:
        primary_field = keywords[0]  # Rough heuristic; LLM will refine

    return PaperStructure(
        title=title,
        abstract=abstract,
        keywords=keywords,
        primary_field=primary_field,
        sections=sections,
        raw_text=raw_text,
        total_lines=total_lines,
        filename=filename,
    )


def _extract_title(lines: List[str]) -> Optional[str]:
    """Extract paper title (usually first non-empty line or first heading)."""
    for line in lines[:20]:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip markdown heading markers
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
        # First substantial text line is likely the title
        if len(stripped) > 5 and not stripped.startswith(("http", "/", "\\", "---")):
            return stripped
    return None


def _extract_abstract(lines: List[str]) -> Optional[str]:
    """Extract abstract section."""
    in_abstract = False
    abstract_lines = []

    for i, line in enumerate(lines[:100]):  # Abstract usually in first 100 lines
        stripped = line.strip().lower()
        if "abstract" in stripped and (stripped.startswith("abstract") or stripped.startswith("#")):
            in_abstract = True
            # If abstract is on the same line
            after = line.strip()
            after = re.sub(r"^#+\s*", "", after)
            after = re.sub(r"^abstract[:\s]*", "", after, flags=re.IGNORECASE).strip()
            if after:
                abstract_lines.append(after)
            continue
        if in_abstract:
            if stripped == "" and abstract_lines:
                # Empty line after content = end of abstract
                break
            # Check if we hit next section
            if _is_section_heading(line):
                break
            abstract_lines.append(line.strip())

    return " ".join(abstract_lines).strip() if abstract_lines else None


def _extract_keywords(lines: List[str]) -> List[str]:
    """Extract keywords from paper."""
    for i, line in enumerate(lines[:80]):
        stripped = line.strip().lower()
        if stripped.startswith("keyword") or stripped.startswith("key word"):
            # Keywords might be on same line or next line
            kw_text = line.strip()
            kw_text = re.sub(r"^(key\s*words?)[:\s]*", "", kw_text, flags=re.IGNORECASE)
            if not kw_text and i + 1 < len(lines):
                kw_text = lines[i + 1].strip()
            # Split by comma, semicolon, or bullet
            keywords = re.split(r"[;,·•]", kw_text)
            return [kw.strip() for kw in keywords if kw.strip()]
    return []


def _is_section_heading(line: str) -> bool:
    """Check if a line is a section heading."""
    stripped = line.strip()
    if not stripped:
        return False
    for pattern in SECTION_PATTERNS:
        if re.match(pattern, stripped, re.IGNORECASE):
            return True
    return False


def _extract_sections(lines: List[str]) -> List[PaperSection]:
    """Extract sections with paragraph-level splitting."""
    sections = []
    current_section_name = "Preamble"
    current_paragraphs = []
    current_paragraph_lines = []
    section_start_line = 0

    for i, line in enumerate(lines):
        if _is_section_heading(line):
            # Save previous section
            if current_paragraph_lines:
                current_paragraphs.append("\n".join(current_paragraph_lines))
            if current_paragraphs or current_section_name != "Preamble":
                sections.append(PaperSection(
                    name=current_section_name,
                    paragraphs=current_paragraphs,
                    start_line=section_start_line,
                    end_line=i - 1,
                ))
            # Start new section
            heading = line.strip()
            heading = re.sub(r"^#+\s*", "", heading)
            heading = re.sub(r"^\d+\.?\s*", "", heading)
            current_section_name = heading.strip()
            current_paragraphs = []
            current_paragraph_lines = []
            section_start_line = i
        elif line.strip() == "":
            # Empty line = paragraph break
            if current_paragraph_lines:
                current_paragraphs.append("\n".join(current_paragraph_lines))
                current_paragraph_lines = []
        else:
            current_paragraph_lines.append(line)

    # Save last section
    if current_paragraph_lines:
        current_paragraphs.append("\n".join(current_paragraph_lines))
    if current_paragraphs:
        sections.append(PaperSection(
            name=current_section_name,
            paragraphs=current_paragraphs,
            start_line=section_start_line,
            end_line=len(lines) - 1,
        ))

    return sections


def locate_snippet(paper: PaperStructure, snippet: str, section_hint: Optional[str] = None) -> Tuple[Optional[str], Optional[int], Optional[List[int]]]:
    """
    Locate a text snippet in the paper structure.
    
    Returns (section_name, paragraph_idx, [start_line, end_line]) or (None, None, None).
    Uses difflib for fuzzy matching.
    """
    if not snippet or not snippet.strip():
        return None, None, None

    best_ratio = 0.0
    best_match = (None, None, None)
    snippet_clean = snippet.strip().lower()

    # If section hint provided, search that section first
    search_sections = paper.sections
    if section_hint:
        hint_sections = [s for s in paper.sections if section_hint.lower() in s.name.lower()]
        if hint_sections:
            search_sections = hint_sections + [s for s in paper.sections if s not in hint_sections]

    for section in search_sections:
        for para_idx, para in enumerate(section.paragraphs):
            para_clean = para.strip().lower()
            # Quick check: if snippet is a substring
            if snippet_clean in para_clean:
                # Find line range within section
                line_start = section.start_line
                for j in range(para_idx):
                    line_start += len(section.paragraphs[j].split("\n")) + 1
                line_end = line_start + len(para.split("\n")) - 1
                return section.name, para_idx, [line_start, line_end]

            # Fuzzy match
            ratio = difflib.SequenceMatcher(None, snippet_clean[:200], para_clean[:200]).ratio()
            if ratio > best_ratio and ratio > 0.5:
                best_ratio = ratio
                line_start = section.start_line
                for j in range(para_idx):
                    line_start += len(section.paragraphs[j].split("\n")) + 1
                line_end = line_start + len(para.split("\n")) - 1
                best_match = (section.name, para_idx, [line_start, line_end])

    return best_match
