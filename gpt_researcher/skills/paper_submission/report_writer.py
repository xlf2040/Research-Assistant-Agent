"""Report Writer - render Findings into Markdown report and annotations JSON."""

import json
import os
import logging
from typing import List, Dict
from datetime import datetime

from .schemas import Finding, Annotation, JournalCandidate, PaperStructure

logger = logging.getLogger(__name__)

# Dimension display names
DIMENSION_NAMES = {
    "format": "格式规范 (Format Compliance)",
    "title_abstract": "标题与摘要 (Title & Abstract)",
    "keywords": "关键词 (Keywords)",
    "introduction": "引言质量 (Introduction)",
    "methodology": "方法可复现性 (Methodology)",
    "results_discussion": "结果与讨论 (Results & Discussion)",
    "figures_tables": "图表规范 (Figures & Tables)",
    "citations": "文献引用 (Citations)",
    "grammar_spelling": "语法拼写 (Grammar & Spelling)",
    "terminology": "专业术语 (Terminology)",
    "consistency": "用词一致性 (Consistency)",
    "logical_coherence": "逻辑连贯性 (Logical Coherence)",
    "declarations": "必备声明 (Declarations)",
    "author_format": "作者署名 (Author Format)",
    "anonymization": "匿名化检查 (Anonymization)",
    "cover_letter": "投稿信建议 (Cover Letter)",
}

SEVERITY_ICONS = {
    "critical": "🔴",
    "major": "🟠",
    "minor": "🔵",
}


def render_markdown_report(
    findings: List[Finding],
    paper: PaperStructure,
    journal: JournalCandidate,
) -> str:
    """Render findings into a structured Markdown report."""
    lines = []
    lines.append(f"# 论文投稿修改报告")
    lines.append(f"")
    lines.append(f"**论文标题**: {paper.title or '未知'}")
    lines.append(f"**目标期刊**: {journal.name}")
    lines.append(f"**影响因子**: {journal.impact_factor or 'N/A'}")
    lines.append(f"**匹配度**: {journal.match_score}/100")
    lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"")

    # Summary statistics
    stats = _compute_stats(findings)
    lines.append(f"## 修改摘要")
    lines.append(f"")
    lines.append(f"| 严重程度 | 数量 |")
    lines.append(f"|---------|------|")
    lines.append(f"| 🔴 Critical | {stats['critical']} |")
    lines.append(f"| 🟠 Major | {stats['major']} |")
    lines.append(f"| 🔵 Minor | {stats['minor']} |")
    lines.append(f"| **总计** | **{stats['total']}** |")
    lines.append(f"")

    # Group findings by dimension
    by_dimension = _group_by_dimension(findings)

    for dim_id, dim_findings in by_dimension.items():
        dim_name = DIMENSION_NAMES.get(dim_id, dim_id)
        lines.append(f"## {dim_name}")
        lines.append(f"")

        for i, f in enumerate(dim_findings, 1):
            icon = SEVERITY_ICONS.get(f.severity, "⚪")
            location = _format_location(f)
            lines.append(f"### {icon} 问题 {i} [{f.severity.upper()}]")
            if location:
                lines.append(f"**位置**: {location}")
            lines.append(f"")
            if f.snippet:
                lines.append(f"> {f.snippet}")
                lines.append(f"")
            lines.append(f"**问题**: {f.issue}")
            lines.append(f"")
            lines.append(f"**建议**: {f.suggestion}")
            lines.append(f"")
            lines.append(f"---")
            lines.append(f"")

    return "\n".join(lines)


def render_annotations_json(findings: List[Finding]) -> str:
    """Render findings as annotations JSON for frontend consumption."""
    annotations = []
    for i, f in enumerate(findings):
        annotations.append({
            "id": f"ann_{i:04d}",
            "dimension": f.dimension,
            "dimensionName": DIMENSION_NAMES.get(f.dimension, f.dimension),
            "severity": f.severity,
            "section": f.section,
            "paragraphIdx": f.paragraph_idx,
            "lineRange": f.line_range,
            "snippet": f.snippet,
            "issue": f.issue,
            "suggestion": f.suggestion,
        })
    return json.dumps(annotations, ensure_ascii=False, indent=2)


def _compute_stats(findings: List[Finding]) -> Dict[str, int]:
    """Compute severity statistics."""
    stats = {"critical": 0, "major": 0, "minor": 0, "total": len(findings)}
    for f in findings:
        if f.severity in stats:
            stats[f.severity] += 1
    return stats


def _group_by_dimension(findings: List[Finding]) -> Dict[str, List[Finding]]:
    """Group findings by dimension, maintaining dimension order."""
    grouped = {}
    for dim_id in DIMENSION_NAMES:
        dim_findings = [f for f in findings if f.dimension == dim_id]
        if dim_findings:
            grouped[dim_id] = dim_findings
    # Add any dimensions not in our known list
    for f in findings:
        if f.dimension not in grouped:
            grouped.setdefault(f.dimension, []).append(f)
    return grouped


def _format_location(f: Finding) -> str:
    """Format finding location as readable string."""
    parts = []
    if f.section:
        parts.append(f"§ {f.section}")
    if f.paragraph_idx is not None:
        parts.append(f"段落 {f.paragraph_idx + 1}")
    if f.line_range:
        parts.append(f"行 {f.line_range[0]}-{f.line_range[1]}")
    return " · ".join(parts) if parts else ""
