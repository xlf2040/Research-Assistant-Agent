"""Data models for Paper Submission Advisor."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict


class JournalCandidate(BaseModel):
    """期刊推荐候选项"""
    journal_id: str = Field(description="OpenAlex source_id or ISSN")
    name: str = Field(description="期刊名称")
    issn: Optional[str] = Field(default=None, description="ISSN")
    publisher: Optional[str] = Field(default=None, description="出版方")
    impact_factor: Optional[float] = Field(default=None, description="影响因子(估算)")
    scope: str = Field(description="期刊研究范围概述")
    homepage: Optional[str] = Field(default=None, description="期刊官网链接")
    is_open_access: bool = Field(default=False, description="是否开放获取")
    avg_review_weeks: Optional[float] = Field(default=None, description="平均审稿周数")
    match_score: int = Field(ge=0, le=100, description="与本文匹配度(0-100)")
    match_reason: str = Field(description="LLM给出的匹配理由")


class Finding(BaseModel):
    """修改报告中的单条发现"""
    dimension: str = Field(description="检查维度标识")
    severity: Literal["critical", "major", "minor"] = Field(description="严重程度")
    section: Optional[str] = Field(default=None, description="论文章节名")
    paragraph_idx: Optional[int] = Field(default=None, description="段落序号(0-based)")
    line_range: Optional[List[int]] = Field(default=None, description="行号范围 [start, end]")
    snippet: Optional[str] = Field(default=None, description="原文片段引用")
    issue: str = Field(description="问题描述")
    suggestion: str = Field(description="改写建议")


class Annotation(BaseModel):
    """段落级批注（前端消费）"""
    id: str = Field(description="批注唯一ID")
    dimension: str
    severity: Literal["critical", "major", "minor"]
    section: Optional[str] = None
    paragraph_idx: Optional[int] = None
    line_range: Optional[List[int]] = None
    snippet: Optional[str] = None
    issue: str
    suggestion: str


class GuidelineDoc(BaseModel):
    """期刊投稿指南归一化文档"""
    journal_name: str
    issn: Optional[str] = None
    homepage: Optional[str] = None
    raw_text: str = Field(description="投稿指南正文(抓取/缓存)")
    sections: Dict[str, str] = Field(default_factory=dict, description="按章节拆分的指南内容")
    fetched_at: Optional[str] = None


class PaperSection(BaseModel):
    """论文的一个章节"""
    name: str = Field(description="章节名称")
    paragraphs: List[str] = Field(default_factory=list, description="段落列表")
    start_line: int = Field(default=0, description="起始行号")
    end_line: int = Field(default=0, description="结束行号")


class PaperStructure(BaseModel):
    """结构化论文"""
    title: Optional[str] = None
    abstract: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    primary_field: Optional[str] = None
    sections: List[PaperSection] = Field(default_factory=list)
    raw_text: str = Field(default="", description="完整原文(带行号)")
    total_lines: int = Field(default=0)
    filename: Optional[str] = None
