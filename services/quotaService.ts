import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

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
