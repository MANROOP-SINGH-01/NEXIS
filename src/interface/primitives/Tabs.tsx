import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'pill',
}) => {
  if (variant === 'underline') {
    return (
      <div
        className={`flex space-x-4 sm:space-x-6 overflow-x-auto custom-scrollbar ${className}`}
        style={{ borderBottom: '2px solid #111111' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex items-center gap-2 pb-3 min-h-[44px] touch-manipulation select-none transition-all duration-100 active:scale-[0.98] cursor-pointer relative shrink-0"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: isActive ? '#111111' : '#7A7A7A',
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    letterSpacing: '0.08em',
                    backgroundColor: isActive ? 'rgba(229,57,53,0.1)' : 'rgba(17,17,17,0.06)',
                    color: isActive ? '#E53935' : '#7A7A7A',
                    border: `1px solid ${isActive ? 'rgba(229,57,53,0.3)' : 'rgba(17,17,17,0.12)'}`,
                  }}
                >
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: '3px', backgroundColor: '#E53935' }}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pill variant → Bauhaus segmented control
  return (
    <div
      className={`inline-flex items-center gap-0 overflow-x-auto custom-scrollbar ${className}`}
      style={{ border: '2px solid #111111' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-2 min-h-[40px] sm:min-h-[38px] touch-manipulation select-none transition-all duration-100 active:scale-[0.98] cursor-pointer shrink-0"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              padding: '8px 16px',
              backgroundColor: isActive ? '#111111' : 'transparent',
              color: isActive ? '#F5F0E6' : '#7A7A7A',
              borderRight: '1px solid #111111',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '1px 5px',
                  letterSpacing: '0.08em',
                  backgroundColor: isActive ? '#E53935' : 'rgba(17,17,17,0.06)',
                  color: isActive ? '#F5F0E6' : '#7A7A7A',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
