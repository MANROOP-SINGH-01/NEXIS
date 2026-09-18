import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
}

export interface NexusTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const NexusTabs: React.FC<NexusTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) => {
  return (
    <div className={`nx-nav-capsule overflow-x-auto max-w-full ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`nx-nav-tab flex items-center gap-2 cursor-pointer select-none ${
              isActive ? 'active' : ''
            } ${size === 'sm' ? '!py-1 !px-3.5 text-xs' : ''}`}
          >
            {tab.icon && <span className="flex-shrink-0 text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#F47B20] text-white'
                    : 'bg-[#E5DBCF] text-[#6A6359]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
