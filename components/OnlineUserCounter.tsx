import React, { useState, useEffect } from 'react';
import { subscribeToOnlineUsers } from '../services/onlineUserService';

const OnlineUserCounter: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineUsers((count) => {
      setOnlineCount(count);
      // Trigger animation when count changes
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="inline-flex">
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-300 dark:border-gray-600 px-2.5 py-1 flex items-center gap-1.5 transition-all hover:bg-gray-100 dark:hover:bg-gray-600/50">
        {/* Compact LED Indicator */}
        <div className="relative">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
        
        {/* Compact Counter */}
        <div className="flex items-center gap-1">
          <span 
            className={`text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all ${
              isAnimating ? 'scale-110' : 'scale-100'
            }`}
          >
            {onlineCount}
          </span>
          <svg 
            className="w-3 h-3 text-gray-500 dark:text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default OnlineUserCounter;
