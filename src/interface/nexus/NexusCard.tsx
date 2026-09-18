import React from 'react';

export interface NexusCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const NexusCard: React.FC<NexusCardProps> = ({
  title,
  subtitle,
  action,
  badge,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#EADFCF] shadow-[0_4px_20px_-2px_rgba(180,150,120,0.08),0_1px_4px_rgba(160,130,100,0.04)] transition-all duration-200 ${
        hoverable ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(180,150,120,0.14)] cursor-pointer' : ''
      } ${className}`}
    >
      {(title || subtitle || action || badge) && (
        <div className={`p-5 sm:p-6 pb-2 sm:pb-3 flex items-start justify-between gap-4 border-b border-[#F5EFE6] ${headerClassName}`}>
          <div>
            <div className="flex items-center gap-2.5">
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg font-bold text-[#181512] tracking-tight">{title}</h3>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#6A6359] mt-0.5 font-normal">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
