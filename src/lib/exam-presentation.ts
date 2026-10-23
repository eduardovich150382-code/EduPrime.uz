import { shuffleArray } from './shuffle';

export function hasExamAnswer(answer: string | undefined | null): boolean {
  if (!answer?.trim()) return false;
  if (!answer.startsWith('[')) return true;
  try {
    const values: unknown = JSON.parse(answer);
    return Array.isArray(values) && values.some(value =>
      typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0)
    );
  } catch {
    return true;
  }
}

export function canAutoAdvance(type: string, answer: string): boolean {
  return (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') && hasExamAnswer(answer);
}

export function isPhysicsSubject(subject?: { nameUz?: string; nameRu?: string; nameEn?: string } | null): boolean {
  return Boolean(subject && [subject.nameUz, subject.nameRu, subject.nameEn].some(name =>
    name && /fizika|физика|physics/i.test(name)
  ));
}

// Variantlar serverda aralashtirilgan: faqat butun savolni ko'chirish
// baholashdagi variant urug'ini o'zgartirmaydi. Fan bo'limlari saqlanadi.
// `section` faqat bo'limli attestatsiya testida keladi (GET /api/tests/[id]);
// u yo'q bo'lsa kalit aynan `subjectId` — boshqa testlarda guruhlar o'zgarmaydi.
export function shufflePresentedQuestions<T extends { id: string; subjectId?: string | null; section?: string | null }>(questions: T[], seed: number): T[] {
  const groupKey = (question: T) => question.section ? `section:${question.section}` : question.subjectId;
  const groups: T[][] = [];
  for (const question of questions) {
    const last = groups[groups.length - 1];
    if (last && groupKey(last[0]) === groupKey(question)) last.push(question);
    else groups.push([question]);
  }
  return groups.flatMap((group, index) => shuffleArray(group, seed + index));
}

export function restoreQuestionOrder<T extends { id: string }>(questions: T[], ids: unknown): T[] | null {
  if (!Array.isArray(ids) || ids.length !== questions.length || new Set(ids).size !== questions.length) return null;
  const byId = new Map(questions.map(question => [question.id, question]));
  const ordered: T[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') return null;
    const question = byId.get(id);
    if (!question) return null;
    ordered.push(question);
  }
  return ordered;
}

// Natija xaritasidagi raqamlar urinishdagi savollarga mos bo'lsin.
// Noto'liq yoki takrorlangan ro'yxat savollarni yashira olmaydi.
export function orderResultsBySubmission<T extends { questionId: string }>(results: T[], ids: string[]): T[] {
  if (ids.length !== results.length || new Set(ids).size !== results.length) return results;
  const byId = new Map(results.map(result => [result.questionId, result]));
  const ordered: T[] = [];
  for (const id of ids) {
    const result = byId.get(id);
    if (!result) return results;
    ordered.push(result);
  }
  return ordered;
}
