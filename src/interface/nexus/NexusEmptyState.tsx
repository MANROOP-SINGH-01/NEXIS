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
      className={`bg-[#121317] rounded-[10px] border border-dashed border-white/12 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-[8px] bg-[#1A1B20] border border-white/8 flex items-center justify-center text-[#FF5C1A] mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-[#EDEDED] tracking-tight mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-[#8B949E] max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
