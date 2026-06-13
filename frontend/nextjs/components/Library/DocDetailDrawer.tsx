"use client";

import React, { useState } from "react";
import type { LibraryDoc, UserTag } from "@/helpers/libraryApi";
import { renameDocument, deleteDocument, getPreviewUrl, assignUserTag } from "@/helpers/libraryApi";
import TagEditor from "./TagEditor";

interface DocDetailDrawerProps {
  doc: LibraryDoc | null;
  allUserTags: UserTag[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function DocDetailDrawer({ doc, allUserTags, onClose, onRefresh }: DocDetailDrawerProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "preview">("info");

  if (!doc) return null;

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === doc.filename) {
      setIsRenaming(false);
      return;
    }
    try {
      await renameDocument(doc.filename, newName.trim());
      setIsRenaming(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除 "${doc.filename}"？此操作不可撤销。`)) return;
    try {
      await deleteDocument(doc.filename);
      onClose();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssign = async (tagId: string) => {
    try {
      await assignUserTag(doc.filename, tagId, "assign");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnassign = async (tagId: string) => {
    try {
      await assignUserTag(doc.filename, tagId, "unassign");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const previewUrl = getPreviewUrl(doc.filename);
  const ext = doc.filename.split(".").pop()?.toLowerCase() || "";
  const canPreview = ["pdf", "md", "txt", "html", "csv"].includes(ext);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <button onClick={handleRename} className="text-xs text-sky-500">确定</button>
                <button onClick={() => setIsRenaming(false)} className="text-xs text-gray-400">取消</button>
              </div>
            ) : (
              <h2 className="text-base font-semibold text-gray-900 truncate">{doc.filename}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => { setIsRenaming(true); setNewName(doc.filename); }}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="重命名"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-600"
              title="删除"
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            详情
          </button>
          {canPreview && (
            <button
              onClick={() => setActiveTab("preview")}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "preview"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              预览
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {activeTab === "info" ? (
            <>
              {/* 系统标签 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  系统标签
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {doc.primary_field && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                      {doc.primary_field}
                    </span>
                  )}
                  {doc.subfields?.map((sf) => (
                    <span key={sf} className="px-2.5 py-1 rounded-full text-xs bg-sky-50/60 text-sky-600 border border-sky-100">
                      {sf}
                    </span>
                  ))}
                  {doc.keywords?.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* 用户标签 */}
              <TagEditor
                assignedTags={doc.user_tags || []}
                allUserTags={allUserTags}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />

              {/* 摘要 */}
              {doc.summary && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    摘要
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{doc.summary}</p>
                </div>
              )}

              {/* 元信息 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  元信息
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-400">Chunks</dt>
                  <dd className="text-gray-700">{doc.chunks ?? "—"}</dd>
                  <dt className="text-gray-400">状态</dt>
                  <dd className="text-gray-700">{doc.status || "—"}</dd>
                  <dt className="text-gray-400">上传时间</dt>
                  <dd className="text-gray-700">
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString("zh-CN") : "—"}
                  </dd>
                  <dt className="text-gray-400">SHA256</dt>
                  <dd className="text-gray-700 truncate text-xs font-mono">{doc.sha256 || "—"}</dd>
                </dl>
              </div>
            </>
          ) : (
            /* Preview */
            <div className="h-full min-h-[400px]">
              {ext === "pdf" ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg border border-gray-200"
                  title="PDF 预览"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg border border-gray-200"
                  title="文件预览"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
