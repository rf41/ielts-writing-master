import React from 'react';
import { GrammarSegment } from '../types';

interface GrammarDisplayProps {
  segments: GrammarSegment[];
  textFallback?: string;
  placeholder?: React.ReactNode;
}

const GrammarDisplay: React.FC<GrammarDisplayProps> = ({ segments, textFallback, placeholder }) => {
  if (segments.length === 0) {
    if (textFallback) {
      return <div className="whitespace-pre-wrap">{textFallback}</div>;
    }
    return <>{placeholder}</>;
  }

  // Helper to render text with preserved newlines
  const renderTextWithNewlines = (text: string) => {
    return text.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Helper to check if text needs space after it
  const needsSpace = (text: string, nextText?: string, currentIndex?: number) => {
    if (!text) return false;
    const lastChar = text.slice(-1);
    // Don't add space if already ends with space or newline
    if (lastChar === ' ' || lastChar === '\n' || text.includes('\n')) return false;
    // Don't add space if next text starts with space, newline, or punctuation
    if (nextText) {
      const firstChar = nextText[0];
      if (firstChar === ' ' || firstChar === '\n' || nextText.includes('\n')) return false;
      if ([',', '.', '!', '?', ';', ':', ')', ']', '}'].includes(firstChar)) return false;
    }
    // Don't add space at the end of segments array
    return true;
  };

  // Calculate error statistics
  const errorCount = segments.filter(seg => seg.type === 'correction').length;
  const hasErrors = errorCount > 0;

  return (
    <>
      {/* Error Summary Banner */}
      {hasErrors && (
        <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Found {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Hover for explanations
          </div>
        </div>
      )}
      
      {/* No errors message */}
      {!hasErrors && (
        <div className="mb-3 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            No grammar errors found! Great job! 🎉
          </span>
        </div>
      )}

      <div className="whitespace-pre-wrap break-words">
        {segments.map((seg, idx) => {
        const nextSeg = segments[idx + 1];
        const addSpace = needsSpace(seg.text, nextSeg?.text, idx);
        
        return seg.type === 'correction' ? (
          <span key={idx} className="relative group inline-block mx-0.5">
            <span className="inline-block">
              <span className="line-through text-red-500 dark:text-red-400 decoration-2">{renderTextWithNewlines(seg.text)}</span>
              <span className="ml-1 inline-block">
                <span className="text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 cursor-help">
                  {renderTextWithNewlines(seg.correction || '')}
                </span>
              </span>
            </span>
            {seg.explanation && (
              <span className="absolute top-full left-0 right-auto mt-2 w-64 max-w-[90vw] p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] shadow-xl border border-gray-700 group-hover:translate-y-0 -translate-y-1
              [.group:last-child>&]:left-auto [.group:last-child>&]:right-0">
                <div className="font-semibold text-yellow-400 mb-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  Why?
                </div>
                <div className="text-gray-200">{seg.explanation}</div>
                <svg className="absolute bottom-full left-4 [.group:last-child_&]:left-auto [.group:last-child_&]:right-4 text-gray-900 dark:text-gray-800 h-2 w-4" viewBox="0 0 255 255">
                  <polygon className="fill-current" points="0,255 127.5,127.5 255,255"/>
                </svg>
              </span>
            )}
            {addSpace && ' '}
          </span>
        ) : (
          <span key={idx} className="text-gray-800 dark:text-gray-200">{renderTextWithNewlines(seg.text)}{addSpace && ' '}</span>
        );
      })}
      </div>
    </>
  );
};

export default GrammarDisplay;
