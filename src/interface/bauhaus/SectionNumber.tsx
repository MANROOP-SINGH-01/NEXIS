import React from 'react';

// Section Number — "01 /" style numbering used in navigation and headings.

export interface SectionNumberProps {
  code?: string;
  number?: string;
  label?: string;
  className?: string;
}

export const SectionNumber: React.FC<SectionNumberProps> = ({ code, number, label, className = '' }) => {
  const displayNum = code || number || '01';

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`} aria-hidden="true">
      <span
        className="font-bold text-[#E53935] tracking-[0.08em]"
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px' }}
      >
        {displayNum}
      </span>
      <span className="font-bold text-[#7A7A7A] text-[11px]">/</span>
      {label && (
        <span
          className="font-bold text-[#7A7A7A] text-[10px] uppercase tracking-widest"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
