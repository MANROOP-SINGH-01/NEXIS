/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCoreStore } from './integration/store/coreStore';
import { useUiStore } from './integration/store/uiStore';
import { useTraineeProfile } from './integration/hooks/useTraineeProfile';
import { RouterProvider, useRouter } from './router';
import { Shell } from './interface/layout/Shell';
import { LandingPage } from './interface/pages/LandingPage';
import { LoginPage } from './interface/auth/LoginPage';
import { SettingsPage } from './interface/pages/SettingsPage';
import { FinalOutputModal } from './interface/FinalOutputModal';
import BYOKModal from './interface/BYOKModal';
import NexusHunterModal from './interface/NexusHunterModal';
import { OutputReviewModal } from './interface/OutputReviewModal';
import NexusMirrorModal from './interface/NexusMirrorModal';
import PhaseOneControlPanel from './interface/PhaseOneControlPanel';
import ResumeForgeModal from './interface/ResumeForgeModal';
import { ApplicationPreparationModal } from './interface/ApplicationPreparationModal';
import SimulationView from './interface/SimulationView';
import SkillGapsView from './interface/SkillGapsView';
import JobMatchesView from './interface/JobMatchesView';
import RecommendedProgramsView from './interface/RecommendedProgramsView';
import InterviewPrepView from './interface/InterviewPrepView';
import NewCVView from './interface/NewCVView';
import OutcomeStatusView from './interface/OutcomeStatusView';
import LinkedInIntegrationView from './interface/LinkedInIntegrationView';
import ApplicationTrackerView from './interface/ApplicationTrackerView';
import CareerPassportView from './interface/CareerPassportView';
import ConsentScreen from './interface/onboarding/ConsentScreen';
import TraineeProfileSetup from './interface/onboarding/TraineeProfileSetup';
import AgentDetailDrawer from './interface/AgentDetailDrawer';
import { VisualConfigurator } from './interface/VisualConfigurator/VisualConfigurator';
import { SceneContext } from './simulation/SceneContext';
import { SceneManager } from './simulation/SceneManager';
import { CareerHealthDashboard } from './interface/CareerHealthDashboard';
import { DedupReviewPanel } from './interface/admin/DedupReviewPanel';
import { AnalyticsDashboard } from './interface/admin/AnalyticsDashboard';
import { AgentActivityHUD } from './interface/AgentActivityHUD';
import EmployerVerificationPage from './interface/employer/EmployerVerificationPage';
import ProviderViewPage from './interface/provider/ProviderViewPage';
import EmptySectionView from './interface/EmptySectionView';
import { PulseOverviewView } from './interface/PulseOverviewView';
import { CandidateProfileView } from './interface/CandidateProfileView';
import { SystemLogsView } from './interface/SystemLogsView';
import { ActiveSidebarTab } from './types';

