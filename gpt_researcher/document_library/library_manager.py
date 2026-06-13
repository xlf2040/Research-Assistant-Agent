"""文献库管理器 - 单一入口，管理 FAISS 索引、manifest、打标、检索。

所有上传/删除/检索操作都通过此类进行，避免逻辑散落。
FAISS 索引使用 langchain_community 的封装，支持增量和持久化。
并发写操作通过 asyncio.Lock 保护。
"""

import asyncio
import hashlib
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter

from .classifier import classify_document, empty_tags
from .manifest_store import ManifestStore
from .taxonomy import load_taxonomy

logger = logging.getLogger(__name__)

# 切块参数
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


class LibraryManager:
    """文献库管理器。

    提供：
    - add_document(file_path): 解析→切块→embedding→FAISS merge→打标→写 manifest
    - remove_document(filename): 从 manifest 标记删除→重建 FAISS
    - search(query, k): 向量检索 top-k
    - list_documents(): 列出所有文献及元信息
    - aggregate_tags(): 聚合标签统计
    - reindex_all(): 全量重建 FAISS 索引
    """

    def __init__(self, doc_path: str, cfg: Any = None):
        self.doc_path = doc_path
        self.cfg = cfg
        self._index_dir = os.path.join(doc_path, ".index")
        self._faiss_path = os.path.join(self._index_dir, "faiss_store")
        self._lock = asyncio.Lock()
        self._faiss_store = None
        self._embeddings = None
        self._manifest = ManifestStore(doc_path)
        self._taxonomy = load_taxonomy(doc_path)
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
        )

    def _get_embeddings(self):
        """延迟初始化 embedding 实例。"""
        if self._embeddings is None:
            from ..memory.embeddings import Memory

            if self.cfg:
                provider = self.cfg.embedding_provider
                model = self.cfg.embedding_model
            else:
                embedding_str = os.getenv("EMBEDDING", "openai:text-embedding-3-small")
                parts = embedding_str.split(":", 1)
                provider = parts[0] if len(parts) > 1 else "openai"
                model = parts[1] if len(parts) > 1 else parts[0]

            self._embeddings = Memory(provider, model).get_embeddings()
            logger.info(f"Embedding 已初始化: provider={provider}, model={model}")
        return self._embeddings

    def _load_faiss(self):
        """加载已有的 FAISS 索引。"""
        if self._faiss_store is not None:
            return self._faiss_store

        faiss_index_file = os.path.join(self._faiss_path, "index.faiss")
        if os.path.isfile(faiss_index_file):
            try:
                from langchain_community.vectorstores import FAISS

                self._faiss_store = FAISS.load_local(
                    self._faiss_path,
                    self._get_embeddings(),
                    allow_dangerous_deserialization=True,
                )
                logger.info("FAISS 索引已从磁盘加载")
            except Exception as e:
                logger.warning(f"加载 FAISS 索引失败: {e}")
                self._faiss_store = None

        return self._faiss_store

    def _save_faiss(self):
        """原子保存 FAISS 索引。"""
        if self._faiss_store is None:
            return

        os.makedirs(self._index_dir, exist_ok=True)

        # 先写到临时目录再替换
        tmp_dir = tempfile.mkdtemp(dir=self._index_dir, prefix="faiss_tmp_")
        try:
            self._faiss_store.save_local(tmp_dir)
            # 原子替换：删旧目录、重命名新目录
            import shutil
            if os.path.exists(self._faiss_path):
                shutil.rmtree(self._faiss_path)
            os.rename(tmp_dir, self._faiss_path)
            logger.info("FAISS 索引已保存")
        except Exception as e:
            logger.error(f"保存 FAISS 索引失败: {e}")
            import shutil
            if os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)
            raise

    def _compute_file_hash(self, file_path: str) -> str:
        """计算文件 SHA256 hash。"""
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    async def _load_and_split(self, file_path: str) -> list:
        """加载文档并切块。

        Returns:
            LangChain Document 列表。
        """
        from ..document.document import DocumentLoader

        loader = DocumentLoader([file_path])
        raw_docs = await loader.load()

        # raw_docs 是 [{raw_content, url}] 格式
        from langchain_core.documents import Document

        documents = []
        filename = os.path.basename(file_path)
        for doc in raw_docs:
            content = doc.get("raw_content", "")
            if content.strip():
                documents.append(
                    Document(
                        page_content=content,
                        metadata={"source": filename},
                    )
                )

        # 切块
        chunks = self._splitter.split_documents(documents)
        logger.info(f"文件 {filename}: {len(documents)} 页 → {len(chunks)} 个 chunk")
        return chunks

    async def add_document(self, file_path: str) -> dict:
        """添加一篇文献到库中。

        流程：解析→切块→embedding→FAISS merge→LLM 打标→写 manifest

        Args:
            file_path: 文献文件的完整路径。

        Returns:
            manifest entry（含标签信息）。
        """
        async with self._lock:
            filename = os.path.basename(file_path)
            logger.info(f"开始添加文献: {filename}")

            # 1. 计算 hash 检查是否重复
            file_hash = self._compute_file_hash(file_path)
            existing = self._manifest.get(filename)
            if existing and existing.get("sha256") == file_hash:
                logger.info(f"文件 {filename} 内容未变化，跳过重新索引")
                return existing

            # 2. 加载并切块
            try:
                chunks = await self._load_and_split(file_path)
            except Exception as e:
                logger.error(f"文件解析失败 {filename}: {e}")
                # 仍然记录到 manifest，标记解析失败
                entry = self._manifest.upsert({
                    "filename": filename,
                    "sha256": file_hash,
                    "chunks": 0,
                    "status": "parse_error",
                    **empty_tags(),
                })
                return entry

            if not chunks:
                logger.warning(f"文件 {filename} 解析后无有效内容")
                entry = self._manifest.upsert({
                    "filename": filename,
                    "sha256": file_hash,
                    "chunks": 0,
                    "status": "empty",
                    **empty_tags(),
                })
                return entry

            # 3. 向量化并 merge 到 FAISS
            try:
                from langchain_community.vectorstores import FAISS

                embeddings = self._get_embeddings()
                new_store = await asyncio.to_thread(
                    FAISS.from_documents, chunks, embeddings
                )

                existing_store = self._load_faiss()
                if existing_store is not None:
                    existing_store.merge_from(new_store)
                else:
                    self._faiss_store = new_store

                self._save_faiss()
                logger.info(f"文件 {filename}: {len(chunks)} 个 chunk 已向量化并合并到索引")
            except Exception as e:
                logger.error(f"向量化失败 {filename}: {e}")
                entry = self._manifest.upsert({
                    "filename": filename,
                    "sha256": file_hash,
                    "chunks": len(chunks),
                    "status": "embed_error",
                    **empty_tags(),
                })
                return entry

            # 4. LLM 打标（失败不阻塞）
            full_text = "\n".join(chunk.page_content for chunk in chunks)
            tags = await classify_document(full_text, self._taxonomy, self.cfg)

            # 5. 写 manifest
            entry = self._manifest.upsert({
                "filename": filename,
                "sha256": file_hash,
                "chunks": len(chunks),
                "status": "indexed",
                **tags,
            })

            logger.info(f"文献添加完成: {filename} (primary_field={tags.get('primary_field', '?')})")
            return entry

    async def remove_document(self, filename: str) -> bool:
        """从文献库移除一篇文献。

        由于 FAISS 不支持按 metadata 删除，采用标记删除 + 重建策略。

        Args:
            filename: 文件名。

        Returns:
            是否成功移除。
        """
        async with self._lock:
            removed = self._manifest.remove(filename)
            if not removed:
                logger.warning(f"文件 {filename} 不在 manifest 中")
                return False

            # 重建索引（仅包含未删除的文件）
            await self._rebuild_index_unlocked()
            logger.info(f"文献已移除并重建索引: {filename}")
            return True

    async def _rebuild_index_unlocked(self):
        """重建 FAISS 索引（调用方需已持有锁）。"""
        logger.info("开始重建 FAISS 索引...")
        self._faiss_store = None

        active_files = self._manifest.get_filenames()
        if not active_files:
            # 清除索引文件
            import shutil
            if os.path.exists(self._faiss_path):
                shutil.rmtree(self._faiss_path)
            logger.info("无活跃文件，索引已清空")
            return

        all_chunks = []
        for fname in active_files:
            file_path = os.path.join(self.doc_path, fname)
            if os.path.isfile(file_path):
                try:
                    chunks = await self._load_and_split(file_path)
                    all_chunks.extend(chunks)
                except Exception as e:
                    logger.warning(f"重建时跳过文件 {fname}: {e}")

        if all_chunks:
            from langchain_community.vectorstores import FAISS

            embeddings = self._get_embeddings()
            self._faiss_store = await asyncio.to_thread(
                FAISS.from_documents, all_chunks, embeddings
            )
            self._save_faiss()
            logger.info(f"FAISS 索引重建完成: {len(all_chunks)} 个 chunk")
        else:
            import shutil
            if os.path.exists(self._faiss_path):
                shutil.rmtree(self._faiss_path)
            logger.info("重建后无有效 chunk，索引已清空")

    async def search(
        self,
        query: str,
        k: int = 8,
        filter_dict: Optional[dict] = None,
        filenames: Optional[List[str]] = None,
    ) -> List[dict]:
        """向量检索 top-k chunk。

        Args:
            query: 查询文本。
            k: 返回 chunk 数量。
            filter_dict: 可选的 metadata 过滤条件。
            filenames: 可选的文件名白名单，仅在这些文件范围内检索。

        Returns:
            与现有 document_data 结构一致的列表:
            [{"raw_content": str, "url": str}]
        """
        store = self._load_faiss()
        if store is None:
            logger.warning("FAISS 索引不存在，无法检索")
            return []

        try:
            # 若有 filenames 限定，多检索一些再过滤
            fetch_k = k * 4 if filenames else k
            results = await asyncio.to_thread(
                store.similarity_search, query, k=fetch_k
            )

            document_data = []
            filenames_set = set(filenames) if filenames else None
            for doc in results:
                source = doc.metadata.get("source", "unknown")
                if filenames_set and source not in filenames_set:
                    continue
                document_data.append({
                    "raw_content": doc.page_content,
                    "url": source,
                })
                if len(document_data) >= k:
                    break

            logger.info(f"检索完成: query='{query[:50]}...', 返回 {len(document_data)} 个 chunk (filenames filter={filenames is not None})")
            return document_data
        except Exception as e:
            logger.error(f"FAISS 检索失败: {e}")
            return []

    def list_documents(self) -> List[dict]:
        """列出所有文献及其元信息。"""
        return self._manifest.list_active()

    def aggregate_tags(self) -> dict:
        """聚合统计所有标签。"""
        return self._manifest.aggregate_tags()

    async def reindex_all(self) -> None:
        """全量重建索引和重新打标。"""
        async with self._lock:
            logger.info("开始全量重建...")

            # 重新扫描文件目录
            if not os.path.isdir(self.doc_path):
                logger.warning(f"文档目录不存在: {self.doc_path}")
                return

            files = []
            for f in os.listdir(self.doc_path):
                fp = os.path.join(self.doc_path, f)
                if os.path.isfile(fp) and not f.startswith("."):
                    files.append(fp)

            # 清空现有索引
            self._faiss_store = None
            import shutil
            if os.path.exists(self._faiss_path):
                shutil.rmtree(self._faiss_path)

            # 逐文件重建
            for file_path in files:
                filename = os.path.basename(file_path)
                file_hash = self._compute_file_hash(file_path)

                try:
                    chunks = await self._load_and_split(file_path)
                except Exception as e:
                    logger.warning(f"重建跳过 {filename}: {e}")
                    continue

                if not chunks:
                    continue

                # 向量化
                try:
                    from langchain_community.vectorstores import FAISS

                    embeddings = self._get_embeddings()
                    new_store = await asyncio.to_thread(
                        FAISS.from_documents, chunks, embeddings
                    )

                    if self._faiss_store is not None:
                        self._faiss_store.merge_from(new_store)
                    else:
                        self._faiss_store = new_store
                except Exception as e:
                    logger.warning(f"重建向量化失败 {filename}: {e}")
                    continue

                # 打标
                full_text = "\n".join(c.page_content for c in chunks)
                tags = await classify_document(full_text, self._taxonomy, self.cfg)

                self._manifest.upsert({
                    "filename": filename,
                    "sha256": file_hash,
                    "chunks": len(chunks),
                    "status": "indexed",
                    **tags,
                })

            # 保存索引
            if self._faiss_store is not None:
                self._save_faiss()

            logger.info(f"全量重建完成: {len(files)} 个文件")

    def has_index(self) -> bool:
        """检查是否存在 FAISS 索引。"""
        return os.path.isfile(os.path.join(self._faiss_path, "index.faiss"))

    def reload(self):
        """重新加载 manifest 和 taxonomy（不重新加载 FAISS）。"""
        self._manifest.reload()
        self._taxonomy = load_taxonomy(self.doc_path)
        self._faiss_store = None  # 下次检索时会重新加载
