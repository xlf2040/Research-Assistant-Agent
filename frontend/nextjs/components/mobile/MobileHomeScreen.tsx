import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchHistoryItem } from '@/types/data';
import { useResearchHistoryContext } from '@/hooks/ResearchHistoryContext';
import LoadingDots from '@/components/LoadingDots';
import { toast } from "react-hot-toast";

interface MobileHomeScreenProps {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: (newQuestion: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function MobileHomeScreen({
  promptValue,
  setPromptValue,
  handleDisplayResult,
  isLoading = false,
  placeholder = "今天想研究什么？",
  handleKeyDown
}: MobileHomeScreenProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { history, renameResearch } = useResearchHistoryContext();
  const [recentHistory, setRecentHistory] = useState<ResearchHistoryItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const submissionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get recent research history
  useEffect(() => {
    // Get the 3 most recent items
    if (history && history.length > 0) {
      setRecentHistory(history.slice(0, 3));
    }
  }, [history]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [promptValue]);

  // Clean up any timeouts on unmount
  useEffect(() => {
    return () => {
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
    };
  }, []);

  // Handle history item click
  const handleHistoryItemClick = useCallback((id: string) => {
    window.location.href = `/research/${id}`;
  }, []);

  // Start editing a history item name
  const startEditing = useCallback((id: string, currentQuestion: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentQuestion);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  }, []);

  // Save the edited name
  const saveEdit = useCallback((id: string) => {
    if (editValue.trim()) {
      renameResearch(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editValue, renameResearch]);

  // Handle key down in edit input
  const handleEditKeyDown = useCallback((id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  }, [saveEdit]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(e.target.value);
  }, [setPromptValue]);

  const handleSubmit = useCallback(async () => {
    // Don't submit if empty, already loading, or already submitting
    if (!promptValue.trim() || isLoading || isSubmitting) {
      return;
    }
    
    try {
      // Set submitting state for UI feedback
      setIsSubmitting(true);
      
      // Add a timeout as a safety measure to prevent infinite loading
      submissionTimeoutRef.current = setTimeout(() => {
        setIsSubmitting(false);
        toast.error("Research request took too long. Please try again.", {
          duration: 3000,
          position: "bottom-center"
        });
      }, 15000); // 15 second timeout
      
      // Create a new simplified direct API submission that won't use websockets
      try {
        // First show visual feedback
        const trimmedPrompt = promptValue.trim();
        
        // Call the display result handler from props
        await handleDisplayResult(trimmedPrompt);
        
        // Clear the timeout since we successfully completed
        if (submissionTimeoutRef.current) {
          clearTimeout(submissionTimeoutRef.current);
          submissionTimeoutRef.current = null;
        }
      } catch (apiError) {
        console.error("API error during research submission:", apiError);
        toast.error("There was a problem submitting your research. Please try again.", {
          duration: 3000,
          position: "bottom-center"
        });
        
        // Clear submission state
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error during research submission:", error);
      // Reset state in case of error
      setIsSubmitting(false);
      
      // Clear any existing timeout
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
        submissionTimeoutRef.current = null;
      }
    }
  }, [promptValue, isLoading, isSubmitting, handleDisplayResult]);

  // Handle enter key for submission
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleKeyDown) {
      handleKeyDown(e);
    }
    
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleKeyDown, handleSubmit]);

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-b from-gray-900 to-gray-950 pb-16">
      {/* Header with logo and title */}
      <div className="pt-10 px-6 text-center mb-8">
        <div className="flex justify-center mb-3">
          <img
            src="/img/gptr-logo.png"
            alt="科研agent助手"
            width={60}
            height={60}
            className="rounded-xl"
          />
        </div>
        <p className="text-gray-400 text-sm">欢迎使用科研agent助手，您的 AI 伙伴，助您快速获取洞察与全面研究报告</p>
      </div>

      {/* Search Box */}
      <div className="px-4 md:px-8 w-full max-w-lg mx-auto">
        <div 
          className={`relative bg-gray-800 border ${isFocused ? 'border-sky-500/70 input-glow-active' : 'border-gray-700/50 input-glow-subtle'} rounded-xl shadow-lg transition-all duration-300`}
        >
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-gray-200 px-4 pt-4 pb-12 focus:outline-none resize-none rounded-xl"
            placeholder={placeholder}
            value={promptValue}
            onChange={handlePromptChange}
            onKeyDown={handleKeyPress}
            rows={1}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading || isSubmitting}
          />
          
          <div className="absolute bottom-3 right-3">
            <button
              onClick={handleSubmit}
              disabled={isLoading || isSubmitting || !promptValue.trim()}
              className={`rounded-full p-2 ${
                isLoading || isSubmitting || !promptValue.trim() 
                  ? 'bg-gray-700 text-gray-500' 
                  : 'bg-sky-600 text-white hover:bg-sky-500'
              } transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50`}
              aria-label="Start research"
            >
              {isLoading || isSubmitting ? (
                <div className="flex justify-center items-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center px-2">
          Enter any research topic or specific question
        </p>
      </div>

      {/* Recent research history */}
      {recentHistory.length > 0 && (
        <div className="mt-10 px-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3 px-2">Recent Research</h2>
          <div className="space-y-2">
            {recentHistory.map((item) => (
              <div key={item.id} className="relative group">
                {editingId === item.id ? (
                  <div className="w-full bg-gray-800/60 rounded-lg p-3 border border-teal-500/50">
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
                    className="w-full bg-gray-800/60 hover:bg-gray-800 rounded-lg p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                  >
                    <h3 className="text-sm font-medium text-gray-200 line-clamp-1 pr-6">{item.question}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.timestamp || Date.now()).toLocaleString()}
                    </p>
                  </button>
                )}
                {editingId !== item.id && (
                  <button
                    onClick={(e) => startEditing(item.id, item.question, e)}
                    className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-teal-400 hover:bg-gray-700"
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
          <div className="mt-3 text-center">
            <a
              href="/history"
              className="inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              View all research
            </a>
          </div>
        </div>
      )}

      {/* Features or tips section */}
      <div className="mt-auto pb-6 pt-8 px-4">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Research Tips</h3>
          <ul className="text-xs text-gray-400 space-y-1.5">
            <li className="flex items-start">
              <span className="text-sky-400 mr-1.5">•</span>
              <span>Ask specific questions for better results</span>
            </li>
            <li className="flex items-start">
              <span className="text-sky-400 mr-1.5">•</span>
              <span>Include key details like dates or context</span>
            </li>
            <li className="flex items-start">
              <span className="text-sky-400 mr-1.5">•</span>
              <span>Chat with your research results for deeper insights</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Styling for line clamp and input glow */}
      <style jsx global>{`
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }
        
        .input-glow-subtle {
          box-shadow: 
            0 0 5px rgba(56, 189, 248, 0.2),
            0 0 12px rgba(14, 165, 233, 0.15),
            0 0 20px rgba(2, 132, 199, 0.1);
          animation: pulse-glow-subtle 3s infinite alternate;
        }
        
        @keyframes pulse-glow-subtle {
          0% {
            box-shadow: 
              0 0 5px rgba(56, 189, 248, 0.2),
              0 0 12px rgba(14, 165, 233, 0.15),
              0 0 20px rgba(2, 132, 199, 0.1);
          }
          100% {
            box-shadow: 
              0 0 8px rgba(56, 189, 248, 0.25),
              0 0 15px rgba(14, 165, 233, 0.2),
              0 0 25px rgba(2, 132, 199, 0.15);
          }
        }
        
        .input-glow-active {
          box-shadow: 
            0 0 5px rgba(56, 189, 248, 0.3),
            0 0 15px rgba(56, 189, 248, 0.3),
            0 0 25px rgba(14, 165, 233, 0.2),
            inset 0 0 3px rgba(186, 230, 253, 0.1);
          animation: pulse-glow-active 2s infinite alternate;
        }
        
        @keyframes pulse-glow-active {
          0% {
            box-shadow: 
              0 0 5px rgba(56, 189, 248, 0.3),
              0 0 15px rgba(56, 189, 248, 0.3),
              0 0 25px rgba(14, 165, 233, 0.2),
              inset 0 0 3px rgba(186, 230, 253, 0.1);
          }
          100% {
            box-shadow: 
              0 0 8px rgba(56, 189, 248, 0.4),
              0 0 20px rgba(14, 165, 233, 0.4),
              0 0 30px rgba(2, 132, 199, 0.3),
              inset 0 0 5px rgba(186, 230, 253, 0.2);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
} 