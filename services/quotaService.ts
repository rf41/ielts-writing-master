import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Quota management for default API key usage
const USERS_COLLECTION = 'users';
const MAX_DEFAULT_QUOTA = 3;

// In-memory cache for quota (synced with Firestore)
let quotaCache: { userId: string; used: number } | null = null;

export const initializeQuota = async (userId: string): Promise<void> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      // Create user document with initial quota
      await setDoc(userDoc, {
        quotaUsed: 0,
        createdAt: new Date().toISOString()
      });
      quotaCache = { userId, used: 0 };
    } else {
      // Load existing quota
      const data = userSnap.data();
      quotaCache = { userId, used: data.quotaUsed || 0 };
    }
  } catch (error) {
    console.error('Error initializing quota:', error);
    // Fallback to 0 if error
    quotaCache = { userId, used: 0 };
  }
};

export const getQuotaUsed = async (userId: string): Promise<number> => {
  // Return from cache if available and matches user
  if (quotaCache && quotaCache.userId === userId) {
    return quotaCache.used;
  }
  
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userDoc);
    
    if (userSnap.exists()) {
      const used = userSnap.data().quotaUsed || 0;
      quotaCache = { userId, used };
      return used;
    }
    return 0;
  } catch (error) {
    console.error('Error getting quota:', error);
    return quotaCache?.used || 0;
  }
};

export const incrementQuota = async (userId: string): Promise<void> => {
  try {
    const current = await getQuotaUsed(userId);
    const newUsed = current + 1;
    
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, {
      quotaUsed: newUsed,
      lastUpdated: new Date().toISOString()
    });
    
    // Update cache
    quotaCache = { userId, used: newUsed };
    
    // Dispatch event for UI update
    window.dispatchEvent(new Event('quotaUpdated'));
  } catch (error) {
    console.error('Error incrementing quota:', error);
    throw error;
  }
};

export const getRemainingQuota = async (userId: string): Promise<number> => {
  const used = await getQuotaUsed(userId);
  return MAX_DEFAULT_QUOTA - used;
};

export const hasQuotaRemaining = async (userId: string): Promise<boolean> => {
  const remaining = await getRemainingQuota(userId);
  return remaining > 0;
};

export const isUsingCustomApiKey = (): boolean => {
  return !!localStorage.getItem('CUSTOM_GEMINI_API_KEY');
};

export const canMakeRequest = async (userId: string): Promise<boolean> => {
  // If using custom API key, unlimited requests
  if (isUsingCustomApiKey()) {
    return true;
  }
  // Otherwise check quota
  return await hasQuotaRemaining(userId);
};

export const getMaxQuota = (): number => {
  return MAX_DEFAULT_QUOTA;
};

// Get cached quota synchronously (for UI display)
export const getCachedQuota = (): number => {
  return quotaCache?.used || 0;
};

// Clear cache on logout
export const clearQuotaCache = (): void => {
  quotaCache = null;
};
