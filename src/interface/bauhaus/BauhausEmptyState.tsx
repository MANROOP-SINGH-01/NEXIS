import React from 'react';
import { GeometricAccent } from './GeometricAccent';

// BauhausEmptyState — Large typography + geometric composition + CTA

interface BauhausEmptyStateProps {
  headline: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: 'red' | 'yellow' | 'blue';
  className?: string;
}

export const BauhausEmptyState: React.FC<BauhausEmptyStateProps> = ({
  headline,
  description,
  actionLabel,
  onAction,
  accentColor = 'red',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
    {/* Geometric composition */}
    <div className="flex items-center gap-3 mb-8" aria-hidden="true">
      <GeometricAccent shape="circle" color={accentColor} size={32} />
      <GeometricAccent shape="triangle" color="black" size={24} />
      <GeometricAccent shape="square" color={accentColor === 'red' ? 'yellow' : 'red'} size={20} />
    </div>

    {/* Large headline */}
    <h2
      className="text-[clamp(28px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.02em] text-[#111111] whitespace-pre-line mb-4"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {headline}
    </h2>

    {description && (
      <p className="text-[14px] text-[#7A7A7A] max-w-[320px] mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
        {description}
      </p>
    )}

    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="bh-btn-primary"
      >
        {actionLabel} →
      </button>
    )}
  </div>
);
