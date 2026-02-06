import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from './firebase';
import { secureSetItem, secureGetItem, secureRemoveItem, clearSecureStorage } from '../utils/encryption';

// Quota management for default API key usage
const USERS_COLLECTION = 'users';
const MAX_DEFAULT_QUOTA = 3;
const JAKARTA_TIMEZONE = 'Asia/Jakarta';

// In-memory cache for quota (synced with Firestore)
let quotaCache: { userId: string; used: number } | null = null;

// Get current date in Jakarta timezone (YYYY-MM-DD format)
const getJakartaDate = (): string => {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  return jakartaDate; // Returns YYYY-MM-DD
};

// Check if quota needs to be reset (new day in Jakarta timezone)
const shouldResetQuota = (lastResetDate: string | undefined): boolean => {
  if (!lastResetDate) return true; // No reset date recorded, should reset
  const currentDate = getJakartaDate();
  return currentDate !== lastResetDate;
};

export const initializeQuota = async (userId: string): Promise<void> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userDoc);
    const currentDate = getJakartaDate();
    
    if (!userSnap.exists()) {
      // Create user document with initial quota and user info
      const currentUser = auth.currentUser;
      await setDoc(userDoc, {
        quotaUsed: 0,
        lastResetDate: currentDate,
        createdAt: new Date().toISOString(),
        email: currentUser?.email || '',
        displayName: currentUser?.displayName || currentUser?.email || ''
      });
      quotaCache = { userId, used: 0 };
    } else {
      // Load existing quota
      const data = userSnap.data();
      
      // Check if quota needs to be reset for new day
      if (shouldResetQuota(data.lastResetDate)) {
        await updateDoc(userDoc, {
          quotaUsed: 0,
          lastResetDate: currentDate
        });
        quotaCache = { userId, used: 0 };
      } else {
        quotaCache = { userId, used: data.quotaUsed || 0 };
      }
      
      // Update email and displayName if missing
      const currentUser = auth.currentUser;
      if (!data.email || !data.displayName) {
        await updateDoc(userDoc, {
          email: currentUser?.email || data.email || '',
          displayName: currentUser?.displayName || currentUser?.email || data.displayName || ''
        });
      }
    }
  } catch (error) {
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
      const data = userSnap.data();
      
      // Check if quota needs to be reset for new day
      if (shouldResetQuota(data.lastResetDate)) {
        const currentDate = getJakartaDate();
        await updateDoc(userDoc, {
          quotaUsed: 0,
          lastResetDate: currentDate
        });
        quotaCache = { userId, used: 0 };
        return 0;
      }
      
      const used = data.quotaUsed || 0;
      quotaCache = { userId, used };
      return used;
    }
    return 0;
  } catch (error) {
    return quotaCache?.used || 0;
  }
};

export const incrementQuota = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Use transaction to prevent race condition
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      
      if (!userSnap.exists()) {
        // Create new user document
        const currentDate = getJakartaDate();
        const currentUser = auth.currentUser;
        transaction.set(userRef, {
          quotaUsed: 1,
          lastResetDate: currentDate,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          email: currentUser?.email || '',
          displayName: currentUser?.displayName || currentUser?.email || ''
        });
        quotaCache = { userId, used: 1 };
        return;
      }
      
      const data = userSnap.data();
      const currentDate = getJakartaDate();
      
      // Check if quota needs to be reset for new day
      if (shouldResetQuota(data.lastResetDate)) {
        transaction.update(userRef, {
          quotaUsed: 1,
          lastResetDate: currentDate,
          lastUpdated: new Date().toISOString()
        });
        quotaCache = { userId, used: 1 };
      } else {
        const newUsed = (data.quotaUsed || 0) + 1;
        transaction.update(userRef, {
          quotaUsed: newUsed,
          lastUpdated: new Date().toISOString()
        });
        quotaCache = { userId, used: newUsed };
      }
    });
    
    // Dispatch event for UI update
    window.dispatchEvent(new Event('quotaUpdated'));
  } catch (error) {
    console.error('[QuotaService] Transaction error:', error);
    throw new Error('Failed to update quota. Please try again.');
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

/**
 * Get user-specific API key from encrypted localStorage
 * @param userId - User ID to get API key for
 * @returns API key or null
 */
export const getUserApiKey = (userId: string): string | null => {
  const apiKey = secureGetItem(`GEMINI_API_KEY_${userId}`, userId);
  console.log('[QuotaService] getUserApiKey', {
    userId,
    hasKey: !!apiKey,
    keyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'null'
  });
  return apiKey;
};

/**
 * Set user-specific API key in encrypted localStorage
 * @param userId - User ID
 * @param apiKey - API key to store (will be encrypted)
 */
export const setUserApiKey = (userId: string, apiKey: string): void => {
  secureSetItem(`GEMINI_API_KEY_${userId}`, apiKey, userId);
};

/**
 * Remove user-specific API key from localStorage
 * @param userId - User ID
 */
export const removeUserApiKey = (userId: string): void => {
  secureRemoveItem(`GEMINI_API_KEY_${userId}`);
};

/**
 * Check if user is using custom API key
 * @param userId - User ID to check
 */
export const isUsingCustomApiKey = (userId: string): boolean => {
  return !!getUserApiKey(userId);
};

export const canMakeRequest = async (userId: string): Promise<boolean> => {
  // If using custom API key, unlimited requests
  if (isUsingCustomApiKey(userId)) {
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

/**
 * Clear user-specific API key on logout (secure deletion)
 * @param userId - User ID to clear API key for
 */
export const clearUserApiKey = (userId: string): void => {
  removeUserApiKey(userId);
  // Also clear all secure storage on logout
  clearSecureStorage();
};
