import React, { useState, useMemo } from "react";
import { Finding, Annotation } from "@/types/data";
import CritiqueDimensionSection from "./CritiqueDimensionSection";
import DownloadActions from "./DownloadActions";

const DIMENSION_NAMES: Record<string, string> = {
  format: "格式规范",
  title_abstract: "标题与摘要",
  keywords: "关键词",
  introduction: "引言质量",
  methodology: "方法可复现性",
  results_discussion: "结果与讨论",
  figures_tables: "图表规范",
  citations: "文献引用",
  grammar_spelling: "语法拼写",
  terminology: "专业术语",
  consistency: "用词一致性",
  logical_coherence: "逻辑连贯性",
  declarations: "必备声明",
  author_format: "作者署名",
  anonymization: "匿名化检查",
  cover_letter: "投稿信建议",
};

interface CritiqueReportViewProps {
  findings: Finding[];
  completedDimensions: Set<string>;
  totalDimensions: number;
  annotations?: Annotation[];
  files?: { md?: string; pdf?: string; annotations?: string };
  isComplete: boolean;
}

export default function CritiqueReportView({
  findings,
  completedDimensions,
  totalDimensions,
  annotations,
  files,
  isComplete,
}: CritiqueReportViewProps) {
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showCheckedOnly, setShowCheckedOnly] = useState(false);

  // Group findings by dimension
  const groupedFindings = useMemo(() => {
    const groups: Record<string, Finding[]> = {};
    for (const dimId of Object.keys(DIMENSION_NAMES)) {
      const dimFindings = findings.filter((f) => f.dimension === dimId);
      if (dimFindings.length > 0) {
        groups[dimId] = dimFindings;
      }
    }
    // Include any unknown dimensions
    for (const f of findings) {
      if (!groups[f.dimension]) {
        groups[f.dimension] = findings.filter((ff) => ff.dimension === f.dimension);
      }
    }
    return groups;
  }, [findings]);

  // Statistics
  const stats = useMemo(() => {
    const s = { critical: 0, major: 0, minor: 0, total: findings.length };
    findings.forEach((f) => {
      if (f.severity in s) s[f.severity as keyof typeof s]++;
    });
    return s;
  }, [findings]);

  const toggleSeverity = (sev: string) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleJumpToAnnotation = (finding: Finding) => {
    const dimEl = document.getElementById(`dim-${finding.dimension}`);
    if (dimEl) dimEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const progressPercent = totalDimensions > 0
    ? Math.round((completedDimensions.size / totalDimensions) * 100)
    : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left sidebar: dimension navigation */}
      <div className="lg:w-60 flex-shrink-0">
        <div className="sticky top-4 bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">检查维度</h3>
          <div className="space-y-1">
            {Object.entries(DIMENSION_NAMES).map(([dimId, dimName]) => {
              const dimFindings = groupedFindings[dimId];
              const isDone = completedDimensions.has(dimId);
              const count = dimFindings ? dimFindings.length : 0;

              return (
                <a
                  key={dimId}
                  href={`#dim-${dimId}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className={isDone ? "text-gray-900" : "text-gray-400"}>
                    {dimName}
                  </span>
                  <span className="flex items-center gap-1">
                    {!isDone && !isComplete && (
                      <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        {count}
                      </span>
                    )}
                    {isDone && count === 0 && (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top toolbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 mb-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Severity toggles */}
              <button
                type="button"
                onClick={() => toggleSeverity("critical")}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                  severityFilter.has("critical")
                    ? "bg-red-500 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                Critical ({stats.critical})
              </button>
              <button
                type="button"
                onClick={() => toggleSeverity("major")}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                  severityFilter.has("major")
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Major ({stats.major})
              </button>
              <button
                type="button"
                onClick={() => toggleSeverity("minor")}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                  severityFilter.has("minor")
                    ? "bg-blue-500 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                Minor ({stats.minor})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                总计 {stats.total} 项 · 已修改 {checkedItems.size} 项
              </span>
              {/* Progress bar */}
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Dimension sections */}
        {Object.entries(groupedFindings).map(([dimId, dimFindings]) => (
          <CritiqueDimensionSection
            key={dimId}
            dimensionId={dimId}
            dimensionName={DIMENSION_NAMES[dimId] || dimId}
            findings={dimFindings}
            checkedItems={checkedItems}
            onToggleChecked={toggleChecked}
            onJumpToAnnotation={handleJumpToAnnotation}
            severityFilter={severityFilter}
          />
        ))}

        {/* Loading state for pending dimensions */}
        {!isComplete && (
          <div className="text-center py-8">
            <svg className="animate-spin h-6 w-6 mx-auto text-sky-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">
              正在审查更多维度... ({completedDimensions.size}/{totalDimensions})
            </p>
          </div>
        )}

        {/* Download actions */}
        {isComplete && <DownloadActions files={files} />}
      </div>
    </div>
  );
}
