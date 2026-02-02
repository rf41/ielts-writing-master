import React from 'react';
import { FeedbackResult } from '../types';

interface ScoreFeedbackProps {
  result: FeedbackResult | null;
  isLoading?: boolean;
  onEvaluate?: () => void;
  canEvaluate?: boolean;
  readOnly?: boolean;
}

const ScoreFeedback: React.FC<ScoreFeedbackProps> = ({ result, isLoading = false, onEvaluate, canEvaluate, readOnly = false }) => {
  return (
    <div className={`mt-8 pt-6 ${!readOnly ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
      {!result && !readOnly && (
        <div className="flex justify-center">
          <button
            onClick={onEvaluate}
            disabled={!canEvaluate || isLoading}
            className={`px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              !canEvaluate || isLoading
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Writing...
              </span>
            ) : (
              'Get Score & Feedback'
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="animate-fade-in-up mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-primary/5 dark:bg-primary/10 p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Assessment Result</h3>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-200 font-medium uppercase text-sm tracking-wider">Estimated Band Score</span>
              <span className={`text-3xl font-extrabold ${result.bandScore >= 7 ? 'text-green-600' : result.bandScore >= 6 ? 'text-yellow-600' : 'text-red-500'}`}>
                {result.bandScore}
              </span>
            </div>
          </div>
          
          <div className="p-6 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  General Feedback
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{result.feedback}</p>
              </div>
              
              <div>
                <h4 className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center">
                   <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Strengths
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1 ml-1">
                  {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Areas for Improvement
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1 ml-1 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                {result.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
          
          {/* {!readOnly && onEvaluate && (
            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 border-t border-gray-100 dark:border-gray-700 text-center">
               <button onClick={onEvaluate} className="text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium hover:underline">
                 Regenerate Evaluation
               </button>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
};

export default ScoreFeedback;
