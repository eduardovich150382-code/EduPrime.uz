import type { AIImportResult } from '@/types';
import type { AIImportedQuestion } from '@/types';
import {
  parsePastedQuestions,
  type PastedProblem,
  type PastedWarning,
} from './pasted-json';

/**
 * `AiImportPanel` ning textarea yo'li — YUBORISH mantig'i.
 *
 * Nega alohida modul: JSON rejimining butun ma'nosi serverga chiqmaslikda.
 * Bu qoida panel ichida qolsa, uni faqat qo'lda (DevTools Network) tekshirish
 * mumkin bo'lardi — `.tsx` testlari bu loyihada yo'q (`vitest.config.mts`
 * faqat `.ts` ni oladi). `fetchFn` ineksiya qilingani uchun "JSON rejimi
 * tarmoqqa chiqmaydi" degan da'vo testda tasdiqlanadi.
 *
 * Rasm va fayl yo'llari bu yerda EMAS: ular textarea'ga bog'liq emas va
 * ikki bosqichli yuklashga ega, panelda qoladi.
 */

export type ImportSubmission =
  | { mode: 'json'; text: string }
  | { mode: 'text'; text: string };

export interface SubmitDeps {
  fetchFn: typeof fetch;
}

export interface SubmitResult {
  questions: AIImportedQuestion[];
  /** JSON yo'li — ustozga ko'rsatiladigan muammolar. */
  problems: PastedProblem[];
  warnings: PastedWarning[];
  /** AI yo'li — panel `getAiImportStatus` uchun ishlatadi. JSON yo'lida `null`. */
  aiResult: AIImportResult | null;
  /** Tarmoq yoki marshrut xatosi. Muvaffaqiyatda `null`. */
  error: string | null;
}

export async function submitImport(
  input: ImportSubmission,
  deps: SubmitDeps,
): Promise<SubmitResult> {
  if (input.mode === 'json') {
    // Server chaqirilmaydi: Gemini yo'q, kvota yo'q, 60 s chegara yo'q.
    const parsed = parsePastedQuestions(input.text);
    return {
      questions: parsed.questions,
      problems: parsed.problems,
      warnings: parsed.warnings,
      aiResult: null,
      error: null,
    };
  }

  try {
    const res = await deps.fetchFn('/api/ai/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', content: input.text }),
    });
    const data = await res.json();
    // Marshrut xato bilan javob bergan bo'lsa (401/403/429/500), buni "0 ta
    // savol topildi" deb sokin ko'rsatish o'rniga aniq xato sifatida
    // qaytaramiz — aks holda haqiqiy sabab foydalanuvchidan yashiringan bo'lardi.
    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : null;
      return { questions: [], problems: [], warnings: [], aiResult: null, error: message ?? '' };
    }
    const aiResult = data as AIImportResult;
    return {
      questions: Array.isArray(aiResult.questions) ? aiResult.questions : [],
      problems: [],
      warnings: [],
      aiResult,
      error: null,
    };
  } catch {
    return { questions: [], problems: [], warnings: [], aiResult: null, error: '' };
  }
}
