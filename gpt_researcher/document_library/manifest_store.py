"""文献元信息 manifest.json 持久化管理。

manifest 文件存放每篇文献的元信息（文件名、hash、标签、摘要等）。
所有写操作使用临时文件 + os.replace 原子替换，避免进程中断导致数据损坏。
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ManifestStore:
    """管理 manifest.json 的读写操作。"""

    def __init__(self, doc_path: str):
        self._index_dir = os.path.join(doc_path, ".index")
        self._manifest_path = os.path.join(self._index_dir, "manifest.json")
        self._data: Dict[str, dict] = {}
        self._load()

    def _load(self):
        """从磁盘加载 manifest。"""
        if os.path.isfile(self._manifest_path):
            try:
                with open(self._manifest_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                # 兼容列表和字典两种格式
                if isinstance(raw, list):
                    self._data = {entry["filename"]: entry for entry in raw if "filename" in entry}
                elif isinstance(raw, dict):
                    self._data = raw
                else:
                    self._data = {}
                logger.info(f"已加载 manifest: {len(self._data)} 条记录")
            except Exception as e:
                logger.warning(f"加载 manifest 失败，将使用空数据: {e}")
                self._data = {}
        else:
            self._data = {}

    def _save(self):
        """原子写入 manifest 到磁盘。"""
        os.makedirs(self._index_dir, exist_ok=True)
        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=self._index_dir, suffix=".tmp", prefix="manifest_"
            )
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self._manifest_path)
            logger.debug("manifest 已保存")
        except Exception as e:
            logger.error(f"保存 manifest 失败: {e}")
            # 清理临时文件
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise

    def upsert(self, entry: dict) -> dict:
        """插入或更新一条文献记录。

        Args:
            entry: 必须包含 'filename' 字段的字典。

        Returns:
            更新后的完整记录。
        """
        filename = entry["filename"]
        existing = self._data.get(filename, {})
        existing.update(entry)

        # 确保有上传时间
        if "uploaded_at" not in existing:
            existing["uploaded_at"] = datetime.now(timezone.utc).isoformat()

        # 确保有状态
        if "status" not in existing:
            existing["status"] = "indexed"

        self._data[filename] = existing
        self._save()
        return existing

    def remove(self, filename: str) -> bool:
        """移除一条文献记录。

        Returns:
            是否找到并移除了记录。
        """
        if filename in self._data:
            del self._data[filename]
            self._save()
            logger.info(f"已从 manifest 移除: {filename}")
            return True
        return False

    def get(self, filename: str) -> Optional[dict]:
        """获取单条文献记录。"""
        return self._data.get(filename)

    def list_all(self) -> List[dict]:
        """列出所有文献记录。"""
        return list(self._data.values())

    def list_active(self) -> List[dict]:
        """列出所有活跃（未删除）的文献记录。"""
        return [
            entry for entry in self._data.values()
            if entry.get("status") != "deleted"
        ]

    def get_filenames(self) -> List[str]:
        """获取所有活跃文件名列表。"""
        return [
            entry["filename"] for entry in self._data.values()
            if entry.get("status") != "deleted"
        ]

    def aggregate_tags(self) -> dict:
        """聚合统计所有标签。

        Returns:
            {
                "primary_fields": {"领域A": 3, "领域B": 1, ...},
                "subfields": {"方向X": 2, ...},
                "keywords": {"关键词1": 5, ...}
            }
        """
        primary_counts: Dict[str, int] = {}
        subfield_counts: Dict[str, int] = {}
        keyword_counts: Dict[str, int] = {}

        for entry in self.list_active():
            pf = entry.get("primary_field", "")
            if pf:
                primary_counts[pf] = primary_counts.get(pf, 0) + 1

            for sf in entry.get("subfields", []):
                subfield_counts[sf] = subfield_counts.get(sf, 0) + 1

            for kw in entry.get("keywords", []):
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

        return {
            "primary_fields": primary_counts,
            "subfields": subfield_counts,
            "keywords": keyword_counts,
        }

    def reload(self):
        """从磁盘重新加载 manifest。"""
        self._load()
