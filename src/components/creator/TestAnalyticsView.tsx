import React, { useState, useEffect } from 'react';
import { TestAnalytics } from '../../types/index';
import { api } from '../../services/api';
import { 
  ArrowLeft, BarChart3, Clock, HelpCircle, 
  CheckCircle2, XCircle, AlertTriangle, Activity 
} from 'lucide-react';

interface TestAnalyticsViewProps {
  testId: string;
  onBack: () => void;
}

export const TestAnalyticsView: React.FC<TestAnalyticsViewProps> = ({ testId, onBack }) => {
  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.tests.getAnalytics(testId);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load test analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [testId]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Calculating empirical test analytics and distractor metrics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs">
          {error || 'No analytics available for this test yet.'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-xs font-mono text-blue-400 uppercase">Assessment Analytics</span>
          <h1 className="text-xl font-bold text-white tracking-tight">{analytics.title}</h1>
        </div>
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Responses</span>
          <span className="text-2xl font-bold font-mono text-white tabular-nums">{analytics.totalResponses}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Average Score</span>
          <span className="text-2xl font-bold font-mono text-blue-400 tabular-nums">{analytics.averageScore}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Median Score</span>
          <span className="text-2xl font-bold font-mono text-purple-400 tabular-nums">{analytics.medianScore}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Highest Score</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">{analytics.highestScore}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Lowest Score</span>
          <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">{analytics.lowestScore}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Pass Rate</span>
          <span className="text-2xl font-bold font-mono text-teal-400 tabular-nums">{analytics.passRate}%</span>
        </div>
      </div>

      {/* Score Distribution & Time Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Histogram */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Score Distribution</h2>
              <p className="text-xs text-slate-400">Percentage tiers across all evaluated attempts</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {analytics.scoreDistribution.map(bracket => (
              <div key={bracket.range} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-slate-300">{bracket.range}</span>
                  <span className="font-mono text-slate-400">{bracket.count} candidates</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: analytics.totalResponses > 0 
                        ? `${Math.max(4, (bracket.count / analytics.totalResponses) * 100)}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Analytics */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Completion Duration</h2>
                <p className="text-xs text-slate-400">Pacing and time metrics</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Average Completion Time:</span>
                <span className="font-mono font-bold text-white">{analytics.avgTimeTakenMinutes} mins</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Fastest Submission:</span>
                <span className="font-mono font-bold text-emerald-400">{analytics.fastestTimeMinutes} mins</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Longest Duration:</span>
                <span className="font-mono font-bold text-amber-400">{analytics.longestTimeMinutes} mins</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-4 border-t border-slate-800 mt-4 leading-relaxed">
            Helps verify whether the allotted examination duration provides sufficient time for candidates.
          </p>
        </div>
      </div>

      {/* QUESTION DIFFICULTY & OPTION DISTRACTOR ANALYSIS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">Item Response & Question Difficulty Analysis</h2>
          <p className="text-xs text-slate-400">
            Calculated empirical difficulty indicator based on candidate success rates and option selection patterns
          </p>
        </div>

        <div className="space-y-4">
          {analytics.questionAnalytics.map((qa, idx) => (
            <div key={qa.questionId} className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">Question {idx + 1}</span>
                  <span className="text-slate-600">·</span>
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    qa.calculatedDifficulty === 'EASY'
                      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                      : qa.calculatedDifficulty === 'MEDIUM'
                      ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                      : 'text-rose-400 bg-rose-950/40 border-rose-500/30'
                  }`}>
                    {qa.calculatedDifficulty} (Empirical)
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-emerald-400 font-semibold">{qa.correctRate}% Correct Rate</span>
                  <span className="text-slate-500">({qa.totalAnswers} Answers)</span>
                </div>
              </div>

              <p className="text-slate-200 font-medium leading-relaxed">
                {qa.questionText}
              </p>

              {/* Distractor / Option Distribution Graph */}
              {qa.optionDistribution && qa.optionDistribution.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Option Choice Distribution (Common Misconceptions):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {qa.optionDistribution.map((opt, oIdx) => (
                      <div 
                        key={oIdx} 
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          opt.isCorrect 
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="truncate max-w-[200px]">
                          {opt.isCorrect ? '✓ ' : '○ '} {opt.optionText}
                        </div>
                        <span className="font-mono font-bold ml-2">
                          {opt.chosenPercentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
