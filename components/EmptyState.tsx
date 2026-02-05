import React, { ReactNode } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Reusable empty state component
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { isDark } = useDarkMode();

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>
      <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {description}
      </p>
      {action}
    </div>
  );
};

export default EmptyState;
