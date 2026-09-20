import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  showCloseButton?: boolean;
  doubleBezel?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  doubleBezel = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[95vw] h-[90vh]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop — paper-tinted with smooth fade */}
      <div
        className="fixed inset-0 bg-[#111111]/45 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        onClick={onClose}
      />

      {/* Modal Dialog Container — Bauhaus with Doppelrand Double-Bezel & Spring Scale Entrance */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} ${
          doubleBezel ? 'double-bezel' : 'border-2 border-[#111111] shadow-[4px_4px_0px_#111111]'
        } animate-modal-enter z-10 flex flex-col`}
      >
        <div
          className="w-full bg-[#F5F0E6] border border-[#111111] overflow-hidden flex flex-col"
          style={{ borderRadius: '0px' }}
        >
          {/* Header with geometric accent & macro spacing */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b-2 border-[#111111] bg-[#FFFFFF]">
              <div className="flex items-center gap-3">
                {/* Red accent bar */}
                <div className="w-1.5 h-6 bg-[#E53935] shrink-0" aria-hidden="true" />
                <div>
                  {title && typeof title === 'string' ? (
                    <h3
                      className="text-[16px] sm:text-[17px] font-bold text-[#111111] uppercase tracking-[0.04em]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    <p className="text-[12px] text-[#7A7A7A] mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-11 h-11 flex items-center justify-center text-[#7A7A7A] hover:text-[#111111] hover:bg-[#EFE7D8] active:scale-[0.95] transition-all touch-manipulation cursor-pointer shrink-0"
                  style={{ borderRadius: '0px' }}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Macro-whitespace dialog body */}
          <div className="p-6 sm:p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
};
