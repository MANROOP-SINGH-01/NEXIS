/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCoreStore } from './integration/store/coreStore';
import { useUiStore } from './integration/store/uiStore';
import { useAuthStore } from './integration/store/authStore';
import { useTraineeProfile } from './integration/hooks/useTraineeProfile';
import { RouterProvider, useRouter, TAB_TO_PATH, PATH_TO_TAB } from './router';
import { Shell } from './interface/layout/Shell';
import { LandingPage } from './interface/pages/LandingPage';
import { LoginPage } from './interface/auth/LoginPage';
import { SettingsPage } from './interface/pages/SettingsPage';
import { FinalOutputModal } from './interface/FinalOutputModal';
import BYOKModal from './interface/BYOKModal';
import NexusHunterModal from './interface/NexusHunterModal';
import { OutputReviewModal } from './interface/OutputReviewModal';
import NexusMirrorModal from './interface/NexusMirrorModal';
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
import { DataQualityConsole } from './interface/admin/DataQualityConsole';
import { AgentReviewQueueModal } from './interface/admin/AgentReviewQueueModal';
import { AgentActivityHUD } from './interface/AgentActivityHUD';
import EmployerVerificationPage from './interface/employer/EmployerVerificationPage';
import ProviderViewPage from './interface/provider/ProviderViewPage';
import EmptySectionView from './interface/EmptySectionView';
import { PulseOverviewView } from './interface/PulseOverviewView';
import { CandidateProfileView } from './interface/CandidateProfileView';
import { SystemLogsView } from './interface/SystemLogsView';
import { InterventionManagementView } from './interface/InterventionManagementView';
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
    isAgentReviewQueueOpen,
    setAgentReviewQueueOpen,
    isLowFpsFallback,
  } = useUiStore();

  // 1. Synchronize URL pathname -> activeSidebarTab
  useEffect(() => {
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    if (cleanPath === '/dedup' || cleanPath === '/admin/dedup') {
      setDedupReviewOpen(true);
    }
    if (cleanPath === '/review-queue' || cleanPath === '/admin/review-queue') {
      setAgentReviewQueueOpen(true);
    }
    const matchedTab = PATH_TO_TAB[cleanPath];
    if (matchedTab) {
      setActiveSidebarTab(matchedTab);
    }
  }, [pathname, setActiveSidebarTab, setDedupReviewOpen, setAgentReviewQueueOpen]);

  // 2. Synchronize activeSidebarTab -> URL pathname
  useEffect(() => {
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    const expectedPath = TAB_TO_PATH[activeSidebarTab];
    if (expectedPath && PATH_TO_TAB[cleanPath] !== activeSidebarTab) {
      navigate(expectedPath);
    }
  }, [activeSidebarTab, pathname, navigate]);

  const {
    loading: isTraineeLoading,
    needsConsent,
    needsProfile,
    submitConsents,
    saveProfile,
    refreshProfile,
  } = useTraineeProfile();

  // 3D Scene Initialization
  useEffect(() => {
    if (canvasRef.current) {
      if (!managerRef.current) {
        const manager = new SceneManager(canvasRef.current);
        managerRef.current = manager;
        (window as any).__sceneManager = manager;
        (window as any).useCoreStore = useCoreStore;
        (window as any).useUiStore = useUiStore;
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
        {/* Dynamic Views Area */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-transparent">
          {activeSidebarTab === 'dashboard' && <PulseOverviewView />}
          {activeSidebarTab === 'profile' && <CandidateProfileView />}
          {activeSidebarTab === 'skill-gaps' && <SkillGapsView />}
          {activeSidebarTab === 'job-matches' && <JobMatchesView />}
          {activeSidebarTab === 'recommended-programs' && <RecommendedProgramsView />}
          {activeSidebarTab === 'interview-prep' && <InterviewPrepView />}
          {activeSidebarTab === 'new-cv' && <NewCVView />}
          {activeSidebarTab === 'my-outcome' && <OutcomeStatusView />}
          {activeSidebarTab === 'linkedin-integration' && <LinkedInIntegrationView />}
          {activeSidebarTab === 'career-health' && <CareerHealthDashboard />}
          {activeSidebarTab === 'application-tracker' && <ApplicationTrackerView />}
          {activeSidebarTab === 'career-passport' && <CareerPassportView />}
          {activeSidebarTab === 'interventions' && <InterventionManagementView />}
          {activeSidebarTab === 'system-logs' && <SystemLogsView />}
          {activeSidebarTab === 'settings' && <SettingsPage />}

          {/* Section 1: 3D Agent Command Center (Persistently Mounted to Preserve WebGL Context) */}
          <div
            className="flex-1 flex flex-col min-w-0 min-h-0 relative"
            style={{
              display: activeSidebarTab === 'agent-workspace' ? 'flex' : 'none',
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
          <div className="fixed inset-0 z-[125] flex flex-col bg-[#090A0F] text-zinc-100">
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
          <div className="fixed inset-0 z-[120] flex flex-col bg-[#090A0F] animate-in fade-in duration-150">
            <AnalyticsDashboard />
          </div>
        )}

        {/* Section 15.5 Agent Review Queue Modal */}
        <AgentReviewQueueModal
          isOpen={isAgentReviewQueueOpen}
          onClose={() => setAgentReviewQueueOpen(false)}
        />

        {/* Onboarding & DPDP Flow */}
        {!isTraineeLoading && needsConsent && (
          <ConsentScreen onConsentsSaved={submitConsents} />
        )}
        {!isTraineeLoading && !needsConsent && needsProfile && (
          <TraineeProfileSetup 
            onProfileSaved={saveProfile} 
            onComplete={() => refreshProfile()}
          />
        )}
      </Shell>
    </SceneContext.Provider>
  );
};

const MainRouter: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const { user, hydrated } = useAuthStore();

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

  // 2b. Trainee Deduplication Review Portal (/dedup, /admin/dedup)
  if (pathname === '/dedup' || pathname === '/admin/dedup') {
    return (
      <div className="fixed inset-0 z-[125] flex flex-col bg-[#090A0F] text-zinc-100">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#12131C]">
          <h2 className="text-lg font-display font-bold text-white">Admin: Trainee Deduplication</h2>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <DedupReviewPanel />
        </div>
      </div>
    );
  }

  // 2c. Data Quality & Anomaly Detection Console (/data-quality, /admin/data-quality)
  if (pathname === '/data-quality' || pathname === '/admin/data-quality') {
    return <DataQualityConsole />;
  }

  // 3. Login & Authentication (/login, /register)
  if (pathname === '/login' || pathname === '/register') {
    return (
      <LoginPage
        initialMode={pathname === '/register' ? 'register' : 'signin'}
        onSuccess={() => navigate('/dashboard')}
        onNeedOnboarding={() => navigate('/onboarding')}
        onBackToHome={() => navigate('/')}
      />
    );
  }

  // 4. Public Landing Page (at root '/' or '/landing')
  if (pathname === '/' || pathname === '/landing') {
    return (
      <LandingPage
        onEnterApp={() => {
          if (!user) {
            navigate('/login');
          } else {
            navigate('/dashboard');
          }
        }}
        onGoLogin={() => navigate('/login')}
        onGoRegister={() => navigate('/register')}
      />
    );
  }

  // 5. Auth gate: If user is not authenticated and trying to access workspace, ask for sign-in
  if (hydrated && !user) {
    return (
      <LoginPage
        onSuccess={() => navigate(pathname || '/dashboard')}
        onBackToHome={() => navigate('/')}
      />
    );
  }

  // 6. Default: Full Application Workspace
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
