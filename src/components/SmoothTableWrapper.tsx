import React from 'react';

interface SmoothTableWrapperProps {
  children: React.ReactNode;
  isRefreshing?: boolean;
  className?: string;
}

export const SmoothTableWrapper: React.FC<SmoothTableWrapperProps> = ({
  children,
  isRefreshing = false,
  className = '',
}) => {
  return (
    <div 
      className={`transition-all duration-300 ${
        isRefreshing 
          ? 'opacity-70 scale-[0.998]' 
          : 'opacity-100 scale-100'
      } ${className}`}
    >
      {children}
    </div>
  );
};
