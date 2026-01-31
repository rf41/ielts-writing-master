import React, { useState } from 'react';
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

  const handleGenerate = async () => {
    // Save current session to history if it has feedback
    if (taskData && feedback && userText) {
      onAddToHistory({
        taskType: 'Task 2',
        prompt: taskData.prompt,
        userText: userText,
        feedback: feedback,
        timestamp: new Date().toISOString(),
        grammarSegments: currentSegments
      });
    }

    setLoading(true);
    setTaskData(null);
    setFeedback(null);
    setUserText("");
    setCurrentSegments([]);
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
    } catch (e) {
      console.error(e);
      alert("Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="text-gray-700 dark:text-gray-300 font-medium">IELTS Writing Task 2 (Essay)</div>
        <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="px-6 py-2 bg-secondary dark:bg-gray-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-600 transition disabled:opacity-50 font-medium shadow-sm"
        >
            {loading ? 'Generating...' : taskData ? 'Generate New & Save' : 'Generate Topic'}
        </button>
      </div>

      {/* Task Content */}
      {taskData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 animate-fade-in-down">
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