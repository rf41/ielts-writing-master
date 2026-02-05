import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * Reusable loading spinner component
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const { isDark } = useDarkMode();
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div 
        className={`animate-spin rounded-full border-b-2 ${
          isDark ? 'border-blue-400' : 'border-blue-600'
        } ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
