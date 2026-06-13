"use client";

import React from "react";
import type { UserTag, TagStats } from "@/helpers/libraryApi";

interface SideFiltersProps {
  tagStats: TagStats | null;
  userTags: UserTag[];
  activePrimary: string | null;
  activeUserTagIds: Set<string>;
  onPrimaryClick: (field: string | null) => void;
  onUserTagClick: (tagId: string) => void;
  onManageTags: () => void;
}

export default function SideFilters({
  tagStats,
  userTags,
  activePrimary,
  activeUserTagIds,
  onPrimaryClick,
  onUserTagClick,
  onManageTags,
}: SideFiltersProps) {
  const primaryFields = tagStats?.primary_fields
    ? Object.entries(tagStats.primary_fields).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <aside className="w-56 flex-shrink-0 space-y-6">
      {/* 系统标签筛选 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          研究领域
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onPrimaryClick(null)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activePrimary === null
                ? "bg-sky-50 text-sky-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            全部
          </button>
          {primaryFields.map(([field, count]) => (
            <button
              key={field}
              onClick={() => onPrimaryClick(field === activePrimary ? null : field)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex justify-between items-center ${
                activePrimary === field
                  ? "bg-sky-50 text-sky-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="truncate">{field}</span>
              <span className="text-xs text-gray-400 ml-1">{count}</span>
            </button>
          ))}
          {primaryFields.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-1">暂无标签数据</p>
          )}
        </div>
      </div>

      {/* 用户标签筛选 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            我的标签
          </h3>
          <button
            onClick={onManageTags}
            className="text-xs text-sky-500 hover:text-sky-600"
            title="管理标签"
          >
            管理
          </button>
        </div>
        <div className="space-y-1">
          {userTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onUserTagClick(tag.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                activeUserTagIds.has(tag.id)
                  ? "bg-purple-50 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
          {userTags.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-1">
              暂无自定义标签
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
