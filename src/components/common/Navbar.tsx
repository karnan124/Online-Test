import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Cloud, Plus, LogOut, ExternalLink, 
  Trash2, AlertTriangle, X 
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenParticipantPortal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  onOpenCreateModal,
  onOpenParticipantPortal 
}) => {
  const { creator, logout, deleteAccount } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (confirmInput !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Zone 1: Brand Wordmark */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className="flex items-center gap-2.5 text-left text-slate-100 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight block leading-tight">TestCloud</span>
                  <span className="text-[10px] text-blue-400 font-mono tracking-wider block">ONLINE EXAMINATION PLATFORM</span>
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation Links (Clean - No Cloud Architecture) */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentTab === 'dashboard' 
                    ? 'text-white bg-slate-800 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => setCurrentTab('tests')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentTab === 'tests' 
                    ? 'text-white bg-slate-800 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                My Tests
              </button>

              <button
                onClick={() => setCurrentTab('questionBank')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentTab === 'questionBank' 
                    ? 'text-white bg-slate-800 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Question Bank
              </button>

              <button
                onClick={onOpenParticipantPortal}
                className="px-3 py-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 transition-colors flex items-center gap-1.5 ml-2 text-xs font-mono"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Take Test (Student View)</span>
              </button>
            </nav>

            {/* Zone 3: Actions & Workspace Profile */}
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenCreateModal}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Test</span>
              </button>

              {creator ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-medium text-slate-200 block truncate max-w-[130px]">{creator.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[130px]">{creator.organization || 'Examiner'}</span>
                  </div>

                  <button
                    onClick={() => {
                      setConfirmInput('');
                      setDeleteError(null);
                      setShowDeleteModal(true);
                    }}
                    title="Delete Account & Data"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCurrentTab('login')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Account Deletion Modal (No window.prompt!) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Account?</h3>
                <p className="text-xs text-slate-400">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Deleting your account will permanently erase all created examinations, questions, student submissions, and analytics records.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs mb-4">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-mono text-slate-400">
                Type <strong className="text-rose-400">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== 'DELETE' || isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
              >
                {isDeleting ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
