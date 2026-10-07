import React, { useState } from 'react';
import { Test, Question, QuestionOption, QuestionType, DifficultyLevel, QuestionBankItem, ResultReleaseMode } from '../../types/index';
import { api } from '../../services/api';
import { 
  Check, ArrowRight, ArrowLeft, Plus, Trash2, 
  Sparkles, Shield, QrCode, Copy, AlertTriangle, 
  ExternalLink, Wand2, Clock, CheckCircle2, Lock,
  BookOpen, Eye, EyeOff, Award, HelpCircle
} from 'lucide-react';

interface CreateTestWizardProps {
  onCancel: () => void;
  onSuccess: (test: Test) => void;
  onTakeTestDirectly?: (publicCode: string) => void;
}

export const CreateTestWizard: React.FC<CreateTestWizardProps> = ({ 
  onCancel, 
  onSuccess,
  onTakeTestDirectly 
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<Test | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Question Bank Modal & Toast
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bankCategoryFilter, setBankCategoryFilter] = useState('ALL');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankToast, setBankToast] = useState<string | null>(null);

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
      questionType: 'TRUE_FALSE',
      questionText: 'An interface in Java can have abstract methods.',
      marks: 2,
      difficulty: 'EASY',
      explanation: 'Interfaces in Java declare abstract methods to be implemented by classes.',
      options: [
        { optionText: 'True', isCorrect: true },
        { optionText: 'False', isCorrect: false }
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
        { optionText: 'Binary Tree', isCorrect: false },
        { optionText: 'Graph', isCorrect: false }
      ]
    }
  ]);

  // Step 3: Rules & Settings (clean defaults - no negative marks by default)
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
    resultReleaseMode: 'IMMEDIATE' as ResultReleaseMode,
    negativeMarkingEnabled: false,
    negativeMarks: 0,
    passingPercentage: 40
  });

  // Quick Sample Template Loader (3 questions of 2 marks each -> total 6 marks)
  const handleLoadSample = () => {
    setBasicInfo({
      title: 'Data Structures & Algorithms Comprehensive Assessment',
      subject: 'Computer Science',
      description: 'Assessment on asymptotic runtime, balanced trees, and graph algorithms.',
      instructions: 'Answer all questions. The timer runs continuously upon start.'
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
        questionType: 'TRUE_FALSE',
        questionText: 'A balanced Binary Search Tree guarantees O(log n) worst-case search time complexity.',
        marks: 2,
        difficulty: 'EASY',
        explanation: 'Self-balancing trees like AVL or Red-Black trees maintain logarithmic height.',
        options: [
          { optionText: 'True', isCorrect: true },
          { optionText: 'False', isCorrect: false }
        ]
      },
      {
        questionType: 'MCQ',
        questionText: 'Which graph traversal algorithm uses a FIFO Queue for level-by-level traversal?',
        marks: 2,
        difficulty: 'MEDIUM',
        explanation: 'Breadth-First Search (BFS) uses a FIFO queue to visit vertices level by level.',
        options: [
          { optionText: 'Depth-First Search (DFS)', isCorrect: false },
          { optionText: 'Breadth-First Search (BFS)', isCorrect: true },
          { optionText: 'Prim\'s Algorithm only', isCorrect: false },
          { optionText: 'Bellman-Ford Algorithm', isCorrect: false }
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

  const handleChangeQuestionType = (qIdx: number, newType: QuestionType) => {
    const updated = [...questionList];
    updated[qIdx].questionType = newType;
    if (newType === 'TRUE_FALSE') {
      updated[qIdx].options = [
        { optionText: 'True', isCorrect: true },
        { optionText: 'False', isCorrect: false }
      ];
    } else if (newType === 'SHORT_ANSWER') {
      updated[qIdx].options = [];
      updated[qIdx].correctShortAnswer = updated[qIdx].correctShortAnswer || '';
    } else if (newType === 'MCQ') {
      if (!updated[qIdx].options || updated[qIdx].options.length < 2) {
        updated[qIdx].options = [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ];
      } else {
        // Enforce exactly 1 correct
        let hasCorrect = false;
        updated[qIdx].options.forEach((opt) => {
          if (opt.isCorrect && !hasCorrect) {
            hasCorrect = true;
          } else {
            opt.isCorrect = false;
          }
        });
        if (!hasCorrect && updated[qIdx].options.length > 0) {
          updated[qIdx].options[0].isCorrect = true;
        }
      }
    } else if (newType === 'MULTIPLE_SELECT') {
      if (!updated[qIdx].options || updated[qIdx].options.length < 2) {
        updated[qIdx].options = [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ];
      }
    }
    setQuestionList(updated);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questionList];
    updated[qIdx].options[optIdx].optionText = text;
    setQuestionList(updated);
  };

  const handleAddOptionToQuestion = (qIdx: number) => {
    const updated = [...questionList];
    if (updated[qIdx].options.length >= 6) return;
    updated[qIdx].options.push({
      optionText: '',
      isCorrect: false
    });
    setQuestionList(updated);
  };

  const handleRemoveOptionFromQuestion = (qIdx: number, optIdx: number) => {
    const updated = [...questionList];
    if (updated[qIdx].options.length <= 2) return;
    updated[qIdx].options.splice(optIdx, 1);
    if (updated[qIdx].questionType === 'MCQ' && !updated[qIdx].options.some(o => o.isCorrect)) {
      updated[qIdx].options[0].isCorrect = true;
    }
    setQuestionList(updated);
  };

  const handleSetCorrectOption = (qIdx: number, optIdx: number) => {
    const updated = [...questionList];
    const qType = updated[qIdx].questionType;
    if (qType === 'MCQ' || qType === 'TRUE_FALSE') {
      updated[qIdx].options.forEach((opt, idx) => {
        opt.isCorrect = idx === optIdx;
      });
    } else if (qType === 'MULTIPLE_SELECT') {
      updated[qIdx].options[optIdx].isCorrect = !updated[qIdx].options[optIdx].isCorrect;
    }
    setQuestionList(updated);
  };

  // Save specific question to Question Bank library
  const handleSaveQuestionToBank = async (qIdx: number) => {
    const q = questionList[qIdx];
    const cleanText = q.questionText.trim() || `Question ${qIdx + 1}`;
    try {
      await api.questionBank.create({
        category: basicInfo.subject || 'General Assessment',
        questionType: q.questionType,
        questionText: cleanText,
        marks: Number(q.marks) || 1,
        difficulty: q.difficulty,
        explanation: q.explanation || '',
        options: (q.options || []).map((o, idx) => ({
          id: `qbo-${Date.now()}-${idx}`,
          optionText: o.optionText || `Option ${idx + 1}`,
          isCorrect: o.isCorrect,
          optionOrder: idx + 1
        })),
        correctShortAnswer: q.correctShortAnswer
      });
      setBankToast(`✓ Question ${qIdx + 1} saved to your reusable Question Bank!`);
      setTimeout(() => setBankToast(null), 3000);
    } catch (err: any) {
      setBankToast(err.message || 'Failed to save question to bank');
      setTimeout(() => setBankToast(null), 3000);
    }
  };

  // Open modal to import questions from Question Bank
  const handleOpenBankModal = async () => {
    setBankLoading(true);
    setShowBankModal(true);
    setSelectedBankIds([]);
    try {
      const items = await api.questionBank.getAll();
      setBankItems(items);
    } catch (err: any) {
      console.error('Failed to load bank items:', err);
    } finally {
      setBankLoading(false);
    }
  };

  const handleImportFromBank = () => {
    const selected = bankItems.filter(item => selectedBankIds.includes(item.id));
    if (selected.length === 0) return;

    const imported = selected.map(item => ({
      questionType: item.questionType,
      questionText: item.questionText,
      marks: item.marks || 2,
      difficulty: item.difficulty,
      explanation: item.explanation || '',
      options: (item.options || []).map(opt => ({
        optionText: opt.optionText,
        isCorrect: opt.isCorrect
      })),
      correctShortAnswer: item.correctShortAnswer
    }));

    setQuestionList(prev => [...prev, ...imported]);
    setShowBankModal(false);
    setBankToast(`✓ Successfully imported ${imported.length} question(s) from Question Bank.`);
    setTimeout(() => setBankToast(null), 3000);
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
          {/* Question Bank Toast */}
          {bankToast && (
            <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs flex items-center justify-between animate-in fade-in">
              <span className="font-medium">{bankToast}</span>
              <button onClick={() => setBankToast(null)} className="underline text-purple-300 ml-3">Dismiss</button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Question Builder</h2>
              <p className="text-xs text-slate-400">
                Configure questions, distinct question formats (MCQ, True/False, Multi-select, Short Answer), and score weights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenBankModal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Import questions from your reusable Question Bank pool"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Import from Bank</span>
              </button>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          <div className="space-y-5 max-h-[560px] overflow-y-auto pr-1">
            {questionList.map((q, qIdx) => (
              <div key={qIdx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/50 border border-blue-500/30 px-2 py-0.5 rounded">
                      Q{qIdx + 1}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      of {questionList.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Question Format Selector */}
                    <select
                      value={q.questionType}
                      onChange={e => handleChangeQuestionType(qIdx, e.target.value as QuestionType)}
                      className="text-xs font-medium bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="MCQ">Single Choice (MCQ)</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="MULTIPLE_SELECT">Multiple Select (Multi-Choice)</option>
                      <option value="SHORT_ANSWER">Short Answer (Direct Text)</option>
                    </select>

                    {/* Marks weight */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-300">
                      <span>Marks:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks}
                        onChange={e => {
                          const updated = [...questionList];
                          updated[qIdx].marks = Math.max(1, Number(e.target.value) || 1);
                          setQuestionList(updated);
                        }}
                        className="w-10 bg-transparent text-center font-bold text-white focus:outline-none"
                      />
                    </div>

                    {/* Save to Question Bank */}
                    <button
                      type="button"
                      onClick={() => handleSaveQuestionToBank(qIdx)}
                      title="Save question to your reusable Question Bank"
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-purple-300 rounded text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      <span>Save to Bank</span>
                    </button>

                    {questionList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        title="Delete question"
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Question Prompt *</label>
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

                {/* TYPE 1: SINGLE CHOICE (MCQ) */}
                {q.questionType === 'MCQ' && (
                  <div className="space-y-2.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Single Choice (MCQ) — Click radio button to mark the single correct answer:</span>
                      </span>
                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => handleAddOptionToQuestion(qIdx)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Option</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                            title={opt.isCorrect ? 'Correct Answer' : 'Click to mark as correct answer'}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              opt.isCorrect 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' 
                                : 'border-slate-700 text-transparent hover:border-slate-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={opt.optionText}
                            onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Choice ${String.fromCharCode(65 + optIdx)}`}
                            className={`flex-1 px-3 py-1.5 bg-slate-900 border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none ${
                              opt.isCorrect ? 'border-emerald-500/50' : 'border-slate-800'
                            }`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionFromQuestion(qIdx, optIdx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TYPE 2: TRUE / FALSE */}
                {q.questionType === 'TRUE_FALSE' && (
                  <div className="space-y-2.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-mono text-slate-400 block">
                      True / False Statement — Select which value is the verified correct answer:
                    </span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isTrue = opt.optionText.toLowerCase() === 'true';
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                              opt.isCorrect
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                opt.isCorrect ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-700'
                              }`}>
                                {opt.isCorrect ? <Check className="w-3 h-3" /> : null}
                              </div>
                              <span className="font-bold text-sm">{isTrue ? 'True' : 'False'}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {opt.isCorrect ? 'Correct Answer' : 'Incorrect'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TYPE 3: MULTIPLE SELECT */}
                {q.questionType === 'MULTIPLE_SELECT' && (
                  <div className="space-y-2.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-purple-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-purple-400" />
                        <span>Multiple Select — Check all options that apply (one or more can be correct):</span>
                      </span>
                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => handleAddOptionToQuestion(qIdx)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Option</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                            title={opt.isCorrect ? 'Checked as correct' : 'Click to check as correct'}
                            className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              opt.isCorrect 
                                ? 'bg-purple-600 border-purple-500 text-white shadow-sm' 
                                : 'border-slate-700 text-transparent hover:border-slate-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={opt.optionText}
                            onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Choice ${optIdx + 1}`}
                            className={`flex-1 px-3 py-1.5 bg-slate-900 border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none ${
                              opt.isCorrect ? 'border-purple-500/50' : 'border-slate-800'
                            }`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionFromQuestion(qIdx, optIdx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TYPE 4: SHORT ANSWER */}
                {q.questionType === 'SHORT_ANSWER' && (
                  <div className="space-y-1.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-mono text-slate-400 block">
                      Expected Correct Phrase (Candidate response will be matched case-insensitively):
                    </span>
                    <input
                      type="text"
                      value={q.correctShortAnswer || ''}
                      onChange={e => {
                        const updated = [...questionList];
                        updated[qIdx].correctShortAnswer = e.target.value;
                        setQuestionList(updated);
                      }}
                      placeholder="e.g. Polymorphism, O(n), HTTP 200"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
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
                    placeholder="Explanation (displayed to student in evaluation review transcript)"
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
              <span>Next: Rules & Result Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RULES & SETTINGS */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Examination Rules, Result Display & Security</h2>
            <p className="text-xs text-slate-400">Configure result disclosure policy, evaluation marks, timer, and anti-copying protections</p>
          </div>

          {/* 1. RESULT DISPLAY & ANSWER REVIEW POLICY (CRITICAL SETTING) */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Result Display & Answer Review Policy</span>
                <span className="text-[11px] text-slate-400">Choose how and when candidates receive their scores and review answer keys</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: IMMEDIATE */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, resultReleaseMode: 'IMMEDIATE' })}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  settings.resultReleaseMode === 'IMMEDIATE'
                    ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  settings.resultReleaseMode === 'IMMEDIATE' ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-700'
                }`}>
                  {settings.resultReleaseMode === 'IMMEDIATE' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Display Score & Review Answers</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Students instantly view total marks, percentage, and a full question-by-question review with answer keys and explanations upon submission.
                  </p>
                </div>
              </button>

              {/* Option 2: SCORE_ONLY */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, resultReleaseMode: 'SCORE_ONLY' })}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  settings.resultReleaseMode === 'SCORE_ONLY'
                    ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  settings.resultReleaseMode === 'SCORE_ONLY' ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-700'
                }`}>
                  {settings.resultReleaseMode === 'SCORE_ONLY' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Display Score Only (No Answer Review)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Students only see their final score and percentage. The questions, correct answers, and explanations are hidden to prevent cheating.
                  </p>
                </div>
              </button>

              {/* Option 3: MANUAL_RELEASE */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, resultReleaseMode: 'MANUAL_RELEASE' })}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  settings.resultReleaseMode === 'MANUAL_RELEASE'
                    ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  settings.resultReleaseMode === 'MANUAL_RELEASE' ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-700'
                }`}>
                  {settings.resultReleaseMode === 'MANUAL_RELEASE' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hold Results (Manual Release Later)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Do not display results immediately. Students receive a submission confirmation; you release results whenever ready from the dashboard.
                  </p>
                </div>
              </button>

              {/* Option 4: HIDDEN */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, resultReleaseMode: 'HIDDEN' })}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  settings.resultReleaseMode === 'HIDDEN'
                    ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  settings.resultReleaseMode === 'HIDDEN' ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-700'
                }`}>
                  {settings.resultReleaseMode === 'HIDDEN' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hide Results Completely</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Never display scores or results to candidates. Displays a simple thank-you completion notice upon test submission.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. DURATION & PASSCODE */}
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
                Timer runs continuously from the moment the candidate starts.
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

          {/* 3. EVALUATION & MARKING SCHEME */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="font-semibold text-slate-200 block text-xs">Evaluation & Marking Scheme:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Passing Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passingPercentage}
                  onChange={e => setSettings({ ...settings, passingPercentage: Number(e.target.value) || 40 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={settings.negativeMarkingEnabled}
                    onChange={e => setSettings({ ...settings, negativeMarkingEnabled: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs">Enable Negative Marking</span>
                </label>
                {settings.negativeMarkingEnabled && (
                  <div>
                    <label className="block text-[11px] text-rose-400 mb-1">Deduction per incorrect answer (Marks)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.negativeMarks}
                      onChange={e => setSettings({ ...settings, negativeMarks: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-rose-900/60 rounded-lg text-xs font-mono text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. SECURITY & ANTI-CHEATING */}
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
                <span className="text-slate-500 text-[10px] block">Total Marks</span>
                <span className="text-emerald-400 font-bold">
                  {questionList.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)} Marks
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Result Policy</span>
                <span className="text-blue-400 font-bold uppercase text-[11px]">{settings.resultReleaseMode}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-semibold text-slate-300 block">Questions Overview ({questionList.length}):</span>
              {questionList.map((q, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200">Q{idx + 1}. {q.questionText || `Question ${idx + 1}`}</span>
                    <span className="text-[11px] font-mono text-blue-400">{q.marks} Marks</span>
                  </div>
                  {q.questionType !== 'SHORT_ANSWER' && q.options && (
                    <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`p-1.5 rounded ${opt.isCorrect ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 font-medium' : ''}`}>
                          {opt.isCorrect ? '✓ ' : '○ '}{opt.optionText || `Option ${oIdx + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.questionType === 'SHORT_ANSWER' && (
                    <div className="text-[11px] font-mono text-slate-400">
                      Expected: <span className="text-emerald-400">{q.correctShortAnswer || 'N/A'}</span>
                    </div>
                  )}
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
                if (onTakeTestDirectly) {
                  onTakeTestDirectly(createdTest.publicCode);
                } else {
                  window.location.href = `/exam/${createdTest.publicCode}`;
                }
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Test as Student</span>
            </button>
          </div>
        </div>
      )}

      {/* QUESTION BANK IMPORT MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import from Question Bank</h3>
                  <p className="text-xs text-slate-400">Select questions to add directly into this examination</p>
                </div>
              </div>
              <button
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="py-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                {bankItems.length} question(s) available in your library
              </span>
              <span className="text-purple-400 font-mono">
                {selectedBankIds.length} selected
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {bankLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading question bank items...
                </div>
              ) : bankItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <p>Your question bank is empty.</p>
                  <p className="text-slate-500 text-[11px]">
                    Tip: You can click "Save to Bank" on any question in your tests to build your reusable library.
                  </p>
                </div>
              ) : (
                bankItems.map(item => {
                  const isChecked = selectedBankIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedBankIds(prev => 
                          prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked 
                          ? 'bg-purple-950/40 border-purple-500 text-white' 
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-purple-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800/60">
                            {item.category}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 uppercase">
                            {item.questionType}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.marks} Marks
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 line-clamp-2">
                          {item.questionText}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedBankIds.length === 0}
                onClick={handleImportFromBank}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
              >
                Import {selectedBankIds.length} Question(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
