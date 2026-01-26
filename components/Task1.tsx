import React, { useState } from 'react';
import { ChartType, Task1Data, TaskType, FeedbackResult, HistoryEntry, GrammarSegment } from '../types';
import { generateTask1Prompt, evaluateWriting } from '../services/geminiService';
import WritingEditor from './WritingEditor';
import ScoreFeedback from './ScoreFeedback';
import HistoryList from './HistoryList';
import HistoryModal from './HistoryModal';
import TaskChart from './TaskChart';

interface Task1Props {
  history: HistoryEntry[];
  onAddToHistory: (entry: HistoryEntry) => void;
}

const Task1: React.FC<Task1Props> = ({ history, onAddToHistory }) => {
  const [selectedType, setSelectedType] = useState<ChartType>(ChartType.BAR);
  const [taskData, setTaskData] = useState<Task1Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [userText, setUserText] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [currentSegments, setCurrentSegments] = useState<GrammarSegment[]>([]);
  const [viewingHistory, setViewingHistory] = useState<HistoryEntry | null>(null);

  const handleGenerate = async () => {
    // Save current session to history if it has feedback
    if (taskData && feedback && userText) {
      onAddToHistory({
        id: Date.now().toString(),
        timestamp: new Date(),
        taskType: TaskType.TASK_1,
        title: taskData.title,
        question: taskData.prompt,
        userText: userText,
        feedback: feedback,
        task1Data: taskData,
        grammarSegments: currentSegments
      });
    }

    setLoading(true);
    setTaskData(null);
    setFeedback(null);
    setUserText("");
    setCurrentSegments([]);
    try {
      const data = await generateTask1Prompt(selectedType);
      setTaskData(data);
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
      const res = await evaluateWriting(TaskType.TASK_1, taskData.prompt, userText, wordCount);
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="font-semibold text-gray-700 whitespace-nowrap">Chart Type:</label>
            <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value as ChartType)}
                className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
            >
                {Object.values(ChartType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
        <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2 bg-secondary text-white rounded-lg hover:bg-slate-700 transition disabled:opacity-50 font-medium shadow-sm"
        >
            {loading ? 'Generating...' : taskData ? 'Generate New & Save' : 'Generate New Question'}
        </button>
      </div>

      {/* Task Content */}
      {taskData && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in-down">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{taskData.title}</h2>
            <p className="text-gray-600 mb-4">{taskData.prompt}</p>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <TaskChart data={taskData} />
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
        </div>
      )}
        
      {!taskData && !loading && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">Select a chart type and click "Generate" to start practicing.</p>
        </div>
      )}

      <HistoryList history={history} type={TaskType.TASK_1} onSelect={setViewingHistory} />
      
      {viewingHistory && <HistoryModal entry={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </div>
  );
};

export default Task1;