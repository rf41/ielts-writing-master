import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for timer functionality
 * Prevents code duplication between Task1 and Task2 components
 */
export const useTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const toggle = () => setIsRunning(!isRunning);
  
  const reset = () => {
    setIsRunning(false);
    setSeconds(0);
  };
  
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return { 
    seconds, 
    isRunning, 
    toggle, 
    reset, 
    formatTime 
  };
};
