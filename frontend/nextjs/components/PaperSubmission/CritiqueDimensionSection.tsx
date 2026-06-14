import React, { useState } from "react";
import { Finding } from "@/types/data";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  major: { label: "Major", color: "#F59E0B", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  minor: { label: "Minor", color: "#3B82F6", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
};

interface CritiqueDimensionSectionProps {
  dimensionId: string;
  dimensionName: string;
  findings: Finding[];
  checkedItems: Set<string>;
  onToggleChecked: (findingKey: string) => void;
  onJumpToAnnotation?: (finding: Finding) => void;
  severityFilter: Set<string>;
}

export default function CritiqueDimensionSection({
  dimensionId,
  dimensionName,
  findings,
  checkedItems,
  onToggleChecked,
  onJumpToAnnotation,
  severityFilter,
}: CritiqueDimensionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredFindings = findings.filter(
    (f) => severityFilter.size === 0 || severityFilter.has(f.severity)
  );

  const severityCounts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    major: findings.filter((f) => f.severity === "major").length,
    minor: findings.filter((f) => f.severity === "minor").length,
  };

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden" id={`dim-${dimensionId}`}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{dimensionName}</span>
          <span className="text-xs text-gray-500">({filteredFindings.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {severityCounts.critical > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500" title={`${severityCounts.critical} critical`} />
          )}
          {severityCounts.major > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title={`${severityCounts.major} major`} />
          )}
          {severityCounts.minor > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-500" title={`${severityCounts.minor} minor`} />
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Findings list */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {filteredFindings.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">无匹配的发现</p>
          ) : (
            filteredFindings.map((finding, idx) => {
              const key = `${dimensionId}-${idx}`;
              const severity = SEVERITY_CONFIG[finding.severity];
              const isChecked = checkedItems.has(key);

              return (
                <div
                  key={key}
                  className={`px-4 py-3 flex gap-3 ${isChecked ? "opacity-50" : ""}`}
                >
                  {/* Severity indicator */}
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: severity.color }}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Location & severity */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${severity.bg} ${severity.text}`}>
                        {severity.label}
                      </span>
                      {finding.section && (
                        <span className="text-xs text-gray-400">
                          § {finding.section}
                          {finding.paragraphIdx != null && ` · 段落 ${finding.paragraphIdx + 1}`}
                          {finding.lineRange && ` · 行 ${finding.lineRange[0]}-${finding.lineRange[1]}`}
                        </span>
                      )}
                    </div>

                    {/* Snippet */}
                    {finding.snippet && (
                      <blockquote className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2 border-l-2 border-gray-300 line-clamp-2">
                        {finding.snippet}
                      </blockquote>
                    )}

                    {/* Issue */}
                    <p className="text-sm text-gray-800 mb-1">
                      <strong>问题：</strong>{finding.issue}
                    </p>

                    {/* Suggestion */}
                    <p className="text-sm text-gray-600">
                      <strong>建议：</strong>{finding.suggestion}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <label className="flex items-center cursor-pointer" title="标记为已修改">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleChecked(key)}
                        className="w-4 h-4 text-sky-500 rounded"
                      />
                    </label>
                    {onJumpToAnnotation && (
                      <button
                        type="button"
                        onClick={() => onJumpToAnnotation(finding)}
                        className="text-gray-400 hover:text-sky-500 transition-colors"
                        title="跳转到原文"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
