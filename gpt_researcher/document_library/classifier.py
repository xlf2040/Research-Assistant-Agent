"""文献自动分类与打标模块。

使用 FAST_LLM 对文献前段文本做一次分类，返回：
  - primary_field: 一级研究领域（受控词表单选）
  - subfields: 二级研究方向（受控词表多选）
  - keywords: 自由关键词（5-10 个）
  - summary: 文献摘要（≤200 字）

打标失败不阻塞索引流程，返回空标签 + warning。
"""

import json
import logging
import os
from typing import Any, Dict, List

from .taxonomy import get_all_primary_fields, validate_primary_field, validate_subfields

logger = logging.getLogger(__name__)

# 打标时取文献前多少字符
MAX_CLASSIFY_CHARS = int(os.getenv("MAX_CLASSIFY_CHARS", "8000"))

# 关键词长度和数量上限
MAX_KEYWORD_LENGTH = 16
MAX_KEYWORD_COUNT = 10

_CLASSIFY_PROMPT = """你是一个专业的文献分类助手。请阅读以下文献内容片段，对其进行分类和摘要。

## 可选的一级研究领域（只能从以下列表中选择一个）：
{primary_fields}

## 可选的二级研究方向（从以下列表中选择 1-3 个最相关的）：
{subfields}

## 文献内容（前段摘录）：
{text}

## 请严格以 JSON 格式返回，不要添加任何其他文字：
{{
  "primary_field": "选择一个最匹配的一级领域",
  "subfields": ["二级方向1", "二级方向2"],
  "keywords": ["关键词1", "关键词2", "...（5-10个自由关键词，每个不超过16字）"],
  "summary": "200字以内的文献摘要"
}}"""


def _build_classify_prompt(text: str, taxonomy: Dict[str, List[str]]) -> str:
    """构建分类 prompt。"""
    primary_fields = "、".join(taxonomy.keys())
    all_subfields = []
    for subs in taxonomy.values():
        all_subfields.extend(subs)
    subfields_str = "、".join(all_subfields)

    return _CLASSIFY_PROMPT.format(
        primary_fields=primary_fields,
        subfields=subfields_str,
        text=text[:MAX_CLASSIFY_CHARS],
    )


def _extract_json_from_response(response: str) -> dict:
    """从 LLM 返回中提取 JSON（兼容 markdown code block）。"""
    text = response.strip()

    # 尝试提取 ```json ... ``` 块
    if "```" in text:
        import re
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()

    return json.loads(text)


def _sanitize_result(raw: dict, taxonomy: Dict[str, List[str]]) -> dict:
    """对 LLM 返回结果做白名单校验和清洗。"""
    result = {}

    # primary_field: 必须在词表中
    pf = raw.get("primary_field", "")
    result["primary_field"] = validate_primary_field(str(pf).strip(), taxonomy)

    # subfields: 过滤掉不在词表中的
    subs = raw.get("subfields", [])
    if isinstance(subs, list):
        subs = [str(s).strip() for s in subs if isinstance(s, str)]
        result["subfields"] = validate_subfields(subs, taxonomy)[:5]
    else:
        result["subfields"] = []

    # keywords: 长度和数量限制
    keywords = raw.get("keywords", [])
    if isinstance(keywords, list):
        cleaned = []
        for kw in keywords:
            if isinstance(kw, str):
                kw = kw.strip()
                if 0 < len(kw) <= MAX_KEYWORD_LENGTH:
                    cleaned.append(kw)
        result["keywords"] = cleaned[:MAX_KEYWORD_COUNT]
    else:
        result["keywords"] = []

    # summary: 截断到 300 字（留些余量）
    summary = raw.get("summary", "")
    if isinstance(summary, str):
        result["summary"] = summary.strip()[:300]
    else:
        result["summary"] = ""

    return result


def empty_tags() -> dict:
    """返回空标签结构。"""
    return {
        "primary_field": "其他",
        "subfields": [],
        "keywords": [],
        "summary": "",
    }


async def classify_document(
    text: str,
    taxonomy: Dict[str, List[str]],
    cfg: Any = None,
) -> dict:
    """对文献文本进行自动分类打标。

    Args:
        text: 文献完整文本（内部只取前 MAX_CLASSIFY_CHARS）。
        taxonomy: 受控词表 {一级领域: [二级方向]}。
        cfg: gpt_researcher 的 Config 实例（用于获取 LLM 配置）。

    Returns:
        {primary_field, subfields, keywords, summary}
    """
    if not text or not text.strip():
        logger.warning("文献文本为空，跳过打标")
        return empty_tags()

    try:
        from ..utils.llm import create_chat_completion

        # 获取 LLM 配置
        if cfg:
            llm_provider = cfg.fast_llm_provider
            model = cfg.fast_llm_model
            temperature = cfg.temperature
            max_tokens = min(cfg.fast_token_limit, 4000)
        else:
            # Fallback 到环境变量
            fast_llm = os.getenv("FAST_LLM", "openai:gpt-4o-mini")
            parts = fast_llm.split(":", 1)
            llm_provider = parts[0] if len(parts) > 1 else "openai"
            model = parts[1] if len(parts) > 1 else parts[0]
            temperature = 0.3
            max_tokens = 4000

        prompt = _build_classify_prompt(text, taxonomy)
        messages = [
            {"role": "system", "content": "你是一个专业的文献分类助手，请严格按 JSON 格式输出。"},
            {"role": "user", "content": prompt},
        ]

        response = await create_chat_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            llm_provider=llm_provider,
        )

        raw = _extract_json_from_response(response)
        result = _sanitize_result(raw, taxonomy)
        logger.info(f"打标完成: primary_field={result['primary_field']}, "
                     f"keywords={result['keywords'][:3]}...")
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"LLM 返回的 JSON 解析失败: {e}")
        return empty_tags()
    except Exception as e:
        logger.warning(f"文献打标失败: {e}")
        return empty_tags()
