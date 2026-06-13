"use client";

import React, { useState } from "react";
import type { UserTag } from "@/helpers/libraryApi";
import { createUserTag, updateUserTag, deleteUserTag } from "@/helpers/libraryApi";

interface TagManagerModalProps {
  open: boolean;
  tags: UserTag[];
  onClose: () => void;
  onRefresh: () => void;
}

const PRESET_COLORS = [
  "#8B5CF6", "#7C3AED", "#6D28D9", "#A78BFA",
  "#C084FC", "#E879F9", "#D946EF", "#EC4899",
  "#F43F5E", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#14B8A6", "#0EA5E9", "#6366F1",
];

export default function TagManagerModal({ open, tags, onClose, onRefresh }: TagManagerModalProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createUserTag(newName.trim(), newColor);
      setNewName("");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (tagId: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await updateUserTag(tagId, editName.trim());
      setEditingId(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm("确定删除此标签？已关联的文献将取消关联。")) return;
    setLoading(true);
    try {
      await deleteUserTag(tagId);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">管理标签</h2>

        {/* 创建新标签 */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="新标签名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          {/* 颜色选择 */}
          <div className="relative group">
            <button
              className="w-8 h-8 rounded-lg border border-gray-200"
              style={{ backgroundColor: newColor }}
            />
            <div className="hidden group-hover:grid absolute bottom-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid-cols-4 gap-1 z-10">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full ${c === newColor ? "ring-2 ring-offset-1 ring-sky-400" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !newName.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
          >
            添加
          </button>
        </div>

        {/* 标签列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50"
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {editingId === tag.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                  onBlur={() => setEditingId(null)}
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm text-gray-700">{tag.name}</span>
              )}
              <button
                onClick={() => {
                  setEditingId(tag.id);
                  setEditName(tag.name);
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(tag.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                删除
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">还没有标签，创建一个吧</p>
          )}
        </div>

        {/* 关闭 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
