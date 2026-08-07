'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import LatexToolbar from '@/components/ui/LatexToolbar';
import { BLOOM_LEVELS } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, Library, X,
} from 'lucide-react';
import ImageUploadButton, { ImagePreviewList } from '@/components/ui/ImageUploadButton';
import {
  FILL_BLANK_MARKER, countFillBlanks, encodeFillBlankCorrectAnswer, parseFillBlankCorrectAnswer,
} from '@/lib/fill-blank';
import FillBlankEditor from '@/components/ui/FillBlankEditor';

type QType = 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'TRUE_FALSE' | 'MULTI_SELECT' | 'FILL_BLANK';

interface BankOption { label: string; text: string; image: string | null }

interface BankQuestionItem {
  id: string;
  subjectId: string;
  text: string;
  images: string[];
  options: BankOption[];
  correctAnswer: string;
  type: QType;
  explanation: string | null;
  topic: string | null;
  bloomLevel: string | null;
  difficulty: number | null;
  createdAt: string;
  subject: { nameUz: string; icon: string | null };
}

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

const emptyForm = {
  subjectId: '',
  text: '',
  images: [] as string[],
  options: [
    { label: 'A', text: '', image: null as string | null },
    { label: 'B', text: '', image: null as string | null },
    { label: 'C', text: '', image: null as string | null },
    { label: 'D', text: '', image: null as string | null },
  ],
  correctAnswer: '',
  type: 'MULTIPLE_CHOICE' as QType,
  explanation: '',
  topic: '',
  bloomLevel: '',
  difficulty: null as number | null,
  blankAnswers: [''] as string[],
};

