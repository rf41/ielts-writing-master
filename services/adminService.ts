import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, orderBy, limit, getDoc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if user is admin by email (single admin: ridwancard@gmail.com)
 * OPTIMIZED: No Firestore read needed - saves quota
 * @param email - User email to check
 * @returns boolean - True if user is admin
 */
export const isAdmin = (email: string | null): boolean => {
  return email ? email.toLowerCase() === 'ridwancard@gmail.com' : false;
};

// IELTS band score rounding
// 0.00-0.24 → round down to .0
// 0.25-0.74 → round to .5
// 0.75-0.99 → round up to next .0
const roundIELTSScore = (score: number): number => {
  const integerPart = Math.floor(score);
  const decimal = score - integerPart;
  
  if (decimal < 0.25) {
    return integerPart;
  } else if (decimal < 0.75) {
    return integerPart + 0.5;
  } else {
    return integerPart + 1;
  }
};

export interface UserStats {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  totalAttempts: number;
  avgBandScore: number;
  lastActive: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalAttempts: number;
  avgBandScoreTask1: number;
  avgBandScoreTask2: number;
  todayAttempts: number;
  weekAttempts: number;
  monthAttempts: number;
  activeToday: number;
  activeWeek: number;
  task1Attempts: number;
  task2Attempts: number;
  lastUpdated: string;
}

export interface TopUser {
  uid: string;
  email: string;
  displayName: string;
  totalAttempts: number;
  avgBandScore: number;
  lastActive: string;
}

/**
 * Get paginated users list with stats
 * More efficient than loading all users at once
 */
export const getAllUsers = async (pageSize: number = 50): Promise<UserStats[]> => {
  try {
    // Only fetch user_stats (lighter than users + stats join)
    const statsQuery = query(
      collection(db, 'user_stats'),
      orderBy('lastAttemptDate', 'desc'),
      limit(pageSize)
    );
    
    const statsSnapshot = await getDocs(statsQuery);
    const users: UserStats[] = [];

    // Get user emails in parallel (only for displayed users)
    const userPromises = statsSnapshot.docs.map(async (statsDoc) => {
      const statsData = statsDoc.data();
      const userId = statsDoc.id;
      
      // Try to get user email from user_stats first (cached)
      let email = statsData.email || 'Unknown';
      let displayName = statsData.displayName || email;
      
      // If not in stats, fetch from users collection
      if (!statsData.email) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            email = userDoc.data().email || 'Unknown';
            displayName = userDoc.data().displayName || email;
          }
        } catch (e) {
          // Silently fail, use default
        }
      }
      
      const rawAvg = statsData.avgBandScore || 0;
      
      return {
        uid: userId,
        email,
        displayName,
        createdAt: statsData.createdAt || '',
        totalAttempts: statsData.totalAttempts || 0,
        avgBandScore: rawAvg > 0 ? roundIELTSScore(rawAvg) : 0,
        lastActive: statsData.lastAttemptDate || statsData.createdAt || '',
      };
    });

    const usersData = await Promise.all(userPromises);
    return usersData;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Get dashboard stats from pre-aggregated adminStats document
 * MOST EFFICIENT: Only 1 Firestore read!
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Try to read from adminStats document first (1 read)
    const adminStatsDoc = await getDoc(doc(db, 'adminStats', 'global'));
    
    if (adminStatsDoc.exists()) {
      const data = adminStatsDoc.data();
      
      // Check if data is stale (older than 5 minutes)
      const lastUpdated = data.lastUpdated?.toDate() || new Date(0);
      const now = new Date();
      const ageMinutes = (now.getTime() - lastUpdated.getTime()) / 60000;
      
      // If data is fresh, return it directly
      if (ageMinutes < 5) {
        console.log('[AdminService] Using cached admin stats (age:', Math.round(ageMinutes), 'min)');
        return {
          totalUsers: data.totalUsers || 0,
          totalAttempts: data.totalAttempts || 0,
          avgBandScoreTask1: data.avgBandScoreTask1 || 0,
          avgBandScoreTask2: data.avgBandScoreTask2 || 0,
          todayAttempts: data.todayAttempts || 0,
          weekAttempts: data.weekAttempts || 0,
          monthAttempts: data.monthAttempts || 0,
          activeToday: data.activeToday || 0,
          activeWeek: data.activeWeek || 0,
          task1Attempts: data.task1Attempts || 0,
          task2Attempts: data.task2Attempts || 0,
          lastUpdated: lastUpdated.toISOString(),
        };
      }
      
      console.log('[AdminService] Admin stats stale (age:', Math.round(ageMinutes), 'min), recalculating...');
    }
    
    // If no cache or stale, calculate from user_stats
    console.log('[AdminService] Calculating admin stats from user_stats...');
    return await recalculateAdminStats();
  } catch (error) {
    console.error('[AdminService] Error getting dashboard stats:', error);
    throw error;
  }
};

