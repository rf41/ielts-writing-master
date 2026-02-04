import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { getAllQuestions, getQuestionsByTaskType, downloadQuestionsJSON } from '../services/questionService';

interface QuestionExporterProps {
  onClose: () => void;
}

const QuestionExporter: React.FC<QuestionExporterProps> = ({ onClose }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<'all' | 'Task 1' | 'Task 2'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const allData = await getAllQuestions();
      setAllQuestions(allData);
      
      const data = filter === 'all' 
        ? allData
        : allData.filter(q => q.taskType === filter);
      setQuestions(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const taskType = filter === 'all' ? undefined : filter;
      await downloadQuestionsJSON(taskType);
    } catch (error) {
      alert('Failed to export questions');
    }
  };

  const task1Questions = allQuestions.filter(q => q.taskType === 'Task 1');
  const task2Questions = allQuestions.filter(q => q.taskType === 'Task 2');

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="w-full">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg text-blue-600 dark:text-blue-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-6" id="modal-title">
                      Export Questions
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Download question bank as JSON file
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

              {/* Filter Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({allQuestions.length})
                </button>
                <button
                  onClick={() => setFilter('Task 1')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'Task 1'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Task 1 ({task1Questions.length})
                </button>
                <button
                  onClick={() => setFilter('Task 2')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'Task 2'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Task 2 ({task2Questions.length})
                </button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allQuestions.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{task1Questions.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Task 1 Questions</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{task2Questions.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Task 2 Questions</div>
                </div>
              </div>

              {/* Questions List Preview */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No questions found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {questions.map((question) => (
                      <div key={question.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                question.taskType === 'Task 1'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              }`}>
                                {question.taskType}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Used {question.usageCount} time{question.usageCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {question.prompt}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/30 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-primary hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto sm:text-sm transition-all"
              onClick={handleExport}
              disabled={questions.length === 0}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export as JSON
            </button>
            <button 
              type="button" 
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-6 py-2.5 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm transition-all"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionExporter;
