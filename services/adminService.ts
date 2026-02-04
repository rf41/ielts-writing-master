import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

const ADMIN_EMAILS = ['ridwancard@gmail.com'];

export const isAdmin = (email: string | null): boolean => {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false;
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
  recentUsers: UserStats[];
}

export const getAllUsers = async (): Promise<UserStats[]> => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const statsSnapshot = await getDocs(collection(db, 'user_stats'));
    
    // Map stats by userId for quick lookup
    const statsMap = new Map();
    statsSnapshot.docs.forEach(doc => {
      statsMap.set(doc.id, doc.data());
    });
    
    // Fallback: If no stats exist, query history (migration case)
    const needsHistoryFallback = statsSnapshot.empty;
    let historyByUser = new Map<string, any[]>();
    
    if (needsHistoryFallback) {
      const allHistorySnapshot = await getDocs(collection(db, 'history'));
      allHistorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId) {
          if (!historyByUser.has(data.userId)) {
            historyByUser.set(data.userId, []);
          }
          historyByUser.get(data.userId)!.push(data);
        }
      });
    }
    
    const users: UserStats[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userStats = statsMap.get(userDoc.id);
      
      // Use stats if available, otherwise calculate from history
      let totalAttempts, avgBandScore, lastActive;
      
      if (userStats) {
        totalAttempts = userStats.totalAttempts || 0;
        const rawAvg = userStats.avgBandScore || 0;
        avgBandScore = rawAvg > 0 ? roundIELTSScore(rawAvg) : 0;
        lastActive = userStats.lastAttemptDate || userData.createdAt || '';
      } else if (needsHistoryFallback) {
        // Fallback to history calculation
        const userHistory = historyByUser.get(userDoc.id) || [];
        totalAttempts = userHistory.length;
        const scoresWithFeedback = userHistory.filter(h => h.feedback?.bandScore).map(h => h.feedback.bandScore);
        const rawAvg = scoresWithFeedback.length > 0 
          ? scoresWithFeedback.reduce((a, b) => a + b, 0) / scoresWithFeedback.length 
          : 0;
        avgBandScore = rawAvg > 0 ? roundIELTSScore(rawAvg) : 0;
        lastActive = userHistory.length > 0 
          ? userHistory.sort((a, b) => new Date(b.timestamp || b.createdAt?.toDate()).getTime() - new Date(a.timestamp || a.createdAt?.toDate()).getTime())[0].timestamp || userData.createdAt
          : userData.createdAt;
      } else {
        // No stats and no history fallback
        totalAttempts = 0;
        avgBandScore = 0;
        lastActive = userData.createdAt || '';
      }

      users.push({
        uid: userDoc.id,
        email: userData.email || 'No email',
        displayName: userData.displayName || userData.email || 'Unknown',
        createdAt: userData.createdAt || '',
        totalAttempts,
        avgBandScore,
        lastActive,
      });
    }

    return users.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  } catch (error) {
    throw error;
  }
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    // Get all user stats (much lighter than all history)
    const statsSnapshot = await getDocs(collection(db, 'user_stats'));
    
    // If stats collection is empty, fallback to history
    if (statsSnapshot.empty) {
      const allHistorySnapshot = await getDocs(collection(db, 'history'));
      let totalAttempts = 0;
      let task1Scores: number[] = [];
      let task2Scores: number[] = [];
      let todayAttempts = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allHistorySnapshot.docs.forEach(historyDoc => {
        const data = historyDoc.data();
        totalAttempts++;

        const attemptDate = data.timestamp ? new Date(data.timestamp) : data.createdAt?.toDate();
        if (attemptDate && attemptDate >= today) {
          todayAttempts++;
        }

        if (data.feedback?.bandScore) {
          if (data.taskType === 'Task 1') {
            task1Scores.push(data.feedback.bandScore);
          } else if (data.taskType === 'Task 2') {
            task2Scores.push(data.feedback.bandScore);
          }
        }
      });

      const rawAvgTask1 = task1Scores.length > 0
        ? task1Scores.reduce((a, b) => a + b, 0) / task1Scores.length
        : 0;
      const avgBandScoreTask1 = rawAvgTask1 > 0 ? roundIELTSScore(rawAvgTask1) : 0;

      const rawAvgTask2 = task2Scores.length > 0
        ? task2Scores.reduce((a, b) => a + b, 0) / task2Scores.length
        : 0;
      const avgBandScoreTask2 = rawAvgTask2 > 0 ? roundIELTSScore(rawAvgTask2) : 0;

      const recentUsers = await getAllUsers();

      return {
        totalUsers,
        totalAttempts,
        avgBandScoreTask1,
        avgBandScoreTask2,
        todayAttempts,
        recentUsers: recentUsers.slice(0, 10),
      };
    }
    
    // Use user_stats aggregation
    let totalAttempts = 0;
    let task1TotalScore = 0;
    let task1Count = 0;
    let task2TotalScore = 0;
    let task2Count = 0;
    let todayAttempts = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    statsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalAttempts += data.totalAttempts || 0;
      
      // Aggregate task-specific scores
      if (data.task1Attempts > 0) {
        task1TotalScore += (data.avgTask1Score || 0) * data.task1Attempts;
        task1Count += data.task1Attempts;
      }
      if (data.task2Attempts > 0) {
        task2TotalScore += (data.avgTask2Score || 0) * data.task2Attempts;
        task2Count += data.task2Attempts;
      }
      
      // Check if last attempt was today
      if (data.lastAttemptDate) {
        const attemptDate = new Date(data.lastAttemptDate);
        if (attemptDate >= today) {
          todayAttempts++;
        }
      }
    });

    const rawAvgTask1 = task1Count > 0 ? task1TotalScore / task1Count : 0;
    const avgBandScoreTask1 = rawAvgTask1 > 0 ? roundIELTSScore(rawAvgTask1) : 0;

    const rawAvgTask2 = task2Count > 0 ? task2TotalScore / task2Count : 0;
    const avgBandScoreTask2 = rawAvgTask2 > 0 ? roundIELTSScore(rawAvgTask2) : 0;

    // Get recent active users
    const recentUsers = await getAllUsers();

    return {
      totalUsers,
      totalAttempts,
      avgBandScoreTask1,
      avgBandScoreTask2,
      todayAttempts,
      recentUsers: recentUsers.slice(0, 10),
    };
  } catch (error) {
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