/**
 * Recalculate admin stats from user_stats collection
 * This is expensive but cached in adminStats document
 */
export const recalculateAdminStats = async (): Promise<DashboardStats> => {
  try {
    const statsSnapshot = await getDocs(collection(db, 'user_stats'));
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    const totalUsers = usersSnapshot.size;
    let totalAttempts = 0;
    let task1TotalScore = 0;
    let task1Count = 0;
    let task2TotalScore = 0;
    let task2Count = 0;
    let todayAttempts = 0;
    let weekAttempts = 0;
    let monthAttempts = 0;
    let activeToday = 0;
    let activeWeek = 0;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    statsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const attempts = data.totalAttempts || 0;
      totalAttempts += attempts;
      
      // Task-specific aggregation
      if (data.task1Attempts > 0) {
        task1TotalScore += (data.avgTask1Score || 0) * data.task1Attempts;
        task1Count += data.task1Attempts;
      }
      if (data.task2Attempts > 0) {
        task2TotalScore += (data.avgTask2Score || 0) * data.task2Attempts;
        task2Count += data.task2Attempts;
      }
      
      // Time-based metrics
      if (data.lastAttemptDate) {
        const attemptDate = new Date(data.lastAttemptDate);
        
        if (attemptDate >= today) {
          todayAttempts += attempts;
          activeToday++;
        }
        if (attemptDate >= weekAgo) {
          weekAttempts += attempts;
          activeWeek++;
        }
        if (attemptDate >= monthAgo) {
          monthAttempts += attempts;
        }
      }
    });

    const rawAvgTask1 = task1Count > 0 ? task1TotalScore / task1Count : 0;
    const avgBandScoreTask1 = rawAvgTask1 > 0 ? roundIELTSScore(rawAvgTask1) : 0;

    const rawAvgTask2 = task2Count > 0 ? task2TotalScore / task2Count : 0;
    const avgBandScoreTask2 = rawAvgTask2 > 0 ? roundIELTSScore(rawAvgTask2) : 0;

    const stats: DashboardStats = {
      totalUsers,
      totalAttempts,
      avgBandScoreTask1,
      avgBandScoreTask2,
      todayAttempts,
      weekAttempts,
      monthAttempts,
      activeToday,
      activeWeek,
      task1Attempts: task1Count,
      task2Attempts: task2Count,
      lastUpdated: new Date().toISOString(),
    };

    // Save to adminStats for caching
    await setDoc(doc(db, 'adminStats', 'global'), {
      ...stats,
      lastUpdated: Timestamp.now(),
    });
    
    console.log('[AdminService] Admin stats recalculated and cached');
    return stats;
  } catch (error) {
    console.error('[AdminService] Error recalculating admin stats:', error);
    throw error;
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  try {
    // Delete user's history from flat collection
    const historyQuery = query(collection(db, 'history'), where('userId', '==', uid));
    const historySnapshot = await getDocs(historyQuery);
    for (const historyDoc of historySnapshot.docs) {
      await deleteDoc(historyDoc.ref);
    }

    // Delete user stats
    const statsDoc = doc(db, 'user_stats', uid);
    await deleteDoc(statsDoc);

    // Delete user document
    const userDoc = doc(db, 'users', uid);
    await deleteDoc(userDoc);
  } catch (error) {
    throw error;
  }
};
