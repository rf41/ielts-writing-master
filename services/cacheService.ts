import { HistoryEntry } from '../types';

const CACHE_PREFIX = 'ielts_cache_';
const MAX_CACHED_ITEMS = 10; // Only cache last 10 items

interface CacheData<T> {
  data: T;
  version: number;
  userId: string;
}

// Generic cache functions
const getCacheKey = (userId: string, key: string): string => {
  return `${CACHE_PREFIX}${key}_${userId}`;
};

// Version management
const getVersionKey = (userId: string): string => {
  return `${CACHE_PREFIX}version_${userId}`;
};

const getCurrentVersion = (userId: string): number => {
  try {
    const versionKey = getVersionKey(userId);
    const version = localStorage.getItem(versionKey);
    return version ? parseInt(version, 10) : 1;
  } catch {
    return 1;
  }
};

const incrementVersion = (userId: string): void => {
  try {
    const versionKey = getVersionKey(userId);
    const currentVersion = getCurrentVersion(userId);
    localStorage.setItem(versionKey, String(currentVersion + 1));
  } catch (error) {
  }
};

// History cache functions
export const getCachedHistory = (userId: string): Array<HistoryEntry & { id: string }> | null => {
  try {
    const cacheKey = getCacheKey(userId, 'history');
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cacheData: CacheData<Array<HistoryEntry & { id: string }>> = JSON.parse(cached);
    
    // Check if userId matches
    if (cacheData.userId !== userId) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Check if version matches
    const currentVersion = getCurrentVersion(userId);
    if (cacheData.version !== currentVersion) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return cacheData.data;
  } catch (error) {
    return null;
  }
};

export const setCachedHistory = (userId: string, history: Array<HistoryEntry & { id: string }>): void => {
  try {
    const cacheKey = getCacheKey(userId, 'history');
    // Only cache last 10 items
    const limitedHistory = history.slice(0, MAX_CACHED_ITEMS);
    const currentVersion = getCurrentVersion(userId);
    const cacheData: CacheData<Array<HistoryEntry & { id: string }>> = {
      data: limitedHistory,
      version: currentVersion,
      userId
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
  }
};

export const invalidateHistoryCache = (userId: string): void => {
  try {
    // Increment version to invalidate cache
    incrementVersion(userId);
  } catch (error) {
  }
};

// History detail cache functions
export const getCachedHistoryDetail = (historyId: string): HistoryEntry | null => {
  try {
    const cacheKey = `${CACHE_PREFIX}history_detail_${historyId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cacheData: CacheData<HistoryEntry> = JSON.parse(cached);
    
    // Detail cache valid for entire session
    return cacheData.data;
  } catch (error) {
    return null;
  }
};

export const setCachedHistoryDetail = (historyId: string, detail: HistoryEntry): void => {
  try {
    const cacheKey = `${CACHE_PREFIX}history_detail_${historyId}`;
    const cacheData: CacheData<HistoryEntry> = {
      data: detail,
      version: 1, // Detail doesn't need version tracking
      userId: '' // Not needed for detail cache
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
  }
};

export const invalidateHistoryDetailCache = (historyId: string): void => {
  try {
    const cacheKey = `${CACHE_PREFIX}history_detail_${historyId}`;
    sessionStorage.removeItem(cacheKey);
  } catch (error) {
  }
};

// Clear all cache on logout
export const clearAllCache = (): void => {
  try {
    // Clear localStorage cache
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage cache
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
  }
};
