import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { CreatorDashboard } from './components/creator/CreatorDashboard';
import { CreateTestWizard } from './components/creator/CreateTestWizard';
import { TestResponsesView } from './components/creator/TestResponsesView';
import { TestAnalyticsView } from './components/creator/TestAnalyticsView';
import { QuestionBankView } from './components/creator/QuestionBankView';
import { PublicExamPortal } from './components/participant/PublicExamPortal';
import { ExamCanvas } from './components/participant/ExamCanvas';
import { ParticipantResultView } from './components/participant/ParticipantResultView';

function MainApp() {
  const { creator, loading } = useAuth();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'tests' | 'questionBank' | 'participantPortal'>('landing');

  // Candidate Exam Lifecycle
  const [candidateAttemptId, setCandidateAttemptId] = useState<string | null>(null);
  const [candidateResultId, setCandidateResultId] = useState<string | null>(null);
  const [participantCode, setParticipantCode] = useState<string>('');

  // Assessment Workspace Sub-views
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [viewingResponsesTestId, setViewingResponsesTestId] = useState<string | null>(null);
  const [viewingAnalyticsTestId, setViewingAnalyticsTestId] = useState<string | null>(null);

  // Check URL pathname for direct /exam/:code access
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/exam/')) {
      const code = path.replace('/exam/', '').trim().toUpperCase();
      if (code) {
        setParticipantCode(code);
        setCurrentTab('participantPortal');
      }
    } else if (creator) {
      setCurrentTab('dashboard');
    }
  }, [creator]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Connecting to TestCloud Assessment System...</p>
        </div>
      </div>
    );
  }

  // 1. CANDIDATE IS ACTIVELY TAKING A TEST
  if (candidateAttemptId) {
    return (
      <ExamCanvas
        attemptId={candidateAttemptId}
        onFinish={(finishedId) => {
          setCandidateAttemptId(null);
          setCandidateResultId(finishedId);
        }}
      />
    );
  }

  // 2. CANDIDATE IS VIEWING TEST RESULT TRANSCRIPT
  if (candidateResultId) {
    return (
      <ParticipantResultView
        attemptId={candidateResultId}
        onExit={() => {
          setCandidateResultId(null);
          setCurrentTab(creator ? 'dashboard' : 'landing');
        }}
      />
    );
  }

  // 3. CANDIDATE PORTAL (NO ACCOUNT REQUIRED)
  if (currentTab === 'participantPortal') {
    return (
      <PublicExamPortal
        initialCode={participantCode}
        onAttemptStarted={(responseId) => {
          setCandidateAttemptId(responseId);
        }}
        onCancel={() => {
          setCurrentTab(creator ? 'dashboard' : 'landing');
        }}
      />
    );
  }

  // 4. LANDING PAGE FOR LOGGED OUT USERS
  if (!creator && currentTab === 'landing') {
    return (
      <LandingPage
        onStartAsParticipant={(code) => {
          setParticipantCode(code);
          setCurrentTab('participantPortal');
        }}
        onCreatorAuthenticated={() => {
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  // 5. CREATOR / EXAMINER LOGGED-IN WORKSPACE
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setViewingResponsesTestId(null);
          setViewingAnalyticsTestId(null);
          setShowCreateWizard(false);
          setCurrentTab(tab as any);
        }}
        onOpenCreateModal={() => {
          setViewingResponsesTestId(null);
          setViewingAnalyticsTestId(null);
          setShowCreateWizard(true);
        }}
        onOpenParticipantPortal={() => {
          setParticipantCode('');
          setCurrentTab('participantPortal');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CREATE TEST WIZARD */}
        {showCreateWizard ? (
          <CreateTestWizard
            onCancel={() => setShowCreateWizard(false)}
            onSuccess={() => {
              setShowCreateWizard(false);
              setCurrentTab('dashboard');
            }}
          />
        ) : viewingResponsesTestId ? (
          /* RESPONSES VIEW */
          <TestResponsesView
            testId={viewingResponsesTestId}
            onBack={() => setViewingResponsesTestId(null)}
          />
        ) : viewingAnalyticsTestId ? (
          /* ANALYTICS VIEW */
          <TestAnalyticsView
            testId={viewingAnalyticsTestId}
            onBack={() => setViewingAnalyticsTestId(null)}
          />
        ) : currentTab === 'dashboard' || currentTab === 'tests' ? (
          /* DASHBOARD & TESTS */
          <CreatorDashboard
            onOpenCreateWizard={() => setShowCreateWizard(true)}
            onViewResponses={(tId) => setViewingResponsesTestId(tId)}
            onViewAnalytics={(tId) => setViewingAnalyticsTestId(tId)}
            onTakeTestDirectly={(publicCode) => {
              setParticipantCode(publicCode);
              setCurrentTab('participantPortal');
            }}
          />
        ) : currentTab === 'questionBank' ? (
          /* QUESTION BANK */
          <QuestionBankView />
        ) : null}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TestCloud — Online Examination and Performance Analytics Platform</span>
          <span className="text-slate-400 text-[11px]">
            Create. Share. Assess. Analyze. · Fast, Secure & Reliable
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
