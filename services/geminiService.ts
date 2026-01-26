import { GoogleGenAI, Type } from "@google/genai";
import { ChartType, Task1Data, Task2Data, CorrectionResponse, FeedbackResult, TaskType } from "../types";

// Helper to get client safely
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateTask1Prompt = async (chartType: ChartType): Promise<Task1Data> => {
  const ai = getClient();
  
  const prompt = `Generate a realistic IELTS Writing Task 1 dataset and prompt for a ${chartType}. 
  The data should be suitable for a chart. 
  Return a JSON object with:
  - 'title': The title of the chart.
  - 'prompt': The specific IELTS instruction (e.g. "Summarise the information...").
  - 'type': The string value "${chartType}".
  - 'xAxisKey': The key used for the x-axis or category (e.g., 'year', 'country').
  - 'dataKeys': An array of strings representing the data series keys (e.g., ['Sales', 'Profit'] or ['Men', 'Women']).
  - 'data': An array of objects where each object represents a data point (e.g., { "year": "1990", "Men": 50, "Women": 40 }). Limit to 5-8 data points.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // responseSchema is removed here because 'data' items have dynamic keys which
      // cannot be statically defined in the schema (requires non-empty properties).
    }
  });

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text) as Task1Data;
};

export const generateTask2Prompt = async (): Promise<Task2Data> => {
  const ai = getClient();
  const prompt = `Generate a random IELTS Writing Task 2 essay topic. 
  Return JSON with 'topic' (short title) and 'prompt' (the full essay question).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
};

export const checkGrammar = async (text: string): Promise<CorrectionResponse> => {
  const ai = getClient();
  
  const prompt = `Analyze the following English text for grammar, spelling, and vocabulary errors suitable for IELTS.
  Return a JSON object containing a 'segments' array. 
  Break the text into segments. If a segment is correct, set type to 'ok'. 
  If a segment has an error, set type to 'correction', provide the 'correction' (the correct word/phrase), and a brief 'explanation'.
  The segments when concatenated MUST reconstruction the meaning of the original text, but the 'text' field of the 'correction' segment should be the ORIGINAL error.
  
  Example input: "I has cat."
  Example output segments: 
  [
    { "text": "I ", "type": "ok" }, 
    { "text": "has", "type": "correction", "correction": "have", "explanation": "Subject-verb agreement" }, 
    { "text": " cat.", "type": "ok" }
  ]

  Text to analyze: "${text}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
};

export const evaluateWriting = async (taskType: TaskType, question: string, text: string, wordCount: number): Promise<FeedbackResult> => {
  const ai = getClient();
  const prompt = `Act as an expert IELTS examiner. Evaluate the following ${taskType} response based on the official descriptors.
  
  Question: "${question}"
  User Response Word Count: ${wordCount} words (Use this exact count for checking length requirements).
  User Response: "${text}"

  Important Instructions:
  1. **Word Count**: Relies strictly on the provided word count (${wordCount}) to judge if the response is underlength (Task 1 < 150, Task 2 < 250).
  2. **Consistency**: The user has a separate tool for checking specific spelling and minor grammar errors. DO NOT list specific spelling corrections in "improvements".
  3. **Focus**: In the 'strengths' and 'improvements' sections, focus on:
     - **Task Achievement/Response**: Did they answer the prompt fully? Is the position clear?
     - **Coherence & Cohesion**: Paragraphing, linking words, flow.
     - **Lexical Resource**: Range of vocabulary, collocation usage (not just spelling).
     - **Grammatical Range**: Variety of sentence structures (simple vs complex), passive voice, etc.
  4. If the grammar is accurate but simple, suggest "using more complex structures" rather than saying "fix grammar".

  Return JSON:
  - bandScore: number (0-9, increments of 0.5)
  - feedback: string (general summary)
  - strengths: array of strings (bullet points)
  - improvements: array of strings (bullet points)
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
};