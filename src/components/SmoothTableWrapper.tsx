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
      className={`transition-all duration-300 ${isRefreshing
        ? 'opacity-70'
        : 'opacity-100'
        } ${className}`}
    >
      {children}
    </div>
  );
};
