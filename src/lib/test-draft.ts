import { restoreQuestionOrder } from './exam-presentation';

function numberRecord(value: unknown, count: number): Record<number, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < count && typeof entry === 'number' && Number.isFinite(entry) && entry >= 0));
}

export function restoreTestDraft<T extends { id: string }>(questions: T[], raw: string | null) {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const draft = data as Record<string, unknown>;
    // Eski qoralamada indekslar API tartibida yozilgan; yangi tartibga
    // ko'chirsak foydalanuvchining javobi boshqa savolga yopishib qoladi.
    const ordered = draft.questionIds === undefined ? questions : restoreQuestionOrder(questions, draft.questionIds);
    if (!ordered) return null;
    const answers = draft.answers && typeof draft.answers === 'object'
      ? Object.fromEntries(Object.entries(draft.answers).filter(([key, value]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < questions.length && typeof value === 'string')) as Record<number, string> : {};
    const current = typeof draft.currentQuestion === 'number' && Number.isInteger(draft.currentQuestion) && draft.currentQuestion >= 0 && draft.currentQuestion < questions.length ? draft.currentQuestion : 0;
    const flagged = Array.isArray(draft.flagged) ? draft.flagged.filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < questions.length) : [];
    return { questions: ordered, answers, current, flagged, questionTimeSpent: numberRecord(draft.questionTimeSpent, questions.length), autoNext: draft.autoNext !== false };
  } catch { return null; }
}

// localStorage kalitlari — yechish sahifasi (qoralama) va usePracticeClock
// (taymer) shu nomlar bilan yozadi; /tests "Davom etish" bloki o'qiydi.
export const DRAFT_KEY_PREFIX = 'test_progress_';
export const CLOCK_KEY_PREFIX = 'test_clock_';

// 14 kundan eski qoralamani foydalanuvchi tashlab ketgan — uni "Davom
// etish" ga qaytarish foyda emas, bezovta qiladi.
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface DraftTitle { uz: string; ru?: string; en?: string }

export interface DraftSummary {
  testId: string;
  answered: number;
  total: number;
  timestamp: number;
  // Eski qoralamalarda nom yo'q — sahifa yuklangan testlar ro'yxatidan oladi.
  title?: DraftTitle;
  expired: boolean;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

// Blokka faqat son va nom kerak — savollar restoreTestDraft orqali faqat
// yechish sahifasida tiklanadi. questionIds bo'lmagan eski qoralamada jami
// savol soni noma'lum: "29 / ?" ko'rsatgandan ko'ra ko'rsatmaymiz.
export function readDraftSummary(testId: string, raw: string | null): Omit<DraftSummary, 'expired'> | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const draft = data as Record<string, unknown>;
    if (!Array.isArray(draft.questionIds) || draft.questionIds.length === 0) return null;
    if (typeof draft.timestamp !== 'number' || !Number.isFinite(draft.timestamp)) return null;
    const total = draft.questionIds.length;
    const answered = draft.answers && typeof draft.answers === 'object'
      ? Object.entries(draft.answers).filter(([key, value]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < total && typeof value === 'string' && value !== '').length
      : 0;
    const uz = optionalString(draft.titleUz);
    const title = uz ? { uz, ru: optionalString(draft.titleRu), en: optionalString(draft.titleEn) } : undefined;
    return { testId, answered, total, timestamp: draft.timestamp, title };
  } catch { return null; }
}

// Vaqti tugagan (to'xtatilmagan va deadline o'tgan) taymerli qoralamani
// yechish sahifasi ochishi bilan TestTimer onTimeUp orqali avtomatik
// topshiradi. "Davom etish" bosgan foydalanuvchi buni kutmaydi — bunday
// qoralama blokda ko'rsatilmaydi. Taymer yozuvi bo'lmasa soat to'liq
// vaqtdan boshlanadi, demak muddati o'tmagan.
export function isClockExpired(raw: string | null, now: number = Date.now()): boolean {
  if (!raw) return false;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;
    const clock = data as Record<string, unknown>;
    if (clock.paused === true) return typeof clock.remaining === 'number' && clock.remaining <= 0;
    return typeof clock.deadline === 'number' && Number.isFinite(clock.deadline) && clock.deadline <= now;
  } catch { return false; }
}

// Natija qoralamadan keyin yozilgan bo'lsa test boshqa qurilma yoki tabda
// topshirilgan — qoralama shunchaki tozalanmay qolgan.
export function pickContinueDrafts(
  drafts: DraftSummary[],
  latestResults: Map<string, { completedAt: string }>,
  now: number = Date.now(),
  limit = 3,
): DraftSummary[] {
  return drafts
    .filter((draft) => {
      if (draft.expired || draft.answered === 0) return false;
      if (now - draft.timestamp > DRAFT_MAX_AGE_MS) return false;
      const result = latestResults.get(draft.testId);
      return !result || new Date(result.completedAt).getTime() < draft.timestamp;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
