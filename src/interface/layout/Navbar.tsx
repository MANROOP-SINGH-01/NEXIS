import React from 'react';
import { 
  Command, 
  Sparkles, 
  Bell, 
  Activity, 
  LogOut, 
  User, 
  ChevronDown,
  Layers,
  Search
} from 'lucide-react';
import { useAuthStore } from '../../integration/store/authStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useUiStore } from '../../integration/store/uiStore';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';

interface NavbarProps {
  onOpenCommandBar: () => void;
  onOpenResumeForge?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandBar, onOpenResumeForge }) => {
  const { user, clearAuth } = useAuthStore();
  const { activeSidebarTab, setActiveSidebarTab, setBYOKOpen } = useUiStore();
  const { agentStatuses } = useCoreStore();

  const workingAgentsCount = Object.values(agentStatuses || {}).filter(
    (s) => s === 'working' || s === 'talking'
  ).length;

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-[#090a0f]/80 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Brand / Title / Active view indicator */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setActiveSidebarTab('dashboard')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-[#090a0f] rounded-[11px] flex items-center justify-center">
              <span className="font-['Space_Grotesk'] font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                NX
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-['Space_Grotesk'] font-bold text-sm tracking-wider text-white flex items-center gap-1.5">
              NEXIS
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 mx-1 hidden md:block" />

        {/* Real-time Agents Pulse Status */}
        <div className="hidden md:flex items-center gap-2">
          {workingAgentsCount > 0 ? (
            <Badge variant="cyan" size="sm" pulseDot>
              <span>{workingAgentsCount} AGENTS ACTIVE</span>
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
              <span>SYSTEM READY</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          onClick={onOpenCommandBar}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all text-xs cursor-pointer shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span>Search agents, jobs, resume or press Cmd+K...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 rounded shadow-xs">
              Ctrl+K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenResumeForge && (
          <Button
            variant="glow"
            size="sm"
            onClick={onOpenResumeForge}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="hidden lg:inline-flex"
          >
            Resume Forge
          </Button>
        )}

        <button
          onClick={onOpenCommandBar}
          className="sm:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Open Command Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* User Account or Login button */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold uppercase shadow-sm">
              {user.profile?.name ? user.profile.name.slice(0, 2) : 'US'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-200 leading-tight">
                {user.profile?.name || 'Trainee'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {user.phone || 'Connected'}
              </span>
            </div>
            <button
              onClick={() => clearAuth()}
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800/80 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/login"
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
              Get Started
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
