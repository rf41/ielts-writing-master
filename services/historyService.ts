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
import { HistoryEntry, FeedbackResult } from '../types';
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
      try {
        await updateUserStats(userId, entry.taskType, entry.feedback);
        console.log('[HistoryService] Stats updated for user:', userId, 'taskType:', entry.taskType);
      } catch (statsError) {
        console.error('[HistoryService] Failed to update user stats:', statsError);
        // Don't throw - history is saved successfully, stats can be recalculated later
      }
    } else {
      console.warn('[HistoryService] No feedback provided, stats not updated');
    }
    
    return docRef.id;
  } catch (error) {
    console.error('[HistoryService] Failed to save history:', error);
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
        // This significantly reduces data transfer and improves performance
        history.push({
          id: doc.id,
          taskType: data.taskType,
          prompt: data.prompt.substring(0, 100) + '...', // Only first 100 chars for preview
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
          prompt: data.prompt.substring(0, 100) + '...',
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

/**
 * Sync user stats from all history entries
 * Use this to fix stats that are out of sync
 */
export const syncUserStatsFromHistory = async (userId: string): Promise<void> => {
  try {
    console.log('[HistoryService] Syncing stats for user:', userId);
    
    // Fetch ALL history for user (not paginated)
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const historyData: Array<{ taskType: string; feedback?: FeedbackResult }> = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      historyData.push({
        taskType: data.taskType,
        feedback: data.feedback
      });
    });
    
    console.log('[HistoryService] Found', historyData.length, 'history entries');
    
    // Use recalculateUserStats to rebuild stats from scratch
    const { recalculateUserStats } = await import('./userStatsService');
    await recalculateUserStats(userId, historyData);
    
    console.log('[HistoryService] Stats sync completed');
  } catch (error) {
    console.error('[HistoryService] Failed to sync stats:', error);
    throw error;
  }
};

/**
 * Sync stats for all users (admin only)
 * Use this to fix all user stats at once
 */
export const syncAllUsersStats = async (): Promise<void> => {
  try {
    console.log('[HistoryService] Syncing stats for all users...');
    
    // Get all history
    const querySnapshot = await getDocs(collection(db, HISTORY_COLLECTION));
    
    // Group by userId
    const userHistories = new Map<string, Array<{ taskType: string; feedback?: FeedbackResult }>>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      
      if (!userHistories.has(userId)) {
        userHistories.set(userId, []);
      }
      
      userHistories.get(userId)!.push({
        taskType: data.taskType,
        feedback: data.feedback
      });
    });
    
    console.log('[HistoryService] Found', userHistories.size, 'users with history');
    
    // Recalculate stats for each user
    const { recalculateUserStats } = await import('./userStatsService');
    
    for (const [userId, historyData] of userHistories.entries()) {
      try {
        console.log('[HistoryService] Syncing stats for user:', userId, '- entries:', historyData.length);
        await recalculateUserStats(userId, historyData);
      } catch (error) {
        console.error('[HistoryService] Failed to sync stats for user:', userId, error);
        // Continue with next user
      }
    }
    
    console.log('[HistoryService] All users stats sync completed');
  } catch (error) {
    console.error('[HistoryService] Failed to sync all users stats:', error);
    throw error;
  }
};
