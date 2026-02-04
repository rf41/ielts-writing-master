import React, { useState, useEffect } from 'react';
import { getQuotaUsed, isUsingCustomApiKey, getMaxQuota, getCachedQuota } from '../services/quotaService';
import { useAuth } from '../contexts/AuthContext';

interface GuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuidelineModal: React.FC<GuidelineModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [remaining, setRemaining] = useState(3);
  const [isCustom, setIsCustom] = useState(false);
  const maxQuota = getMaxQuota();

  useEffect(() => {
    const loadQuota = async () => {
      if (!currentUser) return;
      
      setIsCustom(isUsingCustomApiKey());
      
      if (!isUsingCustomApiKey()) {
        try {
          const used = await getQuotaUsed(currentUser.uid);
          setRemaining(maxQuota - used);
        } catch (error) {
          setRemaining(maxQuota - getCachedQuota());
        }
      }
    };
    
    if (isOpen) {
      loadQuota();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Usage Guidelines
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Quota Status */}
          {!isCustom ? (
            <div className={`p-3 rounded-lg border ${
              remaining === 0 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
                : remaining <= 1
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    remaining === 0 ? 'bg-red-500' : remaining <= 1 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Quota Status</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    remaining === 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : remaining <= 1
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>{remaining}/{maxQuota}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">attempts left</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">Custom API Active</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unlimited generations!</div>
                </div>
              </div>
            </div>
          )}

          {/* Default API Limitation */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Default API Limitation
            </h3>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <p><strong>• 3 generate attempts</strong> (Task 1 + Task 2 combined)</p>
              <p>• Generation is limited because the shared API is used by many users to prevent rate limiting and quota exhaustion.</p>
              <p>• Add your own free Gemini API key for unlimited generations</p>
            </div>
          </div>

          {/* How to Get Free API Key */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              How to Get Your Free Gemini API Key
            </h3>
            <ol className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                <div>
                  Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">aistudio.google.com/app/apikey</a>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                <div>Create or select Google Cloud project</div>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                <div>Click "Create API key" and copy it</div>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                <div>Paste in Settings (key icon in header)</div>
              </li>
            </ol>
            <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] text-blue-800 dark:text-blue-300">
              🔒 Your API key is stored locally only
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Usage Tips
            </h3>
            <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
              <p>💡 Grammar check limited to 1x per task</p>
              <p>💡 Use your own Free Gemini API key for generate ~6-7 complete tasks per day</p>
              <p>💡 All evaluations auto-saved to history</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidelineModal;
