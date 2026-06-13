"""受控词表加载与校验模块。

优先加载用户自定义词表（my-docs/.index/taxonomy.json），
不存在时 fallback 到内置默认词表。
"""

import json
import logging
import os
import shutil
from typing import Dict, List, Set

logger = logging.getLogger(__name__)

_DEFAULT_TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "default_taxonomy.json")


def _load_json_file(path: str) -> dict:
    """安全加载 JSON 文件。"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_taxonomy(doc_path: str) -> Dict[str, List[str]]:
    """加载受控词表，返回 {一级领域: [二级方向]} 字典。

    优先级：
      1. {doc_path}/.index/taxonomy.json
      2. 内置 default_taxonomy.json

    如果用户目录不存在词表，自动拷贝一份默认词表过去。
    """
    index_dir = os.path.join(doc_path, ".index")
    user_taxonomy = os.path.join(index_dir, "taxonomy.json")

    # 尝试加载用户自定义词表
    if os.path.isfile(user_taxonomy):
        try:
            data = _load_json_file(user_taxonomy)
            fields = data.get("fields", {})
            if fields:
                logger.info(f"已加载用户自定义词表: {user_taxonomy} ({len(fields)} 个一级领域)")
                return fields
        except Exception as e:
            logger.warning(f"加载用户词表失败，将使用默认词表: {e}")

    # Fallback 到默认词表
    try:
        data = _load_json_file(_DEFAULT_TAXONOMY_PATH)
        fields = data.get("fields", {})
        logger.info(f"使用默认受控词表 ({len(fields)} 个一级领域)")

        # 自动拷贝到用户目录，方便后续编辑
        os.makedirs(index_dir, exist_ok=True)
        if not os.path.isfile(user_taxonomy):
            shutil.copy2(_DEFAULT_TAXONOMY_PATH, user_taxonomy)
            logger.info(f"已将默认词表拷贝到: {user_taxonomy}")

        return fields
    except Exception as e:
        logger.error(f"加载默认词表失败: {e}")
        return {"其他": ["综合研究"]}


def get_all_primary_fields(taxonomy: Dict[str, List[str]]) -> Set[str]:
    """获取所有一级领域名称。"""
    return set(taxonomy.keys())


def get_all_subfields(taxonomy: Dict[str, List[str]]) -> Set[str]:
    """获取所有二级方向名称。"""
    subs = set()
    for sub_list in taxonomy.values():
        subs.update(sub_list)
    return subs


def validate_primary_field(field: str, taxonomy: Dict[str, List[str]]) -> str:
    """校验一级领域，不在词表中返回 '其他'。"""
    if field in taxonomy:
        return field
    return "其他"


def validate_subfields(subfields: List[str], taxonomy: Dict[str, List[str]]) -> List[str]:
    """校验二级方向列表，过滤掉不在词表中的项。"""
    all_subs = get_all_subfields(taxonomy)
    return [s for s in subfields if s in all_subs]
