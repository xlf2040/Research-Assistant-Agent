import React, { useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import Image from "next/image";
import { chatBoxSettings } from "@/types/data";
import { useResearchHistoryContext } from "@/hooks/ResearchHistoryContext";
import { formatDistanceToNow } from "date-fns";

interface Mobile布局Props {
  children: React.ReactNode;
  loading: boolean;
  isStopped: boolean;
  showResult: boolean;
  onStop?: () => void;
  onNewResearch?: () => void;
  chatBoxSettings: chatBoxSettings;
  setChatBoxSettings: React.Dispatch<React.SetStateAction<chatBoxSettings>>;
  mainContentRef?: React.RefObject<HTMLDivElement>;
  toastOptions?: Record<string, any>;
  toggleSidebar?: () => void;
}

export default function Mobile布局({
  children,
  loading,
  isStopped,
  showResult,
  onStop,
  onNewResearch,
  chatBoxSettings,
  setChatBoxSettings,
  mainContentRef,
  toastOptions = {},
  toggleSidebar
}: Mobile布局Props) {
  const defaultRef = useRef<HTMLDivElement>(null);
  const contentRef = mainContentRef || defaultRef;
  const [show设置, setShow设置] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Get research history from context
  const { history, renameResearch } = useResearchHistoryContext();
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: number | string | Date | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown time';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };
  
  // Handle history item selection
  const handleHistoryItemClick = (id: string) => {
    setShowHistory(false);
    window.location.href = `/research/${id}`;
  };
  
  // Start editing a history item name
  const startEditing = (id: string, currentQuestion: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentQuestion);
    // Focus after render
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  // Save the edited name
  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      renameResearch(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  // Handle key down in edit input
  const handleEditKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };
  
  return (
    <main className="flex flex-col min-h-screen bg-gray-900">
      <Toaster 
        position="bottom-center" 
        toastOptions={toastOptions}
      />
      
      {/* Mobile Header - simplified and compact */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 border-b border-gray-800/50 shadow-md">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img
                src="/img/gptr-logo.png"
                alt="科研agent助手"
                width={30}
                height={30}
                className="rounded-md mr-2"
              />
              <span className="font-medium text-gray-200 text-sm">科研agent助手</span>
            </a>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {loading && (
              <button
                onClick={onStop}
                className="p-2 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30"
                aria-label="Stop research"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                </svg>
              </button>
            )}
            
            {showResult && onNewResearch && (
              <button
                onClick={onNewResearch}
                className="p-2 rounded-full bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                aria-label="New research"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                setShow设置(false);
                if (toggleSidebar) toggleSidebar();
              }}
              className="p-2 rounded-full bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
              aria-label="View history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
            
            <button
              onClick={() => {
                setShow设置(!show设置);
                setShowHistory(false);
              }}
              className="p-2 rounded-full bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
              aria-label="设置"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* History panel - slides down when active */}
        {showHistory && (
          <div className="px-4 py-3 bg-gray-800/90 border-t border-gray-700/50 animate-slide-down shadow-lg max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="mb-3 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">研究历史</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="relative">
                    {editingId === item.id ? (
                      <div className="bg-gray-900/60 rounded-lg p-3 border border-teal-500/50">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(item.id, e)}
                          onBlur={() => saveEdit(item.id)}
                          className="w-full bg-gray-700/60 border border-gray-600 rounded-md px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleHistoryItemClick(item.id)}
                        className="w-full bg-gray-900/60 hover:bg-gray-800 rounded-lg p-3 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500/50 border border-gray-700/30 group pr-16"
                      >
                        <h3 className="text-sm font-medium text-gray-200 line-clamp-1">{item.question}</h3>
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTimestamp(item.timestamp || (item as any).updated_at || (item as any).created_at)}
                        </p>
                      </button>
                    )}
                    {editingId !== item.id && (
                      <button
                        onClick={(e) => startEditing(item.id, item.question, e)}
                        className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-teal-400 hover:bg-gray-700"
                        aria-label="Rename research"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <p className="text-sm text-gray-400">暂无研究历史</p>
                <button 
                  onClick={onNewResearch} 
                  className="mt-3 px-4 py-2 text-xs text-teal-300 bg-teal-900/30 hover:bg-teal-800/40 rounded-md transition-colors"
                >
                  开始新研究
                </button>
              </div>
            )}
            
            {history.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-700/30 flex justify-center">
                <a 
                  href="/history" 
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  View All 研究历史
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* 设置 panel - slides down when active */}
        {show设置 && (
          <div className="px-4 py-3 bg-gray-800/90 border-t border-gray-700/50 animate-slide-down shadow-lg">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">设置</h3>
              <button 
                onClick={() => setShow设置(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">报告类型</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 px-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  value={chatBoxSettings.report_type}
                  onChange={(e) => setChatBoxSettings({...chatBoxSettings, report_type: e.target.value})}
                >
                  <option value="research_report">摘要 - 快速简短 (~2分钟)</option>
                  <option value="deep">深度研究报告</option>
                  <option value="multi_agents">多智能体报告</option>
                  <option value="detailed_report">详细 - 深入详尽 (~5分钟)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">研究来源</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 px-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  value={chatBoxSettings.report_source}
                  onChange={(e) => setChatBoxSettings({...chatBoxSettings, report_source: e.target.value})}
                >
                  <option value="web">网络</option>
                  <option value="scholar">学术</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">报告语气</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 px-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  value={chatBoxSettings.tone}
                  onChange={(e) => setChatBoxSettings({...chatBoxSettings, tone: e.target.value})}
                >
                  <option value="Objective">客观 - 公正无偏地呈现事实</option>
                  <option value="Formal">正式 - 遵循学术标准</option>
                  <option value="Analytical">分析型 - 批判性评估数据</option>
                  <option value="Persuasive">说服型 - 令人信服的观点</option>
                  <option value="Informative">信息型 - 清晰全面的信息</option>
                  <option value="Simple">简单 - 基础词汇清晰解释</option>
                  <option value="Casual">轻松 - 对话式风格</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">布局</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 px-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  value={chatBoxSettings.layoutType}
                  onChange={(e) => setChatBoxSettings({...chatBoxSettings, layoutType: e.target.value})}
                >
                  <option value="copilot">副驾驶 - 对话风格布局</option>
                  <option value="document">文档 - 传统报告布局</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Main content area */}
      <div 
        ref={contentRef}
        className="flex-1 pt-14" /* Matches header height */
      >
        {children}
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-3 px-4 text-center border-t border-gray-800/40 bg-gray-900/80">
        <div className="flex items-center justify-center gap-5 mb-3">
        </div>
        <div className="text-xs text-gray-400">
          © {new Date().getFullYear()} 科研agent助手. 保留所有权利。
        </div>
      </footer>
      
      {/* Custom animations */}
      <style jsx global>{`
        .animate-slide-down {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Custom scrollbar for history panel */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 20px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.7);
        }
        
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }
        
        @media (display-mode: standalone) {
          /* PWA specific styles */
          body {
            overscroll-behavior-y: contain;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            user-select: none;
          }
        }
      `}</style>
    </main>
  );
} 