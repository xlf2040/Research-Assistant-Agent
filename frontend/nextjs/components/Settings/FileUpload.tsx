import React from "react";

const FileUpload = () => {
  return (
    <div className="mb-4 w-full">
      <a
        href="/library"
        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-sky-300 hover:shadow-sm transition-all duration-200 group"
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-50 text-sky-500 group-hover:bg-sky-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">我的文献库</p>
          <p className="text-xs text-gray-500 mt-0.5">管理文献、打标签、筛选与子集研究</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-sky-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
};

export default FileUpload;
