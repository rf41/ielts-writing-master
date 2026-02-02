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

  // Helper to check if text needs space after it
  const needsSpace = (text: string, nextText?: string) => {
    if (!text) return false;
    const lastChar = text.slice(-1);
    // Don't add space if already ends with space or if next segment starts with punctuation/space
    if (lastChar === ' ' || lastChar === '\n') return false;
    if (nextText && (nextText[0] === ' ' || nextText[0] === ',' || nextText[0] === '.' || nextText[0] === '!' || nextText[0] === '?' || nextText[0] === ';' || nextText[0] === ':')) return false;
    return true;
  };

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((seg, idx) => {
        const nextSeg = segments[idx + 1];
        const addSpace = needsSpace(seg.text, nextSeg?.text);
        
        return seg.type === 'correction' ? (
          <span key={idx} className="relative group mx-0.5">
            <span className="line-through text-red-400 decoration-2 decoration-red-400/50">{seg.text}</span>
            <span className="ml-1 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 px-1 rounded border border-green-100 dark:border-green-800 cursor-help">
              {seg.correction}
            </span>
            {seg.explanation && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                {seg.explanation}
                <svg className="absolute bottom-full left-1/2 -translate-x-1/2 text-gray-800 dark:text-gray-700 h-2 w-full" x="0px" y="0px" viewBox="0 0 255 255">
                  <polygon className="fill-current" points="0,255 127.5,127.5 255,255"/>
                </svg>
              </span>
            )}
            {addSpace && ' '}
          </span>
        ) : (
          <span key={idx}>{seg.text}{addSpace && ' '}</span>
        );
      })}
    </div>
  );
};

export default GrammarDisplay;