const Workspace: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    viewMode,
    isResumeForgeOpen,
    setResumeForgeOpen,
    isNexusMirrorOpen,
    setNexusMirrorOpen,
    isNexusHunterOpen,
    setNexusHunterOpen,
  } = useCoreStore();

  const { pathname, navigate } = useRouter();

  const {
    activeSidebarTab,
    setActiveSidebarTab,
    isBYOKOpen,
    setBYOKOpen,
    isDedupReviewOpen,
    setDedupReviewOpen,
    isAnalyticsDashboardOpen,
    setAnalyticsDashboardOpen,
    isLowFpsFallback,
  } = useUiStore();

  // Bi-directional synchronization: URL pathname -> activeSidebarTab
  useEffect(() => {
    const pathToTab: Record<string, ActiveSidebarTab> = {
      '/dashboard': 'dashboard',
      '/app': 'dashboard',
      '/profile': 'profile',
      '/jobs': 'job-matches',
      '/job-matches': 'job-matches',
      '/skills': 'skill-gaps',
      '/skill-gaps': 'skill-gaps',
      '/learning': 'recommended-programs',
      '/recommended-programs': 'recommended-programs',
      '/interview': 'interview-prep',
      '/interview-prep': 'interview-prep',
      '/resume': 'new-cv',
      '/new-cv': 'new-cv',
      '/overview': 'career-health',
      '/career-health': 'career-health',
      '/tracker': 'application-tracker',
      '/application-tracker': 'application-tracker',
      '/passport': 'career-passport',
      '/career-passport': 'career-passport',
      '/outcomes': 'my-outcome',
      '/my-outcome': 'my-outcome',
      '/network': 'linkedin-integration',
      '/linkedin-integration': 'linkedin-integration',
      '/logs': 'system-logs',
      '/system-logs': 'system-logs',
      '/settings': 'settings',
    };

    const cleanPath = pathname.replace(/\/$/, '') || '/';
    const matchedTab = pathToTab[cleanPath];
    if (matchedTab && matchedTab !== activeSidebarTab) {
      setActiveSidebarTab(matchedTab);
    }
  }, [pathname, activeSidebarTab, setActiveSidebarTab]);

  const {
    loading: isTraineeLoading,
    needsConsent,
    needsProfile,
    submitConsents,
    saveProfile,
  } = useTraineeProfile();

  // 3D Scene Initialization
  useEffect(() => {
    if (canvasRef.current) {
      if (!managerRef.current) {
        const manager = new SceneManager(canvasRef.current);
        managerRef.current = manager;
        (window as any).__sceneManager = manager;
        setSceneManager(manager);
      } else {
        managerRef.current.attachTo(canvasRef.current);
      }
    }
  }, [isLowFpsFallback, activeSidebarTab]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
        setSceneManager(null);
      }
    };
  }, []);

  // Real-time Agent SSE Stream
  useEffect(() => {
    const eventSource = new EventSource('/api/agents/activity');
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected' || data.type === 'ping') return;
        
        const agentMap: Record<string, number> = {
          'NEXUS_DIRECTOR': 0,
          'NEXUS_VISION': 1,
          'NEXUS_STRATEGIST': 2,
          'NEXUS_WRITER': 3,
          'NEXUS_HUNTER': 4,
          'NEXUS_MIRROR': 5,
        };
        
        const idx = agentMap[data.agent];
        if (idx !== undefined) {
          if (data.eventType.endsWith('_STARTED')) {
            useCoreStore.getState().setAgentStatus(idx, 'working');
          } else if (data.eventType.endsWith('_COMPLETE')) {
            useCoreStore.getState().setAgentStatus(idx, 'idle');
          }
        }
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <SceneContext.Provider value={sceneManager}>
      <Shell isFullscreen={isFullscreen}>
        {/* Top Control Panel (when viewing 3D Agent Dashboard) */}
        {!isFullscreen && viewMode !== 'design' && activeSidebarTab === 'dashboard' && (
          <PhaseOneControlPanel />
        )}

        {/* Dynamic Views Area */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-transparent">
          {activeSidebarTab === 'profile' && <CandidateProfileView />}
          {activeSidebarTab === 'skill-gaps' && <SkillGapsView />}
          {activeSidebarTab === 'job-matches' && <JobMatchesView />}
          {activeSidebarTab === 'recommended-programs' && <RecommendedProgramsView />}
          {activeSidebarTab === 'interview-prep' && <InterviewPrepView />}
          {activeSidebarTab === 'new-cv' && <NewCVView />}
          {activeSidebarTab === 'my-outcome' && <OutcomeStatusView />}
          {activeSidebarTab === 'linkedin-integration' && <LinkedInIntegrationView />}
          {activeSidebarTab === 'career-health' && <PulseOverviewView />}
          {activeSidebarTab === 'application-tracker' && <ApplicationTrackerView />}
          {activeSidebarTab === 'career-passport' && <CareerPassportView />}
          {activeSidebarTab === 'system-logs' && <SystemLogsView />}
          {activeSidebarTab === 'settings' && <SettingsPage />}

          {/* Section 1: 3D Agent Command Center (Persistently Mounted to Preserve WebGL Context) */}
          <div
            className="flex-1 flex flex-col min-w-0 min-h-0 relative"
            style={{
              display: activeSidebarTab === 'dashboard' ? 'flex' : 'none',
              visibility: viewMode === 'design' ? 'hidden' : 'visible',
            }}
          >
            <SimulationView
              canvasRef={canvasRef}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
            />
            {isLowFpsFallback && <AgentActivityHUD />}
          </div>
        </div>

        {/* Slide-in Agent Detail Telemetry Drawer */}
        <AgentDetailDrawer />

        {/* Design Mode Overlay (Visual Configurator) */}
        {viewMode === 'design' && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xl">
            <div
              className="w-full h-full bg-[#12131C] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <VisualConfigurator />
            </div>
          </div>
        )}

        {/* Dialogs & Interactive Modals */}
        <FinalOutputModal />
        <OutputReviewModal />
        {isBYOKOpen && <BYOKModal onClose={() => setBYOKOpen(false)} />}
        {isResumeForgeOpen && <ResumeForgeModal onClose={() => setResumeForgeOpen(false)} />}
        {isNexusHunterOpen && <NexusHunterModal onClose={() => setNexusHunterOpen(false)} />}
        {isNexusMirrorOpen && <NexusMirrorModal onClose={() => setNexusMirrorOpen(false)} />}
        <ApplicationPreparationModal />

        {/* Admin Panels */}
        {isDedupReviewOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#090A0F] text-zinc-100">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#12131C]">
              <h2 className="text-lg font-display font-bold text-white">Admin: Trainee Deduplication</h2>
              <button 
                onClick={() => setDedupReviewOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Panel
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <DedupReviewPanel />
            </div>
          </div>
        )}

        {isAnalyticsDashboardOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#090A0F] animate-in fade-in duration-150">
            <AnalyticsDashboard />
          </div>
        )}

        {/* Onboarding & DPDP Flow */}
        {!isTraineeLoading && needsConsent && (
          <ConsentScreen onConsentsSaved={submitConsents} />
        )}
        {!isTraineeLoading && !needsConsent && needsProfile && (
          <TraineeProfileSetup onProfileSaved={saveProfile} />
        )}
      </Shell>
    </SceneContext.Provider>
  );
};

const MainRouter: React.FC = () => {
  const { pathname, navigate } = useRouter();

  // 1. Employer Verification Portal (/verify/:token)
  if (pathname.startsWith('/verify/')) {
    const token = pathname.replace(/^\/verify\/?/, '').split('/')[0];
    return <EmployerVerificationPage token={token} />;
  }

  // 2. Provider Analytics Portal (/provider/:token)
  if (pathname.startsWith('/provider/')) {
    const token = pathname.replace(/^\/provider\/?/, '').split('/')[0];
    return <ProviderViewPage token={token} />;
  }

  // 3. Login & Authentication (/login, /register)
  if (pathname === '/login' || pathname === '/register') {
    return (
      <LoginPage
        onSuccess={() => navigate('/dashboard')}
        onBackToHome={() => navigate('/')}
      />
    );
  }

  // 4. Public Landing Page (at root '/' or '/landing')
  if (pathname === '/' || pathname === '/landing') {
    return (
      <LandingPage
        onEnterApp={() => navigate('/dashboard')}
        onGoLogin={() => navigate('/login')}
      />
    );
  }

  // 5. Default: Full Application Workspace
  return <Workspace />;
};

const App: React.FC = () => {
  return (
    <RouterProvider>
      <MainRouter />
    </RouterProvider>
  );
};

export default App;
