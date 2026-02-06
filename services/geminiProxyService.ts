/**
 * API Proxy Service
 * 
 * Use this service instead of direct Gemini API calls to protect API keys.
 * This calls your backend proxy at /api/gemini instead of calling Gemini directly.
 * 
 * TO ENABLE PROXY MODE:
 * 1. Deploy the /api/gemini.ts serverless function
 * 2. Set GEMINI_API_KEY in Vercel environment variables
 * 3. Import functions from this file instead of geminiService.ts
 */

import { ChartType, Task1Data, Task2Data, CorrectionResponse, FeedbackResult, TaskType } from "../types";
import { auth } from './firebase';

const API_ENDPOINT = '/api/gemini';

/**
 * Get Firebase auth token for API requests
 */
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

/**
 * Make authenticated request to proxy API
 */
const makeProxyRequest = async (payload: {
  model: string;
  contents: string;
  config?: any;
}): Promise<any> => {
  try {
    const token = await getAuthToken();

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'API request failed');
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    // Handle specific error cases
    if (error.message?.includes('Rate limit')) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    }
    if (error.message?.includes('authentication') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please log in again.');
    }
    
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// Prompt builders (same as geminiService.ts)
const JSON_FORMATS = {
  TASK1: (type: string) => {
    if (type === ChartType.PIE || type === 'Pie Chart') {
      return `{"title":"","prompt":"","type":"${type}","xAxisKey":"category","dataKeys":["value"],"data":[{"category":"CategoryName","value":123}]}`;
    }
    return `{"title":"","prompt":"","type":"${type}","xAxisKey":"","dataKeys":[],"data":[]}`;
  },
  TASK2: '{"topic":"","prompt":""}',
  GRAMMAR: '[{"text":"","type":"ok|correction","correction":"","explanation":""}]',
  EVALUATION: '{"bandScore":0-9,"feedback":"","strengths":[],"improvements":[]}',
} as const;

const buildPrompt = {
  task1: (chartType: ChartType) => {
    const pieInstruction = chartType === ChartType.PIE 
      ? ' IMPORTANT for Pie Chart: xAxisKey="category", dataKeys=["value"], data format: [{"category":"Transport","value":30},{"category":"Housing","value":25}]. Each entry needs category (string) and value (number).' 
      : '';
    return `Generate IELTS Task 1 ${chartType} with realistic data. Use current/recent topics (2020-2025). Data: logical trends, realistic values, clear comparison points. 5-7 data entries.${pieInstruction} JSON: ${JSON_FORMATS.TASK1(chartType)}`;
  },
  task2: () => 
    `Generate IELTS Task 2 with engaging contemporary topic. Categories: Technology & Society, Environment & Sustainability, Education & Work, Health & Lifestyle, Culture & Globalization, Government & Economy. Use clear arguable position. Avoid cliché topics. JSON: ${JSON_FORMATS.TASK2}`,
  grammar: (text: string) => 
    `IELTS grammar check. GROUP LARGE BLOCKS of correct text. Only split at errors. Focus: tense, subject-verb, articles, prepositions, academic vocabulary, formality.\n\nRULES:\n1. CORRECT text: group 20-50 words minimum, type "ok"\n2. ERROR: isolate 1-3 words only, type "correction", add correction + brief reason (max 10 words)\n3. Preserve whitespace/newlines\n\nFormat: ${JSON_FORMATS.GRAMMAR}\n\nText: "${text}"`,
  evaluation: (taskType: TaskType, question: string, text: string, wordCount: number) => {
    const minWords = taskType === TaskType.TASK_1 ? 150 : 250;
    return `IELTS examiner: Evaluate ${taskType}.\nQ: "${question}"\nWords: ${wordCount} (min ${minWords})\nAnswer: "${text}"\n\nFocus: Task achievement, coherence, vocabulary, grammar variety. Omit spelling.\nJSON: ${JSON_FORMATS.EVALUATION}`;
  }
} as const;

/**
 * Generate Task 1 prompt via proxy
 */
export const generateTask1Prompt = async (chartType: ChartType): Promise<Task1Data> => {
  const prompt = buildPrompt.task1(chartType);
  const response = await makeProxyRequest({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response) throw new Error("No response from AI");
  return JSON.parse(response) as Task1Data;
};

/**
 * Generate Task 2 prompt via proxy
 */
export const generateTask2Prompt = async (): Promise<Task2Data> => {
  const prompt = buildPrompt.task2();
  const response = await makeProxyRequest({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response) throw new Error("No response from AI");
  return JSON.parse(response) as Task2Data;
};

/**
 * Check grammar via proxy
 */
export const checkGrammar = async (text: string): Promise<CorrectionResponse> => {
  try {
    const prompt = buildPrompt.grammar(text);
    const response = await makeProxyRequest({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response) {
      console.error('No response from grammar check');
      return { segments: [] };
    }
    
    const parsed = JSON.parse(response);
    console.log('Grammar check parsed:', { isArray: Array.isArray(parsed), hasSegments: !!parsed.segments, length: Array.isArray(parsed) ? parsed.length : (parsed.segments?.length || 0) });
    
    // Handle different response formats
    if (Array.isArray(parsed)) {
      // Response is directly an array of segments
      return { segments: parsed };
    } else if (parsed.segments && Array.isArray(parsed.segments)) {
      // Response has segments property
      return parsed as CorrectionResponse;
    } else {
      // Unknown format
      console.error('Unexpected grammar response format:', parsed);
      return { segments: [] };
    }
  } catch (error) {
    console.error('Grammar check error:', error);
    return { segments: [] };
  }
};

/**
 * Evaluate writing via proxy
 */
export const evaluateWriting = async (
  taskType: TaskType,
  question: string,
  text: string,
  wordCount: number
): Promise<FeedbackResult> => {
  const prompt = buildPrompt.evaluation(taskType, question, text, wordCount);
  const response = await makeProxyRequest({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response) throw new Error("Failed to evaluate");
  return JSON.parse(response) as FeedbackResult;
};
