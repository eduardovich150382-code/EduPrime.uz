import { describe, expect, it } from 'vitest';
import { filterPracticeQuestions, getOriginalNumbers, getPracticeLink, getRetakeQuestionIds } from '../retake-wrong';
import { hasExamAnswer, restoreQuestionOrder } from '../exam-presentation';

const IDS = ['q1', 'q2', 'q3', 'q4'];
const answer = (questionId: string, isCorrect: boolean, value = 'A') => ({ questionId, answer: value, isCorrect, correctAnswer: 'A', timeSpent: 0 });

// ResultQuestionMap.status() bilan bir xil: to'g'ri / xato / javobsiz.
function mapCounts(answers: { questionId: string; answer: string; isCorrect: boolean }[], ids: string[]) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let incorrect = 0, unanswered = 0;
  for (const id of ids) {
    const a = byId.get(id);
    if (a?.isCorrect) continue;
    if (hasExamAnswer(a?.answer)) incorrect++; else unanswered++;
  }
  return incorrect + unanswered;
}

describe('getRetakeQuestionIds', () => {
  it("hammasi to'g'ri → bo'sh (N=0)", () => {
    expect(getRetakeQuestionIds(IDS.map((id) => answer(id, true)), IDS)).toEqual([]);
  });

  it('hammasi xato → hammasi, test tartibida', () => {
    expect(getRetakeQuestionIds([...IDS].reverse().map((id) => answer(id, false)), IDS)).toEqual(IDS);
  });

  it('aralash: xato va javobsiz kiradi, to\'g\'ri kirmaydi', () => {
    const answers = [answer('q1', true), answer('q2', false), answer('q3', false, ''), answer('q4', true)];
    expect(getRetakeQuestionIds(answers, IDS)).toEqual(['q2', 'q3']);
  });

  it("answers'da yo'q savol (natijadan keyin qo'shilgan) — javobsiz sifatida kiradi", () => {
    expect(getRetakeQuestionIds([answer('q1', true), answer('q2', true), answer('q3', true)], IDS)).toEqual(['q4']);
  });

  it("natijadan keyin o'chirilgan savol tushib qoladi", () => {
    const answers = [answer('q1', false), answer('gone', false), answer('q2', true)];
    expect(getRetakeQuestionIds(answers, ['q1', 'q2'])).toEqual(['q1']);
  });

  it.each([
    ['null', null],
    ['obyekt', { q1: true }],
    ['string', '[{"questionId":"q1","isCorrect":true}]'],
    ['buzuq elementlar', [null, 5, 'q1', { questionId: 'q1' }, { questionId: 'q2', isCorrect: 'true' }, { questionId: 3, isCorrect: true }]],
  ])('buzilgan answers (%s) — yiqilmaydi, hammasi javobsiz', (_name, answers) => {
    expect(getRetakeQuestionIds(answers, IDS)).toEqual(IDS);
  });

  it("N har doim xaritadagi Xato + Javob berilmagan yig'indisiga teng", () => {
    const cases = [
      IDS.map((id) => answer(id, true)),
      IDS.map((id) => answer(id, false)),
      [answer('q1', true), answer('q2', false, ''), answer('q3', false, '[]'), answer('q4', false, '["", 1]')],
      [answer('q2', false), answer('extra', false)],
      [answer('q1', true, '')],
    ];
    for (const answers of cases) {
      expect(getRetakeQuestionIds(answers, IDS)).toHaveLength(mapCounts(answers, IDS));
    }
  });
});

describe('filterPracticeQuestions', () => {
  it("taqdimot tartibini saqlaydi, to'plamdan tashqarisini tashlaydi", () => {
    const presented = ['q3', 'q1', 'q4', 'q2'].map((id) => ({ id }));
    expect(filterPracticeQuestions(presented, ['q2', 'q3', 'zz']).map((q) => q.id)).toEqual(['q3', 'q2']);
  });
});

describe('getOriginalNumbers', () => {
  // Natija sahifasi: restoreQuestionOrder(test.questions, answers ids) ?? test.questions → indeks + 1.
  const pageNumbers = (answers: { questionId: string }[], ids: string[]) => {
    const questions = ids.map((id) => ({ id }));
    const ordered = restoreQuestionOrder(questions, answers.map((a) => a.questionId)) ?? questions;
    return new Map(ordered.map((q, i) => [q.id, i + 1]));
  };

  it('urinishdagi tartibni tiklaydi — natija sahifasi raqamlari bilan bir xil', () => {
    const answers = ['q3', 'q1', 'q4', 'q2'].map((id) => answer(id, false));
    expect(getOriginalNumbers(answers, IDS)).toEqual(pageNumbers(answers, IDS));
    expect(getOriginalNumbers(answers, IDS).get('q3')).toBe(1);
  });

  it("tiklab bo'lmasa (savol qo'shilgan/o'chirilgan) — bazadagi tartib, sahifa bilan bir xil", () => {
    const answers = ['q3', 'q1', 'gone'].map((id) => answer(id, false));
    expect(getOriginalNumbers(answers, IDS)).toEqual(pageNumbers(answers, IDS));
    expect(getOriginalNumbers(answers, IDS).get('q1')).toBe(1);
  });

  it('buzilgan answers — bazadagi tartib', () => {
    expect([...getOriginalNumbers('x', IDS).values()]).toEqual([1, 2, 3, 4]);
  });
});

describe('getPracticeLink — natija sahifasidagi tugma', () => {
  const base = {
    resultId: 'r1', testId: 't1', resultUserId: 'u1', viewerId: 'u1',
    answers: [answer('q1', true), answer('q2', false)], testQuestionIds: ['q1', 'q2', 'q3'], returnTo: null,
  };

  it("o'z natijasi, N>0 — havola faqat resultId bilan, N xaritadagidek", () => {
    expect(getPracticeLink(base)).toEqual({ href: '/tests/t1/solve?practice=r1', count: 2 });
  });

  it("returnTo (dars) saqlanadi", () => {
    expect(getPracticeLink({ ...base, returnTo: '/courses/c1/learn?lesson=l1' })!.href)
      .toBe(`/tests/t1/solve?practice=r1&returnTo=${encodeURIComponent('/courses/c1/learn?lesson=l1')}`);
  });

  it.each([
    ['N=0', { answers: ['q1', 'q2', 'q3'].map((id) => answer(id, true)) }],
    ['sessiya natijasi (testId yo\'q)', { testId: null }],
    ['begona natija (masalan admin ko\'rmoqda)', { viewerId: 'admin' }],
    ['sessiya hali yuklanmagan', { viewerId: undefined }],
  ])('%s → tugma yo\'q', (_name, overrides) => {
    expect(getPracticeLink({ ...base, ...overrides })).toBeNull();
  });
});
