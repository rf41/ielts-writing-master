import React, { useState, useEffect, useRef } from 'react';
import { ChartType, Task1Data, TaskType, FeedbackResult, HistoryEntry, GrammarSegment } from '../types';
import { generateTask1Prompt, evaluateWriting } from '../services/geminiService';
import { saveQuestion } from '../services/questionService';
import { canMakeRequest, incrementQuota, isUsingCustomApiKey, getQuotaUsed } from '../services/quotaService';
import { useAuth } from '../contexts/AuthContext';
import WritingEditor from './WritingEditor';
import ScoreFeedback from './ScoreFeedback';
import TaskChart from './TaskChart';

interface Task1Props {
  history: HistoryEntry[];
  onAddToHistory: (entry: HistoryEntry) => void;
}

const Task1: React.FC<Task1Props> = ({ history, onAddToHistory }) => {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState<ChartType>(ChartType.BAR);
  const [taskData, setTaskData] = useState<Task1Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [userText, setUserText] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [currentSegments, setCurrentSegments] = useState<GrammarSegment[]>([]);
  const [canSave, setCanSave] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleGenerate = async () => {
    if (!currentUser) return;
    
    // Check quota before generating
    const canGenerate = await canMakeRequest(currentUser.uid);
    if (!canGenerate) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down';
      notification.textContent = '✗ Quota exceeded (3 attempts). Please use your own API key for unlimited access.';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
      return;
    }
    
    setLoading(true);
    setTaskData(null);
    setFeedback(null);
    setUserText("");
    setCurrentSegments([]);
    setCanSave(false);
    resetTimer();
    try {
      const data = await generateTask1Prompt(selectedType);
      setTaskData(data);
      
      // Increment quota only for default API key users
      if (!isUsingCustomApiKey()) {
        await incrementQuota(currentUser.uid);
      }
      
      // Save question to database
      await saveQuestion({
        taskType: 'Task 1',
        prompt: data.prompt,
        task1Data: data
      });
    } catch (e: any) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down';
      notification.textContent = '✗ ' + (e?.message || "Failed to generate task. Please try again.");
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!taskData || !userText) return;
    setEvaluating(true);
    try {
      // Calculate word count explicitly using the same logic as the UI
      const wordCount = userText.trim().split(/\s+/).filter(w => w.length > 0).length;
      const res = await evaluateWriting(TaskType.TASK_1, taskData.prompt, userText, wordCount);
      setFeedback(res);
      
      // Auto-save to history after evaluation
      onAddToHistory({
        taskType: 'Task 1',
        prompt: taskData.prompt,
        userText: userText,
        feedback: res,
        timestamp: new Date().toISOString(),
        task1Data: taskData,
        grammarSegments: currentSegments
      });
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down';
      notification.textContent = '✓ History saved automatically!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
      setCanSave(false);
    } catch (e: any) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down';
      notification.textContent = '✗ ' + (e?.message || "Evaluation failed. Please try again.");
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerateNew = () => {
    // Reset all states
    setTaskData(null);
    setUserText('');
    setFeedback(null);
    setCurrentSegments([]);
    setCanSave(false);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setShowGenerateConfirm(false);
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down';
    notification.textContent = 'Ready for new task. Click Generate to start!';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };



  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Chart Type:</label>
            <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value as ChartType)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
            >
                {Object.values(ChartType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
        <div className="flex gap-2 items-center">
          {!taskData && (
            <button 
              onClick={handleGenerate} 
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-secondary dark:bg-gray-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-600 transition disabled:opacity-50 font-medium shadow-sm"
            >
              {loading ? 'Generating...' : 'Generate New Question'}
            </button>
          )}
        </div>
      </div>

      {/* Floating Timer */}
      {taskData && (
        <div className="fixed right-6 top-24 z-40">
          <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
            isTimerRunning 
              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 animate-pulse backdrop-blur-sm' 
              : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 backdrop-blur-sm'
          }`}>
            <svg className={`w-5 h-5 transition-colors ${
              isTimerRunning ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-lg font-mono font-bold transition-colors ${
              isTimerRunning ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
            }`}>{formatTime(timerSeconds)}</span>
            <div className="flex gap-1">
              <button
                onClick={toggleTimer}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={isTimerRunning ? 'Pause' : 'Start'}
              >
                {isTimerRunning ? (
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={resetTimer}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title="Reset"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Content */}
      {taskData && (
        <div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 animate-fade-in-down" style={{ fontSize: `${zoomLevel}%` }}>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1.5">{taskData.title}</h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-2.5">{taskData.prompt}</p>
            
            {/* Zoom Controls */}
            <div className="flex justify-end gap-2 mb-2">
              <button
                onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
                disabled={zoomLevel <= 70}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                title="Zoom Out"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <div className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                {zoomLevel}%
              </div>
              <button
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                disabled={zoomLevel >= 150}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                title="Zoom In"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <TaskChart data={taskData} zoomLevel={zoomLevel} />
            </div>
          </div>

          <WritingEditor 
            value={userText} 
            onChange={setUserText} 
            placeholder="Write your summary here..."
            onSegmentsChange={setCurrentSegments}
          />

          <ScoreFeedback 
            result={feedback} 
            isLoading={evaluating} 
            onEvaluate={handleEvaluate} 
            canEvaluate={userText.length > 50} 
          />

          {/* Generate New Button - Show after evaluation */}
          {feedback && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={async () => {
                  setShowGenerateConfirm(true);
                  if (currentUser && !isUsingCustomApiKey()) {
                    const used = await getQuotaUsed(currentUser.uid);
                    setQuotaRemaining(3 - used);
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate New Task
              </button>
            </div>
          )}
        </div>
        </div>
      )}
        
      {!taskData && !loading && (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Select a chart type and click "Generate" to start practicing.</p>
        </div>
      )}

      {/* Generate New Confirmation Modal */}
      {showGenerateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGenerateConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generate New Task?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current progress will be cleared</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Your current task, answer, and evaluation will be cleared. The task has been saved to history. Are you sure you want to start a new task?
            </p>
            {currentUser && !isUsingCustomApiKey() && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold text-blue-800 dark:text-blue-300">Quota Remaining: {quotaRemaining}/3</span>
                    <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                      {quotaRemaining === 0 ? 'No quota left. Please use custom API key.' : 'Generating new task will not consume quota.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNew}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Generate New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Task1;