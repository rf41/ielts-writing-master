import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { FeedbackResult } from '../types';

const USER_STATS_COLLECTION = 'user_stats';

interface UserStats {
  totalAttempts: number;
  avgBandScore: number;
  lastAttemptDate: string;
  task1Attempts: number;
  task2Attempts: number;
  avgTask1Score: number;
  avgTask2Score: number;
  progressTrend: number[]; // Last 10 band scores
  lastUpdated: string;
}

// Initialize user stats document
export const initializeUserStats = async (userId: string): Promise<void> => {
  try {
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        totalAttempts: 0,
        avgBandScore: 0,
        lastAttemptDate: '',
        task1Attempts: 0,
        task2Attempts: 0,
        avgTask1Score: 0,
        avgTask2Score: 0,
        progressTrend: [],
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
  }
};

// Update stats when new history is added
export const updateUserStats = async (
  userId: string, 
  taskType: string, 
  feedback: FeedbackResult
): Promise<void> => {
  try {
    console.log('[UserStatsService] Updating stats for user:', userId, 'taskType:', taskType, 'score:', feedback.bandScore);
    
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize if not exists
      console.log('[UserStatsService] Stats doc not found, initializing...');
      await initializeUserStats(userId);
      await updateUserStats(userId, taskType, feedback); // Retry after init
      return;
    }
    
    const currentStats = statsSnap.data() as UserStats;
    const bandScore = feedback.bandScore;
    
    // Update total attempts
    const newTotalAttempts = currentStats.totalAttempts + 1;
    
    // Update task-specific attempts and avg scores
    let newTask1Attempts = currentStats.task1Attempts;
    let newTask2Attempts = currentStats.task2Attempts;
    let newAvgTask1Score = currentStats.avgTask1Score;
    let newAvgTask2Score = currentStats.avgTask2Score;
    
    if (taskType === 'Task 1') {
      newTask1Attempts += 1;
      // Calculate new average
      newAvgTask1Score = ((currentStats.avgTask1Score * currentStats.task1Attempts) + bandScore) / newTask1Attempts;
    } else {
      newTask2Attempts += 1;
      newAvgTask2Score = ((currentStats.avgTask2Score * currentStats.task2Attempts) + bandScore) / newTask2Attempts;
    }
    
    // Calculate overall average
    const newAvgBandScore = ((currentStats.avgBandScore * currentStats.totalAttempts) + bandScore) / newTotalAttempts;
    
    // Update progress trend (keep last 10)
    const newProgressTrend = [...currentStats.progressTrend, bandScore].slice(-10);
    
    // Update document
    await updateDoc(statsRef, {
      totalAttempts: newTotalAttempts,
      avgBandScore: newAvgBandScore,
      lastAttemptDate: new Date().toISOString(),
      task1Attempts: newTask1Attempts,
      task2Attempts: newTask2Attempts,
      avgTask1Score: newAvgTask1Score,
      avgTask2Score: newAvgTask2Score,
      progressTrend: newProgressTrend,
      lastUpdated: new Date().toISOString()
    });
    
    console.log('[UserStatsService] Stats updated successfully. Total attempts:', newTotalAttempts);
  } catch (error) {
    console.error('[UserStatsService] Error updating stats:', error);
    throw error;
  }
};

// Recalculate stats from scratch (for corrections or migrations)
export const recalculateUserStats = async (
  userId: string,
  historyData: Array<{ taskType: string; feedback?: FeedbackResult }>
): Promise<void> => {
  try {
    let totalAttempts = 0;
    let totalScore = 0;
    let task1Attempts = 0;
    let task2Attempts = 0;
    let task1TotalScore = 0;
    let task2TotalScore = 0;
    const progressTrend: number[] = [];
    
    historyData.forEach((entry) => {
      if (entry.feedback) {
        totalAttempts++;
        totalScore += entry.feedback.bandScore;
        progressTrend.push(entry.feedback.bandScore);
        
        if (entry.taskType === 'Task 1') {
          task1Attempts++;
          task1TotalScore += entry.feedback.bandScore;
        } else {
          task2Attempts++;
          task2TotalScore += entry.feedback.bandScore;
        }
      }
    });
    
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    await setDoc(statsRef, {
      totalAttempts,
      avgBandScore: totalAttempts > 0 ? totalScore / totalAttempts : 0,
      lastAttemptDate: totalAttempts > 0 ? new Date().toISOString() : '',
      task1Attempts,
      task2Attempts,
      avgTask1Score: task1Attempts > 0 ? task1TotalScore / task1Attempts : 0,
      avgTask2Score: task2Attempts > 0 ? task2TotalScore / task2Attempts : 0,
      progressTrend: progressTrend.slice(-10),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

// Get user stats
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      return null;
    }
    
    return statsSnap.data() as UserStats;
  } catch (error) {
    return null;
  }
};
