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
import { HistoryEntry } from '../types';

const HISTORY_COLLECTION = 'history';

export const saveHistory = async (userId: string, entry: HistoryEntry): Promise<void> => {
  try {
    await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      ...entry,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error saving history:', error);
    throw error;
  }
};

export const getUserHistory = async (userId: string): Promise<HistoryEntry[]> => {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const history: HistoryEntry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        taskType: data.taskType,
        prompt: data.prompt,
        userText: data.userText,
        feedback: data.feedback,
        timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString()
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};
