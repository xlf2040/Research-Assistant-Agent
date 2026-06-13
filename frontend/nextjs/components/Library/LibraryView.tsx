"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchDocuments,
  fetchTagStats,
  exportDocuments,
  deleteDocument,
  uploadFile,
  type LibraryDoc,
  type UserTag,
  type TagStats,
} from "@/helpers/libraryApi";
import Toolbar from "./Toolbar";
import SideFilters from "./SideFilters";
import DocGrid from "./DocGrid";
import DocDetailDrawer from "./DocDetailDrawer";
import TagManagerModal from "./TagManagerModal";

export default function LibraryView() {
  // 数据
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [tagStats, setTagStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 筛选
  const [keyword, setKeyword] = useState("");
  const [activePrimary, setActivePrimary] = useState<string | null>(null);
  const [activeUserTagIds, setActiveUserTagIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("name");

  // 选择
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 详情
  const [detailDoc, setDetailDoc] = useState<LibraryDoc | null>(null);

  // 标签管理弹窗
  const [showTagManager, setShowTagManager] = useState(false);

  // 上传中
  const [uploading, setUploading] = useState(false);

  // ── 加载数据 ──

  const loadData = useCallback(async () => {
    try {
      const [docRes, stats] = await Promise.all([fetchDocuments(), fetchTagStats()]);
      setDocs(docRes.documents || []);
      setUserTags(docRes.user_tags || []);
      setTagStats(stats);
    } catch (e) {
      console.error("加载文献数据失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 筛选逻辑 ──

  const filteredDocs = useMemo(() => {
    let result = [...docs];

    // 关键词筛选
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(kw) ||
          d.summary?.toLowerCase().includes(kw) ||
          d.primary_field?.toLowerCase().includes(kw) ||
          d.subfields?.some((sf) => sf.toLowerCase().includes(kw)) ||
          d.keywords?.some((k) => k.toLowerCase().includes(kw)) ||
          d.user_tags?.some((t) => t.name.toLowerCase().includes(kw))
      );
    }

    // 系统标签筛选
    if (activePrimary) {
      result = result.filter((d) => d.primary_field === activePrimary);
    }

    // 用户标签筛选
    if (activeUserTagIds.size > 0) {
      result = result.filter((d) =>
        d.user_tags?.some((t) => activeUserTagIds.has(t.id))
      );
    }

    // 排序
    result.sort((a, b) => {
      if (sortBy === "date") {
        return (b.uploaded_at || "").localeCompare(a.uploaded_at || "");
      }
      if (sortBy === "field") {
        return (a.primary_field || "其他").localeCompare(b.primary_field || "其他");
      }
      return a.filename.localeCompare(b.filename);
    });

    return result;
  }, [docs, keyword, activePrimary, activeUserTagIds, sortBy]);

  // ── 选择操作 ──

  const toggleSelect = (filename: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFiles(new Set(filteredDocs.map((d) => d.filename)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // ── 导出 ──

  const handleExport = async (format: "json" | "csv") => {
    const filenames = Array.from(selectedFiles);
    if (filenames.length === 0) return;
    try {
      if (format === "csv") {
        await exportDocuments(filenames, "csv");
      } else {
        const data = await exportDocuments(filenames, "json");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "library_export.json";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── 子集研究 ──

  const handleResearchSelected = () => {
    const filenames = Array.from(selectedFiles);
    if (filenames.length === 0) return;
    const params = new URLSearchParams({ filenames: filenames.join(",") });
    window.location.href = `/?${params.toString()}`;
  };

  // ── 批量删除 ──

  const handleDeleteSelected = async () => {
    const filenames = Array.from(selectedFiles);
    if (filenames.length === 0) return;
    if (!confirm(`确定删除 ${filenames.length} 篇文献？此操作不可撤销。`)) return;
    for (const f of filenames) {
      try {
        await deleteDocument(f);
      } catch (e) {
        console.error(`删除 ${f} 失败:`, e);
      }
    }
    setSelectedFiles(new Set());
    loadData();
  };

  // ── 上传 ──

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── 用户标签筛选 ──

  const toggleUserTag = (tagId: string) => {
    setActiveUserTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  // ── 文献详情 ──

  const openDetail = (doc: LibraryDoc) => {
    setDetailDoc(doc);
  };

  const closeDetail = () => {
    setDetailDoc(null);
  };

  // 当详情面板打开并刷新后，同步更新 detailDoc
  const handleRefresh = useCallback(async () => {
    await loadData();
    // loadData 会更新 docs，但 detailDoc 需要手动同步
  }, [loadData]);

  // 同步 detailDoc
  useEffect(() => {
    if (detailDoc) {
      const updated = docs.find((d) => d.filename === detailDoc.filename);
      if (updated) setDetailDoc(updated);
    }
  }, [docs]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">我的文献库</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理上传的文献、查看标签、筛选与研究
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← 返回研究
            </a>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* 左侧筛选栏 */}
            <SideFilters
              tagStats={tagStats}
              userTags={userTags}
              activePrimary={activePrimary}
              activeUserTagIds={activeUserTagIds}
              onPrimaryClick={setActivePrimary}
              onUserTagClick={toggleUserTag}
              onManageTags={() => setShowTagManager(true)}
            />

            {/* 右侧主内容 */}
            <div className="flex-1 min-w-0">
              {/* 工具栏 */}
              <Toolbar
                keyword={keyword}
                onKeywordChange={setKeyword}
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedCount={selectedFiles.size}
                totalCount={filteredDocs.length}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onExport={handleExport}
                onResearchSelected={handleResearchSelected}
                onDeleteSelected={handleDeleteSelected}
                onUpload={handleUpload}
              />

              {/* 上传状态 */}
              {uploading && (
                <div className="mb-4 px-4 py-2 bg-sky-50 text-sky-700 text-sm rounded-lg flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
                  正在上传和解析文献...
                </div>
              )}

              {/* 文献网格 */}
              <DocGrid
                docs={filteredDocs}
                selectedFiles={selectedFiles}
                onSelect={toggleSelect}
                onDocClick={openDetail}
              />
            </div>
          </div>
        )}
      </div>

      {/* 详情抽屉 */}
      <DocDetailDrawer
        doc={detailDoc}
        allUserTags={userTags}
        onClose={closeDetail}
        onRefresh={handleRefresh}
      />

      {/* 标签管理弹窗 */}
      <TagManagerModal
        open={showTagManager}
        tags={userTags}
        onClose={() => setShowTagManager(false)}
        onRefresh={loadData}
      />
    </div>
  );
}
