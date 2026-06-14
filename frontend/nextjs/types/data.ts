export interface BaseData {
  type: string;
}

export interface BasicData extends BaseData {
  type: 'basic';
  content: string;
}

export interface LanggraphButtonData extends BaseData {
  type: 'langgraphButton';
  link: string;
}

export interface DifferencesData extends BaseData {
  type: 'differences';
  content: string;
  output: string;
}

export interface QuestionData extends BaseData {
  type: 'question';
  content: string;
}

export interface ChatData extends BaseData {
  type: 'chat';
  content: string;
  metadata?: any; // For storing search results and other contextual information
}

export type Data = BasicData | LanggraphButtonData | DifferencesData | QuestionData | ChatData;

export interface MCPConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface ChatBoxSettings {
  report_type: string;
  report_source: string;
  tone: string;
  domains: string[];
  defaultReportType: string;
  layoutType: string;
  mcp_enabled: boolean;
  mcp_configs: MCPConfig[];
  mcp_strategy?: string;
  paper_filename?: string;
}

// Paper Submission types
export interface JournalCandidate {
  journal_id: string;
  name: string;
  issn?: string;
  publisher?: string;
  impact_factor?: number;
  scope: string;
  homepage?: string;
  is_open_access: boolean;
  avg_review_weeks?: number;
  match_score: number;
  match_reason: string;
}

export interface Finding {
  dimension: string;
  dimensionName?: string;
  severity: 'critical' | 'major' | 'minor';
  section?: string;
  paragraphIdx?: number;
  lineRange?: number[];
  snippet?: string;
  issue: string;
  suggestion: string;
}

export interface Annotation extends Finding {
  id: string;
}

export interface PaperSubmissionMessage {
  type: 'paper_parsed' | 'journal_card' | 'journals_complete'
    | 'critique_section' | 'annotations_ready' | 'progress' | 'error';
  payload?: any;
  // paper_parsed fields
  title?: string;
  keywords?: string[];
  primary_field?: string;
  sections_count?: number;
  // journal_card fields  
  // critique_section fields
  dimension?: string;
  dimension_name?: string;
  findings?: Finding[];
  count?: number;
  // annotations_ready fields
  annotations?: Annotation[];
  files?: { md?: string; pdf?: string; annotations?: string };
  // progress/error fields
  content?: string;
}

export interface Domain {
  value: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  metadata?: any; // For storing search results and other contextual information
}

export interface ResearchHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  orderedData: Data[];
  chatMessages?: ChatMessage[];
  /** 用于区分历史会话类型，例如 "research_report" / "paper_submission" 等；缺省视为普通研究报告 */
  report_type?: string;
}

export interface UserTagInfo {
  id: string;
  name: string;
  color: string;
}

export interface LibraryDocument {
  filename: string;
  primary_field?: string;
  subfields?: string[];
  keywords?: string[];
  summary?: string;
  uploaded_at?: string;
  chunks?: number;
  sha256?: string;
  status?: string;
  user_tags?: UserTagInfo[];
}

export interface LibraryTagStats {
  primary_fields: Record<string, number>;
  subfields: Record<string, number>;
  keywords: Record<string, number>;
}