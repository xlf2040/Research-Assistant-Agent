"use client";

import React from "react";
import type { LibraryDoc, UserTag } from "@/helpers/libraryApi";

// 文件图标映射
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    pdf: "📄",
    md: "📝",
    txt: "📃",
    docx: "📘",
    doc: "📘",
    xlsx: "📊",
    xls: "📊",
    csv: "📊",
    html: "🌐",
  };
  return iconMap[ext] || "📎";
}

interface DocCardProps {
  doc: LibraryDoc;
  selected: boolean;
  onSelect: (filename: string) => void;
  onClick: (doc: LibraryDoc) => void;
}

export default function DocCard({ doc, selected, onSelect, onClick }: DocCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
        selected ? "border-sky-400 ring-2 ring-sky-100" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={() => onClick(doc)}
    >
      {/* 选择框 */}
      <div
        className="absolute top-3 left-3 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(doc.filename);
        }}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? "bg-sky-500 border-sky-500 text-white"
              : "border-gray-300 group-hover:border-gray-400"
          }`}
        >
          {selected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="p-4 pt-10">
        {/* 文件名 + 图标 */}
        <div className="flex items-start gap-2 mb-2">
          <span className="text-xl flex-shrink-0">{getFileIcon(doc.filename)}</span>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 break-all leading-5">
            {doc.filename}
          </h3>
        </div>

        {/* 摘要 */}
        {doc.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-4">{doc.summary}</p>
        )}

        {/* 系统标签 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {doc.primary_field && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
              {doc.primary_field}
            </span>
          )}
          {doc.subfields?.slice(0, 2).map((sf) => (
            <span
              key={sf}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-50/60 text-sky-600 border border-sky-100"
            >
              {sf}
            </span>
          ))}
          {(doc.subfields?.length || 0) > 2 && (
            <span className="text-xs text-gray-400">+{(doc.subfields?.length || 0) - 2}</span>
          )}
        </div>

        {/* 用户标签 */}
        {doc.user_tags && doc.user_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {doc.user_tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {doc.user_tags.length > 3 && (
              <span className="text-xs text-gray-400">+{doc.user_tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
          <span>{doc.chunks ? `${doc.chunks} chunks` : ""}</span>
          <span>
            {doc.status === "indexed" ? "✓ 已索引" : doc.status === "unindexed" ? "未索引" : doc.status || ""}
          </span>
        </div>
      </div>
    </div>
  );
}
