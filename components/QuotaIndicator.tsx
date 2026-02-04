import React, { useState, useEffect } from 'react';
import { getCachedQuota, isUsingCustomApiKey, getMaxQuota, getQuotaUsed } from '../services/quotaService';
import { useAuth } from '../contexts/AuthContext';

const QuotaIndicator: React.FC = () => {
  const [remaining, setRemaining] = useState(3);
  const [isCustom, setIsCustom] = useState(false);
  const { currentUser } = useAuth();

  const updateQuota = async () => {
    if (!currentUser) return;
    
    setIsCustom(isUsingCustomApiKey());
    
    if (!isUsingCustomApiKey()) {
      try {
        const used = await getQuotaUsed(currentUser.uid);
        setRemaining(getMaxQuota() - used);
      } catch (error) {
        console.error('Error updating quota:', error);
        // Fallback to cached value
        setRemaining(getMaxQuota() - getCachedQuota());
      }
    }
  };

  useEffect(() => {
    updateQuota();
    
    // Listen for custom quota update event
    const handleQuotaUpdate = () => {
      updateQuota();
    };
    
    window.addEventListener('quotaUpdated', handleQuotaUpdate);
    
    return () => {
      window.removeEventListener('quotaUpdated', handleQuotaUpdate);
    };
  }, [currentUser]);

  // Don't show indicator for custom API users
  if (isCustom) {
    return null;
  }

  const maxQuota = getMaxQuota();
  
  // Simplified color coding
  let dotColor = 'bg-green-500';
  let textColor = 'text-gray-700 dark:text-gray-300';
  
  if (remaining === 0) {
    dotColor = 'bg-red-500';
    textColor = 'text-red-600 dark:text-red-400';
  } else if (remaining === 1) {
    dotColor = 'bg-orange-500';
    textColor = 'text-orange-600 dark:text-orange-400';
  } else if (remaining === 2) {
    dotColor = 'bg-yellow-500';
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/50">
      <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
      <span className={`text-xs font-medium ${textColor}`}>
        {remaining}/{maxQuota}
      </span>
    </div>
  );
};

export default QuotaIndicator;
