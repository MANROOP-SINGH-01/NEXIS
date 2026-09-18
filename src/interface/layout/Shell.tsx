import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Navbar } from './Navbar';
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
    <div className="w-screen h-screen bg-[#090a0f] text-zinc-100 overflow-hidden flex flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Desktop App Sidebar */}
      {!isFullscreen && (
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
      )}

      {/* Main App Workspace Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        {!isFullscreen && (
          <Navbar
            onOpenCommandBar={() => setIsCommandBarOpen(true)}
            onOpenResumeForge={() => setResumeForgeOpen(true)}
          />
        )}

        {/* Dynamic Main Views Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative pb-16 md:pb-0">
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
