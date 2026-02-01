import React, { useState, useEffect, useRef } from 'react';
import { Task2Data, TaskType, FeedbackResult, HistoryEntry, GrammarSegment } from '../types';
import { generateTask2Prompt, evaluateWriting } from '../services/geminiService';
import { saveQuestion } from '../services/questionService';
import WritingEditor from './WritingEditor';
import ScoreFeedback from './ScoreFeedback';

interface Task2Props {
  history: HistoryEntry[];
  onAddToHistory: (entry: HistoryEntry) => void;
}

const Task2: React.FC<Task2Props> = ({ history, onAddToHistory }) => {
  const [taskData, setTaskData] = useState<Task2Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [userText, setUserText] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [currentSegments, setCurrentSegments] = useState<GrammarSegment[]>([]);
  const [canSave, setCanSave] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
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
    setLoading(true);
    setTaskData(null);
    setFeedback(null);
    setUserText("");
    setCurrentSegments([]);
    setCanSave(false);
    resetTimer();
    try {
      const data = await generateTask2Prompt();
      setTaskData(data);
      
      // Save question to database
      await saveQuestion({
        taskType: 'Task 2',
        prompt: data.prompt,
        task2Data: data
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate task. Please try again.");
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
      const res = await evaluateWriting(TaskType.TASK_2, taskData.prompt, userText, wordCount);
      setFeedback(res);
      setCanSave(true);
    } catch (e) {
      console.error(e);
      alert("Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleSave = () => {
    if (taskData && feedback && userText) {
      onAddToHistory({
        taskType: 'Task 2',
        prompt: taskData.prompt,
        userText: userText,
        feedback: feedback,
        timestamp: new Date().toISOString(),
        grammarSegments: currentSegments
      });
      alert('Session saved to history!');
      setCanSave(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="text-gray-700 dark:text-gray-300 font-medium">IELTS Writing Task 2 (Essay)</div>
        <div className="flex gap-2 items-center">
          {taskData && (
            <button 
                onClick={handleSave} 
                disabled={!canSave}
                className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                title={canSave ? 'Save to history' : 'Complete evaluation first'}
              >
                Save
              </button>
            )}
          <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="px-6 py-2 bg-secondary dark:bg-gray-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-600 transition disabled:opacity-50 font-medium shadow-sm"
          >
            {loading ? 'Generating...' : taskData ? 'Generate New' : 'Generate Topic'}
          </button>
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
        <div className="relative">
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
              disabled={zoomLevel <= 70}
              className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              title="Zoom Out"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <div className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
              {zoomLevel}%
            </div>
            <button
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              disabled={zoomLevel >= 150}
              className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              title="Zoom In"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 animate-fade-in-down" style={{ fontSize: `${zoomLevel}%` }}>
          <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-1">{taskData.topic}</h3>
            <p className="text-lg font-semibold text-gray-900 leading-snug">{taskData.prompt}</p>
          </div>

          <WritingEditor 
            value={userText} 
            onChange={setUserText} 
            placeholder="Write your essay here..."
            onSegmentsChange={setCurrentSegments}
          />

          <ScoreFeedback 
            result={feedback} 
            isLoading={evaluating} 
            onEvaluate={handleEvaluate} 
            canEvaluate={userText.length > 100} 
          />
        </div>
        </div>
      )}

      {!taskData && !loading && (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Click "Generate Topic" to start practicing.</p>
        </div>
      )}
    </div>
  );
};

export default Task2;