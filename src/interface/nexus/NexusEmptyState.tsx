import React from 'react';

export interface NexusEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const NexusEmptyState: React.FC<NexusEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-dashed border-[#D7CABB] p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0E4] border border-[#FDCBA7] flex items-center justify-center text-[#F47B20] mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[#181512] tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-[#6A6359] max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
