'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, Image, Paperclip, ShieldCheck, ShieldAlert, Braces, ClipboardCopy } from 'lucide-react';
import type { AIImportedQuestion, AIImportResult } from '@/types';
import { getAiImportStatus } from '@/lib/import/ai-import-status';
import { CHAT_JSON_SCHEMA } from '@/lib/import/chat-schema';
import { MAX_PASTED_QUESTIONS, type PastedParseResult } from '@/lib/import/pasted-json';
import { MAX_OPTIONS, MIN_OPTIONS } from '@/lib/import/option-labels';
import { submitImport } from '@/lib/import/submit-import';

/** Shundan past ishonchlilikdagi savollar "tekshiring" deb ajratiladi — teacher e'tibori shu tomonga yo'naltirilsin. */
export const LOW_CONFIDENCE_THRESHOLD = 0.85;

interface AiImportPanelProps {
  /** AI muvaffaqiyatli savol qaytarganda chaqiriladi — natijani qayerga qo'yishni (Test qoralamasi yoki Savollar bazasi qoralamasi) chaqiruvchi hal qiladi. */
  onImported: (questions: AIImportedQuestion[]) => void;
  title?: string;
  subtitle?: string;
}

/**
 * "N tasi ishonchli / N tasini tekshiring" satri.
 *
 * AI va JSON bloklari IKKALASI ham shuni ishlatadi. JSON yo'lida
 * `confidence` AI ishonchi emas, import ogohlantirishi (`pasted-json.ts`) —
 * lekin ustoz uchun ma'nosi bir xil: "bu savolga qarab chiqing".
 */
function ConfidenceSummary({ questions }: { questions: AIImportedQuestion[] }) {
  if (questions.length === 0) return null;
  const confident = questions.filter((q) => q.confidence >= LOW_CONFIDENCE_THRESHOLD).length;
  const needsReview = questions.length - confident;
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <span className="text-xs text-green-700 flex items-center gap-1.5">
        <ShieldCheck size={13} /> {confident} tasi ishonchli
      </span>
      {needsReview > 0 && (
        <span className="text-xs text-amber-700 flex items-center gap-1.5">
          <ShieldAlert size={13} /> {needsReview} tasini albatta tekshiring
        </span>
      )}
    </div>
  );
}

/**
 * Matn/rasm/fayl (PDF, DOCX, TXT) orqali AI (Gemini) yordamida savol import
 * qilish paneli — test yaratish va Savollar bazasi sahifalari o'rtasida
 * qayta ishlatiladi. `/api/ai/import` bitta umumiy endpointdan foydalanadi
 * (mavzu/qiyinlik, shuningdek ekranda ko'rinmaydigan Bloom darajasini ham
 * avtomatik qaytaradi).
 */
