import { 
  collection, 
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

const ONLINE_USERS_COLLECTION = 'onlineUsers';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD = 60000; // 1 minute

export const updateOnlineStatus = async (userId: string, userName: string) => {
  try {
    await setDoc(doc(db, ONLINE_USERS_COLLECTION, userId), {
      userId,
      userName,
      lastSeen: Timestamp.now(),
      status: 'online'
    }, { merge: true });
  } catch (error) {
  }
};

export const removeOnlineStatus = async (userId: string) => {
  try {
    await deleteDoc(doc(db, ONLINE_USERS_COLLECTION, userId));
  } catch (error) {
  }
};

export const startHeartbeat = (userId: string, userName: string): NodeJS.Timeout => {
  // Initial update
  updateOnlineStatus(userId, userName);
  
  // Set up heartbeat
  const interval = setInterval(() => {
    updateOnlineStatus(userId, userName);
  }, HEARTBEAT_INTERVAL);
  
  return interval;
};

export const stopHeartbeat = (intervalId: NodeJS.Timeout, userId: string) => {
  clearInterval(intervalId);
  removeOnlineStatus(userId);
};

export const subscribeToOnlineUsers = (callback: (count: number) => void) => {
  const q = query(collection(db, ONLINE_USERS_COLLECTION));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const now = Date.now();
    let onlineCount = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const lastSeen = data.lastSeen?.toDate().getTime() || 0;
      
      // Consider user online if last seen within threshold
      if (now - lastSeen < ONLINE_THRESHOLD) {
        onlineCount++;
      } else {
      }
    });
    callback(onlineCount);
  }, (error) => {
  });
  
  return unsubscribe;
};

// Clean up stale online users (can be called periodically)
export const cleanupStaleUsers = async () => {
  try {
    const q = query(collection(db, ONLINE_USERS_COLLECTION));
    const snapshot = await getDocs(q);
    const now = Date.now();
    
    const deletePromises: Promise<void>[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const lastSeen = data.lastSeen?.toDate().getTime() || 0;
      
      if (now - lastSeen > ONLINE_THRESHOLD) {
        deletePromises.push(deleteDoc(doc(db, ONLINE_USERS_COLLECTION, docSnap.id)));
      }
    });
    
    await Promise.all(deletePromises);
  } catch (error) {
  }
};
