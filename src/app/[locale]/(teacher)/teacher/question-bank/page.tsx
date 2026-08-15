'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, Library, X, Bot, Eye, CheckCircle, ShieldAlert,
} from 'lucide-react';
import type { AIImportedQuestion, QuestionCoreFields, QuestionType } from '@/types';
import { isQuestionValid, mapQuestionForBank } from '@/lib/question-form';
import QuestionEditorForm from '@/components/teacher/QuestionEditorForm';
import AiImportPanel, { LOW_CONFIDENCE_THRESHOLD } from '@/components/teacher/AiImportPanel';
import QuestionPreviewList from '@/components/teacher/QuestionPreviewList';

interface DraftQuestion extends QuestionCoreFields {
  /** Faqat AI import orqali kelgan qoralamalarda bo'ladi — qo'lda qo'shilganlarda undefined. */
  aiConfidence?: number;
}

interface BankOption { label: string; text: string; image: string | null }

interface BankQuestionItem {
  id: string;
  subjectId: string;
  text: string;
  images: string[];
  options: BankOption[] | { left: string[]; right: string[] };
  correctAnswer: string;
  type: QuestionType;
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

const emptyDraft: DraftQuestion = {
  text: '',
  images: [],
  options: [
    { label: 'A', text: '', image: null },
    { label: 'B', text: '', image: null },
    { label: 'C', text: '', image: null },
    { label: 'D', text: '', image: null },
  ],
  correctAnswer: '',
  explanation: '',
  explanationImages: [],
  type: 'MULTIPLE_CHOICE',
  topic: '',
  bloomLevel: '',
  difficulty: null,
  blankAnswers: [''],
  matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
};

export default function QuestionBankPage() {
  // Mavjud savollarni ko'rib chiqish/qidirish
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [questions, setQuestions] = useState<BankQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Yangi savol(lar) qo'shish — Test yaratish sahifasidagi kabi
  // "Savollar / AI import / Ko'rib chiqish" bosqichli qoralama
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSubjectId, setWizardSubjectId] = useState('');
  const [wizardStep, setWizardStep] = useState<'questions' | 'ai-import' | 'review'>('questions');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([{ ...emptyDraft }]);
  const [activeDraft, setActiveDraft] = useState(0);
  const [showOnlyLowConfidence, setShowOnlyLowConfidence] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const openWizard = () => {
    setWizardSubjectId(filterSubject);
    setDrafts([{ ...emptyDraft }]);
    setActiveDraft(0);
    setWizardStep('questions');
    setWizardOpen(true);
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, { ...emptyDraft }]);
    setActiveDraft(drafts.length);
  };

  const removeDraft = (index: number) => {
    if (drafts.length <= 1) return;
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    if (activeDraft >= drafts.length - 1) setActiveDraft(Math.max(0, drafts.length - 2));
  };

  // AiImportPanel savol topganda chaqiradi — AIImportedQuestion[] ni
  // qoralama massiviga o'giradi.
  const handleAiImported = (imported: AIImportedQuestion[]) => {
    const mapped: DraftQuestion[] = imported.map((q) => ({
      text: q.text || '',
      images: q.images || [],
      options: q.type === 'OPEN_ENDED' ? [] : (q.options?.length ? q.options : [
        { label: 'A', text: '', image: null },
        { label: 'B', text: '', image: null },
        { label: 'C', text: '', image: null },
        { label: 'D', text: '', image: null },
      ]),
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      explanationImages: [],
      type: q.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
      topic: q.topic || '',
      bloomLevel: q.bloomLevel || '',
      difficulty: q.difficulty ?? null,
      blankAnswers: [''],
      matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
      aiConfidence: q.confidence,
    }));
    setDrafts(mapped);
    setActiveDraft(0);
    setWizardStep('questions');
    setShowOnlyLowConfidence(false);
  };

  const handleSaveAll = async () => {
    if (!wizardSubjectId) {
      alert('Avval fan tanlang!');
      return;
    }
    const validDrafts = drafts.filter(isQuestionValid);
    if (validDrafts.length === 0) {
      alert("Bazaga saqlash uchun kamida bitta to'liq to'ldirilgan savol bo'lishi kerak!");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/teacher/question-bank/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: validDrafts.map((d) => mapQuestionForBank(d, wizardSubjectId)),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const skippedNote = drafts.length - validDrafts.length;
        alert(
          `${data.count} ta savol bazaga saqlandi!` +
            (skippedNote > 0 ? `\n${skippedNote} ta to'ldirilmagan savol o'tkazib yuborildi.` : '')
        );
        setWizardOpen(false);
        fetchQuestions();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setSaving(false);
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
        {!wizardOpen && (
          <button onClick={openWizard} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
            <Plus size={16} /> Yangi savol(lar)
          </button>
        )}
      </motion.div>

      {/* Savol(lar) qo'shish qoralamasi */}
      {wizardOpen && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-text-primary">Yangi savol(lar) qo&apos;shish</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setWizardOpen(false)} className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm">
                <X size={14} /> Bekor qilish
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Hammasini saqlash
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
            <select
              value={wizardSubjectId}
              onChange={(e) => setWizardSubjectId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.nameUz} ({s.category.nameUz})</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">Shu qoralamadagi barcha savollar shu fanga saqlanadi.</p>
          </div>

          {/* Step tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'questions' as const, label: `Savollar (${drafts.length})`, icon: Plus },
              { id: 'ai-import' as const, label: 'AI Import', icon: Bot },
              { id: 'review' as const, label: "Ko'rib chiqish", icon: Eye },
            ].map((step) => (
              <button
                key={step.id}
                onClick={() => setWizardStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  wizardStep === step.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white border border-border text-text-secondary hover:border-primary-200'
                }`}
              >
                <step.icon size={16} />
                {step.label}
              </button>
            ))}
          </div>

          {/* STEP: SAVOLLAR */}
          {wizardStep === 'questions' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="card p-4 space-y-2 h-fit">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">Savollar</h3>
                  <span className="text-xs text-text-secondary">{drafts.length} ta</span>
                </div>
                {(() => {
                  const lowConfidenceCount = drafts.filter((d) => d.aiConfidence !== undefined && d.aiConfidence < LOW_CONFIDENCE_THRESHOLD).length;
                  return lowConfidenceCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowOnlyLowConfidence((v) => !v)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 border transition-all ${
                        showOnlyLowConfidence ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      <ShieldAlert size={12} />
                      {showOnlyLowConfidence ? `Hammasini ko'rsatish` : `Faqat tekshirish kerakligini ko'rsatish (${lowConfidenceCount})`}
                    </button>
                  ) : null;
                })()}
                {drafts.map((d, i) => {
                  const needsReview = d.aiConfidence !== undefined && d.aiConfidence < LOW_CONFIDENCE_THRESHOLD;
                  if (showOnlyLowConfidence && !needsReview) return null;
                  return (
                  <button
                    key={i}
                    onClick={() => setActiveDraft(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                      i === activeDraft ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {i + 1}-savol
                      {needsReview && (
                        <span title="AI bu savolga unchalik ishonchli emas — tekshiring">
                          <ShieldAlert size={12} className="text-amber-600" />
                        </span>
                      )}
                    </span>
                    {isQuestionValid(d) && <CheckCircle size={12} className="text-green-500" />}
                  </button>
                  );
                })}
                <button
                  onClick={addDraft}
                  className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition-colors border border-dashed border-primary-200"
                >
                  <Plus size={14} /> Savol qo&apos;shish
                </button>
              </div>

              <div className="lg:col-span-3 card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">{activeDraft + 1}-savol</h3>
                  <button onClick={() => removeDraft(activeDraft)} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
                {drafts[activeDraft] && (
                  <QuestionEditorForm
                    question={drafts[activeDraft]}
                    onChange={(updater) => {
                      setDrafts((prev) => {
                        const next = [...prev];
                        next[activeDraft] = updater(next[activeDraft]);
                        return next;
                      });
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP: AI IMPORT */}
          {wizardStep === 'ai-import' && (
            <AiImportPanel
              onImported={handleAiImported}
              title="AI bilan savol import qilish"
              subtitle="Matn kiriting yoki rasm/fayl yuklang — AI savollarni mavzu/Bloom/qiyinlik darajasi bilan birga ajratib beradi"
            />
          )}

          {/* STEP: KO'RIB CHIQISH */}
          {wizardStep === 'review' && (
            <QuestionPreviewList questions={drafts} emptyMessage="Hali savollar kiritilmagan." />
          )}
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
                    {q.type === 'MATCHING' && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Moslashtirish</span>}
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
