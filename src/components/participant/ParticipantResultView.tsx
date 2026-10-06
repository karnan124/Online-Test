import React, { useState, useEffect } from 'react';
import { ParticipantResponse, Question } from '../../types/index';
import { api } from '../../services/api';
import { 
  CheckCircle2, XCircle, Award, Printer, ArrowLeft, 
  HelpCircle, Clock, ShieldCheck, Lock 
} from 'lucide-react';

interface ParticipantResultViewProps {
  attemptId: string;
  onExit: () => void;
}

export const ParticipantResultView: React.FC<ParticipantResultViewProps> = ({ attemptId, onExit }) => {
  const [attempt, setAttempt] = useState<ParticipantResponse | null>(null);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.attempts.getById(attemptId);
        setAttempt(data.attempt);
        setTest(data.test);
        setQuestions(data.questions);
      } catch (err: any) {
        setError(err.message || 'Failed to load examination result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Generating evaluation report...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <p className="text-xs text-rose-300 bg-rose-950/60 p-3 rounded-lg border border-rose-800">
            {error || 'Result not found'}
          </p>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check result release control (Section 37)
  const isHold = test?.resultReleaseMode === 'MANUAL_RELEASE' && !test?.isResultsReleased;
  const isScoreOnly = test?.resultReleaseMode === 'SCORE_ONLY';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>

        {/* If results are held by test creator */}
        {isHold ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Your Response Has Been Recorded</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Results will be released by the test creator once the examination window closes. Please check back later using your examination link.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              Candidate: {attempt.participantName} ({attempt.rollNumber})
            </div>
          </div>
        ) : (
          <>
            {/* Scorecard Hero */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${attempt.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />

              <div className="text-center pb-6 border-b border-slate-800">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 block mb-1">
                  OFFICIAL EVALUATION TRANSCRIPT
                </span>
                <h1 className="text-2xl font-bold text-white">{test?.title}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Candidate: <strong className="text-slate-200">{attempt.participantName}</strong> ({attempt.rollNumber})
                </p>
              </div>

              {/* Score Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6 text-center">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Score Scored</span>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {attempt.score.toFixed(2)} <span className="text-xs text-slate-400">/ {attempt.totalMarks}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Percentage</span>
                  <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
                    {attempt.percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Status</span>
                  <div className={`text-2xl font-bold font-mono ${attempt.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {attempt.passed ? 'PASS' : 'FAIL'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Time Taken</span>
                  <div className="text-2xl font-bold font-mono text-slate-300 tabular-nums">
                    {Math.floor((attempt.timeTakenSeconds || 60) / 60)}m
                  </div>
                </div>
              </div>
            </div>

            {/* Question Review (only if not SCORE_ONLY) */}
            {!isScoreOnly && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Question Review & Explanations</h2>
                  <p className="text-xs text-slate-400">Review your choices against verified answer keys</p>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const ans = attempt.answers?.[q.id];
                    const isCorrect = ans?.isCorrect;
                    const selectedIds = ans?.selectedOptionIds || [];

                    return (
                      <div 
                        key={q.id}
                        className={`p-4 sm:p-5 rounded-xl border text-xs space-y-3 ${
                          isCorrect ? 'bg-emerald-950/10 border-emerald-500/40' : 'bg-rose-950/10 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">Question {idx + 1}</span>
                          <span className={`font-mono text-[11px] font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCorrect ? `+${q.marks} Marks` : `${ans?.marksAwarded || 0} Marks`}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-slate-100">{q.questionText}</p>

                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map(opt => {
                              const wasSelected = selectedIds.includes(opt.id);
                              let optClass = 'bg-slate-950 border-slate-800 text-slate-400';
                              if (opt.isCorrect) optClass = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-semibold';
                              else if (wasSelected) optClass = 'bg-rose-950/40 border-rose-500 text-rose-200';

                              return (
                                <div key={opt.id} className={`p-2.5 rounded-lg border flex items-center gap-2 ${optClass}`}>
                                  <span>{opt.isCorrect ? '✓' : wasSelected ? '✗' : '○'}</span>
                                  <span className="truncate">{opt.optionText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-400 text-[11px]">
                            <strong className="text-blue-400">Explanation: </strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
