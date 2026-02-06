/**
 * Gemini Service Adapter
 * 
 * Automatically routes requests to the appropriate service:
 * - Users with custom API key → geminiService (direct API, no server rate limit)
 * - Users without custom API key → geminiProxyService (server proxy with rate limit)
 */

import { ChartType, Task1Data, Task2Data, CorrectionResponse, FeedbackResult, TaskType } from "../types";
import { isUsingCustomApiKey } from './quotaService';
import * as geminiService from './geminiService';
import * as geminiProxyService from './geminiProxyService';
import { auth } from './firebase';

/**
 * Determine which service to use based on custom API key status
 * This is checked on EVERY request to ensure real-time custom key detection
 */
const getService = () => {
  const user = auth.currentUser;
  if (!user) {
    // Not logged in, use proxy by default
    console.log('[GeminiAdapter] No user, using proxy service');
    return geminiProxyService;
  }

  // Check custom API key in real-time (not cached)
  const hasCustomKey = isUsingCustomApiKey(user.uid);
  
  console.log('[GeminiAdapter]', {
    userId: user.uid,
    email: user.email,
    hasCustomKey,
    service: hasCustomKey ? 'geminiService (direct)' : 'geminiProxyService (server)'
  });
  
  // Custom API key users bypass server proxy (no server rate limit)
  return hasCustomKey ? geminiService : geminiProxyService;
};

/**
 * Generate Task 1 prompt
 * Routes to appropriate service based on custom API key
 */
export const generateTask1Prompt = async (chartType: ChartType): Promise<Task1Data> => {
  const service = getService();
  return service.generateTask1Prompt(chartType);
};

/**
 * Generate Task 2 prompt
 * Routes to appropriate service based on custom API key
 */
export const generateTask2Prompt = async (): Promise<Task2Data> => {
  const service = getService();
  return service.generateTask2Prompt();
};

/**
 * Check grammar
 * Routes to appropriate service based on custom API key
 */
export const checkGrammar = async (text: string): Promise<CorrectionResponse> => {
  const service = getService();
  return service.checkGrammar(text);
};

/**
 * Evaluate writing
 * Routes to appropriate service based on custom API key
 */
export const evaluateWriting = async (
  taskType: TaskType,
  question: string,
  text: string,
  wordCount: number
): Promise<FeedbackResult> => {
  const service = getService();
  return service.evaluateWriting(taskType, question, text, wordCount);
};
