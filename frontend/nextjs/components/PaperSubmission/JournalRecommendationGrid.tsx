import React from "react";
import { JournalCandidate } from "@/types/data";
import JournalCard from "./JournalCard";

interface JournalRecommendationGridProps {
  journals: JournalCandidate[];
  onSelectJournal: (journalId: string) => void;
  isComplete: boolean;
}

export default function JournalRecommendationGrid({
  journals,
  onSelectJournal,
  isComplete,
}: JournalRecommendationGridProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          推荐期刊 ({journals.length})
        </h2>
        {!isComplete && (
          <span className="flex items-center text-sm text-sky-600">
            <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            检索中...
          </span>
        )}
      </div>

      {journals.length === 0 && !isComplete ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {journals.map((journal, idx) => (
            <div
              key={journal.journal_id || idx}
              className="animate-fadeIn"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <JournalCard journal={journal} onSelect={onSelectJournal} />
            </div>
          ))}
        </div>
      )}

      {isComplete && journals.length > 0 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          请点击「选择此期刊」确定投稿目标，系统将生成针对性修改报告
        </p>
      )}
    </div>
  );
}
