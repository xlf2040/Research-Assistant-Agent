"""个人标签（user_tags）存储管理。

与系统词表 taxonomy 解耦的纯用户数据：
- tags: 用户创建的标签列表（含 id/name/color）
- assignments: 每篇文献关联的标签 id 列表

存储路径: {doc_path}/.index/user_tags.json
所有写操作使用临时文件 + os.replace 原子替换。
"""

import json
import logging
import os
import tempfile
import threading
import uuid
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# 默认紫色系颜色池
DEFAULT_COLORS = [
    "#8B5CF6", "#7C3AED", "#6D28D9", "#A78BFA",
    "#C084FC", "#E879F9", "#F0ABFC", "#D946EF",
]


class UserTagsStore:
    """管理用户自定义标签的读写操作。"""

    def __init__(self, doc_path: str):
        self._index_dir = os.path.join(doc_path, ".index")
        self._file_path = os.path.join(self._index_dir, "user_tags.json")
        self._lock = threading.Lock()
        self._tags: List[dict] = []
        self._assignments: Dict[str, List[str]] = {}
        self._load()

    def _load(self):
        """从磁盘加载。"""
        if os.path.isfile(self._file_path):
            try:
                with open(self._file_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                self._tags = raw.get("tags", [])
                self._assignments = raw.get("assignments", {})
                logger.info(f"已加载 user_tags: {len(self._tags)} 个标签, {len(self._assignments)} 篇文献关联")
            except Exception as e:
                logger.warning(f"加载 user_tags 失败: {e}")
                self._tags = []
                self._assignments = {}
        else:
            self._tags = []
            self._assignments = {}

    def _save(self):
        """原子写入到磁盘。调用方应已持有 _lock。"""
        os.makedirs(self._index_dir, exist_ok=True)
        data = {"tags": self._tags, "assignments": self._assignments}
        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=self._index_dir, suffix=".tmp", prefix="user_tags_"
            )
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self._file_path)
        except Exception as e:
            logger.error(f"保存 user_tags 失败: {e}")
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise

    # ── 标签 CRUD ──

    def list_tags(self) -> List[dict]:
        """列出所有用户标签。"""
        return list(self._tags)

    def create_tag(self, name: str, color: Optional[str] = None) -> dict:
        """创建一个新标签。"""
        name = name.strip()
        if not name:
            raise ValueError("标签名称不能为空")
        # 检查重名
        for t in self._tags:
            if t["name"] == name:
                raise ValueError(f"标签 '{name}' 已存在")
        if color is None:
            color = DEFAULT_COLORS[len(self._tags) % len(DEFAULT_COLORS)]

        tag = {"id": uuid.uuid4().hex[:12], "name": name, "color": color}
        with self._lock:
            self._tags.append(tag)
            self._save()
        logger.info(f"创建用户标签: {tag}")
        return tag

    def update_tag(self, tag_id: str, name: Optional[str] = None, color: Optional[str] = None) -> dict:
        """更新标签名称或颜色。"""
        with self._lock:
            tag = self._find_tag(tag_id)
            if tag is None:
                raise ValueError(f"标签 {tag_id} 不存在")
            if name is not None:
                name = name.strip()
                if not name:
                    raise ValueError("标签名称不能为空")
                # 检查重名（排除自身）
                for t in self._tags:
                    if t["id"] != tag_id and t["name"] == name:
                        raise ValueError(f"标签 '{name}' 已存在")
                tag["name"] = name
            if color is not None:
                tag["color"] = color
            self._save()
        return tag

    def delete_tag(self, tag_id: str) -> bool:
        """删除标签，并移除所有文献的关联。"""
        with self._lock:
            idx = None
            for i, t in enumerate(self._tags):
                if t["id"] == tag_id:
                    idx = i
                    break
            if idx is None:
                return False
            self._tags.pop(idx)
            # 清理 assignments
            for filename in list(self._assignments):
                ids = self._assignments[filename]
                if tag_id in ids:
                    ids.remove(tag_id)
                    if not ids:
                        del self._assignments[filename]
            self._save()
        logger.info(f"删除用户标签: {tag_id}")
        return True

    # ── 关联操作 ──

    def assign(self, filename: str, tag_id: str) -> bool:
        """给文献贴上一个标签。"""
        if self._find_tag(tag_id) is None:
            raise ValueError(f"标签 {tag_id} 不存在")
        with self._lock:
            ids = self._assignments.setdefault(filename, [])
            if tag_id not in ids:
                ids.append(tag_id)
                self._save()
                return True
            return False

    def unassign(self, filename: str, tag_id: str) -> bool:
        """取消文献的一个标签。"""
        with self._lock:
            ids = self._assignments.get(filename, [])
            if tag_id in ids:
                ids.remove(tag_id)
                if not ids:
                    del self._assignments[filename]
                self._save()
                return True
            return False

    def get_assignments(self, filename: str) -> List[dict]:
        """获取文献关联的所有用户标签完整信息。"""
        tag_ids = self._assignments.get(filename, [])
        result = []
        for tid in tag_ids:
            tag = self._find_tag(tid)
            if tag:
                result.append(tag)
        return result

    def get_all_assignments(self) -> Dict[str, List[dict]]:
        """获取所有文献的用户标签关联（key=filename）。"""
        result: Dict[str, List[dict]] = {}
        for filename, tag_ids in self._assignments.items():
            tags = []
            for tid in tag_ids:
                tag = self._find_tag(tid)
                if tag:
                    tags.append(tag)
            if tags:
                result[filename] = tags
        return result

    def remove_document(self, filename: str):
        """文献被删除时清理关联。"""
        with self._lock:
            if filename in self._assignments:
                del self._assignments[filename]
                self._save()

    def rename_document(self, old_name: str, new_name: str):
        """文献重命名时迁移关联。"""
        with self._lock:
            if old_name in self._assignments:
                self._assignments[new_name] = self._assignments.pop(old_name)
                self._save()

    # ── 内部 ──

    def _find_tag(self, tag_id: str) -> Optional[dict]:
        for t in self._tags:
            if t["id"] == tag_id:
                return t
        return None
