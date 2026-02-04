import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { HistoryEntry } from '../types';
import { 
  getCachedHistory, 
  setCachedHistory, 
  getCachedHistoryDetail, 
  setCachedHistoryDetail 
} from './cacheService';
import { updateUserStats } from './userStatsService';

const HISTORY_COLLECTION = 'history';
const PAGE_SIZE = 10;

export const saveHistory = async (userId: string, entry: HistoryEntry): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      ...entry,
      createdAt: Timestamp.now()
    });
    // Update user stats aggregation if feedback exists
    if (entry.feedback) {
      await updateUserStats(userId, entry.taskType, entry.feedback);
    }
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Lightweight query with pagination - only load 10 items at a time
export const getUserHistory = async (
  userId: string, 
  lastDoc?: QueryDocumentSnapshot
): Promise<{
  history: Array<HistoryEntry & { id: string }>;
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    // Check cache first (only for first page)
    if (!lastDoc) {
      const cached = getCachedHistory(userId);
      if (cached) {
        return {
          history: cached,
          lastDoc: null,
          hasMore: cached.length >= PAGE_SIZE
        };
      }
    }
    // Try with orderBy first
    try {
      let q = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      
      // Add startAfter for pagination
      if (lastDoc) {
        q = query(
          collection(db, HISTORY_COLLECTION),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const history: Array<HistoryEntry & { id: string }> = [];
      let newLastDoc: QueryDocumentSnapshot | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only load essential metadata - full data loaded on detail view
        history.push({
          id: doc.id,
          taskType: data.taskType,
          prompt: data.prompt,
          userText: '', // Will be loaded on demand
          feedback: data.feedback ? { 
            bandScore: data.feedback.bandScore,
            feedback: '',
            strengths: [],
            improvements: []
          } : undefined,
          timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          task1Data: undefined, // Loaded on demand
          grammarSegments: undefined // Loaded on demand
        });
        newLastDoc = doc;
      });
      
      // Cache only first page
      if (!lastDoc && history.length > 0) {
        setCachedHistory(userId, history);
      }
      
      return {
        history,
        lastDoc: newLastDoc,
        hasMore: querySnapshot.size >= PAGE_SIZE
      };
    } catch (indexError: any) {
      // Fallback: query without orderBy and sort on client (no pagination in fallback)
      const q = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const history: Array<HistoryEntry & { id: string }> = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only load essential metadata
        history.push({
          id: doc.id,
          taskType: data.taskType,
          prompt: data.prompt,
          userText: '', // Will be loaded on demand
          feedback: data.feedback ? { 
            bandScore: data.feedback.bandScore,
            feedback: '',
            strengths: [],
            improvements: []
          } : undefined,
          timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          task1Data: undefined,
          grammarSegments: undefined
        });
      });
      
      // Sort on client side
      history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Limit to PAGE_SIZE
      const limitedHistory = history.slice(0, PAGE_SIZE);
      
      // Cache the result
      setCachedHistory(userId, limitedHistory);
      
      return {
        history: limitedHistory,
        lastDoc: null,
        hasMore: history.length > PAGE_SIZE
      };
    }
  } catch (error) {
    return {
      history: [],
      lastDoc: null,
      hasMore: false
    };
  }
};

// Load full history detail when user clicks to view (on-demand loading)
export const getHistoryDetail = async (historyId: string): Promise<HistoryEntry | null> => {
  try {
    // Check cache first
    const cached = getCachedHistoryDetail(historyId);
    if (cached) {
      return cached;
    }
    const docRef = doc(db, HISTORY_COLLECTION, historyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    const detail: HistoryEntry = {
      taskType: data.taskType,
      prompt: data.prompt,
      userText: data.userText,
      feedback: data.feedback,
      timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      task1Data: data.task1Data,
      grammarSegments: data.grammarSegments
    };
    
    // Cache the detail
    setCachedHistoryDetail(historyId, detail);
    
    return detail;
  } catch (error) {
    return null;
  }
};

export const deleteHistory = async (historyId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, historyId));
  } catch (error) {
    throw error;
  }
};
