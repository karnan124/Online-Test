import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Cloud, Clock, QrCode, BarChart3, Shuffle, ShieldCheck, 
  ArrowRight, CheckCircle2, Lock, User, Mail, School, Sparkles, Layers 
} from 'lucide-react';

interface LandingPageProps {
  onStartAsParticipant: (code: string) => void;
  onCreatorAuthenticated: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartAsParticipant,
  onCreatorAuthenticated 
}) => {
  const { login, register, quickDemoLogin, creator } = useAuth();
  const [candidateCode, setCandidateCode] = useState('');

  // Creator Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(email, password);
        setShowAuthModal(false);
        onCreatorAuthenticated();
      } else {
        await register({ name, email, password, organization });
        setSuccessMessage('Account created successfully! Please sign in with your email and password.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    try {
      await quickDemoLogin();
      setShowAuthModal(false);
      onCreatorAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight block leading-tight">TestCloud</span>
              <span className="text-[10px] text-blue-400 font-mono tracking-wider block">ASSESSMENT PLATFORM</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {creator ? (
              <button
                onClick={onCreatorAuthenticated}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Go to Workspace ({creator.name})
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cloud-Native Online Assessment Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
          Create Online Tests.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
            Share One Link.
          </span>{' '}
          Get Instant Results.
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Create assessments in minutes, share a unique link or QR code, and let participants take timed tests without creating accounts. Automatically evaluate responses and analyze performance.
        </p>

        {/* Action Dual Launchers */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => {
              if (creator) onCreatorAuthenticated();
              else {
                setAuthMode('register');
                setShowAuthModal(true);
              }
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-colors"
          >
            <span>Create a Test</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Participant Code Launcher */}
          <div className="w-full sm:w-auto flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-inner">
            <input
              type="text"
              placeholder="Enter Test Code"
              value={candidateCode}
              onChange={e => setCandidateCode(e.target.value.toUpperCase())}
              className="px-3 py-2 bg-transparent text-xs font-mono text-white placeholder-slate-500 uppercase focus:outline-none w-36"
            />
            <button
              onClick={() => {
                onStartAsParticipant(candidateCode.trim());
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
            >
              Take Test
            </button>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">⏱ Timed Assessments</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Server-side authoritative countdown timers. Even if students manipulate browser clocks, backend timestamps guarantee strict automated submission on expiry.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">📱 QR & Shareable Links</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every published test gets a secure random 6-character public code and instant downloadable high-resolution QR code for quick scanning.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">🚫 Anti-Copy Protection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly blocks text selection, right-click context menu, clipboard copying (Ctrl+C), and logs tab-switch violations during active attempts.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shuffle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">🎲 Double Randomization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shuffle question order and answer option positions for each individual participant, neutralizing simple copying.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">📊 Smart Item Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empirical question difficulty indicators (Easy, Medium, Difficult) and distractor choice distribution charts to diagnose common student misconceptions.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">⚡ Automated Grading & Scoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically evaluates submissions upon completion with configurable negative marking, passing criteria, and detailed transcripts.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-900 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>TestCloud — Online Examination and Performance Analytics Platform</span>
          <span className="text-slate-400">
            Create. Share. Assess. Analyze.
          </span>
        </div>
      </footer>

      {/* CREATOR AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            {/* Quick Demo Fast Login Bar */}
            <div className="mb-5 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">One-Click Demo Account</span>
                <span className="text-[10px] text-slate-400 font-mono">creator@testcloud.io / Password@123</span>
              </div>
              <button
                type="button"
                onClick={handleDemoSignIn}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
              >
                Sign In
              </button>
            </div>

            {/* Toggle Mode */}
            <div className="flex border-b border-slate-800 mb-5 text-sm">
              <button
                onClick={() => setAuthMode('login')}
                className={`pb-2.5 font-medium mr-6 border-b-2 transition-colors ${
                  authMode === 'login' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`pb-2.5 font-medium border-b-2 transition-colors ${
                  authMode === 'register' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {successMessage && (
              <div className="p-2.5 mb-4 rounded bg-emerald-950/60 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 mb-4 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Organization / Institution</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      placeholder="e.g. Assessment Department"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs disabled:opacity-50"
                >
                  {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
