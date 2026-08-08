'use client';

import { useRef, useState } from 'react';
import { Bot, Loader2, Plus, Trash2 } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import LatexToolbar from '@/components/ui/LatexToolbar';
import ImageUploadButton, {
  ImagePreviewList, uploadImageFile, extractPastedImageFile, extractDroppedImageFile,
} from '@/components/ui/ImageUploadButton';
import { FILL_BLANK_MARKER } from '@/lib/fill-blank';
import FillBlankEditor from '@/components/ui/FillBlankEditor';
import MatchingEditor from '@/components/ui/MatchingEditor';
import { BLOOM_LEVELS, type QuestionCoreFields } from '@/types';

interface QuestionEditorFormProps<T extends QuestionCoreFields> {
  question: T;
  onChange: (updater: (prev: T) => T) => void;
  /** Test yaratishda "Video yechim URL" kabi sahifaga xos qo'shimcha maydon uchun. */
  footerSlot?: React.ReactNode;
}

const QUESTION_TYPE_OPTIONS = [
  { key: 'MULTIPLE_CHOICE' as const, label: 'Variantli' },
  { key: 'MULTI_SELECT' as const, label: "Ko'p tanlovli" },
  { key: 'TRUE_FALSE' as const, label: "To'g'ri/Noto'g'ri" },
  { key: 'OPEN_ENDED' as const, label: 'Ochiq' },
  { key: 'FILL_BLANK' as const, label: "Bo'shliqni to'ldirish" },
  { key: 'MATCHING' as const, label: 'Moslashtirish' },
];

const TYPE_DESCRIPTIONS: Record<QuestionCoreFields['type'], string> = {
  OPEN_ENDED: "Ochiq savol — foydalanuvchi javobni qo'lda kiritadi (masalan: son, formula natijasi)",
  MULTIPLE_CHOICE: "Variantli savol — foydalanuvchi bitta to'g'ri variantni tanlaydi",
  MULTI_SELECT: "Ko'p tanlovli savol — foydalanuvchi bir nechta to'g'ri variantni belgilashi mumkin",
  TRUE_FALSE: "To'g'ri/Noto'g'ri savol — ikkita variantdan biri tanlanadi",
  FILL_BLANK: "Bo'shliqni to'ldirish — savol matni ichiga uchta pastki chiziqcha (___) qo'yiladi, talaba shu joyga javob yozadi",
  MATCHING: "Moslashtirish — talaba chap ustundagi har bir elementga mos o'ng ustun elementini tanlaydi",
};

/**
 * Bitta savolni tahrirlash formasi — savol matni/rasm, tur almashtirish,
 * turga xos tana (variantlar+rasm / bo'shliq / moslashtirish / ochiq javob),
 * mavzu/Bloom/qiyinlik + AI taklif, va yechim/rasm. Test yaratish va
 * Savollar bazasi sahifalari o'rtasida qayta ishlatiladi — `T` generik
 * turi orqali har sahifa o'z qo'shimcha maydonlarini (masalan `points`)
 * `QuestionCoreFields` ustiga qo'shishi mumkin.
 *
 * `onChange` — `setQuestions(prev => {...})` naqshiga mos "updater"
 * funksiyani oladi, shu sababli chaqiruvchi tomonda faqat ro'yxatdagi
 * indeksni yangilash kifoya.
 */
