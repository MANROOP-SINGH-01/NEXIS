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
      className={`bg-[#121317] rounded-[10px] border border-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-150 ${
        hoverable ? 'hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] cursor-pointer' : ''
      } ${className}`}
    >
      {(title || subtitle || action || badge) && (
        <div className={`p-5 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between gap-4 border-b border-white/8 ${headerClassName}`}>
          <div>
            <div className="flex items-center gap-2.5">
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg font-bold text-[#EDEDED] tracking-tight">{title}</h3>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#8B949E] mt-0.5 font-normal">{subtitle}</p>
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
