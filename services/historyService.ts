import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { HistoryEntry } from '../types';

const HISTORY_COLLECTION = 'history';

export const saveHistory = async (userId: string, entry: HistoryEntry): Promise<string> => {
  try {
    console.log('Saving history for user:', userId, entry);
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      ...entry,
      createdAt: Timestamp.now()
    });
    console.log('History saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving history:', error);
    throw error;
  }
};

export const getUserHistory = async (userId: string): Promise<Array<HistoryEntry & { id: string }>> => {
  try {
    console.log('Loading history for user:', userId);
    
    // Try with orderBy first
    try {
      const q = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const history: Array<HistoryEntry & { id: string }> = [];
      
      console.log('History documents found:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('History doc:', doc.id, data);
        history.push({
          id: doc.id,
          taskType: data.taskType,
          prompt: data.prompt,
          userText: data.userText,
          feedback: data.feedback,
          timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          task1Data: data.task1Data,
          grammarSegments: data.grammarSegments
        });
      });
      
      return history;
    } catch (indexError: any) {
      console.warn('OrderBy failed, falling back to client-side sorting:', indexError);
      
      // Fallback: query without orderBy and sort on client
      const q = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const history: Array<HistoryEntry & { id: string }> = [];
      
      console.log('History documents found (no orderBy):', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('History doc:', doc.id, data);
        history.push({
          id: doc.id,
          taskType: data.taskType,
          prompt: data.prompt,
          userText: data.userText,
          feedback: data.feedback,
          timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          task1Data: data.task1Data,
          grammarSegments: data.grammarSegments
        });
      });
      
      // Sort on client side
      history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return history;
    }
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

export const deleteHistory = async (historyId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, historyId));
  } catch (error) {
    console.error('Error deleting history:', error);
    throw error;
  }
};
