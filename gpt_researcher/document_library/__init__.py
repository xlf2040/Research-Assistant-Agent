"""文献库管理模块。

提供基于 FAISS 的本地文献向量索引、自动打标和检索功能。
"""

from .library_manager import LibraryManager
from .user_tags_store import UserTagsStore

__all__ = ["LibraryManager", "UserTagsStore"]
