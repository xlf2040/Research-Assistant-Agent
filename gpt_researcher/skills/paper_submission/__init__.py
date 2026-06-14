"""Paper Submission Advisor - 论文投稿推荐与修改指导模块"""

from .advisor import PaperSubmissionAdvisor
from .schemas import JournalCandidate, Finding, Annotation, GuidelineDoc, PaperStructure

__all__ = [
    "PaperSubmissionAdvisor",
    "JournalCandidate",
    "Finding",
    "Annotation",
    "GuidelineDoc",
    "PaperStructure",
]
