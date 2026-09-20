import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Navbar } from './Navbar';
import { GovHeaderBanner } from './GovHeaderBanner';
import { MobileNav } from './MobileNav';
import { CommandBar } from './CommandBar';
import { useCoreStore } from '../../integration/store/coreStore';

export interface ShellProps {
  children: React.ReactNode;
  isFullscreen?: boolean;
}

export const Shell: React.FC<ShellProps> = ({ children, isFullscreen = false }) => {
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const { setResumeForgeOpen } = useCoreStore();

  return (
    <div
      className="w-full max-w-[100vw] h-screen h-dvh overflow-hidden overflow-x-hidden flex flex-row font-sans"
      style={{
        backgroundColor: '#F5F0E6',
        color: '#111111',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Desktop App Sidebar — Black Bauhaus navigation */}
      {!isFullscreen && (
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
      )}

      {/* Main App Workspace Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
        {/* Government Top Strip & Section 25.3 Synthetic Data Trust Banner */}
        {!isFullscreen && <GovHeaderBanner />}

        {/* Top Navbar */}
        {!isFullscreen && (
          <Navbar
            onOpenCommandBar={() => setIsCommandBarOpen(true)}
            onOpenResumeForge={() => setResumeForgeOpen(true)}
          />
        )}

        {/* Dynamic Main Views Content */}
        <main
          className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative pb-16 md:pb-0"
          style={{ backgroundColor: '#F5F0E6' }}
        >
          {children}
        </main>

        {/* Mobile Navigation Dock */}
        {!isFullscreen && <MobileNav />}
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
      />
    </div>
  );
};
