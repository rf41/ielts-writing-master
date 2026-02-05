import { GoogleGenAI, Type } from "@google/genai";
import { ChartType, Task1Data, Task2Data, CorrectionResponse, FeedbackResult, TaskType } from "../types";

// ============================================================================
// MODULAR PROMPT TEMPLATES - Token Optimized
// ============================================================================

// Base system context (reusable across all prompts)
const CONTEXT = {
  IELTS: "IELTS",
  JSON_OUTPUT: "JSON:",
} as const;

// JSON output format templates
const JSON_FORMATS = {
  TASK1: (type: string) => `{"title":"","prompt":"","type":"${type}","xAxisKey":"","dataKeys":[],"data":[]}`,
  TASK2: '{"topic":"","prompt":""}',
  GRAMMAR: '{"text":"","type":"ok|correction","correction":"","explanation":""}',
  EVALUATION: '{"bandScore":0-9,"feedback":"","strengths":[],"improvements":[]}',
} as const;

// Evaluation criteria (shared between functions)
const EVAL_CRITERIA = "Task achievement, coherence, vocabulary, grammar variety" as const;

// Word count requirements
const MIN_WORDS = {
  TASK_1: 150,
  TASK_2: 250,
} as const;

// Prompt builders - compose prompts dynamically
const buildPrompt = {
  task1: (chartType: ChartType) => 
    `Generate ${CONTEXT.IELTS} Task 1 ${chartType} with realistic data. Use current/recent topics (2020-2025). Data: logical trends, realistic values, clear comparison points. 5-7 data entries. ${CONTEXT.JSON_OUTPUT} ${JSON_FORMATS.TASK1(chartType)}`,
  
  
  task2: () => 
    `Generate ${CONTEXT.IELTS} Task 2 with engaging contemporary topic. Categories: Technology & Society, Environment & Sustainability, Education & Work, Health & Lifestyle, Culture & Globalization, Government & Economy. Use clear arguable position. Avoid cliché topics. ${CONTEXT.JSON_OUTPUT} ${JSON_FORMATS.TASK2}`,
  
  
  grammar: (text: string) => 
    `IELTS Academic Writing Grammar Check - Analyze word-by-word for formal academic context.\n\nIELTS ACADEMIC FOCUS:\n- Formal register (avoid contractions, informal expressions)\n- Academic vocabulary appropriateness\n- Complex sentence structures\n- Cohesive devices usage\n- Subject-verb agreement in formal contexts\n- Articles with academic nouns\n- Passive voice correctness\n- Nominal style where appropriate\n\nFor ERRORS:\n- Isolate specific wrong word/phrase only\n- type: "correction"\n- correction: academically appropriate form\n- explanation: IELTS-focused reason (e.g., "informal - use formal alternative", "weak academic vocabulary", "article needed for countable academic noun")\n\nFor CORRECT text:\n- Group consecutive correct words\n- type: "ok"\n\nPreserve: spaces, punctuation, newlines exactly.\n\nFormat: ${JSON_FORMATS.GRAMMAR}\n\nText: "${text}"`,
  
  evaluation: (taskType: TaskType, question: string, text: string, wordCount: number) => {
    const minWords = taskType === TaskType.TASK_1 ? MIN_WORDS.TASK_1 : MIN_WORDS.TASK_2;
    return `${CONTEXT.IELTS} examiner: Evaluate ${taskType}.\nQ: "${question}"\nWords: ${wordCount} (min ${minWords})\nAnswer: "${text}"\n\nFocus: ${EVAL_CRITERIA}. Omit spelling.\n${CONTEXT.JSON_OUTPUT} ${JSON_FORMATS.EVALUATION}`;
  }
} as const;

// ============================================================================
// CLIENT & ERROR HANDLING
// ============================================================================
import { auth } from './firebase';
import { getUserApiKey } from './quotaService';

// Helper to get client safely - checks for custom API key first
const getClient = () => {
  // Check for user-specific custom API key first
  const userId = auth.currentUser?.uid;
  const customApiKey = userId ? getUserApiKey(userId) : null;
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key not found. Please set your Gemini API key in settings or environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to handle API errors and return user-friendly messages
const handleApiError = (error: any): never => {
  // Extract error information from various possible structures
  // Google GenAI SDK might throw error with different structures
  const errorCode = error?.error?.code || error?.code || error?.status;
  const errorMessage = error?.error?.message || error?.message || error?.error?.status || '';
  const errorStatus = error?.error?.status || error?.status || '';
  // Check for RESOURCE_EXHAUSTED status (quota errors)
  if (errorStatus === 'RESOURCE_EXHAUSTED' || errorMessage?.includes('quota') || errorMessage?.includes('RESOURCE_EXHAUSTED')) {
    throw new Error("API quota exceeded. Please wait a few minutes or use your own API key.");
  }
  
  // Check for numeric error codes
  if (errorCode) {
    switch (errorCode) {
      case 429:
        throw new Error("API quota exceeded. Please wait a few minutes or use your own API key.");
      case 401:
      case 403:
        throw new Error("API authentication failed. Please check your API key.");
      case 400:
        throw new Error("Invalid request. Please try again with different input.");
      case 500:
      case 503:
        throw new Error("API service temporarily unavailable. Please try again later.");
      default:
        throw new Error(`API error: Service temporarily unavailable.`);
    }
  }
  
  // If it's a network error
  if (errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
    throw new Error("Network connection failed. Please check your internet connection.");
  }
  
  // Generic fallback - don't include the full error object
  throw new Error("An unexpected error occurred. Please try again.");
};

export const generateTask1Prompt = async (chartType: ChartType): Promise<Task1Data> => {
  try {
    const ai = getClient();
    const prompt = buildPrompt.task1(chartType);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // responseSchema is removed here because 'data' items have dynamic keys which
        // cannot be statically defined in the schema (requires non-empty properties).
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as Task1Data;
  } catch (error) {
    handleApiError(error);
  }
};

export const generateTask2Prompt = async (): Promise<Task2Data> => {
  try {
    const ai = getClient();
    const prompt = buildPrompt.task2();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["topic", "prompt"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as Task2Data;
  } catch (error) {
    handleApiError(error);
  }
};

export const checkGrammar = async (text: string): Promise<CorrectionResponse> => {
  try {
    const ai = getClient();
    const prompt = buildPrompt.grammar(text);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['ok', 'correction'] },
                  correction: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["text", "type"]
              }
            }
          }
        }
      }
    });

    if (!response.text) return { segments: [] };
    return JSON.parse(response.text) as CorrectionResponse;
  } catch (error) {
    // For grammar check, return empty segments instead of throwing
    return { segments: [] };
  }
};

export const evaluateWriting = async (taskType: TaskType, question: string, text: string, wordCount: number): Promise<FeedbackResult> => {
  try {
    const ai = getClient();
    const prompt = buildPrompt.evaluation(taskType, question, text, wordCount);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bandScore: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["bandScore", "feedback", "strengths", "improvements"]
        }
      }
    });

    if (!response.text) throw new Error("Failed to evaluate");
    return JSON.parse(response.text) as FeedbackResult;
  } catch (error) {
    handleApiError(error);
  }
};