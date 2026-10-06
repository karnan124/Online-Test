import React, { useState } from 'react';
import { Test, Question, QuestionOption, QuestionType, DifficultyLevel } from '../../types/index';
import { api } from '../../services/api';
import { 
  Check, ArrowRight, ArrowLeft, Plus, Trash2, 
  Sparkles, Shield, QrCode, Copy, AlertTriangle, 
  ExternalLink, Wand2, Clock, CheckCircle2 
} from 'lucide-react';

interface CreateTestWizardProps {
  onCancel: () => void;
  onSuccess: (test: Test) => void;
}

export const CreateTestWizard: React.FC<CreateTestWizardProps> = ({ onCancel, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<Test | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: 'Midterm Assessment',
    description: 'Timed online examination. Please review all instructions carefully.',
    subject: 'Computer Science',
    instructions: 'Answer all questions. Once the examination begins, the timer cannot be paused.'
  });

  // Step 2: Questions Builder
  const [questionList, setQuestionList] = useState<Array<{
    questionType: QuestionType;
    questionText: string;
    marks: number;
    difficulty: DifficultyLevel;
    explanation: string;
    options: Array<{ optionText: string; isCorrect: boolean }>;
    correctShortAnswer?: string;
  }>>([
    {
      questionType: 'MCQ',
      questionText: 'Which keyword is used for inheritance in Java?',
      marks: 2,
      difficulty: 'EASY',
      explanation: 'In Java, "extends" is used for class inheritance.',
      options: [
        { optionText: 'implements', isCorrect: false },
        { optionText: 'extends', isCorrect: true },
        { optionText: 'inherits', isCorrect: false },
        { optionText: 'super', isCorrect: false }
      ]
    },
    {
      questionType: 'MCQ',
      questionText: 'Which HTTP method is idempotent and used for retrieving data?',
      marks: 2,
      difficulty: 'EASY',
      explanation: 'GET requests are safe and idempotent.',
      options: [
        { optionText: 'POST', isCorrect: false },
        { optionText: 'GET', isCorrect: true },
        { optionText: 'PATCH', isCorrect: false },
        { optionText: 'DELETE', isCorrect: false }
      ]
    }
  ]);

  // Step 3: Rules & Settings
  const [settings, setSettings] = useState({
    durationMinutes: 30,
    startTime: '',
    endTime: '',
    accessCode: '',
    requireName: true,
    requireRollNumber: true,
    requireEmail: false,
    oneResponsePerIdentifier: true,
    randomizeQuestions: true,
    randomizeOptions: true,
    enableFullscreen: false,
    enableTabSwitchDetection: true,
    disableCopyPaste: true,
    resultReleaseMode: 'IMMEDIATE' as Test['resultReleaseMode'],
    negativeMarkingEnabled: true,
    negativeMarks: 0.25,
    passingPercentage: 40
  });

  // Quick Sample Template Loader
  const handleLoadSample = () => {
    setBasicInfo({
      title: 'Data Structures & Algorithms Comprehensive Assessment',
      subject: 'Computer Science',
      description: 'Midterm assessment on asymptotic runtime, balanced trees, and graph algorithms.',
      instructions: 'Answer all multiple choice questions. The timer runs continuously upon start.'
    });
    setQuestionList([
      {
        questionType: 'MCQ',
        questionText: 'What is the average time complexity of searching in a balanced Binary Search Tree (AVL / Red-Black)?',
        marks: 2,
        difficulty: 'MEDIUM',
        explanation: 'A balanced BST guarantees O(log n) height and search complexity.',
        options: [
          { optionText: 'O(1)', isCorrect: false },
          { optionText: 'O(log n)', isCorrect: true },
          { optionText: 'O(n)', isCorrect: false },
          { optionText: 'O(n log n)', isCorrect: false }
        ]
      },
      {
        questionType: 'MCQ',
        questionText: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
        marks: 2,
        difficulty: 'EASY',
        explanation: 'Queues maintain FIFO ordering.',
        options: [
          { optionText: 'Stack', isCorrect: false },
          { optionText: 'Queue', isCorrect: true },
          { optionText: 'Binary Heap', isCorrect: false },
          { optionText: 'Graph', isCorrect: false }
        ]
      },
      {
        questionType: 'MCQ',
        questionText: 'Which graph traversal algorithm uses a Queue for implementation?',
        marks: 2,
        difficulty: 'MEDIUM',
        explanation: 'Breadth-First Search (BFS) uses a FIFO queue to visit vertices level by level.',
        options: [
          { optionText: 'Depth-First Search', isCorrect: false },
          { optionText: 'Breadth-First Search', isCorrect: true },
          { optionText: 'Prim\'s Algorithm only', isCorrect: false },
          { optionText: 'Topological Sort with Recursion', isCorrect: false }
        ]
      }
    ]);
  };

  // Add new question card
  const handleAddQuestion = () => {
    setQuestionList([
      ...questionList,
      {
        questionType: 'MCQ',
        questionText: '',
        marks: 2,
        difficulty: 'MEDIUM',
        explanation: '',
        options: [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questionList.length <= 1) return;
    setQuestionList(questionList.filter((_, i) => i !== idx));
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questionList];
    updated[qIdx].options[optIdx].optionText = text;
    setQuestionList(updated);
  };

  const handleSetCorrectOption = (qIdx: number, optIdx: number) => {
    const updated = [...questionList];
    if (updated[qIdx].questionType === 'MCQ' || updated[qIdx].questionType === 'TRUE_FALSE') {
      updated[qIdx].options.forEach((opt, idx) => {
        opt.isCorrect = idx === optIdx;
      });
    } else {
      updated[qIdx].options[optIdx].isCorrect = !updated[qIdx].options[optIdx].isCorrect;
    }
    setQuestionList(updated);
  };

  // Publish Test & Generate Link
  const handlePublishTest = async () => {
    setLoading(true);
    setPublishError(null);

    // 1. Validation
    const cleanTitle = basicInfo.title.trim();
    if (!cleanTitle) {
      setPublishError('Examination Title is required. Please go to Step 1 and enter a title.');
      setStep(1);
      setLoading(false);
      return;
    }

    if (questionList.length === 0) {
      setPublishError('At least 1 question is required. Please add a question in Step 2.');
      setStep(2);
      setLoading(false);
      return;
    }

    try {
      // 2. Create Test on server
      const newTest = await api.tests.create({
        ...basicInfo,
        title: cleanTitle,
        ...settings,
        accessCode: settings.accessCode.trim() ? settings.accessCode.trim().toUpperCase() : null,
        startTime: settings.startTime || null,
        endTime: settings.endTime || null
      });

      // 3. Add questions with auto-sanitization (guarantees no 400 error)
      for (let i = 0; i < questionList.length; i++) {
        const q = questionList[i];
        const qText = q.questionText.trim() || `Question ${i + 1}`;
        const qOpts = (q.options || []).map((opt, idx) => ({
          id: `opt-${idx}`,
          optionText: opt.optionText.trim() || `Option ${idx + 1}`,
          isCorrect: opt.isCorrect,
          optionOrder: idx + 1
        }));

        // Ensure at least 1 option marked correct for evaluation
        if (q.questionType !== 'SHORT_ANSWER' && !qOpts.some(o => o.isCorrect) && qOpts.length > 0) {
          qOpts[0].isCorrect = true;
        }

        await api.questions.create(newTest.id, {
          questionType: q.questionType,
          questionText: qText,
          marks: Number(q.marks) || 1,
          negativeMarks: settings.negativeMarkingEnabled ? Number(settings.negativeMarks) : 0,
          difficulty: q.difficulty,
          explanation: q.explanation || '',
          options: qOpts,
          correctShortAnswer: q.correctShortAnswer?.trim() || undefined
        });
      }

      // 4. Mark as Published
      const published = await api.tests.publish(newTest.id);
      setCreatedTest(published.test || newTest);
      setStep(5); // Advance to Publish & Share screen
    } catch (err: any) {
      console.error('Failed to create examination:', err);
      setPublishError(err.message || 'Failed to create assessment. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdTest) return;
    const url = `${window.location.origin}/exam/${createdTest.publicCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!createdTest) return;
    navigator.clipboard.writeText(createdTest.publicCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl">
      {/* Wizard Step Progress Tracker */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className={`font-semibold ${step >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>1. Basic Info</span>
          <span className={`font-semibold ${step >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>2. Questions ({questionList.length})</span>
          <span className={`font-semibold ${step >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>3. Rules & Settings</span>
          <span className={`font-semibold ${step >= 4 ? 'text-blue-400' : 'text-slate-500'}`}>4. Preview & Publish</span>
          <span className={`font-semibold ${step >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>5. Share Link</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {publishError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{publishError}</span>
          </div>
          <button 
            onClick={() => setPublishError(null)} 
            className="text-rose-300 hover:text-white underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: BASIC INFORMATION */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Assessment Information</h2>
              <p className="text-xs text-slate-400">Title, category, and instructions displayed to participants</p>
            </div>
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 text-xs rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-center"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Load Sample Template</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Assessment Title *</label>
            <input
              type="text"
              required
              value={basicInfo.title}
              onChange={e => {
                setPublishError(null);
                setBasicInfo({ ...basicInfo, title: e.target.value });
              }}
              placeholder="e.g. Java Programming — Unit 1 Assessment"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subject / Domain *</label>
              <input
                type="text"
                required
                value={basicInfo.subject}
                onChange={e => setBasicInfo({ ...basicInfo, subject: e.target.value })}
                placeholder="e.g. Java, DBMS, Cloud, Aptitude"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={basicInfo.description}
                onChange={e => setBasicInfo({ ...basicInfo, description: e.target.value })}
                placeholder="Brief summary of test scope"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Participant Instructions</label>
            <textarea
              rows={3}
              value={basicInfo.instructions}
              onChange={e => setBasicInfo({ ...basicInfo, instructions: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!basicInfo.title.trim() || !basicInfo.subject.trim()}
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Next: Questions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: QUESTIONS BUILDER */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Question Builder</h2>
              <p className="text-xs text-slate-400">Configure questions, answer choices, and score weights</p>
            </div>
            <button
              onClick={handleAddQuestion}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {questionList.map((q, qIdx) => (
              <div key={qIdx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    QUESTION {qIdx + 1} OF {questionList.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={q.questionType}
                      onChange={e => {
                        const updated = [...questionList];
                        updated[qIdx].questionType = e.target.value as QuestionType;
                        setQuestionList(updated);
                      }}
                      className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                    >
                      <option value="MCQ">Single Choice (MCQ)</option>
                      <option value="MULTIPLE_SELECT">Multiple Select</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                    </select>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400 font-mono">Marks:</span>
                      <input
                        type="number"
                        min="1"
                        value={q.marks}
                        onChange={e => {
                          const updated = [...questionList];
                          updated[qIdx].marks = Number(e.target.value) || 1;
                          setQuestionList(updated);
                        }}
                        className="w-12 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-center text-xs font-mono text-white"
                      />
                    </div>

                    {questionList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={q.questionText}
                    onChange={e => {
                      const updated = [...questionList];
                      updated[qIdx].questionText = e.target.value;
                      setQuestionList(updated);
                    }}
                    placeholder={`Type question ${qIdx + 1} prompt here...`}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* MCQ / Options Editor */}
                {q.questionType !== 'SHORT_ANSWER' && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 block">
                      Options (Click check circle to mark correct answer):
                    </span>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            opt.isCorrect 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'border-slate-700 text-transparent hover:border-slate-500'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          value={opt.optionText}
                          onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={e => {
                      const updated = [...questionList];
                      updated[qIdx].explanation = e.target.value;
                      setQuestionList(updated);
                    }}
                    placeholder="Explanation (shown to student in result review)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <span>Next: Rules & Security</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RULES & SETTINGS */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white">Rules, Security & Anti-Cheating</h2>
            <p className="text-xs text-slate-400">Configure timer, access restrictions, and anti-copying locks</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={settings.durationMinutes}
                onChange={e => setSettings({ ...settings, durationMinutes: Number(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Timer runs continuously from the moment the student starts.
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Optional Access Passcode
              </label>
              <input
                type="text"
                value={settings.accessCode}
                onChange={e => setSettings({ ...settings, accessCode: e.target.value.toUpperCase() })}
                placeholder="e.g. EXAM2026"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono uppercase"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                If set, candidates must enter this passcode to access questions.
              </span>
            </div>
          </div>

          {/* Security & Anti-Cheating */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">Security & Anti-Cheating Controls:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.disableCopyPaste}
                  onChange={e => setSettings({ ...settings, disableCopyPaste: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span className="text-emerald-400 font-semibold">Restrict Copying Questions (Anti-Cheat Lock)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableTabSwitchDetection}
                  onChange={e => setSettings({ ...settings, enableTabSwitchDetection: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Detect Tab Switches & Blur Events</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomizeQuestions}
                  onChange={e => setSettings({ ...settings, randomizeQuestions: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Randomize Question Order per student</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomizeOptions}
                  onChange={e => setSettings({ ...settings, randomizeOptions: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Randomize Answer Choices per student</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <span>Next: Preview & Publish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & PUBLISH */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Preview & Publish Examination</h2>
            <p className="text-xs text-slate-400">Review your examination details before generating the student access link</p>
          </div>

          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-3">
              <span className="font-mono text-blue-400 uppercase text-[10px]">{basicInfo.subject}</span>
              <h3 className="text-lg font-bold text-white mt-0.5">{basicInfo.title}</h3>
              <p className="text-slate-400 mt-1">{basicInfo.description}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Duration</span>
                <span className="text-white font-bold">{settings.durationMinutes} Minutes</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Questions</span>
                <span className="text-white font-bold">{questionList.length} Items</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Access Lock</span>
                <span className="text-amber-400 font-bold">{settings.accessCode ? `Code: ${settings.accessCode}` : 'Open Link'}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Anti-Copy</span>
                <span className="text-emerald-400 font-bold">{settings.disableCopyPaste ? 'Active' : 'Disabled'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-semibold text-slate-300 block">Questions Overview ({questionList.length}):</span>
              {questionList.map((q, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-200">Q{idx + 1}. {q.questionText || `Question ${idx + 1}`}</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className={`p-1.5 rounded ${opt.isCorrect ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30' : ''}`}>
                        {opt.isCorrect ? '✓ ' : '○ '}{opt.optionText || `Option ${oIdx + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePublishTest}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Publishing & Generating Link...' : 'Publish Test & Generate Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PUBLISHED & SHAREABLE LINK */}
      {step === 5 && createdTest && (
        <div className="text-center space-y-6 py-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
              Examination Published & Live
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">{createdTest.title}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your examination is ready. Share the public access link or 6-character code with students to start!
            </p>
          </div>

          <div className="max-w-md mx-auto bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs space-y-4 text-left">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1 font-medium">Unique Student Access Link:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/exam/${createdTest.publicCode}`}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-white text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Examination Code</span>
                <span className="text-xl font-bold font-mono text-amber-400">{createdTest.publicCode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
              >
                {copiedCode ? 'Copied Code' : 'Copy Code'}
              </button>
            </div>

            {createdTest.accessCode && (
              <div className="flex items-center justify-between p-2.5 bg-purple-950/30 border border-purple-500/20 rounded-lg text-purple-300">
                <span className="text-[11px]">Required Passcode:</span>
                <span className="font-mono font-bold">{createdTest.accessCode}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onSuccess(createdTest);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Go to Examination Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/exam/${createdTest.publicCode}`;
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Test as Student</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
