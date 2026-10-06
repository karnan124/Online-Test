import React, { useState, useEffect, useRef } from 'react';
import { ParticipantResponse, Question } from '../../types/index';
import { api } from '../../services/api';
import { 
  Clock, Check, Bookmark, ChevronLeft, ChevronRight, 
  Send, AlertTriangle, Maximize, AlertCircle, ShieldAlert 
} from 'lucide-react';

interface ExamCanvasProps {
  attemptId: string;
  onFinish: (attemptId: string) => void;
}

export const ExamCanvas: React.FC<ExamCanvasProps> = ({ attemptId, onFinish }) => {
  const [attempt, setAttempt] = useState<ParticipantResponse | null>(null);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Candidate answers state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [copyWarning, setCopyWarning] = useState<string | null>(null);
  const [copyViolationsCount, setCopyViolationsCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load attempt & questions
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await api.attempts.getById(attemptId);
        setAttempt(data.attempt);
        setTest(data.test);
        setQuestions(data.questions);

        // Prepopulate existing answers if resumed!
        const initOpts: Record<string, string[]> = {};
        const initTexts: Record<string, string> = {};
        const initReviews: Record<string, boolean> = {};

        if (data.attempt.answers) {
          Object.entries(data.attempt.answers).forEach(([qId, ans]) => {
            if (ans.selectedOptionIds) initOpts[qId] = ans.selectedOptionIds;
            if (ans.textAnswer) initTexts[qId] = ans.textAnswer;
            if (ans.isMarkedForReview) initReviews[qId] = true;
          });
        }
        setSelectedOptions(initOpts);
        setTextAnswers(initTexts);
        setMarkedForReview(initReviews);

        // Calculate timer remaining based on server expiresAt
        const expiresMs = new Date(data.attempt.expiresAt).getTime();
        const diffSecs = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
        setSecondsRemaining(diffSecs);

        if (diffSecs <= 0) {
          handleAutoSubmit();
        }
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load test session. Please check your link or test code.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [attemptId]);

  // Countdown Timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secondsRemaining]);

  // Tab-Switch / Focus-Loss Detection (Anti-Cheating Section 46)
  useEffect(() => {
    if (!test?.enableTabSwitchDetection) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setTabWarning('Warning: You have switched away from the examination window. This event has been recorded.');
        try {
          await api.attempts.recordTabSwitch(attemptId);
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptId, test]);

  // Anti-Cheating & Copy Restrictions (Restricts copying questions, shortcuts, right-click)
  useEffect(() => {
    // Enabled by default unless explicitly disabled by test settings
    const isAntiCopyEnabled = test ? test.disableCopyPaste !== false : true;

    const recordViolation = async (reason: string) => {
      setCopyWarning(reason);
      setCopyViolationsCount(prev => prev + 1);
      try {
        await api.attempts.recordCopyAttempt(attemptId);
      } catch {}
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!isAntiCopyEnabled) return;
      e.preventDefault();
      recordViolation('Copying questions or exam content is prohibited to ensure exam integrity.');
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!isAntiCopyEnabled) return;
      e.preventDefault();
      recordViolation('Cutting exam content is prohibited.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isAntiCopyEnabled) return;
      e.preventDefault();
      recordViolation('Right-click context menu is disabled during the examination.');
    };

    const handleDragStart = (e: DragEvent) => {
      if (!isAntiCopyEnabled) return;
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAntiCopyEnabled) return;

      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Block Copy (Ctrl+C / Cmd+C), Cut (Ctrl+X / Cmd+X), View Source (Ctrl+U), Print (Ctrl+P), Save (Ctrl+S)
      if (cmdOrCtrl && (key === 'c' || key === 'x' || key === 'u' || key === 'p' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation(`Keyboard shortcut (${e.ctrlKey ? 'Ctrl' : 'Cmd'} + ${key.toUpperCase()}) is disabled to prevent question copying.`);
        return;
      }

      // Block Select-All outside text input fields
      if (cmdOrCtrl && key === 'a') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          e.stopPropagation();
          recordViolation('Select-all shortcut is restricted to prevent copying questions.');
          return;
        }
      }

      // Block Developer Tools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (e.key === 'F12' || (cmdOrCtrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('Developer inspection tools are disabled.');
        return;
      }

      // Block PrintScreen / screenshot attempt
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        recordViolation('Screen capture shortcuts are restricted during this examination.');
        return;
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attemptId, test]);

  // Auto-submit when time expires
  const handleAutoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.attempts.submit(attemptId);
      onFinish(attemptId);
    } catch {
      onFinish(attemptId);
    }
  };

  const currentQ = questions[currentIndex];

  // Auto-save answer on selection
  const handleSelectOption = async (optionId: string, isMulti: boolean) => {
    if (!currentQ) return;
    let newSelection: string[] = [];

    if (isMulti) {
      const prev = selectedOptions[currentQ.id] || [];
      newSelection = prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId];
    } else {
      newSelection = [optionId];
    }

    setSelectedOptions({ ...selectedOptions, [currentQ.id]: newSelection });

    // Auto-save to server (Section 32)
    setSavingStatus('Saving...');
    try {
      await api.attempts.saveAnswer(
        attemptId,
        currentQ.id,
        newSelection,
        textAnswers[currentQ.id],
        !!markedForReview[currentQ.id]
      );
      setSavingStatus('✓ Answer saved');
    } catch (err: any) {
      if (err.message && err.message.includes('expired')) {
        handleAutoSubmit();
      }
    }
  };

  const handleClearAnswer = async () => {
    if (!currentQ) return;
    const newOpts = { ...selectedOptions, [currentQ.id]: [] };
    const newTexts = { ...textAnswers, [currentQ.id]: '' };
    setSelectedOptions(newOpts);
    setTextAnswers(newTexts);

    try {
      setSavingStatus('Saving...');
      await api.attempts.saveAnswer(attemptId, currentQ.id, [], '', !!markedForReview[currentQ.id]);
      setSavingStatus('Cleared');
    } finally {
      setTimeout(() => setSavingStatus(null), 1500);
    }
  };

  const handleToggleReview = async () => {
    if (!currentQ) return;
    const newVal = !markedForReview[currentQ.id];
    setMarkedForReview({ ...markedForReview, [currentQ.id]: newVal });

    try {
      await api.attempts.saveAnswer(
        attemptId,
        currentQ.id,
        selectedOptions[currentQ.id] || [],
        textAnswers[currentQ.id],
        newVal
      );
    } catch {}
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    setShowSubmitModal(false);
    try {
      await api.attempts.submit(attemptId);
      onFinish(attemptId);
    } catch (err: any) {
      setTabWarning(err.message || 'Submission failed. Please click Submit Test again.');
      setSubmitting(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Examination Session Error</h2>
          <p className="text-xs text-rose-300 bg-rose-950/60 p-3 rounded-lg border border-rose-800">
            {loadError}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Initializing examination session & timer...</p>
        </div>
      </div>
    );
  }

  const totalCount = questions.length;
  const answeredCount = questions.filter(q => (selectedOptions[q.id]?.length > 0) || (textAnswers[q.id]?.trim()?.length > 0)).length;
  const reviewedCount = questions.filter(q => markedForReview[q.id]).length;
  const unansweredCount = totalCount - answeredCount;

  const isTimeCritical = secondsRemaining < 300;
  const isTimeUrgent = secondsRemaining < 60;

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Copy Violation Toast */}
      {copyWarning && (
        <div className="bg-rose-950 border-b border-rose-600 px-4 py-2.5 text-center text-xs text-rose-200 flex items-center justify-center gap-2 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold">{copyWarning}</span>
          <span className="text-[10px] font-mono bg-rose-900/80 px-2 py-0.5 rounded text-rose-300 border border-rose-700">
            Violation Logged ({copyViolationsCount})
          </span>
          <button 
            onClick={() => setCopyWarning(null)} 
            className="ml-3 text-rose-300 hover:text-white underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Warning Toast */}
      {tabWarning && (
        <div className="bg-amber-950 border-b border-amber-600/80 px-4 py-2.5 text-center text-xs text-amber-200 flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{tabWarning}</span>
          <button 
            onClick={() => setTabWarning(null)} 
            className="ml-4 text-amber-300 underline font-bold"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Top Test Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-blue-400 uppercase font-semibold">
                {test?.subject}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 truncate max-w-xs">{attempt?.participantName} ({attempt?.rollNumber})</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-lg">
              {test?.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Anti-Copy Protection Active Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded text-[11px] font-mono text-emerald-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Anti-Copy Lock Active</span>
              {copyViolationsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-900 text-rose-200 rounded text-[10px] font-bold">
                  {copyViolationsCount} Violated
                </span>
              )}
            </div>

            {/* Countdown Timer (Section 17 & 31) */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono ${
              isTimeUrgent
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : isTimeCritical
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}>
              <Clock className="w-4 h-4" />
              <div className="text-right">
                <span className="text-[9px] uppercase text-slate-400 block leading-none">Time Left</span>
                <span className="text-sm sm:text-base font-bold tabular-nums">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas + Navigator Matrix */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Question Body */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-7">
          {currentQ ? (
            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 font-mono">+{currentQ.marks} Marks</span>
                </div>

                <div className="flex items-center gap-2">
                  {savingStatus && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      {savingStatus}
                    </span>
                  )}
                  <button
                    onClick={handleToggleReview}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border ${
                      markedForReview[currentQ.id]
                        ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{markedForReview[currentQ.id] ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed mb-6">
                {currentQ.questionText}
              </div>

              {/* Options */}
              {currentQ.questionType !== 'SHORT_ANSWER' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map(opt => {
                    const isSelected = selectedOptions[currentQ.id]?.includes(opt.id);
                    const isMulti = currentQ.questionType === 'MULTIPLE_SELECT';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.id, isMulti)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className={`w-5 h-5 ${isMulti ? 'rounded' : 'rounded-full'} border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-transparent'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm leading-snug">{opt.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Answer text field */}
              {currentQ.questionType === 'SHORT_ANSWER' && (
                <div className="mb-6">
                  <input
                    type="text"
                    value={textAnswers[currentQ.id] || ''}
                    onChange={e => setTextAnswers({ ...textAnswers, [currentQ.id]: e.target.value })}
                    onBlur={async () => {
                      setSavingStatus('Saving...');
                      await api.attempts.saveAnswer(attemptId, currentQ.id, [], textAnswers[currentQ.id], !!markedForReview[currentQ.id]);
                      setSavingStatus('✓ Answer saved');
                    }}
                    placeholder="Type your response here..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* Bottom Navigator Controls */}
          <div className="pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <button
                onClick={handleClearAnswer}
                disabled={!selectedOptions[currentQ?.id]?.length && !textAnswers[currentQ?.id]}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review & Submit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 col: Question Navigator Matrix Palette */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Question Navigator
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Review ({reviewedCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-sm border-2 border-blue-400" />
                <span>Current</span>
              </div>
            </div>

            {/* Matrix of Question Buttons */}
            <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = (selectedOptions[q.id]?.length > 0) || (textAnswers[q.id]?.trim()?.length > 0);
                const isReview = markedForReview[q.id];

                let bg = 'bg-slate-800/80 text-slate-300 border-slate-700';
                if (isReview) {
                  bg = 'bg-amber-500/20 text-amber-300 border-amber-500';
                } else if (isAnswered) {
                  bg = 'bg-emerald-600 text-white border-emerald-500';
                }

                if (isCurrent) {
                  bg += ' ring-2 ring-blue-400 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center ${bg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Finish & Submit
            </button>
          </div>
        </div>
      </main>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Submit Examination?</h3>
                <p className="text-xs text-slate-400">Review your questions summary prior to final evaluation</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2 mb-5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Total Questions:</span>
                <span className="font-bold text-white">{totalCount}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Marked for Review:</span>
                <span className="font-bold">{reviewedCount}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Unanswered:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Back to Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleManualSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting & Evaluating...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
