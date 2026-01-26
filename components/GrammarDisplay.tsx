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

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((seg, idx) => (
        <React.Fragment key={idx}>
          {seg.type === 'correction' ? (
            <span className="relative group mx-0.5">
              <span className="line-through text-red-400 decoration-2 decoration-red-400/50">{seg.text}</span>
              <span className="ml-1 text-green-600 font-bold bg-green-50 px-1 rounded border border-green-100 cursor-help">
                {seg.correction}
              </span>
              {seg.explanation && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {seg.explanation}
                  <svg className="absolute top-full left-1/2 -translate-x-1/2 text-gray-800 h-2 w-full" x="0px" y="0px" viewBox="0 0 255 255">
                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                  </svg>
                </span>
              )}
            </span>
          ) : (
            <span>{seg.text}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default GrammarDisplay;
