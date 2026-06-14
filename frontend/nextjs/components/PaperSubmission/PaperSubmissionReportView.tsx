import React, { useState, useCallback, useRef } from "react";
import { JournalCandidate, Finding, Annotation, PaperSubmissionMessage } from "@/types/data";
import JournalRecommendationGrid from "./JournalRecommendationGrid";
import CritiqueReportView from "./CritiqueReportView";

type Stage = "parsing" | "journals" | "selecting" | "critiquing" | "complete";

const PROGRESS_STEPS = [
  { key: "parsing", label: "解析论文" },
  { key: "journals", label: "检索期刊" },
  { key: "selecting", label: "选择期刊" },
  { key: "critiquing", label: "生成报告" },
];

const TOTAL_DIMENSIONS = 16;

interface PaperSubmissionReportViewProps {
  orderedMessages: PaperSubmissionMessage[];
  onSelectJournal: (journalId: string) => void;
  onNewResearch?: () => void;
}

export default function PaperSubmissionReportView({
  orderedMessages,
  onSelectJournal,
  onNewResearch,
}: PaperSubmissionReportViewProps) {
  // Derived state from messages
  const [stage, setStage] = useState<Stage>("parsing");
  const [paperTitle, setPaperTitle] = useState<string>("");
  const [paperKeywords, setPaperKeywords] = useState<string[]>([]);
  const [primaryField, setPrimaryField] = useState<string>("");
  const [journals, setJournals] = useState<JournalCandidate[]>([]);
  const [journalsComplete, setJournalsComplete] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [completedDimensions, setCompletedDimensions] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [files, setFiles] = useState<{ md?: string; pdf?: string; annotations?: string }>({});
  const [progressMessages, setProgressMessages] = useState<string[]>([]);

  // Process incoming messages
  const processMessage = useCallback((msg: PaperSubmissionMessage) => {
    switch (msg.type) {
      case "paper_parsed":
        setPaperTitle(msg.title || "");
        setPaperKeywords(msg.keywords || []);
        setPrimaryField(msg.primary_field || "");
        setStage("journals");
        break;

      case "journal_card":
        if (msg.payload) {
          setJournals((prev) => [...prev, msg.payload as JournalCandidate]);
        }
        setStage("journals");
        break;

      case "journals_complete":
        setJournalsComplete(true);
        setStage("selecting");
        break;

      case "critique_section":
        if (msg.findings) {
          setFindings((prev) => [...prev, ...msg.findings!]);
        }
        if (msg.dimension) {
          setCompletedDimensions((prev) => new Set([...prev, msg.dimension!]));
        }
        setStage("critiquing");
        break;

      case "annotations_ready":
        if (msg.annotations) setAnnotations(msg.annotations);
        if (msg.files) setFiles(msg.files);
        setStage("complete");
        break;

      case "progress":
        if (msg.content) {
          setProgressMessages((prev) => [...prev, msg.content!]);
          // Auto-detect stage from progress messages
          if (msg.content.includes("解析")) setStage("parsing");
          else if (msg.content.includes("检索") || msg.content.includes("候选期刊")) setStage("journals");
          else if (msg.content.includes("投稿指南") || msg.content.includes("审查")) setStage("critiquing");
          else if (msg.content.includes("完毕")) setStage("complete");
        }
        break;

      case "error":
        setProgressMessages((prev) => [...prev, `❌ ${msg.content || "未知错误"}`]);
        break;
    }
  }, []);

  // Process new messages — 关键：用游标追踪已处理消息数，支持「批量回放」（如从历史会话恢复时一次性灌入全部消息）
  const processedCountRef = useRef(0);
  React.useEffect(() => {
    if (orderedMessages.length === 0) {
      processedCountRef.current = 0;
      return;
    }
    // 检测重置：消息总数比已处理的还少，说明换了一个新会话
    if (orderedMessages.length < processedCountRef.current) {
      processedCountRef.current = 0;
    }
    // 处理所有尚未处理过的消息
    for (let i = processedCountRef.current; i < orderedMessages.length; i++) {
      processMessage(orderedMessages[i]);
    }
    processedCountRef.current = orderedMessages.length;
  }, [orderedMessages, processMessage]);

  const handleSelectJournal = (journalId: string) => {
    setStage("critiquing");
    onSelectJournal(journalId);
  };

  // Current step index
  const currentStepIdx = PROGRESS_STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top bar: back button + progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
          {PROGRESS_STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    idx <= currentStepIdx
                      ? "bg-sky-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {idx < currentStepIdx ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`ml-2 text-sm ${idx <= currentStepIdx ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {idx < PROGRESS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${idx < currentStepIdx ? "bg-sky-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Back to research button — top-right corner */}
        {stage === "complete" && onNewResearch && (
          <button
            onClick={onNewResearch}
            className="ml-4 flex-shrink-0 inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium text-sm hover:bg-sky-600 transition-colors shadow-sm whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            返回研究
          </button>
        )}
      </div>

      {/* Paper info card */}
      {paperTitle && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900">{paperTitle}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {primaryField && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                {primaryField}
              </span>
            )}
            {paperKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Latest progress message */}
      {progressMessages.length > 0 && stage !== "complete" && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          {stage !== "selecting" && (
            <svg className="animate-spin h-4 w-4 text-sky-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {progressMessages[progressMessages.length - 1]}
        </div>
      )}

      {/* Stage-specific content */}
      {(stage === "journals" || stage === "selecting") && (
        <JournalRecommendationGrid
          journals={journals}
          onSelectJournal={handleSelectJournal}
          isComplete={journalsComplete}
        />
      )}

      {(stage === "critiquing" || stage === "complete") && (
        <CritiqueReportView
          findings={findings}
          completedDimensions={completedDimensions}
          totalDimensions={TOTAL_DIMENSIONS}
          annotations={annotations}
          files={files}
          isComplete={stage === "complete"}
        />
      )}

      {/* Parsing loading state */}
      {stage === "parsing" && !paperTitle && (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 mx-auto text-sky-500 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">正在解析论文...</p>
        </div>
      )}
    </div>
  );
}
