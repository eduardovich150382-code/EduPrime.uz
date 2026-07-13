'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, Plus, Trash2, Image, Upload, Bot, Eye,
  Save, GripVertical, FileUp, CheckCircle,
} from 'lucide-react';

interface QuestionForm {
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  correctAnswer: string;
  explanation: string;
  explanationImages: string[];
  videoUrl: string;
}

const emptyQuestion: QuestionForm = {
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
  videoUrl: '',
};

export default function CreateTestPage() {
  const [testInfo, setTestInfo] = useState({
    title: '',
    category: 'dtm',
    subject: '',
    duration: 60,
    isFree: false,
    price: 0,
    difficulty: 3,
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentStep, setCurrentStep] = useState<'info' | 'questions' | 'ai-import'>('info');
  const [activeQuestion, setActiveQuestion] = useState(0);

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 5) return;
    const label = String.fromCharCode(65 + q.options.length); // E
    const updated = [...questions];
    updated[qIndex] = {
      ...q,
      options: [...q.options, { label, text: '', image: null }],
    };
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 4) return; // Minimum 4 options
    const updated = [...questions];
    updated[qIndex] = {
      ...q,
      options: q.options.filter((_, i) => i !== optIndex),
    };
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setActiveQuestion(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
    if (activeQuestion >= questions.length - 1) {
      setActiveQuestion(Math.max(0, questions.length - 2));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Yangi test yaratish</h1>
            <p className="text-sm text-text-secondary">Savollarni qo&apos;lda kiriting yoki AI bilan import qiling</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Save size={16} />
          Saqlash
        </button>
      </motion.div>

      {/* Step tabs */}
      <div className="flex gap-2">
        {[
          { id: 'info', label: 'Test ma\'lumotlari', icon: FileUp },
          { id: 'questions', label: 'Savollar', icon: Plus },
          { id: 'ai-import', label: 'AI Import', icon: Bot },
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStep === step.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            <step.icon size={16} />
            {step.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 'info' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Test nomi</label>
              <input
                type="text"
                value={testInfo.title}
                onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                placeholder="Masalan: DTM Matematika #1"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Kategoriya</label>
              <select
                value={testInfo.category}
                onChange={(e) => setTestInfo({ ...testInfo, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="dtm">DTM</option>
                <option value="school">Maktab</option>
                <option value="attestation">Attestatsiya</option>
                <option value="sat">SAT</option>
                <option value="gre">GRE Physics</option>
                <option value="certificate">Milliy sertifikat</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Fan</label>
              <input
                type="text"
                value={testInfo.subject}
                onChange={(e) => setTestInfo({ ...testInfo, subject: e.target.value })}
                placeholder="Masalan: Matematika"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Davomiyligi (daqiqa)</label>
              <input
                type="number"
                value={testInfo.duration}
                onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testInfo.isFree}
                onChange={(e) => setTestInfo({ ...testInfo, isFree: e.target.checked, price: 0 })}
                className="w-5 h-5 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-text-primary">Bepul test</span>
            </label>

            {!testInfo.isFree && (
              <div>
                <label className="text-sm font-medium text-text-primary mr-2">Narx:</label>
                <input
                  type="number"
                  value={testInfo.price}
                  onChange={(e) => setTestInfo({ ...testInfo, price: parseInt(e.target.value) })}
                  placeholder="so'm"
                  className="w-32 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                />
                <span className="text-sm text-text-secondary ml-1">so&apos;m</span>
              </div>
            )}
          </div>

          <p className="text-xs text-text-secondary bg-green-50 p-3 rounded-lg border border-green-100">
            💡 Bepul test belgilasangiz — barcha foydalanuvchilar ushbu testni va uning video/yozma yechimlarini bepul ko&apos;ra oladi
          </p>
        </motion.div>
      )}

      {currentStep === 'questions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* Questions list sidebar */}
          <div className="card p-4 space-y-2 h-fit">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">Savollar</h3>
              <span className="text-xs text-text-secondary">{questions.length} ta</span>
            </div>
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveQuestion(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                  i === activeQuestion
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'hover:bg-gray-50 text-text-secondary'
                }`}
              >
                <span>{i + 1}-savol</span>
                {questions[i].text && <CheckCircle size={12} className="text-green-500" />}
              </button>
            ))}
            <button
              onClick={addQuestion}
              className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition-colors border border-dashed border-primary-200"
            >
              <Plus size={14} />
              Savol qo&apos;shish
            </button>
          </div>

          {/* Question editor */}
          <div className="lg:col-span-3 card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">
                {activeQuestion + 1}-savol
              </h3>
              <button
                onClick={() => removeQuestion(activeQuestion)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                title="Savolni o'chirish"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Question text */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">
                Savol matni <span className="text-xs text-text-secondary">(LaTeX qo&apos;llab-quvvatlanadi)</span>
              </label>
              <textarea
                value={questions[activeQuestion]?.text || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="Savolni kiriting... LaTeX: $\frac{a}{b}$"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
              />
              <button className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Image size={12} />
                Rasm qo&apos;shish
              </button>
            </div>

            {/* Options */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-3">
                Javob variantlari <span className="text-xs text-text-secondary">(E ixtiyoriy)</span>
              </label>
              <div className="space-y-3">
                {questions[activeQuestion]?.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-start gap-3">
                    {/* Radio for correct answer */}
                    <button
                      onClick={() => {
                        const updated = [...questions];
                        updated[activeQuestion] = { ...updated[activeQuestion], correctAnswer: opt.label };
                        setQuestions(updated);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold mt-2 transition-all ${
                        questions[activeQuestion]?.correctAnswer === opt.label
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-border text-text-secondary hover:border-primary-300'
                      }`}
                    >
                      {opt.label}
                    </button>

                    {/* Option text input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[activeQuestion].options[optIndex].text = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder={`${opt.label} variantini kiriting (LaTeX: $formula$)`}
                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm font-mono"
                      />
                    </div>

                    {/* Image button */}
                    <button className="p-2.5 rounded-lg border border-border text-text-secondary hover:text-primary-600 hover:border-primary-200 transition-all mt-0.5">
                      <Image size={14} />
                    </button>

                    {/* Remove E option */}
                    {optIndex === 4 && (
                      <button
                        onClick={() => removeOption(activeQuestion, optIndex)}
                        className="p-2.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {questions[activeQuestion]?.options.length < 5 && (
                  <button
                    onClick={() => addOption(activeQuestion)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11"
                  >
                    <Plus size={12} />
                    E variantini qo&apos;shish
                  </button>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-2 ml-11">
                Yashil doira = to&apos;g&apos;ri javob. Belgilash uchun variant harfiga bosing.
              </p>
            </div>

            {/* Written solution */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">
                Yozma yechim <span className="text-xs text-text-secondary">(LaTeX, ixtiyoriy)</span>
              </label>
              <textarea
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="Yechimni kiriting... $\frac{a}{b} = c$"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
              />
            </div>

            {/* Video solution */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">
                Video yechim URL <span className="text-xs text-text-secondary">(YouTube/Vimeo, ixtiyoriy)</span>
              </label>
              <input
                type="url"
                value={questions[activeQuestion]?.videoUrl || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], videoUrl: e.target.value };
                  setQuestions(updated);
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
              />
            </div>
          </div>
        </motion.div>
      )}

      {currentStep === 'ai-import' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center"
        >
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot size={32} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">AI bilan import qilish</h2>
            <p className="text-sm text-text-secondary mb-8">
              Fayl yuklang — AI avtomatik savollarni, variantlarni va javoblarni aniqlaydi. 
              Formulalar LaTeX formatga o&apos;giriladi.
            </p>

            {/* Upload area */}
            <div className="border-2 border-dashed border-primary-200 rounded-2xl p-8 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
              <Upload size={40} className="text-primary-400 mx-auto mb-3" />
              <p className="font-medium text-text-primary mb-1">Faylni yuklang</p>
              <p className="text-xs text-text-secondary">
                .docx, .pdf, .txt, .xlsx — maksimal 10MB
              </p>
              <input type="file" className="hidden" accept=".docx,.pdf,.txt,.xlsx" />
            </div>

            <div className="mt-6 p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-left">
              <p className="text-xs text-yellow-700">
                <strong>Eslatma:</strong> AI (Gemini Flash) bepul ishlatiladi. Natija ustoz tomonidan tekshirilishi va tasdiqlanishi kerak.
                Rasmli savollar ham qo&apos;llab-quvvatlanadi.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
