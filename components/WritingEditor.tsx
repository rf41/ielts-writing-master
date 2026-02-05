import React, { useState, useEffect } from 'react';
import { GrammarSegment } from '../types';
import { checkGrammar } from '../services/geminiService';
import GrammarDisplay from './GrammarDisplay';

interface WritingEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onSegmentsChange?: (segments: GrammarSegment[]) => void;
  readOnly?: boolean;
  externalSegments?: GrammarSegment[];
  isAdmin?: boolean;
}

const WritingEditor: React.FC<WritingEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  onSegmentsChange,
  readOnly = false,
  externalSegments,
  isAdmin = false
}) => {
  const [internalSegments, setInternalSegments] = useState<GrammarSegment[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [checkingMessageIndex, setCheckingMessageIndex] = useState(0);
  
  // Use external segments if provided, otherwise internal state
  const displaySegments = externalSegments || internalSegments;
  
  // Animated checking messages
  const checkingMessages = [
    "Checking word by word...",
    "Analyzing grammar...",
    "Writing suggestions...",
    "Reviewing vocabulary...",
    "Checking sentence structure...",
    "Almost done..."
  ];
  
  // Clear segments if user clears the text entirely
  useEffect(() => {
    if (!readOnly && value.trim().length === 0) {
      setInternalSegments([]);
      onSegmentsChange?.([]);
      setHasChecked(false);
    }
  }, [value, onSegmentsChange, readOnly]);

  // Animate checking messages
  useEffect(() => {
    if (isChecking) {
      const interval = setInterval(() => {
        setCheckingMessageIndex((prev) => (prev + 1) % checkingMessages.length);
      }, 1500); // Change message every 1.5 seconds
      
      return () => clearInterval(interval);
    } else {
      setCheckingMessageIndex(0);
    }
  }, [isChecking, checkingMessages.length]);

  const performCheck = async () => {
    if (value.trim().length === 0) return;
    
    setIsChecking(true);
    setInternalSegments([]); 
    onSegmentsChange?.([]);
    
    try {
      const result = await checkGrammar(value);
      if (result && result.segments) {
        setInternalSegments(result.segments);
        onSegmentsChange?.(result.segments);
        setHasChecked(true);
      }
    } catch (error) {
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[400px]">
      {/* Input Container */}
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-2 px-1">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Answer</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {value.split(/\s+/).filter(w => w.length > 0).length} words
            </span>
            {!readOnly && (
              <button
                onClick={performCheck}
                disabled={isChecking || value.trim().length === 0 || (!isAdmin && hasChecked)}
                className="flex items-center gap-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                title={hasChecked && !isAdmin ? "Grammar already checked (limit: 1x per session)" : isAdmin ? "Check grammar (unlimited for admin)" : "Check grammar for errors"}
              >
                {isChecking ? (
                  <>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Checking...</span>
                  </>
                ) : hasChecked && !isAdmin ? (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Checked
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check Grammar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <textarea
          className={`w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-sans text-base leading-relaxed shadow-sm ${
            readOnly ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      </div>

      {/* Correction Container */}
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-2 px-1">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Correction Result</label>
        </div>
        <div className="w-full h-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-y-auto font-sans text-base leading-relaxed shadow-inner relative z-10">
          {/* Loading Overlay with Animation */}
          {isChecking && (
            <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-20">
              <div className="relative">
                {/* Outer spinning ring */}
                <div className="w-20 h-20 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-spin border-t-indigo-600 dark:border-t-indigo-400"></div>
                {/* Inner pulsing circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse transition-all duration-300">
                  {checkingMessages[checkingMessageIndex]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  AI is analyzing your text
                </p>
              </div>
              {/* Animated dots */}
              <div className="flex gap-2 mt-4">
                <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
          
          <GrammarDisplay 
            segments={displaySegments} 
            placeholder={
              readOnly ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm italic">
                  <p>No grammar correction available.</p>
                </div>
              ) : value.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm italic">
                  <p>Write your answer on the left</p>
                  <p>and click "Check Grammar" to see feedback.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm italic opacity-60">
                  <p>Click "Check Grammar" to analyze your text.</p>
                </div>
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

export default WritingEditor;