"use client";

import React, { useState } from "react";
import type { UserTag } from "@/helpers/libraryApi";

interface TagEditorProps {
  assignedTags: UserTag[];
  allUserTags: UserTag[];
  onAssign: (tagId: string) => void;
  onUnassign: (tagId: string) => void;
}

export default function TagEditor({ assignedTags, allUserTags, onAssign, onUnassign }: TagEditorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const available = allUserTags.filter((t) => !assignedIds.has(t.id));

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        我的标签
      </h4>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => onUnassign(tag.id)}
              className="ml-0.5 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ×
            </button>
          </span>
        ))}
        {/* 添加按钮 */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500"
          >
            + 添加标签
          </button>
          {showDropdown && available.length > 0 && (
            <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onAssign(tag.id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {showDropdown && available.length === 0 && (
            <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
              没有更多标签了
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
