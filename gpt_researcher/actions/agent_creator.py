"""Agent creation and selection utilities for GPT Researcher.

This module provides functions to automatically select and configure
the appropriate research agent based on the query type.
"""

import json
import logging
import re

import json_repair

from ..prompts import PromptFamily
from ..utils.llm import create_chat_completion

logger = logging.getLogger(__name__)


def _strip_emoji(text: str) -> str:
    """Remove emoji characters from text while preserving Chinese/CJK characters.
    This prevents GBK encoding errors on Windows."""
    if not text:
        return text
    import re as _re
    # Remove emoji and other non-printable special chars, but keep CJK, Latin, digits, punctuation
    # Pattern keeps: CJK chars (U+4E00-U+9FFF, U+3400-U+4DBF, U+F900-U+FAFF), CJK extensions,
    #   Latin, digits, common punctuation, spaces
    cleaned = _re.sub(r'[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff'
                      r'\u3000-\u303f\uff00-\uffef'
                      r'a-zA-Z0-9\s\-_.,;:!?()（）【】《》""''、，。！？；：' 
                      r'/+@#$%^&*+=<>{}[\]|`~\n\t]', '', text)
    return cleaned.strip() or text

async def choose_agent(
    query,
    cfg,
    parent_query=None,
    cost_callback: callable = None,
    headers=None,
    prompt_family: type[PromptFamily] | PromptFamily = PromptFamily,
    **kwargs
):
    """
    Chooses the agent automatically
    Args:
        parent_query: In some cases the research is conducted on a subtopic from the main query.
            The parent query allows the agent to know the main context for better reasoning.
        query: original query
        cfg: Config
        cost_callback: callback for calculating llm costs
        prompt_family: Family of prompts

    Returns:
        agent: Agent name
        agent_role_prompt: Agent role prompt
    """
    query = f"{parent_query} - {query}" if parent_query else f"{query}"
    response = None  # Initialize response to ensure it's defined

    try:
        response = await create_chat_completion(
            model=cfg.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{prompt_family.auto_agent_instructions()}"},
                {"role": "user", "content": f"task: {query}"},
            ],
            temperature=0.15,
            llm_provider=cfg.smart_llm_provider,
            llm_kwargs=cfg.llm_kwargs,
            cost_callback=cost_callback,
            **kwargs
        )

        agent_dict = json.loads(response)
        server = _strip_emoji(agent_dict["server"])
        return server, agent_dict["agent_role_prompt"]

    except Exception as e:
        return await handle_json_error(response)


async def handle_json_error(response: str | None):
    """Handle JSON parsing errors from LLM responses.

    Attempts to recover agent information from malformed JSON responses
    using json_repair and regex extraction as fallbacks.

    Args:
        response: The LLM response string that failed initial JSON parsing.

    Returns:
        A tuple of (agent_name, agent_role_prompt). Returns default agent
        if all parsing attempts fail.
    """
    try:
        agent_dict = json_repair.loads(response)
        if agent_dict.get("server") and agent_dict.get("agent_role_prompt"):
            return _strip_emoji(agent_dict["server"]), agent_dict["agent_role_prompt"]
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.warning(
            f"Failed to parse agent JSON with json_repair: {error_type}: {error_msg}",
            exc_info=True
        )
        if response:
            logger.debug(f"LLM response that failed to parse: {response[:500]}...")

    json_string = extract_json_with_regex(response)
    if json_string:
        try:
            json_data = json.loads(json_string)
            return json_data["server"], json_data["agent_role_prompt"]
        except json.JSONDecodeError as e:
            logger.warning(
                f"Failed to decode JSON from regex extraction: {str(e)}",
                exc_info=True
            )

    logger.info("No valid JSON found in LLM response. Falling back to default agent.")
    return "默认研究员", (
        "您是一位AI批判性思维研究助手。您的唯一目标是根据给定文本撰写"
        "质量优异、客观且结构清晰的报告。"
    )


def extract_json_with_regex(response: str | None) -> str | None:
    """Extract JSON object from a string using regex.

    Attempts to find the first JSON object pattern in the response string.

    Args:
        response: The string to search for JSON content.

    Returns:
        The extracted JSON string if found, None otherwise.
    """
    if not response:
        return None
    json_match = re.search(r"{.*?}", response, re.DOTALL)
    if json_match:
        return json_match.group(0)
    return None
