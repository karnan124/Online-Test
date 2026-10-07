import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Test, CreatorStats } from '../../types/index';
import { api } from '../../services/api';
import { StatsCard } from '../common/StatsCard';
import { ShareModal } from './ShareModal';
import { 
  Plus, QrCode, BarChart3, Users, Copy, 
  Trash2, ExternalLink, Play, FileText, CheckCircle2, 
  Lock, Sparkles, Layers, AlertTriangle, X, Check 
} from 'lucide-react';

interface CreatorDashboardProps {
  onOpenCreateWizard: () => void;
  onViewResponses: (testId: string) => void;
  onViewAnalytics: (testId: string) => void;
  onTakeTestDirectly: (publicCode: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  onOpenCreateWizard,
  onViewResponses,
  onViewAnalytics,
  onTakeTestDirectly
}) => {
  const { creator } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharingTest, setSharingTest] = useState<Test | null>(null);

  // In-UI Delete Confirmation Modal States (No window.confirm!)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [confirmDeletePermission, setConfirmDeletePermission] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsData, statsData] = await Promise.all([
        api.tests.getAll(),
        api.analytics.getCreatorStats(),
      ]);
      setTests(testsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [creator]);

  const handleDuplicate = async (testId: string) => {
    try {
      await api.tests.duplicate(testId);
      setToastMessage('Test duplicated successfully.');
      setTimeout(() => setToastMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to duplicate test');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleStatusChange = async (testId: string, newStatus: Test['status']) => {
    try {
      if (newStatus === 'PUBLISHED') await api.tests.publish(testId);
      else if (newStatus === 'CLOSED') await api.tests.close(testId);
      else if (newStatus === 'ARCHIVED') await api.tests.archive(testId);
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || 'Status update failed');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Perform delete after explicit user modal confirmation
  const handleConfirmDelete = async () => {
    if (!testToDelete || !confirmDeletePermission) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const deletedId = testToDelete.id;
      const title = testToDelete.title;
      await api.tests.delete(deletedId);
      setTests(prev => prev.filter(t => t.id !== deletedId));
      setTestToDelete(null);
      setConfirmDeletePermission(false);
      setToastMessage(`Examination "${title}" was permanently deleted.`);
      setTimeout(() => setToastMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete examination');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Connecting to your assessment workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <span>EXAMINER WORKSPACE</span>
            <span className="text-slate-600">·</span>
            <span>{creator?.organization || 'Assessment Center'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {creator?.name || 'Examiner'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Create online examinations, share unique codes or links with students, and review instant performance analytics.
          </p>
        </div>

        <button
          onClick={onOpenCreateWizard}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Test</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Active Tests"
          value={stats?.activeTestsCount || 0}
          subtext="Currently accepting responses"
          icon={<Play className="w-4 h-4 text-emerald-400" />}
        />
        <StatsCard
          label="Total Tests"
          value={stats?.totalTestsCount || 0}
          subtext="Assessments created"
          icon={<FileText className="w-4 h-4 text-blue-400" />}
        />
        <StatsCard
          label="Total Responses"
          value={stats?.totalResponsesCount || 0}
          subtext="Evaluated candidate submissions"
          icon={<Users className="w-4 h-4 text-purple-400" />}
        />
        <StatsCard
          label="Average Score"
          value={`${stats?.averageScore || 0}%`}
          subtext={`Pass Rate: ${stats?.passRate || 0}%`}
          icon={<CheckCircle2 className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {/* Tests Management Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Your Examinations</h2>
            <p className="text-xs text-slate-400">Manage links, monitor student submissions, and analyze question performance</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {tests.length} Total
          </span>
        </div>

        {tests.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No examinations created yet</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Build your first test in minutes. Configure questions, duration, and anti-cheating protection. Once published, you'll receive a unique code and link to share with students!
              </p>
            </div>
            <button
              onClick={onOpenCreateWizard}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Test</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map(test => (
              <div 
                key={test.id} 
                className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-blue-400 font-bold uppercase">
                      {test.subject}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono text-xs text-amber-400 font-bold bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded">
                      CODE: {test.publicCode}
                    </span>
                    {test.accessCode && (
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 border border-purple-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Passcode Protected</span>
                      </span>
                    )}
                    {test.disableCopyPaste && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        Anti-Copy Protected
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-white tracking-tight truncate">
                    {test.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{test.durationMinutes}m Duration</span>
                    <span className="text-slate-600">·</span>
                    <span>{test.questionsCount || 0} Questions</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-medium">
                      {test.responsesCount || 0} Submissions
                    </span>
                    {test.responsesCount ? (
                      <>
                        <span className="text-slate-600">·</span>
                        <span>Avg: {test.averageScore || 0}%</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Status Selector and Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                  <select
                    value={test.status}
                    onChange={e => handleStatusChange(test.id, e.target.value as Test['status'])}
                    className={`text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-900 border focus:outline-none ${
                      test.status === 'PUBLISHED' ? 'text-emerald-400 border-emerald-500/40' :
                      test.status === 'CLOSED' ? 'text-rose-400 border-rose-500/40' :
                      test.status === 'ARCHIVED' ? 'text-purple-400 border-purple-500/40' :
                      'text-slate-400 border-slate-700'
                    }`}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED (ACTIVE)</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>

                  <button
                    onClick={() => setSharingTest(test)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>Share & QR</span>
                  </button>

                  <button
                    onClick={() => onTakeTestDirectly(test.publicCode)}
                    className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Take Test</span>
                  </button>

                  <button
                    onClick={() => onViewResponses(test.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Responses ({test.responsesCount || 0})</span>
                  </button>

                  <button
                    onClick={() => onViewAnalytics(test.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(test.id)}
                    title="Duplicate test settings and questions"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Delete Button (Opens In-UI Permission Modal) */}
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmDeletePermission(false);
                      setTestToDelete(test);
                    }}
                    title="Delete examination"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {sharingTest && (
        <ShareModal
          test={sharingTest}
          onClose={() => setSharingTest(null)}
          onTakeTestDirectly={onTakeTestDirectly}
        />
      )}

      {/* In-UI Delete Examination Confirmation Modal (Asks Permission First!) */}
      {testToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isDeleting) {
                  setTestToDelete(null);
                  setConfirmDeletePermission(false);
                }
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Examination?</h3>
                <p className="text-xs text-slate-400 font-mono">Code: {testToDelete.publicCode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">"{testToDelete.title}"</strong>?
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 mb-4 font-mono">
              <div className="flex justify-between">
                <span>Subject:</span>
                <span className="text-slate-200">{testToDelete.subject}</span>
              </div>
              <div className="flex justify-between">
                <span>Questions:</span>
                <span className="text-slate-200">{testToDelete.questionsCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Student Submissions:</span>
                <span className="text-rose-400">{testToDelete.responsesCount || 0}</span>
              </div>
            </div>

            <p className="text-[11px] text-rose-300/80 mb-3">
              ⚠️ Warning: All student attempts and evaluation scores associated with this examination will be permanently erased.
            </p>

            {/* Explicit Permission Authorization Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-rose-300 cursor-pointer mb-4 hover:border-slate-700">
              <input
                type="checkbox"
                checked={confirmDeletePermission}
                onChange={e => setConfirmDeletePermission(e.target.checked)}
                className="mt-0.5 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0"
              />
              <span className="select-none font-medium leading-snug">
                I authorize and grant permission to permanently delete this examination.
              </span>
            </label>

            {deleteError && (
              <div className="p-2.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setTestToDelete(null);
                  setConfirmDeletePermission(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmDeletePermission || isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
