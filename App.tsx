import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Task1 from './components/Task1';
import Task2 from './components/Task2';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import HistorySidebar from './components/HistorySidebar';
import QuestionExporter from './components/QuestionExporter';
import OnlineUserCounter from './components/OnlineUserCounter';
import ApiKeySettings from './components/ApiKeySettings';
import DonationModal from './components/DonationModal';
import QuotaIndicator from './components/QuotaIndicator';
import GuidelineModal from './components/GuidelineModal';
import { TaskType, HistoryEntry } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { getUserHistory, saveHistory, deleteHistory } from './services/historyService';
import { startHeartbeat, stopHeartbeat, cleanupStaleUsers } from './services/onlineUserService';
import { initializeQuota, clearQuotaCache } from './services/quotaService';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TaskType>(TaskType.TASK_1);
  const [history, setHistory] = useState<Array<HistoryEntry & { id: string }>>([]);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showProfile, setShowProfile] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showGuideline, setShowGuideline] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { currentUser, loading, logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();

  // Check for custom API key on mount
  useEffect(() => {
    const checkCustomKey = () => {
      const customKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
      setHasCustomApiKey(!!customKey);
    };
    
    checkCustomKey();
    
    // Listen for storage changes (in case key is added/removed)
    window.addEventListener('storage', checkCustomKey);
    return () => window.removeEventListener('storage', checkCustomKey);
  }, []);

  // Load user history when user logs in
  useEffect(() => {
    if (currentUser) {
      loadUserHistory();
      // Initialize quota from Firestore
      initializeQuota(currentUser.uid);
    } else {
      setHistory([]);
      // Clear quota cache on logout
      clearQuotaCache();
    }
  }, [currentUser]);

  // Online user tracking
  useEffect(() => {
    if (currentUser) {
      console.log('Starting online tracking for user:', currentUser.uid, currentUser.displayName || currentUser.email);
      const userName = currentUser.displayName || currentUser.email || 'Anonymous';
      const heartbeatInterval = startHeartbeat(currentUser.uid, userName);
      
      // Cleanup stale users every minute
      const cleanupInterval = setInterval(() => {
        cleanupStaleUsers();
      }, 60000);
      
      // Cleanup on unmount or logout
      return () => {
        console.log('Stopping online tracking for user:', currentUser.uid);
        stopHeartbeat(heartbeatInterval, currentUser.uid);
        clearInterval(cleanupInterval);
      };
    }
  }, [currentUser]);

  const loadUserHistory = async () => {
    if (!currentUser) return;
    
    console.log('App: Starting to load history for user:', currentUser.uid);
    console.log('App: User email:', currentUser.email);
    
    try {
      setHistoryLoading(true);
      const userHistory = await getUserHistory(currentUser.uid);
      console.log('App: Received history:', userHistory);
      setHistory(userHistory);
    } catch (error) {
      console.error('App: Failed to load history:', error);
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
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  const handleDeleteHistory = async (index: number) => {
    const historyItem = history[index];
    if (!historyItem?.id) return;
    
    try {
      await deleteHistory(historyItem.id);
      setHistory(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
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
              <QuotaIndicator />

              {/* Guideline Button */}
              <button
                onClick={() => setShowGuideline(true)}
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
                onClick={() => setShowApiSettings(true)}
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
              
              {/* Buy Us a Coffee Button */}
              <button
                onClick={() => setShowDonation(true)}
                className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group"
                title="Buy Us a Coffee"
              >
                <svg 
                  className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h15v13c0 1.66-1.34 3-3 3H6c-1.66 0-3-1.34-3-3V3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8h1a3 3 0 013 3v0a3 3 0 01-3 3h-1" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21h9" />
                </svg>
              </button>
              
              {/* Export Questions Button */}
              <button
                onClick={() => setShowExporter(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
                title="Export Question Bank"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
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
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowProfile(true)}
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
                onClick={() => setActiveTab(TaskType.TASK_1)}
                className={`
                  whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors
                  ${activeTab === TaskType.TASK_1
                    ? 'border-primary text-primary dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}
                `}
              >
                Task 1: Academic Report
              </button>
              <button
                onClick={() => setActiveTab(TaskType.TASK_2)}
                className={`
                  whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors
                  ${activeTab === TaskType.TASK_2
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
          isVisible={sidebarVisible}
          onToggleVisibility={() => setSidebarVisible(!sidebarVisible)}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* We use hidden class instead of conditional rendering to persist state including scroll and inputs */}
          <div className={activeTab === TaskType.TASK_1 ? 'block' : 'hidden'}>
            <Task1 history={history} onAddToHistory={addToHistory} />
          </div>
          <div className={activeTab === TaskType.TASK_2 ? 'block' : 'hidden'}>
            <Task2 history={history} onAddToHistory={addToHistory} />
          </div>
        </main>
      </div>
      
      {/* Disclaimer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 relative">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400 dark:text-gray-500">
              Dev <a href="https://ridwancard.my.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">ridwancard.my.id</a>. Scores are estimates only and not official IELTS results.
          </div>
          {/* Online User Counter - Integrated in Footer */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <OnlineUserCounter />
          </div>
      </footer>

      {/* User Profile Modal */}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      
      {/* Question Exporter Modal */}
      {showExporter && <QuestionExporter onClose={() => setShowExporter(false)} />}
      
      {/* API Key Settings Modal */}
      {showApiSettings && <ApiKeySettings onClose={() => {
        setShowApiSettings(false);
        // Recheck custom key status after modal closes
        const customKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
        setHasCustomApiKey(!!customKey);
      }} />}
      
      {/* Guideline Modal */}
      {showGuideline && <GuidelineModal isOpen={showGuideline} onClose={() => setShowGuideline(false)} />}
      
      {/* Donation Modal */}
      {showDonation && <DonationModal onClose={() => setShowDonation(false)} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <AppContent />
        <Analytics />
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
