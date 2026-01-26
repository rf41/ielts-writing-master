import React, { useState } from 'react';
import Task1 from './components/Task1';
import Task2 from './components/Task2';
import { TaskType, HistoryEntry } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TaskType>(TaskType.TASK_1);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const addToHistory = (entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-white p-1.5 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">IELTS Writing Master</h1>
            </div>
            <div className="text-sm text-gray-500">
              Session History: <span className="font-bold text-gray-800">{history.length}</span> items
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab(TaskType.TASK_1)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === TaskType.TASK_1
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Task 1: Academic Report
              </button>
              <button
                onClick={() => setActiveTab(TaskType.TASK_2)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === TaskType.TASK_2
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Task 2: Essay
              </button>
            </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* We use hidden class instead of conditional rendering to persist state including scroll and inputs */}
        <div className={activeTab === TaskType.TASK_1 ? 'block' : 'hidden'}>
          <Task1 history={history} onAddToHistory={addToHistory} />
        </div>
        <div className={activeTab === TaskType.TASK_2 ? 'block' : 'hidden'}>
          <Task2 history={history} onAddToHistory={addToHistory} />
        </div>
      </main>
      
      {/* Disclaimer */}
      <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
              Powered by Google Gemini 2.5 Flash & Pro. Scores are estimates only and not official IELTS results.
          </div>
      </footer>
    </div>
  );
}

export default App;
