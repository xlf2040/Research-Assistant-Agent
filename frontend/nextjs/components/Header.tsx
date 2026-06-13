import React from 'react';
import Image from "next/image";

interface HeaderProps {
  loading?: boolean;      // Indicates if research is currently in progress
  isStopped?: boolean;    // Indicates if research was manually stopped
  showResult?: boolean;   // Controls if research results are being displayed
  onStop?: () => void;    // Handler for stopping ongoing research
  onNewResearch?: () => void;  // Handler for starting fresh research
  isCopilotMode?: boolean; // Indicates if we are in copilot mode
}

const Header = ({ loading, isStopped, showResult, onStop, onNewResearch, isCopilotMode }: HeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Pure transparent blur background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
      
      {/* Header container */}
      <div className="container relative h-[60px] px-4 lg:h-[80px] lg:px-0 pt-4 pb-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <a href="/">
              <img
                src="/img/gptr-logo.png"
                alt="logo"
                width={60}
                height={60}
                className="lg:h-16 lg:w-16"
              />
            </a>
            {/* Navigation links */}
            <nav className="hidden sm:flex items-center gap-4">
              <a
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                研究
              </a>
              <a
                href="/library"
                className="text-sm font-medium text-gray-600 hover:text-sky-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                文献库
              </a>
            </nav>
          </div>
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {/* Mobile library link */}
            <a
              href="/library"
              className="sm:hidden flex items-center justify-center w-9 h-9 text-gray-500 hover:text-sky-600 rounded-full hover:bg-gray-100 transition-colors"
              title="文献库"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </a>
            {/* Stop button - shown only during active research */}
            {loading && !isStopped && (
              <button
                onClick={onStop}
                className="flex items-center justify-center px-4 sm:px-6 h-9 sm:h-10 text-sm text-white bg-red-500 rounded-full hover:bg-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg whitespace-nowrap min-w-[80px]"
              >
                停止
              </button>
            )}
            {/* New Research button - shown after stopping or completing research - but not in copilot mode */}
            {(isStopped || !loading) && showResult && !isCopilotMode && (
              <button
                onClick={onNewResearch}
                className="flex items-center justify-center px-4 sm:px-6 h-9 sm:h-10 text-sm text-white bg-teal-500 rounded-full hover:bg-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg whitespace-nowrap min-w-[120px]"
              >
                新研究
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