// FILL_BLANK: matndagi "___" soniga mos ravishda blankAnswers ro'yxatini hisoblaydi.
function fillBlankCorrectAnswer(text: string, blankAnswers: string[]): string {
  const blankCount = countFillBlanks(text);
  const perBlank = Array.from({ length: blankCount }, (_, i) =>
    (blankAnswers[i] || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  return encodeFillBlankCorrectAnswer(perBlank);
}

function isBankFormValid(form: { text: string; type: QType; correctAnswer: string; blankAnswers: string[] }): boolean {
  if (!form.text) return false;
  if (form.type === 'FILL_BLANK') {
    const blankCount = countFillBlanks(form.text);
    if (blankCount === 0) return false;
    for (let i = 0; i < blankCount; i++) {
      if (!(form.blankAnswers[i] || '').trim()) return false;
    }
    return true;
  }
  return !!form.correctAnswer;
}

export default function QuestionBankPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [questions, setQuestions] = useState<BankQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetch('/api/subjects').then(r => r.json()).then(data => {
      if (data.subjects) setSubjects(data.subjects);
    }).catch(() => {});
  }, []);

  const fetchQuestions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set('subjectId', filterSubject);
    if (search) params.set('search', search);
    fetch(`/api/teacher/question-bank?${params.toString()}`)
      .then(r => r.json())
      .then(data => { if (data.questions) setQuestions(data.questions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(fetchQuestions, 250);
    return () => clearTimeout(timer);
  }, [filterSubject, search]);

  const switchType = (newType: QType) => {
    setForm((prev) => {
      let options = prev.options;
      let correctAnswer = prev.correctAnswer;
      if (newType === 'TRUE_FALSE') {
        options = [{ label: 'A', text: "To'g'ri", image: null }, { label: 'B', text: "Noto'g'ri", image: null }];
        correctAnswer = '';
      } else if (prev.type === 'TRUE_FALSE' && newType !== 'OPEN_ENDED') {
        options = [
          { label: 'A', text: '', image: null }, { label: 'B', text: '', image: null },
          { label: 'C', text: '', image: null }, { label: 'D', text: '', image: null },
        ];
        correctAnswer = '';
      } else if (newType === 'OPEN_ENDED' || newType === 'FILL_BLANK') {
        correctAnswer = '';
      } else if (newType === 'MULTIPLE_CHOICE' && correctAnswer.includes(',')) {
        correctAnswer = correctAnswer.split(',')[0] || '';
      }
      const blankAnswers = newType === 'FILL_BLANK' ? [''] : prev.blankAnswers;
      return { ...prev, type: newType, options, correctAnswer, blankAnswers };
    });
  };

  // "Bo'shliq qo'shish" tugmasi — savol matni ichiga kursor turgan joyga "___" belgisini qo'yadi.
  const insertBlankMarker = () => {
    const el = textRef.current;
    const text = form.text;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    setForm((prev) => ({ ...prev, text: `${before}${FILL_BLANK_MARKER}${after}` }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = before.length + FILL_BLANK_MARKER.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const toggleAnswer = (label: string) => {
    setForm((prev) => {
      if (prev.type === 'MULTI_SELECT') {
        const set = new Set(prev.correctAnswer.split(',').filter(Boolean));
        if (set.has(label)) set.delete(label); else set.add(label);
        return { ...prev, correctAnswer: Array.from(set).sort().join(',') };
      }
      return { ...prev, correctAnswer: label };
    });
  };

  const addOption = () => {
    if (form.options.length >= 5) return;
    const label = String.fromCharCode(65 + form.options.length);
    setForm((prev) => ({ ...prev, options: [...prev.options, { label, text: '', image: null }] }));
  };

  const removeOption = (idx: number) => {
    if (form.options.length <= 4) return;
    setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    if (!form.subjectId || !isBankFormValid(form)) {
      alert("Fan, savol matni va to'g'ri javob majburiy!");
      return;
    }
    setSaving(true);
    try {
      const isFillBlank = form.type === 'FILL_BLANK';
      const res = await fetch('/api/teacher/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: form.subjectId,
          text: form.text,
          images: form.images,
          options: (form.type === 'OPEN_ENDED' || isFillBlank) ? [] : form.options.filter(o => o.text),
          correctAnswer: isFillBlank ? fillBlankCorrectAnswer(form.text, form.blankAnswers) : form.correctAnswer,
          type: form.type,
          explanation: form.explanation || null,
          topic: form.topic || null,
          bloomLevel: form.bloomLevel || null,
          difficulty: form.difficulty || null,
        }),
      });
      if (res.ok) {
        setForm({ ...emptyForm });
        setShowForm(false);
        fetchQuestions();
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu savolni bazadan o'chirishni tasdiqlaysizmi?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/teacher/question-bank/${id}`, { method: 'DELETE' });
      if (res.ok) setQuestions((prev) => prev.filter((q) => q.id !== id));
      else alert("O'chirishda xatolik");
    } catch {
      alert('Server xatolik');
    }
    setDeleting(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Library size={22} className="text-primary-600" /> Savollar bazasi
            </h1>
            <p className="text-sm text-text-secondary">
              Bir marta yozib, xohlagan testingizga qayta-qayta qo&apos;shing
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Bekor qilish' : 'Yangi savol'}
        </button>
      </motion.div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.nameUz} ({s.category.nameUz})</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Savol matni * <span className="text-xs text-text-secondary">(LaTeX: $formula$)</span></label>
              <ImageUploadButton
                endpoint="questionImage"
                label="Rasm qo'shish"
                onUpload={(url) => setForm((prev) => ({ ...prev, images: [...prev.images, url] }))}
              />
            </div>
            <LatexToolbar targetRef={textRef} value={form.text} onChange={(text) => setForm({ ...form, text })} className="mb-1.5" />
            <textarea
              ref={textRef}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Savolni kiriting..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
            />
            <ImagePreviewList
              images={form.images}
              onRemove={(idx) => setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
            />
            {form.text && (
              <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <LatexRenderer content={form.text} className="text-sm text-text-primary" />
              </div>
            )}
          </div>

          {/* Type toggle */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Savol turi</label>
            <div className="inline-flex flex-wrap rounded-xl border border-border overflow-hidden">
              {([
                { key: 'MULTIPLE_CHOICE' as const, label: 'Variantli' },
                { key: 'MULTI_SELECT' as const, label: "Ko'p tanlovli" },
                { key: 'TRUE_FALSE' as const, label: "To'g'ri/Noto'g'ri" },
                { key: 'OPEN_ENDED' as const, label: 'Ochiq' },
                { key: 'FILL_BLANK' as const, label: "Bo'shliqni to'ldirish" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => switchType(opt.key)}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    form.type === opt.key ? 'bg-primary-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'FILL_BLANK' ? (
            <FillBlankEditor
              question={form}
              onInsertBlank={insertBlankMarker}
              onBlankAnswersChange={(blankAnswers) => setForm({ ...form, blankAnswers })}
            />
          ) : form.type === 'OPEN_ENDED' ? (
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">To&apos;g&apos;ri javob (matn) *</label>
              <input
                type="text"
                value={form.correctAnswer}
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                placeholder="Javobni kiriting"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-text-primary block mb-3">Javob variantlari *</label>
              <div className="space-y-2">
                {form.options.map((opt, idx) => {
                  const isMulti = form.type === 'MULTI_SELECT';
                  const isChecked = isMulti ? form.correctAnswer.split(',').includes(opt.label) : form.correctAnswer === opt.label;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAnswer(opt.label)}
                        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold transition-all ${isMulti ? 'rounded-md' : 'rounded-full'} ${
                          isChecked ? 'border-green-500 bg-green-500 text-white' : 'border-border text-text-secondary hover:border-primary-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...form.options];
                          updated[idx] = { ...updated[idx], text: e.target.value };
                          setForm({ ...form, options: updated });
                        }}
                        placeholder={`${opt.label} variantini kiriting`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                      />
                      {idx === 4 && (
                        <button onClick={() => removeOption(idx)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {form.type !== 'TRUE_FALSE' && form.options.length < 5 && (
                  <button onClick={addOption} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11">
                    <Plus size={12} /> E variantini qo&apos;shish
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Mavzu tegi (ixtiyoriy)</label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="Masalan: Kvadrat tenglama"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Bloom darajasi (ixtiyoriy)</label>
              <select
                value={form.bloomLevel}
                onChange={(e) => setForm({ ...form, bloomLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
              >
                <option value="">Tanlanmagan</option>
                {BLOOM_LEVELS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Qiyinlik darajasi (ixtiyoriy)</label>
              <select
                value={form.difficulty ?? ''}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
              >
                <option value="">Tanlanmagan</option>
                <option value="1">1 — Juda oson</option>
                <option value="2">2 — Oson</option>
                <option value="3">3 — O&apos;rta</option>
                <option value="4">4 — Qiyin</option>
                <option value="5">5 — Juda qiyin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Yechim (ixtiyoriy)</label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              rows={2}
              placeholder="Yechimni kiriting..."
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Bazaga saqlash
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Savol yoki mavzu bo'yicha qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
        >
          <option value="">Barcha fanlar</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.nameUz}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
      ) : questions.length === 0 ? (
        <div className="card p-12 text-center">
          <Library size={40} className="text-text-secondary mx-auto mb-3 opacity-50" />
          <p className="text-text-secondary text-sm">Bazada hali savol yo&apos;q. Yangi savol qo&apos;shing yoki test yaratish sahifasida &quot;Bazaga saqlash&quot; tugmasidan foydalaning.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">
                      {q.subject.icon} {q.subject.nameUz}
                    </span>
                    {q.topic && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.topic}</span>}
                    {q.bloomLevel && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{q.bloomLevel}</span>}
                    {q.difficulty && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Qiyinlik: {q.difficulty}/5</span>}
                    {q.type === 'OPEN_ENDED' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Ochiq</span>}
                    {q.type === 'MULTI_SELECT' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Ko&apos;p tanlovli</span>}
                    {q.type === 'TRUE_FALSE' && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">T/N</span>}
                    {q.type === 'FILL_BLANK' && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Bo&apos;shliq</span>}
                  </div>
                  <div className="text-sm text-text-primary">
                    <LatexRenderer content={q.text} />
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 flex-shrink-0"
                >
                  {deleting === q.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
