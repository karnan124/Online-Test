import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Cloud, Clock, ShieldCheck, ArrowRight, Lock, 
  HelpCircle, AlertCircle, FileText, CheckCircle2 
} from 'lucide-react';

interface PublicExamPortalProps {
  initialCode?: string;
  onAttemptStarted: (responseId: string) => void;
  onCancel: () => void;
}

export const PublicExamPortal: React.FC<PublicExamPortalProps> = ({
  initialCode = '',
  onAttemptStarted,
  onCancel
}) => {
  const [publicCode, setPublicCode] = useState(initialCode);
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form input states
  const [participantName, setParticipantName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [confirmedInstructions, setConfirmedInstructions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch test metadata
  const fetchTest = async (codeToFetch: string) => {
    if (!codeToFetch || !codeToFetch.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.public.getTest(codeToFetch.trim().toUpperCase());
      setTestData(res.test);
    } catch (err: any) {
      setError(err.message || 'Test not found with this code. Please verify the examination code.');
      setTestData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setPublicCode(initialCode.trim().toUpperCase());
      fetchTest(initialCode.trim().toUpperCase());
    }
  }, [initialCode]);

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedInstructions) {
      setError('Please check the confirmation box agreeing to the examination instructions before starting.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.public.startAttempt(publicCode.trim().toUpperCase(), {
        participantName,
        rollNumber,
        email: email || undefined,
        accessCode: accessCode.trim() || undefined
      });

      onAttemptStarted(res.responseId);
    } catch (err: any) {
      setError(err.message || 'Failed to start examination');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
            <Cloud className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TestCloud Candidate Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            No registration required. Enter your details to start the timed assessment.
          </p>
        </div>

        {/* Public Code Input if not yet loaded */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter Examination Code (e.g. 7H2K9X or CLOUD9)"
              value={publicCode}
              onChange={e => setPublicCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white placeholder-slate-500 uppercase focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => fetchTest(publicCode)}
              disabled={loading || !publicCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Finding...' : 'Find Test'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs mb-4">
              {error}
            </div>
          )}

          {!testData && !loading && !error && (
            <div className="py-6 text-center text-slate-400 space-y-2 border-t border-slate-800/80 mt-4">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-300 font-medium">Enter an examination code to begin</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Examinations must be created and published first. Once an exam is created, candidates use its unique access code or link to access the questions.
              </p>
            </div>
          )}

          {/* Test Metadata & Candidate Details Form */}
          {testData && (
            <div className="space-y-6 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">
                  {testData.subject}
                </span>
                <h2 className="text-lg font-bold text-white">{testData.title}</h2>
                {testData.description && (
                  <p className="text-xs text-slate-400">{testData.description}</p>
                )}
              </div>

              {/* Assessment Parameters Badge Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block">Duration</span>
                  <span className="text-white font-bold">{testData.durationMinutes} Mins</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Questions</span>
                  <span className="text-white font-bold">{testData.totalQuestions}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Marks</span>
                  <span className="text-white font-bold">{testData.totalMarks}</span>
                </div>
              </div>

              {/* Candidate Form */}
              <form onSubmit={handleStartTest} className="space-y-4 text-xs">
                {testData.requireName && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={participantName}
                      onChange={e => setParticipantName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {testData.requireRollNumber && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Roll Number / Student ID *</label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={e => setRollNumber(e.target.value)}
                      placeholder="e.g. CS-2026-101"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {testData.requireEmail && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {testData.isProtected && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Examination Access Code *</label>
                    <input
                      type="text"
                      required
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="Enter test access code"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Instructions & Confirmation Box (Section 30) */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-200 block text-xs">Before You Begin:</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                    <li>Duration: <strong>{testData.durationMinutes} minutes</strong> from the moment you click Start.</li>
                    <li>Timer runs on server clock and cannot be paused.</li>
                    <li>Answers are automatically saved on selection.</li>
                    <li>Anti-Cheating Policy: Copying questions, right-clicking, and switching browser tabs are strictly blocked and recorded.</li>
                  </ul>

                  <label className="flex items-start gap-2 pt-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedInstructions}
                      onChange={e => setConfirmedInstructions(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700"
                    />
                    <span className="text-[11px] font-medium leading-tight">
                      I have read and agree to the examination instructions and anti-cheating policy.
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !confirmedInstructions}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    <span>{submitting ? 'Initializing Session...' : 'I Understand — Start Test'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
