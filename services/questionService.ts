import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Question, Task1Data, Task2Data } from '../types';

const QUESTIONS_COLLECTION = 'questions';

// Save a new question to the database
// AI-generated questions are always unique, no need to check for duplicates
export const saveQuestion = async (question: Omit<Question, 'id' | 'createdAt' | 'usageCount'>): Promise<string> => {
  try {
    // Directly add new question (AI generates unique content every time)
    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
      ...question,
      createdAt: Timestamp.now(),
      usageCount: 1
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Get all questions by task type
export const getQuestionsByTaskType = async (taskType: string): Promise<Question[]> => {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('taskType', '==', taskType),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const questions: Question[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      questions.push({
        id: doc.id,
        taskType: data.taskType,
        prompt: data.prompt,
        task1Data: data.task1Data,
        task2Data: data.task2Data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        usageCount: data.usageCount || 0
      });
    });
    
    return questions;
  } catch (error) {
    return [];
  }
};

// Get all questions
export const getAllQuestions = async (): Promise<Question[]> => {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const questions: Question[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      questions.push({
        id: doc.id,
        taskType: data.taskType,
        prompt: data.prompt,
        task1Data: data.task1Data,
        task2Data: data.task2Data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        usageCount: data.usageCount || 0
      });
    });
    
    return questions;
  } catch (error) {
    return [];
  }
};

// Export questions as JSON
export const exportQuestionsAsJSON = async (taskType?: string): Promise<string> => {
  try {
    const questions = taskType 
      ? await getQuestionsByTaskType(taskType)
      : await getAllQuestions();
    
    return JSON.stringify(questions, null, 2);
  } catch (error) {
    throw error;
  }
};

// Download questions as JSON file
export const downloadQuestionsJSON = async (taskType?: string, filename?: string) => {
  try {
    const jsonString = await exportQuestionsAsJSON(taskType);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ielts-questions-${taskType || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
};
