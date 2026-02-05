import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import Task1 from './components/Task1';
import Task2 from './components/Task2';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import HistorySidebar from './components/HistorySidebar';
import OnlineUserCounter from './components/OnlineUserCounter';
import ApiKeySettings from './components/ApiKeySettings';
import DonationModal from './components/DonationModal';
import QuotaIndicator from './components/QuotaIndicator';
import GuidelineModal from './components/GuidelineModal';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { TaskType, HistoryEntry } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { getUserHistory, saveHistory, deleteHistory } from './services/historyService';
import { startHeartbeat, stopHeartbeat, cleanupStaleUsers } from './services/onlineUserService';
import { initializeQuota, clearQuotaCache, getUserApiKey, clearUserApiKey } from './services/quotaService';
import { invalidateHistoryCache, clearAllCache } from './services/cacheService';
import { isAdmin } from './services/adminService';
import { useUIState } from './hooks/useUIState';

function AppContent() {
  const { state: uiState, openModal, closeModal, setTab, toggleSidebar, setSidebar } = useUIState();
  const [history, setHistory] = useState<Array<HistoryEntry & { id: string }>>([]);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const { currentUser, loading, logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();

  // Check admin status
  useEffect(() => {
    if (currentUser) {
      setUserIsAdmin(isAdmin(currentUser.email));
    } else {
      setUserIsAdmin(false);
    }
  }, [currentUser]);

  // Check for custom API key on mount and when user changes
  useEffect(() => {
    const checkCustomKey = () => {
      if (currentUser) {
        const customKey = getUserApiKey(currentUser.uid);
        setHasCustomApiKey(!!customKey);
      } else {
        setHasCustomApiKey(false);
      }
    };
    
    checkCustomKey();
    
    // Listen for storage changes (in case key is added/removed)
    window.addEventListener('storage', checkCustomKey);
    // Listen for quota updates
    window.addEventListener('quotaUpdated', checkCustomKey);
    return () => {
      window.removeEventListener('storage', checkCustomKey);
      window.removeEventListener('quotaUpdated', checkCustomKey);
    };
  }, [currentUser]);

  // Initialize user on login (without loading history)
  useEffect(() => {
    if (currentUser) {
      // Initialize quota from Firestore
      initializeQuota(currentUser.uid);
    } else {
      setHistory([]);
      setHistoryLoaded(false);
      setLastDoc(null);
      setHasMoreHistory(false);
      // Clear quota cache on logout
      clearQuotaCache();
      // Clear browser cache on logout
      clearAllCache();
      // Note: We don't clear user API key on logout so it persists for next login
      // If you want to clear it, uncomment the line below
      // clearUserApiKey(currentUser.uid);
    }
  }, [currentUser]);

  // DISABLED: Online user tracking (can be re-enabled later)
  // Heartbeat writes: ~1,440 writes per user per month
  // To re-enable: uncomment the useEffect below and uncomment <OnlineUserCounter /> in render
  /*
  useEffect(() => {
    if (currentUser) {
      const userName = currentUser.displayName || currentUser.email || 'Anonymous';
      const heartbeatInterval = startHeartbeat(currentUser.uid, userName);
      
      // Cleanup stale users every minute
      const cleanupInterval = setInterval(() => {
        cleanupStaleUsers();
      }, 60000);
      
      // Cleanup on unmount or logout
      return () => {
        stopHeartbeat(heartbeatInterval, currentUser.uid);
        clearInterval(cleanupInterval);
      };
    }
  }, [currentUser]);
  */

  const loadUserHistory = async (loadMore = false) => {
    if (!currentUser) return;
    if (loadMore && !hasMoreHistory) return; // No more data to load
    if (historyLoaded && !loadMore) return; // Already loaded first page
    try {
      setHistoryLoading(true);
      const result = await getUserHistory(currentUser.uid, loadMore ? lastDoc || undefined : undefined);
      if (loadMore) {
        // Append to existing history
        setHistory(prev => [...prev, ...result.history]);
      } else {
        // Replace history
        setHistory(result.history);
      }
      
      setLastDoc(result.lastDoc);
      setHasMoreHistory(result.hasMore);
      setHistoryLoaded(true);
    } catch (error) {
      // Silent error
    } finally {
      setHistoryLoading(false);
    }
  };

  const addToHistory = async (entry: HistoryEntry) => {
    if (!currentUser) return;
    
    // Save to Firestore first to get ID
    try {
      const docId = await saveHistory(currentUser.uid, entry);
      // Add to local state with ID
      setHistory(prev => [{ ...entry, id: docId }, ...prev]);
      // Invalidate cache and reset pagination
      invalidateHistoryCache(currentUser.uid);
      setHistoryLoaded(false);
      setLastDoc(null);
      setHasMoreHistory(false);
    } catch (error) {
    }
  };

  const handleDeleteHistory = async (index: number) => {
    const historyItem = history[index];
    if (!historyItem?.id || !currentUser) return;
    
    try {
      await deleteHistory(historyItem.id);
      setHistory(prev => prev.filter((_, i) => i !== index));
      // Invalidate cache and reset pagination
      invalidateHistoryCache(currentUser.uid);
      setHistoryLoaded(false);
      setLastDoc(null);
      setHasMoreHistory(false);
    } catch (error) {
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!currentUser) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-gray-900 font-sans transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-1.5">
              <div className="bg-primary text-white p-1 rounded-md">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">IELTS Writing Master</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
                            
              {/* Quota Indicator */}
              {!userIsAdmin && <QuotaIndicator />}

              {/* Admin Button */}
              {userIsAdmin && (
                <button
                  onClick={() => setTab('admin')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    uiState.activeTab === 'admin'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                  title="Admin Dashboard"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              )}

              {/* Guideline Button */}
              <button
                onClick={() => openModal('guideline')}
                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                title="Usage Guidelines & API Info"
              >
                <svg 
                  className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* API Key Settings Button */}
              <button
                onClick={() => openModal('apiSettings')}
                className={`relative p-1.5 rounded-lg transition-colors ${
                  hasCustomApiKey 
                    ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={hasCustomApiKey ? 'Using Custom API Key' : 'API Key Settings'}
              >
                <svg 
                  className={`w-4 h-4 transition-colors ${
                    hasCustomApiKey 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-300'
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {/* Green dot indicator */}
                {hasCustomApiKey && (
                  <>
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  </>
                )}
              </button>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Buy Us a Coffee Button */}
              <button
                onClick={() => openModal('donation')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
                title="Support Us"
              >
                <svg 
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 transition-transform group-hover:rotate-12" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h15v13c0 1.66-1.34 3-3 3H6c-1.66 0-3-1.34-3-3V3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8h1a3 3 0 013 3v0a3 3 0 01-3 3h-1" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21h9" />
                </svg>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 hidden sm:inline">Buy us a coffee</span>
              </button>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openModal('profile')}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {currentUser.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.displayName || 'User'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="w-full px-3 sm:px-4 lg:px-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
              <button
                onClick={() => setTab(TaskType.TASK_1)}
                className={`
                  whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors
                  ${uiState.activeTab === TaskType.TASK_1
                    ? 'border-primary text-primary dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}
                `}
              >
                Task 1: Academic Report
              </button>
              <button
                onClick={() => setTab(TaskType.TASK_2)}
                className={`
                  whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors
                  ${uiState.activeTab === TaskType.TASK_2
                    ? 'border-primary text-primary dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}
                `}
              >
                Task 2: Essay
              </button>
            </nav>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        <HistorySidebar 
          history={history} 
          onDeleteHistory={handleDeleteHistory}
          isVisible={uiState.sidebarVisible}
          onToggleVisibility={toggleSidebar}
          onLoadHistory={() => loadUserHistory(false)}
          onLoadMore={() => loadUserHistory(true)}
          isLoading={historyLoading}
          isLoaded={historyLoaded}
          hasMore={hasMoreHistory}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Admin Dashboard */}
          {uiState.activeTab === 'admin' && userIsAdmin && (
            <AdminDashboard />
          )}
          
          {/* We use hidden class instead of conditional rendering to persist state including scroll and inputs */}
          <div className={uiState.activeTab === TaskType.TASK_1 ? 'block' : 'hidden'}>
            <Task1 history={history} onAddToHistory={addToHistory} isAdmin={userIsAdmin} />
          </div>
          <div className={uiState.activeTab === TaskType.TASK_2 ? 'block' : 'hidden'}>
            <Task2 history={history} onAddToHistory={addToHistory} isAdmin={userIsAdmin} />
          </div>
        </main>
      </div>
      
      {/* Disclaimer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 relative">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400 dark:text-gray-500">
              Dev <a href="https://ridwancard.my.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">ridwancard.my.id</a>. Scores are estimates only and not official IELTS results.
          </div>
          {/* DISABLED: Online User Counter - can be re-enabled later */}
          {/* 
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <OnlineUserCounter />
          </div>
          */}
      </footer>

      {/* User Profile Modal */}
      {uiState.modals.profile && <UserProfile onClose={() => closeModal('profile')} />}
      
      {/* API Key Settings Modal */}
      {uiState.modals.apiSettings && <ApiKeySettings onClose={() => {
        closeModal('apiSettings');
        // Recheck custom key status after modal closes
        if (currentUser) {
          const customKey = getUserApiKey(currentUser.uid);
          setHasCustomApiKey(!!customKey);
        }
      }} />}
      
      {/* Guideline Modal */}
      {uiState.modals.guideline && <GuidelineModal isOpen={uiState.modals.guideline} onClose={() => closeModal('guideline')} />}
      
      {/* Donation Modal */}
      {uiState.modals.donation && <DonationModal onClose={() => closeModal('donation')} />}

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#f3f4f6' : '#111',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DarkModeProvider>
          <AppContent />
          <Analytics />
        </DarkModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
