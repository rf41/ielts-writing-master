export enum TaskType {
  TASK_1 = 'TASK_1',
  TASK_2 = 'TASK_2'
}

export enum ChartType {
  BAR = 'Bar Chart',
  LINE = 'Line Graph',
  PIE = 'Pie Chart',
  TABLE = 'Table'
}

export interface Task1Data {
  title: string;
  prompt: string;
  type: ChartType;
  // Generic structure for Recharts
  data: Array<Record<string, string | number>>; 
  dataKeys: string[]; // Keys to plot (e.g., 'Series A', 'Series B')
  xAxisKey: string; // Key for the X-axis (e.g., 'year', 'category')
}

export interface Task2Data {
  topic: string;
  prompt: string;
  grammarSegments?: GrammarSegment[];
}

export interface GrammarSegment {
  text: string;
  type: 'ok' | 'correction';
  correction?: string;
  explanation?: string;
}

export interface FeedbackResult {
  bandScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface CorrectionResponse {
  segments: GrammarSegment[];
}

export interface HistoryEntry {
  taskType: string;
  prompt: string;
  userText: string;
  feedback: FeedbackResult | null;
  timestamp: string;
  task1Data?: Task1Data;
  grammarSegments?: GrammarSegment[];
}

export interface Question {
  id?: string;
  taskType: string;
  prompt: string;
  task1Data?: Task1Data;
  task2Data?: Task2Data;
  createdAt: string;
  usageCount: number;
}
