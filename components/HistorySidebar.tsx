import React, { useState } from 'react';
import { HistoryEntry } from '../types';
import HistoryModal from './HistoryModal';

interface HistorySidebarProps {
  history: HistoryEntry[];
  onDeleteHistory: (index: number) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onDeleteHistory, isVisible, onToggleVisibility }) => {
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === index) {
      onDeleteHistory(index);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(index);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <>
      {/* Sidebar - Always visible, width changes */}
      <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-300 ${
        isVisible ? 'w-80' : 'w-16'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {isVisible ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">History</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{history.length} item{history.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={onToggleVisibility}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Collapse Sidebar"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={onToggleVisibility}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mx-auto"
              title="Expand Sidebar"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isVisible ? (
            history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No history yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Complete a task to see your history here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((entry, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition group"
                    onClick={() => setSelectedHistory(entry)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            entry.taskType === 'Task 1' 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                              : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          }`}>
                            {entry.taskType}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.timestamp)}</span>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                          {entry.prompt}
                        </p>
                        
                        {entry.feedback && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {entry.feedback.bandScore}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Band Score</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => handleDelete(index, e)}
                        className={`flex-shrink-0 p-1.5 rounded transition ${
                          deleteConfirm === index
                            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                            : 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 opacity-0 group-hover:opacity-100'
                        }`}
                        title={deleteConfirm === index ? 'Click again to confirm' : 'Delete'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Collapsed state - show mini icons
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="relative">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {history.length > 9 ? '9+' : history.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedHistory && (
        <HistoryModal
          entry={selectedHistory}
          onClose={() => setSelectedHistory(null)}
        />
      )}
    </>
  );
};

export default HistorySidebar;