export default function AiImportPanel({
  onImported,
  title = 'AI bilan import qilish',
  subtitle = 'Test matnini kiriting — AI savollarni avtomatik ajratib beradi',
}: AiImportPanelProps) {
  const t = useTranslations('teacherImport');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFileLoading, setAiFileLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIImportResult | null>(null);
  const [mode, setMode] = useState<'ai' | 'json'>('ai');
  const [jsonText, setJsonText] = useState('');
  const [jsonResult, setJsonResult] = useState<PastedParseResult | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const aiImageInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);

  const runAiImport = async (payload: Record<string, unknown>) => {
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      // Route xato bilan javob bergan bo'lsa (masalan 401/403/429/500), buni
      // "0 ta savol topildi" deb sokin ko'rsatish o'rniga aniq xato sifatida
      // chiqaramiz — aks holda haqiqiy sabab (masalan avtorizatsiya yoki
      // limit) foydalanuvchidan yashiringan bo'lardi.
      if (!res.ok) {
        alert((data as any)?.error || 'AI import xatolik. Qayta urinib ko\'ring.');
        return;
      }
      setAiResult(data as AIImportResult);
      if (data.questions?.length > 0) onImported(data.questions);
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
  };

  const handleAiImport = async () => {
    if (!aiText.trim()) {
      alert('Matn kiriting!');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    // Yuborish qarori `submit-import.ts` da — u yerda test "JSON rejimi
    // tarmoqqa chiqmaydi" qoidasini tasdiqlay oladi.
    const result = await submitImport({ mode: 'text', text: aiText }, { fetchFn: fetch });
    if (result.error !== null) {
      alert(result.error || "AI import xatolik. Qayta urinib ko'ring.");
    } else {
      setAiResult(result.aiResult);
      if (result.questions.length > 0) onImported(result.questions);
    }
    setAiLoading(false);
  };

  const handleJsonImport = async () => {
    setCopyNote(null);
    // Server chaqirilmaydi — natija darhol keladi.
    const result = await submitImport({ mode: 'json', text: jsonText }, { fetchFn: fetch });
    setJsonResult(result as PastedParseResult & typeof result);
    if (result.questions.length > 0) onImported(result.questions);
  };

  const copyInstruction = async () => {
    try {
      await navigator.clipboard.writeText(`${t('jsonInstructionBody')}

${CHAT_JSON_SCHEMA}`);
      setCopyNote(t('jsonCopied'));
    } catch {
      setCopyNote(t('jsonCopyFailed'));
    }
  };

  /** Rejim almashganda ikkinchisining natijasi osilib qolmasin. */
  const switchMode = (next: 'ai' | 'json') => {
    setMode(next);
    setAiResult(null);
    setJsonResult(null);
    setCopyNote(null);
  };

  /**
   * Muammo kodini ustozga tushunarli jumlaga o'giradi.
   *
   * `{max}` ikki xil ma'noda: savollar soni chegarasi va variantlar soni
   * chegarasi. Shuning uchun parametrlar kodga qarab beriladi.
   */
  const problemText = (code: string) =>
    code === 'OPTION_COUNT_INVALID'
      ? t(`jsonProblem.${code}`, { min: MIN_OPTIONS, max: MAX_OPTIONS })
      : t(`jsonProblem.${code}`, { max: MAX_PASTED_QUESTIONS });
  const warningText = (code: string) => t(`jsonWarning.${code}`);

  const handleAiImageImport = async (file: File) => {
    setAiLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
        reader.readAsDataURL(file);
      });
      await runAiImport({ type: 'image', content: base64, mimeType: file.type });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Rasmni yuklashda xatolik');
    }
    setAiLoading(false);
  };

  const handleAiFileImport = async (file: File) => {
    setAiFileLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload?endpoint=aiImportFile', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        alert(uploadData.error || 'Faylni yuklashda xatolik');
        setAiFileLoading(false);
        return;
      }
      setAiLoading(true);
      await runAiImport({ type: 'file', fileUrl: uploadData.url, fileName: file.name });
    } catch {
      alert('Faylni yuklashda xatolik');
    }
    setAiFileLoading(false);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Bot size={32} className="text-primary-600 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary">{subtitle}</p>
      </div>


      {/* Rejim: AI (matn/rasm/fayl) yoki chatdan olingan tayyor JSON. Natija
          IKKALASIDA ham bitta `onImported` dan o'tadi — chaqiruvchi sahifa
          savol qaysi rejimdan kelganini bilmasligi kerak. */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
        <button
          type="button"
          onClick={() => switchMode('ai')}
          className={`flex-1 min-h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            mode === 'ai' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary'
          }`}
        >
          <Bot size={15} /> {t('jsonModeAi')}
        </button>
        <button
          type="button"
          onClick={() => switchMode('json')}
          className={`flex-1 min-h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            mode === 'json' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary'
          }`}
        >
          <Braces size={15} /> {t('jsonModeJson')}
        </button>
      </div>

      {mode === 'ai' && (
        <div className="space-y-6">
        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder={`Test matnini shu yerga kiriting yoki paste qiling...\n\nMasalan:\n1. 2+2=?\nA) 3\nB) 4\nC) 5\nD) 6\nJavob: B\n\n2. Uchburchak ichki burchaklari yig'indisi?\nA) 90°\nB) 180°\nC) 270°\nD) 360°\nJavob: B`}
          rows={12}
          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            💡 AI (Gemini Flash) bepul. Formulalarni LaTeX ga o&apos;giradi.
          </p>
          <button
            onClick={handleAiImport}
            disabled={aiLoading || !aiText.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            {aiLoading ? 'Tahlil qilinmoqda...' : 'AI bilan import'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-secondary flex-shrink-0">yoki rasm/fayl yuklang</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            ref={aiImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAiImageImport(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => aiImageInputRef.current?.click()}
            disabled={aiLoading || aiFileLoading}
            className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
            Rasmdan import (skan/skrinshot)
          </button>

          <input
            ref={aiFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAiFileImport(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => aiFileInputRef.current?.click()}
            disabled={aiLoading || aiFileLoading}
            className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm disabled:opacity-50"
          >
            {aiFileLoading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            Fayldan import (PDF, DOCX, TXT)
          </button>
        </div>

        {/* Yashil blok FAQAT savol kelganda: avval kvota xatosi ham "0 ta savol
            import qilindi" deb muvaffaqiyat sifatida ko'rsatilardi. */}
        {aiResult && getAiImportStatus(aiResult) === 'quota' && (
          <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium break-words">⚠️ {t('aiQuotaExhausted')}</p>
          </div>
        )}

        {aiResult && getAiImportStatus(aiResult) === 'failed' && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium break-words">
              ⚠️ {aiResult.warnings?.length > 0 ? aiResult.warnings.join(', ') : t('aiNoQuestions')}
            </p>
          </div>
        )}

        {aiResult && getAiImportStatus(aiResult) === 'success' && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 font-medium">
              ✅ {aiResult.totalFound || aiResult.questions?.length || 0} ta savol topildi va import qilindi!
            </p>
            <ConfidenceSummary questions={aiResult.questions ?? []} />
            {aiResult.warnings?.length > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                ⚠️ {aiResult.warnings.join(', ')}
              </p>
            )}
            <p className="text-xs text-green-600 mt-2">
              &quot;Savollar&quot; tabiga o&apos;tib tekshiring va tasdiqlang — yon panelda kam ishonchli savollar
              <ShieldAlert size={11} className="inline-block mx-1 -mt-0.5" />
              belgisi bilan ajratilgan.
            </p>
          </div>
        )}
        </div>
      )}

      {mode === 'json' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary break-words">{t('jsonPasteHint')}</p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyInstruction}
              className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm"
            >
              <ClipboardCopy size={15} /> {t('jsonCopyInstruction')}
            </button>
            {copyNote && <span className="text-xs text-text-secondary">{copyNote}</span>}
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={t('jsonPastePlaceholder')}
            rows={12}
            className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
          />

          <div className="flex justify-end">
            <button
              onClick={handleJsonImport}
              disabled={!jsonText.trim()}
              className="btn-primary flex items-center gap-2 min-h-11 disabled:opacity-50"
            >
              <Braces size={16} /> {t('jsonApply')}
            </button>
          </div>

          {/* Muammolar — hech bir savol qo'shilmagan. `getAiImportStatus` bu
              yerda ishlatilmaydi: uning kirishi `AIImportResult`, bu yerda
              esa har savolga tegishli muammolar ro'yxati. */}
          {jsonResult && jsonResult.problems.length > 0 && (
            <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
              <p className="text-sm text-red-700 font-medium break-words">{t('jsonNoneImported')}</p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {jsonResult.problems.map((problem, i) => (
                  <li key={`${problem.order}-${problem.code}-${i}`} className="break-words">
                    {problem.order === -1
                      ? problemText(problem.code)
                      : t('jsonProblemLine', { order: problem.order, message: problemText(problem.code) })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {jsonResult && jsonResult.questions.length > 0 && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              {/* "o'qildi", "import qilindi" emas: qoralamaga nima tushgani —
                  qo'shish/almashtirish dialogining ishi. */}
              <p className="text-sm text-green-700 font-medium">
                ✅ {t('jsonFound', { count: jsonResult.questions.length })}
              </p>
              <ConfidenceSummary questions={jsonResult.questions} />
            </div>
          )}

          {jsonResult && jsonResult.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <p className="text-sm text-amber-800 font-medium">{t('jsonWarningsTitle')}</p>
              <ul className="text-sm text-amber-800 space-y-0.5">
                {jsonResult.warnings.map((warning, i) => (
                  <li key={`${warning.order}-${warning.code}-${i}`} className="break-words">
                    {t('jsonProblemLine', { order: warning.order, message: warningText(warning.code) })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
