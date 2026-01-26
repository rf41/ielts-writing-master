import React from 'react';
import { HistoryEntry, TaskType } from '../types';
import ScoreFeedback from './ScoreFeedback';
import WritingEditor from './WritingEditor';
import TaskChart from './TaskChart';

interface HistoryModalProps {
  entry: HistoryEntry;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ entry, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="w-full">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-6" id="modal-title">
                      History Review
                    </h3>
                    <p className="text-sm text-gray-500">
                      {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                {/* Task Question UI */}
                {entry.taskType === TaskType.TASK_1 && entry.task1Data && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <h2 className="text-xl font-bold text-gray-900 mb-2">{entry.title}</h2>
                     <p className="text-gray-600 mb-4">{entry.question}</p>
                     <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <TaskChart data={entry.task1Data} />
                     </div>
                  </div>
                )}

                {entry.taskType === TaskType.TASK_2 && (
                  <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-1">{entry.title}</h3>
                    <p className="text-lg font-semibold text-gray-900 leading-snug">{entry.question}</p>
                  </div>
                )}

                {/* Editor UI (Read Only) */}
                <WritingEditor 
                  value={entry.userText} 
                  onChange={() => {}} 
                  readOnly={true}
                  externalSegments={entry.grammarSegments}
                />

                {/* Result UI */}
                <ScoreFeedback result={entry.feedback} readOnly={true} />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button 
              type="button" 
              className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-primary text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm transition-all"
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