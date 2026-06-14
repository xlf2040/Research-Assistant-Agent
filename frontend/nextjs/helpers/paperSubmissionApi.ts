/**
 * Paper Submission WebSocket API helpers
 */

/**
 * Send journal selection to backend via WebSocket
 */
export function sendSelectJournal(socket: WebSocket | null, journalId: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not connected');
    return;
  }
  const payload = JSON.stringify({ journal_id: journalId });
  socket.send(`select_journal ${payload}`);
}

/**
 * Build the start payload for paper_submission report type
 */
export function buildPaperSubmissionStartPayload(
  task: string,
  paperFilename: string,
  settings: Record<string, any>
): Record<string, any> {
  return {
    task: task || 'Paper Submission Analysis',
    report_type: 'paper_submission',
    report_source: 'local',
    source_urls: [],
    document_urls: [],
    tone: settings.tone || 'Objective',
    headers: {},
    query_domains: [],
    mcp_enabled: false,
    mcp_configs: [],
    mcp_strategy: 'fast',
    max_search_results: null,
    filenames: [paperFilename],
    paper_filename: paperFilename,
  };
}
