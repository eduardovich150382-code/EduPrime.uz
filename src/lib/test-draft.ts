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
