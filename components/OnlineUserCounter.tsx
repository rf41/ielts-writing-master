import React, { useState, useEffect } from 'react';
import { subscribeToOnlineUsers } from '../services/onlineUserService';

const OnlineUserCounter: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    console.log('OnlineUserCounter: Setting up subscription');
    const unsubscribe = subscribeToOnlineUsers((count) => {
      console.log('OnlineUserCounter: Count updated to', count);
      setOnlineCount(count);
      // Trigger animation when count changes
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    });

    return () => {
      console.log('OnlineUserCounter: Cleaning up subscription');
      unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 transition-all hover:shadow-xl">
        {/* Glowing Green LED Indicator */}
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
          <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full blur-sm"></div>
        </div>
        
        {/* Counter */}
        <div className="flex items-baseline gap-1">
          <span 
            className={`text-2xl font-bold text-gray-900 dark:text-white transition-all ${
              isAnimating ? 'scale-125' : 'scale-100'
            }`}
          >
            {onlineCount}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            online
          </span>
        </div>
        
        {/* Users Icon */}
        <svg 
          className="w-5 h-5 text-gray-600 dark:text-gray-400" 
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
      
      {/* Tooltip on hover */}
      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5), 0 0 10px rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.5);
          }
        }
      `}</style>
    </div>
  );
};

export default OnlineUserCounter;
