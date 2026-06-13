"use client";

import React, { useRef } from "react";

interface ToolbarProps {
  keyword: string;
  onKeywordChange: (kw: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExport: (format: "json" | "csv") => void;
  onResearchSelected: () => void;
  onDeleteSelected: () => void;
  onUpload: (files: FileList) => void;
}

export default function Toolbar({
  keyword,
  onKeywordChange,
  sortBy,
  onSortChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onExport,
  onResearchSelected,
  onDeleteSelected,
  onUpload,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* 搜索框 */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="搜索文献名、关键词..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 bg-white"
        />
      </div>

      {/* 排序 */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        <option value="name">按名称</option>
        <option value="date">按时间</option>
        <option value="field">按领域</option>
      </select>

      {/* 上传按钮 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.md,.txt,.docx,.doc,.xlsx,.xls,.csv,.html"
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        上传
      </button>

      {/* 选择操作 */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">
            {selectedCount > 0 ? `已选 ${selectedCount}` : `共 ${totalCount} 篇`}
          </span>
          {selectedCount === 0 ? (
            <button
              onClick={onSelectAll}
              className="text-xs text-sky-500 hover:text-sky-600"
            >
              全选
            </button>
          ) : (
            <>
              <button
                onClick={onDeselectAll}
                className="text-xs text-gray-500 hover:text-gray-600"
              >
                取消
              </button>
              <button
                onClick={() => onExport("json")}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                导出JSON
              </button>
              <button
                onClick={() => onExport("csv")}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                导出CSV
              </button>
              <button
                onClick={onResearchSelected}
                className="text-xs px-2.5 py-1 rounded-md bg-sky-500 text-white hover:bg-sky-600"
              >
                研究选中
              </button>
              <button
                onClick={onDeleteSelected}
                className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100"
              >
                删除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
