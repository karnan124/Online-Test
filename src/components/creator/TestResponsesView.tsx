import React, { useState, useEffect } from 'react';
import { Test, ParticipantResponse } from '../../types/index';
import { api } from '../../services/api';
import { 
  ArrowLeft, Download, Search, CheckCircle2, XCircle, 
  Clock, AlertTriangle, Eye, ShieldCheck, Sparkles 
} from 'lucide-react';

interface TestResponsesViewProps {
  testId: string;
  onBack: () => void;
}

export const TestResponsesView: React.FC<TestResponsesViewProps> = ({ testId, onBack }) => {
  const [test, setTest] = useState<Test | null>(null);
  const [responses, setResponses] = useState<ParticipantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ParticipantResponse | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      const [testData, respData] = await Promise.all([
        api.tests.getById(testId),
        api.tests.getResponses(testId),
      ]);
      setTest(testData.test);
      setResponses(respData);
    } catch (err: any) {
      setError(err.message || 'Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponses();
  }, [testId]);

  const handleExportCSV = () => {
    if (!test || responses.length === 0) return;

    const headers = ['Candidate Name', 'Roll Number', 'Email', 'Score', 'Total Marks', 'Percentage', 'Time Taken (s)', 'Status', 'Tab Switches', 'Submitted At'];
    const rows = responses.map(r => [
      `"${r.participantName}"`,
      `"${r.rollNumber}"`,
      `"${r.email || ''}"`,
      r.score,
      r.totalMarks,
      `${r.percentage}%`,
      r.timeTakenSeconds || 0,
      r.status,
      r.focusLossCount,
      `"${r.submittedAt || r.startedAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${test.title.replace(/[^a-zA-Z0-9]/g, '_')}_Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast('CSV exported successfully');
    setTimeout(() => setToast(null), 3000);
  };

  const handleReleaseResults = async () => {
    if (!test) return;
    try {
      setReleasing(true);
      await api.tests.releaseResults(test.id);
      setTest({ ...test, isResultsReleased: true });
      setToast('Results have been released! Candidates can now review their scores and explanations.');
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to release results');
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Retrieving candidate attempt records...</p>
      </div>
    );
  }

  const filtered = responses.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.participantName.toLowerCase().includes(q) || r.rollNumber.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="underline text-emerald-300">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-300">Dismiss</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-mono text-blue-400 uppercase">Response Records</span>
            <h1 className="text-xl font-bold text-white tracking-tight">{test?.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {test?.resultReleaseMode === 'MANUAL_RELEASE' && !test?.isResultsReleased && (
            <button
              onClick={handleReleaseResults}
              disabled={releasing}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Release Results</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={responses.length === 0}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by candidate name or roll number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <strong className="text-white">{filtered.length}</strong> of <strong className="text-white">{responses.length}</strong> Responses
        </div>
      </div>

      {/* Response Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-medium">Candidate Name</th>
                <th className="py-3 px-4 font-medium">Roll / ID</th>
                <th className="py-3 px-4 font-medium text-right">Score</th>
                <th className="py-3 px-4 font-medium text-right">Percentage</th>
                <th className="py-3 px-4 font-medium text-center">Time Taken</th>
                <th className="py-3 px-4 font-medium text-center">Anti-Cheat Flags</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{r.participantName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{r.rollNumber}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                    {r.score.toFixed(2)} / {r.totalMarks}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-400 font-semibold">
                    {r.percentage.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                    {Math.floor((r.timeTakenSeconds || 60) / 60)}m {(r.timeTakenSeconds || 60) % 60}s
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {r.focusLossCount > 0 ? (
                      <span className="font-mono text-[11px] text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        {r.focusLossCount} tab switches
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-emerald-400">0 flags</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-mono text-[11px] font-bold ${
                      r.passed ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedResponse(r)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-mono text-blue-400 uppercase">Participant Breakdown</span>
                <h3 className="text-base font-bold text-white">{selectedResponse.participantName}</h3>
                <span className="text-xs text-slate-400 font-mono">Roll: {selectedResponse.rollNumber}</span>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-xs mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Score</span>
                <span className="text-white font-bold">{selectedResponse.score} / {selectedResponse.totalMarks}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Percentage</span>
                <span className="text-blue-400 font-bold">{selectedResponse.percentage}%</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Tab Switches</span>
                <span className={selectedResponse.focusLossCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {selectedResponse.focusLossCount}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">Answers Log:</span>
              {Object.entries(selectedResponse.answers || {}).map(([qId, ans], idx) => (
                <div key={qId} className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">Question {idx + 1}</span>
                    <span className={`font-mono text-[11px] ${ans.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ans.isCorrect ? `+${ans.marksAwarded} Marks` : `${ans.marksAwarded || 0} Marks`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Answered At: {new Date(ans.answeredAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
