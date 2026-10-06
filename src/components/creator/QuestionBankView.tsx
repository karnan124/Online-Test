import React, { useState, useEffect } from 'react';
import { QuestionBankItem, DifficultyLevel, QuestionType } from '../../types/index';
import { api } from '../../services/api';
import { Plus, Search, BookOpen, Trash2, Check } from 'lucide-react';

export const QuestionBankView: React.FC = () => {
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    category: 'Java / OOP',
    questionType: 'MCQ' as QuestionType,
    questionText: '',
    marks: 2,
    difficulty: 'MEDIUM' as DifficultyLevel,
    explanation: '',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false }
    ]
  });

  const [toast, setToast] = useState<string | null>(null);

  const loadBank = async () => {
    try {
      setLoading(true);
      const data = await api.questionBank.getAll();
      setItems(data);
    } catch (err: any) {
      setToast(err.message || 'Failed to load question bank');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBank();
  }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.questionBank.create({
        ...form,
        options: form.options.map((o, idx) => ({
          id: `qbo-${Date.now()}-${idx}`,
          optionText: o.optionText || `Option ${idx + 1}`,
          isCorrect: o.isCorrect,
          optionOrder: idx + 1
        }))
      });
      setShowAddModal(false);
      setToast('Question saved to bank.');
      setTimeout(() => setToast(null), 3000);
      loadBank();
    } catch (err: any) {
      setToast(err.message || 'Failed to save question to bank');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category)))];

  const filtered = items.filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.questionText.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading reusable question library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="underline text-emerald-300">Dismiss</button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>EXAMINER QUESTION ASSET POOL</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reusable Question Bank</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain curated question pools across subjects to import into new assessments or randomize into student tests.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Question to Pool</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions or categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                categoryFilter === cat ? 'bg-blue-600 text-white font-medium' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No questions found in this category. Click "Add Question to Pool" above.
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-blue-400 font-semibold px-2 py-0.5 rounded bg-blue-950/40 border border-blue-500/20">
                    {item.category}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono">{item.marks} Marks</span>
                  <span className="text-slate-600">·</span>
                  <span className={`font-mono text-[11px] ${
                    item.difficulty === 'HARD' ? 'text-rose-400' :
                    item.difficulty === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {item.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-slate-100 font-medium text-sm leading-relaxed">
                {item.questionText}
              </p>

              {item.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {item.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2 rounded-lg border flex items-center gap-2 ${
                        opt.isCorrect 
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{opt.isCorrect ? '✓' : '○'}</span>
                      <span className="truncate">{opt.optionText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-white mb-4">Add Question to Question Bank</h3>
            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Category / Tag</label>
                  <input
                    type="text"
                    required
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Java / Collections"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={2}
                  value={form.questionText}
                  onChange={e => setForm({ ...form, questionText: e.target.value })}
                  placeholder="Enter question text..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-400 text-[11px]">Options (click circle for correct answer)</label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.options.map((o, i) => ({ ...o, isCorrect: i === idx }));
                        setForm({ ...form, options: updated });
                      }}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        opt.isCorrect ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700'
                      }`}
                    >
                      {opt.isCorrect && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <input
                      type="text"
                      required
                      value={opt.optionText}
                      onChange={e => {
                        const updated = [...form.options];
                        updated[idx].optionText = e.target.value;
                        setForm({ ...form, options: updated });
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded font-semibold text-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
