/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCoreStore } from './integration/store/coreStore';
import { useUiStore } from './integration/store/uiStore';
import { useTraineeProfile } from './integration/hooks/useTraineeProfile';
import { FinalOutputModal } from './interface/FinalOutputModal';
import BYOKModal from './interface/BYOKModal';
import NexusHunterModal from './interface/NexusHunterModal';
import { OutputReviewModal } from './interface/OutputReviewModal';
import NexusMirrorModal from './interface/NexusMirrorModal';
import PhaseOneControlPanel from './interface/PhaseOneControlPanel';
import ResumeForgeModal from './interface/ResumeForgeModal';
import SimulationView from './interface/SimulationView';
import Sidebar from './interface/Sidebar';
import EmptySectionView from './interface/EmptySectionView';
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

const App: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Public standalone route: Employer Verification Portal (/verify/:token)
  if (pathname.startsWith('/verify/')) {
    const token = pathname.replace(/^\/verify\/?/, '').split('/')[0];
    return <EmployerVerificationPage token={token} />;
  }

  // Public standalone route: Provider Analytics Portal (/provider/:token)
  if (pathname.startsWith('/provider/')) {
    const token = pathname.replace(/^\/provider\/?/, '').split('/')[0];
    return <ProviderViewPage token={token} />;
  }

  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const {
    viewMode,
    isResumeForgeOpen,
    setResumeForgeOpen,
    isNexusMirrorOpen,
    setNexusMirrorOpen,
    isNexusHunterOpen,
    setNexusHunterOpen,
  } = useCoreStore();

  const {
    activeSidebarTab,
    isBYOKOpen,
    setBYOKOpen,
    isDedupReviewOpen,
    setDedupReviewOpen,
    isAnalyticsDashboardOpen,
    setAnalyticsDashboardOpen,
    isLowFpsFallback,
  } = useUiStore();

  const {
    loading: isTraineeLoading,
    needsConsent,
    needsProfile,
    submitConsents,
    saveProfile,
  } = useTraineeProfile();

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (canvasRef.current && !managerRef.current) {
      const manager = new SceneManager(canvasRef.current);
      managerRef.current = manager;
      (window as any).__sceneManager = manager;
      setSceneManager(manager);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
        setSceneManager(null);
      }
    };
  }, []);

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
      <div className="w-screen h-screen bg-zinc-50 overflow-hidden flex flex-row font-sans text-zinc-950">
        {/* PART A: Permanent Left Sidebar - Full height from top to bottom of page */}
        {!isFullscreen && <Sidebar />}

        {/* Right Content Column: Top Control Panel + Main Views */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
          {/* Top Control Panel (Dashboard only) */}
          {!isFullscreen && viewMode !== 'design' && activeSidebarTab === 'dashboard' && <PhaseOneControlPanel />}

          {/* Center: Main View Area */}
          <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-transparent">
            {/* Sections 2–8: Render views or empty state */}
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
            {activeSidebarTab !== 'dashboard' &&
              activeSidebarTab !== 'skill-gaps' &&
              activeSidebarTab !== 'job-matches' &&
              activeSidebarTab !== 'recommended-programs' &&
              activeSidebarTab !== 'interview-prep' &&
              activeSidebarTab !== 'new-cv' &&
              activeSidebarTab !== 'my-outcome' &&
              activeSidebarTab !== 'career-health' &&
              activeSidebarTab !== 'application-tracker' &&
              activeSidebarTab !== 'career-passport' &&
              activeSidebarTab !== 'linkedin-integration' && (
                <EmptySectionView tab={activeSidebarTab} />
              )}

            {/* Section 1: Dashboard (Simulation Context - Persistently Mounted) */}
            <div
              className="flex-1 flex flex-col min-w-0 min-h-0 relative"
              style={{
                display: activeSidebarTab === 'dashboard' ? 'flex' : 'none',
                visibility: viewMode === 'design' ? 'hidden' : 'visible',
              }}
            >
              <SimulationView canvasRef={canvasRef} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
              {isLowFpsFallback && <AgentActivityHUD />}
            </div>
          </div>

          {/* PART C: Agent-detail slide-in drawer */}
          <AgentDetailDrawer />
        </div>

        {/* Design Mode Overlay (Modal) */}
        {viewMode === 'design' && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-white/40 backdrop-blur-xl"
          >
            <div
              className="w-full h-full bg-white rounded-2xl shadow-2xl border border-zinc-200/50 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <VisualConfigurator />
            </div>
          </div>
        )}

        {/* Modals */}
        <FinalOutputModal />
        <OutputReviewModal />
        {isBYOKOpen && <BYOKModal onClose={() => setBYOKOpen(false)} />}
        {isResumeForgeOpen && <ResumeForgeModal onClose={() => setResumeForgeOpen(false)} />}
        {isNexusHunterOpen && <NexusHunterModal onClose={() => setNexusHunterOpen(false)} />}
        {isNexusMirrorOpen && <NexusMirrorModal onClose={() => setNexusMirrorOpen(false)} />}

        {/* Dedup Admin Panel Modal */}
        {isDedupReviewOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-white">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-darkDelegation">Admin: Trainee Deduplication</h2>
              <button 
                onClick={() => setDedupReviewOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                Close Panel
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DedupReviewPanel />
            </div>
          </div>
        )}

        {/* Analytics Dashboard Admin Panel Modal */}
        {isAnalyticsDashboardOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in fade-in duration-150">
            <AnalyticsDashboard />
          </div>
        )}

        {/* DPDP Consent & Trainee Identity Onboarding Flow */}
        {!isTraineeLoading && needsConsent && (
          <ConsentScreen onConsentsSaved={submitConsents} />
        )}
        {!isTraineeLoading && !needsConsent && needsProfile && (
          <TraineeProfileSetup onProfileSaved={saveProfile} />
        )}
      </div>
    </SceneContext.Provider>
  );
};

export default App;