export default function QuestionEditorForm<T extends QuestionCoreFields>({
  question, onChange, footerSlot,
}: QuestionEditorFormProps<T>) {
  const questionTextRef = useRef<HTMLTextAreaElement | null>(null);
  const explanationRef = useRef<HTMLTextAreaElement | null>(null);
  const [dropUploading, setDropUploading] = useState<'question' | 'explanation' | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const patch = (fields: Partial<T>) => onChange((prev) => ({ ...prev, ...fields }));

  // Savol matni / yechim maydonlariga rasmni sudrab tashlash yoki
  // clipboard'dan (Ctrl+V) joylash orqali yuklash.
  const handleImageDropOrPaste = async (file: File, target: 'question' | 'explanation') => {
    setDropUploading(target);
    try {
      const endpoint = target === 'question' ? 'questionImage' : 'solutionImage';
      const url = await uploadImageFile(file, endpoint);
      if (target === 'question') {
        onChange((prev) => ({ ...prev, images: [...prev.images, url] }));
      } else {
        onChange((prev) => ({ ...prev, explanationImages: [...prev.explanationImages, url] }));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Rasm yuklashda xatolik');
    }
    setDropUploading(null);
  };

  // "Bo'shliq qo'shish" tugmasi — savol matni ichiga kursor turgan joyga "___" belgisini qo'yadi.
  const insertBlankMarker = () => {
    const el = questionTextRef.current;
    const text = question.text;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    patch({ text: `${before}${FILL_BLANK_MARKER}${after}` } as Partial<T>);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = before.length + FILL_BLANK_MARKER.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // Savol turini almashtirish — TRUE_FALSE uchun variantlarni 2 taga
  // qat'iylashtiradi, boshqa turlarga qaytishda esa bo'sh 4 variant tiklaydi.
  const switchQuestionType = (newType: QuestionCoreFields['type']) => {
    let options = question.options;
    let correctAnswer = question.correctAnswer;

    if (newType === 'TRUE_FALSE') {
      options = [
        { label: 'A', text: "To'g'ri", image: null },
        { label: 'B', text: "Noto'g'ri", image: null },
      ];
      correctAnswer = '';
    } else if (question.type === 'TRUE_FALSE' && newType !== 'OPEN_ENDED') {
      options = [
        { label: 'A', text: '', image: null },
        { label: 'B', text: '', image: null },
        { label: 'C', text: '', image: null },
        { label: 'D', text: '', image: null },
      ];
      correctAnswer = '';
    } else if (newType === 'OPEN_ENDED' || newType === 'FILL_BLANK' || newType === 'MATCHING') {
      correctAnswer = '';
    } else if (newType === 'MULTIPLE_CHOICE' && correctAnswer.includes(',')) {
      correctAnswer = correctAnswer.split(',')[0] || '';
    }

    const blankAnswers = newType === 'FILL_BLANK' ? [''] : question.blankAnswers;
    const matchingPairs = newType === 'MATCHING' ? [{ left: '', right: '' }, { left: '', right: '' }] : question.matchingPairs;

    patch({ type: newType, options, correctAnswer, blankAnswers, matchingPairs } as Partial<T>);
  };

  // MULTIPLE_CHOICE/TRUE_FALSE: bitta javobni belgilaydi.
  // MULTI_SELECT: belgilarni to'plamga qo'shadi/olib tashlaydi (vergul bilan ajratilgan saqlanadi).
  const toggleCorrectAnswer = (label: string) => {
    if (question.type === 'MULTI_SELECT') {
      const set = new Set((question.correctAnswer || '').split(',').filter(Boolean));
      if (set.has(label)) set.delete(label); else set.add(label);
      patch({ correctAnswer: Array.from(set).sort().join(',') } as Partial<T>);
    } else {
      patch({ correctAnswer: label } as Partial<T>);
    }
  };

  const addOption = () => {
    if (question.options.length >= 5) return;
    const label = String.fromCharCode(65 + question.options.length);
    onChange((prev) => ({ ...prev, options: [...prev.options, { label, text: '', image: null }] }));
  };

  const removeOption = (optIndex: number) => {
    if (question.options.length <= 4) return;
    onChange((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== optIndex) }));
  };

  const updateOption = (optIndex: number, fields: Partial<{ text: string; image: string | null }>) => {
    onChange((prev) => {
      const options = [...prev.options];
      options[optIndex] = { ...options[optIndex], ...fields };
      return { ...prev, options };
    });
  };

  // AI orqali bo'sh variantlarga distraktor va mavzu/Bloom darajasi taklif
  // qilish. Faqat bo'sh maydonlarni to'ldiradi — o'qituvchi allaqachon
  // yozgan narsani bosib o'tmaydi.
  const handleAiSuggest = async () => {
    if (!question.text || !question.correctAnswer) return;
    setAiSuggestLoading(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: question.text,
          correctAnswer: question.correctAnswer,
          type: question.type,
          existingOptionTexts: question.options.filter((o) => o.text).map((o) => o.text),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
        return;
      }
      onChange((prev) => {
        let options = prev.options;
        if ((prev.type === 'MULTIPLE_CHOICE' || prev.type === 'MULTI_SELECT') && data.distractors?.length) {
          let di = 0;
          options = prev.options.map((o) => {
            if (!o.text && di < data.distractors.length) return { ...o, text: data.distractors[di++] };
            return o;
          });
        }
        return {
          ...prev,
          options,
          topic: prev.topic || data.topic || prev.topic,
          bloomLevel: prev.bloomLevel || data.bloomLevel || prev.bloomLevel,
          difficulty: prev.difficulty ?? data.difficulty ?? prev.difficulty,
        };
      });
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
    setAiSuggestLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Question text */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-primary">
            Savol matni * <span className="text-xs text-text-secondary">(LaTeX: $formula$)</span>
          </label>
          <ImageUploadButton
            endpoint="questionImage"
            label="Rasm qo'shish"
            onUpload={(url) => onChange((prev) => ({ ...prev, images: [...prev.images, url] }))}
          />
        </div>
        <LatexToolbar
          targetRef={questionTextRef}
          value={question.text}
          onChange={(text) => patch({ text } as Partial<T>)}
          className="mb-1.5"
        />
        <textarea
          ref={questionTextRef}
          value={question.text}
          onChange={(e) => patch({ text: e.target.value } as Partial<T>)}
          onPaste={(e) => {
            const file = extractPastedImageFile(e);
            if (file) {
              e.preventDefault();
              handleImageDropOrPaste(file, 'question');
            }
          }}
          onDrop={(e) => {
            const file = extractDroppedImageFile(e);
            if (file) {
              e.preventDefault();
              handleImageDropOrPaste(file, 'question');
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Savolni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
        />
        {dropUploading === 'question' && (
          <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
          </p>
        )}
        <ImagePreviewList
          images={question.images}
          onRemove={(index) => onChange((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
        />
        {question.text && (
          <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600 mb-1 font-medium">Ko&apos;rinishi:</p>
            <LatexRenderer content={question.text} className="text-sm text-text-primary" />
          </div>
        )}
      </div>

      {/* Options */}
      <div>
        {/* Question type toggle */}
        <div className="mb-4">
          <label className="text-sm font-medium text-text-primary block mb-2">Savol turi</label>
          <div className="inline-flex flex-wrap rounded-xl border border-border overflow-hidden">
            {QUESTION_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => switchQuestionType(opt.key)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  question.type === opt.key ? 'bg-primary-600 text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-1">{TYPE_DESCRIPTIONS[question.type]}</p>
        </div>

        {/* FILL_BLANK: per-blank accepted answers */}
        {question.type === 'FILL_BLANK' ? (
          <FillBlankEditor
            question={question}
            onInsertBlank={insertBlankMarker}
            onBlankAnswersChange={(blankAnswers) => patch({ blankAnswers } as Partial<T>)}
          />
        ) : question.type === 'MATCHING' ? (
          <MatchingEditor
            pairs={question.matchingPairs}
            onChange={(matchingPairs) => patch({ matchingPairs } as Partial<T>)}
          />
        ) : question.type === 'OPEN_ENDED' ? (
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">To&apos;g&apos;ri javob (matn) *</label>
            <input
              type="text"
              value={question.correctAnswer}
              onChange={(e) => patch({ correctAnswer: e.target.value } as Partial<T>)}
              placeholder="Javobni kiriting (masalan: 42, 3.14)"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
            <p className="text-xs text-text-secondary mt-2">
              Javobni talaba yozishi kerak bo&apos;lgan shaklda kiriting. Katta-kichik harf farq qilmaydi, lekin formatga e&apos;tibor bering (masalan: 3.14, emas 3,14).
            </p>
          </div>
        ) : (
          /* MULTIPLE_CHOICE / TRUE_FALSE / MULTI_SELECT: options */
          <div>
            <label className="text-sm font-medium text-text-primary block mb-3">Javob variantlari *</label>
            <div className="space-y-3">
              {question.options.map((opt, optIndex) => {
                const isMulti = question.type === 'MULTI_SELECT';
                const isChecked = isMulti
                  ? (question.correctAnswer || '').split(',').includes(opt.label)
                  : question.correctAnswer === opt.label;
                return (
                  <div key={optIndex} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCorrectAnswer(opt.label)}
                        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold mt-2 transition-all ${isMulti ? 'rounded-md' : 'rounded-full'} ${
                          isChecked ? 'border-green-500 bg-green-500 text-white' : 'border-border text-text-secondary hover:border-primary-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOption(optIndex, { text: e.target.value })}
                            placeholder={`${opt.label} variantini kiriting`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                          />
                          {question.type !== 'TRUE_FALSE' && (
                            <ImageUploadButton
                              endpoint="optionImage"
                              label="Rasm"
                              onUpload={(url) => updateOption(optIndex, { image: url })}
                            />
                          )}
                          {optIndex === 4 && (
                            <button onClick={() => removeOption(optIndex)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {opt.text && opt.text.includes('$') && (
                          <div className="ml-1 px-2 py-1 rounded bg-blue-50 text-xs">
                            <LatexRenderer content={opt.text} className="text-text-primary" />
                          </div>
                        )}
                        {opt.image && (
                          <div className="relative inline-block ml-1">
                            <img
                              src={opt.image}
                              alt={`${opt.label} rasmi`}
                              className="h-12 w-auto object-contain rounded-lg border border-border"
                            />
                            <button
                              type="button"
                              onClick={() => updateOption(optIndex, { image: null })}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]"
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {question.type !== 'TRUE_FALSE' && question.options.length < 5 && (
                <button onClick={addOption} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11">
                  <Plus size={12} /> E variantini qo&apos;shish
                </button>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-2 ml-11">
              {question.type === 'MULTI_SELECT'
                ? "Yashil kvadrat = to'g'ri javob. Bir nechtasini belgilashingiz mumkin."
                : "Yashil doira = to'g'ri javob. Belgilash uchun harf tugmasini bosing."}
            </p>
          </div>
        )}
      </div>

      {/* Topic tag, Bloom level & difficulty */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-border">
        <div className="sm:col-span-3 flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary">Mavzu, daraja va variantlarni AI to&apos;ldirsin</p>
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiSuggestLoading || !question.text || !question.correctAnswer}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiSuggestLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
            AI bilan to&apos;ldirish
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Mavzu tegi (ixtiyoriy)</label>
          <input
            type="text"
            value={question.topic}
            onChange={(e) => patch({ topic: e.target.value } as Partial<T>)}
            placeholder="Masalan: Kvadrat tenglama"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Bloom darajasi (ixtiyoriy)</label>
          <select
            value={question.bloomLevel}
            onChange={(e) => patch({ bloomLevel: e.target.value } as Partial<T>)}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          >
            <option value="">Tanlanmagan</option>
            {BLOOM_LEVELS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Qiyinlik darajasi (ixtiyoriy)</label>
          <select
            value={question.difficulty ?? ''}
            onChange={(e) => patch({ difficulty: e.target.value ? Number(e.target.value) : null } as Partial<T>)}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
          >
            <option value="">Tanlanmagan</option>
            <option value="1">1 — Juda oson</option>
            <option value="2">2 — Oson</option>
            <option value="3">3 — O&apos;rta</option>
            <option value="4">4 — Qiyin</option>
            <option value="5">5 — Juda qiyin</option>
          </select>
        </div>
        <p className="text-xs text-text-secondary sm:col-span-3">
          Bu teglar savol darajasidagi tahlil, shaxsiylashtirilgan tavsiyalar va DTM Online&apos;dagi qiyinlik balanslash uchun ishlatiladi.
        </p>
      </div>

      {/* Explanation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-primary">Yozma yechim (ixtiyoriy)</label>
          <ImageUploadButton
            endpoint="solutionImage"
            label="Yechim rasmi"
            onUpload={(url) => onChange((prev) => ({ ...prev, explanationImages: [...prev.explanationImages, url] }))}
          />
        </div>
        <LatexToolbar
          targetRef={explanationRef}
          value={question.explanation}
          onChange={(explanation) => patch({ explanation } as Partial<T>)}
          className="mb-1.5"
        />
        <textarea
          ref={explanationRef}
          value={question.explanation}
          onChange={(e) => patch({ explanation: e.target.value } as Partial<T>)}
          onPaste={(e) => {
            const file = extractPastedImageFile(e);
            if (file) {
              e.preventDefault();
              handleImageDropOrPaste(file, 'explanation');
            }
          }}
          onDrop={(e) => {
            const file = extractDroppedImageFile(e);
            if (file) {
              e.preventDefault();
              handleImageDropOrPaste(file, 'explanation');
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Yechimni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
        />
        {dropUploading === 'explanation' && (
          <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
          </p>
        )}
        <ImagePreviewList
          images={question.explanationImages}
          onRemove={(index) => onChange((prev) => ({ ...prev, explanationImages: prev.explanationImages.filter((_, i) => i !== index) }))}
        />
      </div>

      {footerSlot}
    </div>
  );
}
