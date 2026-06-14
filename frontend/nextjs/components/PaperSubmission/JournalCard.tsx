import React from "react";
import { JournalCandidate } from "@/types/data";

interface JournalCardProps {
  journal: JournalCandidate;
  onSelect: (journalId: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#0EA5E9";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

export default function JournalCard({ journal, onSelect }: JournalCardProps) {
  const [showReason, setShowReason] = React.useState(false);
  const scoreColor = getScoreColor(journal.match_score);

  // SVG circle progress
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (journal.match_score / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {journal.name}
          </h3>
          {journal.issn && (
            <p className="text-xs text-gray-400 mt-0.5">ISSN: {journal.issn}</p>
          )}
          {journal.publisher && (
            <p className="text-xs text-gray-500 mt-0.5">{journal.publisher}</p>
          )}
        </div>

        {/* Match score circle */}
        <div className="flex-shrink-0 relative" style={{ width: 76, height: 76 }}>
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle
              cx="38" cy="38" r={radius}
              fill="none" stroke="#E5E7EB" strokeWidth="5"
            />
            <circle
              cx="38" cy="38" r={radius}
              fill="none" stroke={scoreColor} strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 38 38)"
              className="transition-all duration-500"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-lg font-bold"
            style={{ color: scoreColor }}
          >
            {journal.match_score}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {journal.impact_factor != null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            IF {journal.impact_factor.toFixed(1)}
          </span>
        )}
        {journal.is_open_access && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            Open Access
          </span>
        )}
        {journal.avg_review_weeks != null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            审稿 ~{journal.avg_review_weeks}周
          </span>
        )}
      </div>

      {/* Scope */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{journal.scope}</p>

      {/* Match reason (collapsible) */}
      <button
        type="button"
        className="text-xs text-sky-600 hover:text-sky-700 text-left mb-3"
        onClick={() => setShowReason(!showReason)}
      >
        {showReason ? "收起匹配理由 ▲" : "查看匹配理由 ▼"}
      </button>
      {showReason && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3">
          {journal.match_reason}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {journal.homepage && (
          <a
            href={journal.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            访问官网
          </a>
        )}
        <button
          type="button"
          onClick={() => onSelect(journal.journal_id)}
          className="flex-1 px-3 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
        >
          选择此期刊
        </button>
      </div>
    </div>
  );
}
