import React, { useState, useEffect } from 'react';
import { HistoryEntry, TaskType } from '../types';
import ScoreFeedback from './ScoreFeedback';
import WritingEditor from './WritingEditor';
import TaskChart from './TaskChart';
import { getHistoryDetail } from '../services/historyService';

interface HistoryModalProps {
  entry: HistoryEntry & { id: string };
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ entry, onClose }) => {
  const [fullEntry, setFullEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Load full detail when modal opens
  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      const detail = await getHistoryDetail(entry.id);
      if (detail) {
        setFullEntry(detail);
      } else {
        // Fallback to entry if loading fails
        setFullEntry(entry);
      }
      setLoading(false);
    };
    loadDetail();
  }, [entry.id]);
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  };

  // Show loading state while fetching full detail
  if (loading || !fullEntry) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading history detail...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="w-full">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-6" id="modal-title">
                      History Review - {fullEntry.taskType}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(fullEntry.timestamp)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                {/* Task Question UI */}
                {fullEntry.taskType === 'Task 1' && fullEntry.task1Data && (
                  <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{fullEntry.task1Data.title}</h2>
                     <p className="text-gray-600 dark:text-gray-300 mb-4">{fullEntry.task1Data.prompt}</p>
                     <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <TaskChart data={fullEntry.task1Data} />
                     </div>
                  </div>
                )}

                {fullEntry.taskType === 'Task 2' && (
                  <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-1">Essay Question</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">{fullEntry.prompt}</p>
                  </div>
                )}

                {/* Editor UI (Read Only) */}
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Response</h4>
                  <WritingEditor 
                    value={fullEntry.userText} 
                    onChange={() => {}} 
                    readOnly={true}
                    externalSegments={fullEntry.grammarSegments || []}
                  />
                </div>

                {/* Result UI */}
                {fullEntry.feedback && (
                  <ScoreFeedback result={fullEntry.feedback} readOnly={true} />
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/30 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-primary hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm transition-all"
              onClick={onClose}
            >
              Close Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;