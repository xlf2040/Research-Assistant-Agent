import React, { useState } from "react";

interface DownloadActionsProps {
  files?: {
    md?: string;
    pdf?: string;
    annotations?: string;
  };
}

export default function DownloadActions({ files }: DownloadActionsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!files) return null;

  const handleDownload = async (filePath: string, label: string) => {
    setDownloading(label);
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(`/api/outputs/${encodedPath}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filePath.split("/").pop() || "report";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Download error for ${label}:`, error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 justify-center z-10">
      {files.md && (
        <button
          type="button"
          onClick={() => handleDownload(files.md!, "md")}
          disabled={downloading === "md"}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {downloading === "md" ? (
            <Spinner />
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          Markdown
        </button>
      )}

      {files.pdf && (
        <button
          type="button"
          onClick={() => handleDownload(files.pdf!, "pdf")}
          disabled={downloading === "pdf"}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
        >
          {downloading === "pdf" ? (
            <Spinner />
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          PDF
        </button>
      )}

      {files.annotations && (
        <button
          type="button"
          onClick={() => handleDownload(files.annotations!, "annotations")}
          disabled={downloading === "annotations"}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {downloading === "annotations" ? (
            <Spinner />
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          批注 JSON
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
