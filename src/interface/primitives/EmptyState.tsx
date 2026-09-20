import React from 'react';
import { Button } from './Button';
import { GeometricAccent } from '../bauhaus/GeometricAccent';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '2px dashed #111111',
        borderRadius: '0px',
      }}
    >
      {/* Icon or geometric composition */}
      {icon ? (
        <div
          className="w-14 h-14 flex items-center justify-center mb-5"
          style={{
            backgroundColor: '#F5F0E6',
            border: '2px solid #111111',
            color: '#111111',
          }}
        >
          {icon}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6" aria-hidden="true">
          <GeometricAccent shape="circle" color="red" size={28} />
          <GeometricAccent shape="triangle" color="black" size={22} />
          <GeometricAccent shape="square" color="yellow" size={18} />
        </div>
      )}

      <h3
        className="text-lg font-bold mb-2 uppercase tracking-tight text-[#111111]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h3>

      <p
        className="text-xs text-[#555555] max-w-sm mb-6 leading-relaxed"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
