"use client";

import React from "react";
import DocCard from "./DocCard";
import type { LibraryDoc } from "@/helpers/libraryApi";

interface DocGridProps {
  docs: LibraryDoc[];
  selectedFiles: Set<string>;
  onSelect: (filename: string) => void;
  onDocClick: (doc: LibraryDoc) => void;
}

export default function DocGrid({ docs, selectedFiles, onSelect, onDocClick }: DocGridProps) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-lg font-medium">暂无文献</p>
        <p className="text-sm mt-1">上传文献后将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {docs.map((doc) => (
        <DocCard
          key={doc.filename}
          doc={doc}
          selected={selectedFiles.has(doc.filename)}
          onSelect={onSelect}
          onClick={onDocClick}
        />
      ))}
    </div>
  );
}
