import React from 'react';
import { HistoryEntry, TaskType } from '../types';

interface HistoryListProps {
  history: HistoryEntry[];
  type: TaskType;
  onSelect: (entry: HistoryEntry) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, type, onSelect }) => {
  const filteredHistory = history.filter(h => h.taskType === type);

  if (filteredHistory.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Previous Attempts (Click to Review)
      </h3>
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <div 
            key={item.id} 
            onClick={() => onSelect(item)}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary/50 hover:bg-blue-50/30 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {item.timestamp.toLocaleTimeString()} - {item.timestamp.toLocaleDateString()}
                </span>
                <h4 className="font-bold text-gray-900 mt-1 group-hover:text-primary transition-colors">{item.title}</h4>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-xs text-gray-500 uppercase">Score</span>
                 <span className={`text-2xl font-bold ${item.feedback.bandScore >= 7 ? 'text-green-600' : 'text-primary'}`}>
                  {item.feedback.bandScore}
                 </span>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-3 bg-gray-50 p-3 rounded italic border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
              "{item.question}"
            </p>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
               <div>
                  <strong className="text-green-700 block mb-1">Strengths:</strong>
                  <ul className="list-disc list-inside text-gray-600">
                     {item.feedback.strengths.slice(0, 2).map((s, i) => <li key={i} className="truncate">{s}</li>)}
                  </ul>
               </div>
               <div>
                  <strong className="text-amber-700 block mb-1">To Improve:</strong>
                  <ul className="list-disc list-inside text-gray-600">
                     {item.feedback.improvements.slice(0, 2).map((s, i) => <li key={i} className="truncate">{s}</li>)}
                  </ul>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;