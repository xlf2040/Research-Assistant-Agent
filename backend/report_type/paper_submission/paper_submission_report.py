"""Paper Submission Report - report_type shell for PaperSubmissionAdvisor."""

import os
import logging
from typing import Optional

from gpt_researcher.document.document import DocumentLoader
from gpt_researcher.skills.paper_submission import PaperSubmissionAdvisor
from gpt_researcher.llm_provider import GenericLLMProvider
from gpt_researcher.config import Config

logger = logging.getLogger(__name__)


class PaperSubmissionReport:
    """
    Report type wrapper for Paper Submission Advisor.
    
    Interfaces with the same signature as BasicReport for WebSocket manager integration.
    """

    def __init__(
        self,
        query: str = "",
        paper_filename: str = "",
        websocket=None,
        config_path: str = "default",
        headers=None,
        **kwargs,
    ):
        self.query = query
        self.paper_filename = paper_filename
        self.websocket = websocket
        self.config_path = config_path
        self.headers = headers or {}

        # Load config and LLM provider
        self.cfg = Config(config_path)
        # Create LLM provider using the config's smart_llm settings
        provider_kwargs = {
            "model": self.cfg.smart_llm_model,
            "temperature": 0.35,
            "max_tokens": 4000,
        }
        self.llm_provider = GenericLLMProvider.from_provider(
            self.cfg.smart_llm_provider,
            **provider_kwargs,
        )

        # The advisor instance (created during run)
        self.advisor: Optional[PaperSubmissionAdvisor] = None

    async def run(self) -> str:
        """Execute the paper submission advisory flow."""
        # Load paper content
        paper_text = await self._load_paper()
        if not paper_text:
            error_msg = f"无法加载论文文件: {self.paper_filename}"
            if self.websocket:
                await self.websocket.send_json({
                    "type": "logs",
                    "content": "error",
                    "output": error_msg,
                })
            return error_msg

        # Create and run advisor
        self.advisor = PaperSubmissionAdvisor(
            paper_text=paper_text,
            paper_filename=self.paper_filename,
            llm_provider=self.llm_provider,
            stream_output=self._stream_output,
            websocket=self.websocket,
        )

        report = await self.advisor.run()
        return report

    async def _load_paper(self) -> str:
        """Load paper content from file."""
        doc_path = os.environ.get("DOC_PATH", "./my-docs")
        file_path = os.path.join(doc_path, os.path.basename(self.paper_filename))

        # Security: validate path doesn't escape doc_path
        real_doc_path = os.path.realpath(doc_path)
        real_file_path = os.path.realpath(file_path)
        if not real_file_path.startswith(real_doc_path):
            logger.warning(f"Path traversal attempt: {self.paper_filename}")
            return ""

        if not os.path.exists(real_file_path):
            logger.warning(f"Paper file not found: {real_file_path}")
            return ""

        try:
            # Use DocumentLoader to handle various formats
            # NOTE: DocumentLoader treats a str path as directory; wrap in list for single file
            loader = DocumentLoader([real_file_path])
            docs = await loader.load()
            if docs:
                # Concatenate all document parts
                return "\n\n".join(doc.get("raw_content", "") for doc in docs if doc.get("raw_content"))
            return ""
        except Exception as e:
            logger.error(f"Failed to load paper: {e}")
            return ""

    async def _stream_output(self, type: str, data: dict):
        """Stream output to WebSocket."""
        if self.websocket:
            await self.websocket.send_json({
                "type": type,
                **data,
            })

    def resolve_journal_selection(self, journal_id: str):
        """Resolve journal selection (called from WebSocket handler)."""
        if self.advisor:
            self.advisor.resolve_journal_selection(journal_id)
