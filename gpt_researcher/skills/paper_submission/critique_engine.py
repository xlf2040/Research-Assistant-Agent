"""Critique Engine - orchestrates multi-dimension paper review."""

import asyncio
import logging
import uuid
from typing import List, Optional, Callable, Awaitable

from .schemas import PaperStructure, GuidelineDoc, Finding, Annotation
from .critics import (
    critic_format,
    critic_title_abstract,
    critic_keywords,
    critic_introduction,
    critic_methodology,
    critic_results_discussion,
    critic_figures_tables,
    critic_citations,
    critic_grammar_spelling,
    critic_terminology,
    critic_consistency,
    critic_logical_coherence,
    critic_declarations,
    critic_author_format,
    critic_anonymization,
    critic_cover_letter,
)

logger = logging.getLogger(__name__)

# All critique dimensions with their display names
DIMENSIONS = [
    ("format", "格式规范", critic_format),
    ("title_abstract", "标题与摘要", critic_title_abstract),
    ("keywords", "关键词", critic_keywords),
    ("introduction", "引言质量", critic_introduction),
    ("methodology", "方法可复现性", critic_methodology),
    ("results_discussion", "结果与讨论", critic_results_discussion),
    ("figures_tables", "图表规范", critic_figures_tables),
    ("citations", "文献引用", critic_citations),
    ("grammar_spelling", "语法拼写", critic_grammar_spelling),
    ("terminology", "专业术语", critic_terminology),
    ("consistency", "用词一致性", critic_consistency),
    ("logical_coherence", "段落逻辑连贯", critic_logical_coherence),
    ("declarations", "必备声明", critic_declarations),
    ("author_format", "作者署名", critic_author_format),
    ("anonymization", "匿名化检查", critic_anonymization),
    ("cover_letter", "投稿信建议", critic_cover_letter),
]

MAX_CONCURRENCY = 3  # Limit concurrent LLM calls


class CritiqueEngine:
    """Multi-dimension paper critique engine."""

    def __init__(self, llm_provider, stream_output: Optional[Callable] = None):
        self.llm_provider = llm_provider
        self.stream_output = stream_output

    async def run(
        self, paper: PaperStructure, guideline: GuidelineDoc
    ) -> List[Finding]:
        """
        Run all critique dimensions concurrently (bounded) and return findings.
        Streams progress for each completed dimension.
        """
        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        all_findings: List[Finding] = []
        completed = 0
        total = len(DIMENSIONS)

        async def run_critic(dim_id, dim_name, critic_fn):
            nonlocal completed
            async with semaphore:
                try:
                    if self.stream_output:
                        await self.stream_output(
                            "logs",
                            {"type": "progress", "content": f"正在检查：{dim_name}..."},
                        )

                    findings = await critic_fn(
                        paper=paper,
                        guideline=guideline,
                        llm_provider=self.llm_provider,
                    )

                    # Stream this dimension's results
                    if self.stream_output and findings:
                        await self.stream_output(
                            "logs",
                            {
                                "type": "critique_section",
                                "dimension": dim_id,
                                "dimension_name": dim_name,
                                "findings": [f.model_dump() for f in findings],
                                "count": len(findings),
                            },
                        )

                    completed += 1
                    if self.stream_output:
                        await self.stream_output(
                            "logs",
                            {
                                "type": "progress",
                                "content": f"已完成 {completed}/{total} 个维度检查",
                            },
                        )

                    return findings
                except Exception as e:
                    logger.warning(f"Critic {dim_id} failed: {e}")
                    completed += 1
                    return []

        # Run all critics concurrently with semaphore
        tasks = [
            run_critic(dim_id, dim_name, critic_fn)
            for dim_id, dim_name, critic_fn in DIMENSIONS
        ]
        results = await asyncio.gather(*tasks)

        for findings_list in results:
            all_findings.extend(findings_list)

        return all_findings

    def findings_to_annotations(self, findings: List[Finding]) -> List[Annotation]:
        """Convert findings to annotation format for frontend consumption."""
        annotations = []
        for f in findings:
            annotations.append(Annotation(
                id=str(uuid.uuid4())[:8],
                dimension=f.dimension,
                severity=f.severity,
                section=f.section,
                paragraph_idx=f.paragraph_idx,
                line_range=f.line_range,
                snippet=f.snippet,
                issue=f.issue,
                suggestion=f.suggestion,
            ))
        return annotations
