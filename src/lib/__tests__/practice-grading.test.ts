import { describe, expect, it, vi } from 'vitest';

vi.mock('../gemini', () => ({ checkOpenEndedEquivalence: () => Promise.resolve(false) }));

import { gradePracticeSubset } from '../practice-grading';
import { gradeSubmission, type GradableQuestion } from '../grading';
import { generateSeed, shuffleTest } from '../shuffle';
import { encodeMatchingAnswer, shuffleMatchingIndexOrder } from '../matching';

const LABELS = ['A', 'B', 'C', 'D', 'E'];

function questions(): GradableQuestion[] {
  return Array.from({ length: 9 }, (_, i): GradableQuestion => {
    const id = `q${i}`;
    if (i % 3 === 1) return { id, text: id, points: 1, type: 'MULTI_SELECT', correctAnswer: 'A,C', options: LABELS.map((label) => ({ label, text: `${id}-${label}` })) };
    if (i % 3 === 2) return { id, text: id, points: 1, type: 'MATCHING', correctAnswer: '', options: { left: ['L0', 'L1', 'L2', 'L3'], right: ['R0', 'R1', 'R2', 'R3'] } };
    return { id, text: id, points: 1, type: 'MULTIPLE_CHOICE', correctAnswer: 'B', options: LABELS.slice(0, 4).map((label) => ({ label, text: `${id}-${label}` })) };
  });
}

type Served = { id: string; type: string; options: { label: string; text: string }[] | { left: string[]; right: string[] } };

// Foydalanuvchi GET'da ko'rgan (aralashtirilgan) savolga to'g'ri javob.
function correctAnswerFor(q: Served, baseSeed: number, slot: number): string {
  if (q.type === 'MATCHING') {
    const order = shuffleMatchingIndexOrder(4, baseSeed + slot + 1);
    // Har bir chap qator i uchun o'ng ustundagi asl i ni topadi.
    return encodeMatchingAnswer([0, 1, 2, 3].map((row) => order.indexOf(row)));
  }
  const options = q.options as { label: string; text: string }[];
  const wanted = q.type === 'MULTI_SELECT' ? [`${q.id}-A`, `${q.id}-C`] : [`${q.id}-B`];
  return options.filter((o) => wanted.includes(o.text)).map((o) => o.label).sort().join(',');
}

describe('gradePracticeSubset — qism to\'plam slotlari to\'liq to\'plam bilan mos', () => {
  for (const user of ['user1', 'abc', 'cm9zz']) {
    it(`${user}: qism to'plamga to'g'ri javob — hammasi to'g'ri, to'plamdan tashqarisi qaytmaydi`, async () => {
      const all = questions();
      const baseSeed = generateSeed(user, 'test1');
      const served = shuffleTest(all, user, 'test1') as Served[];
      const subsetIds = ['q1', 'q2', 'q4', 'q8'];
      const answers = served
        .map((q, slot) => ({ q, slot }))
        .filter(({ q }) => subsetIds.includes(q.id))
        .map(({ q, slot }) => ({ questionId: q.id, answer: correctAnswerFor(q, baseSeed, slot), timeSpent: 1 }));

      const practice = await gradePracticeSubset({ questions: all, answers, baseSeed, preserveOrder: false, questionIds: subsetIds });
      expect(practice.total).toBe(4);
      expect(practice.correct).toBe(4);
      expect(practice.answerResults.map((r) => r.questionId)).toEqual(subsetIds);

      // To'liq gradeSubmission bilan bir xil natija — slot siljimagan.
      const full = await gradeSubmission({ questions: all, answers, baseSeed, preserveOrder: false });
      expect(practice.answerResults).toEqual(full.answerResults.filter((r) => subsetIds.includes(r.questionId)));
    });
  }

  it("qism to'plamni gradeSubmission'ga to'g'ridan-to'g'ri berish noto'g'ri baholardi (nega to'liq ro'yxat kerak)", async () => {
    const all = questions();
    const subsetIds = ['q1', 'q2', 'q4', 'q8'];
    let naiveWrong = 0;
    for (const user of ['user1', 'abc', 'cm9zz']) {
      const baseSeed = generateSeed(user, 'test1');
      const served = shuffleTest(all, user, 'test1') as Served[];
      const answers = served
        .map((q, slot) => ({ q, slot }))
        .filter(({ q }) => subsetIds.includes(q.id))
        .map(({ q, slot }) => ({ questionId: q.id, answer: correctAnswerFor(q, baseSeed, slot), timeSpent: 1 }));
      const naive = await gradeSubmission({ questions: all.filter((q) => subsetIds.includes(q.id)), answers, baseSeed, preserveOrder: false });
      naiveWrong += naive.answerResults.filter((r) => !r.isCorrect).length;
    }
    expect(naiveWrong).toBeGreaterThan(0);
  });

  it("to'plamdan tashqaridagi javob baholanmaydi va natijaga tushmaydi", async () => {
    const all = questions();
    const baseSeed = generateSeed('user1', 'test1');
    const practice = await gradePracticeSubset({
      questions: all, baseSeed, preserveOrder: false, questionIds: ['q0'],
      answers: [{ questionId: 'q3', answer: 'B', timeSpent: 1 }, { questionId: 'q0', answer: '', timeSpent: 1 }],
    });
    expect(practice).toMatchObject({ total: 1, correct: 0 });
    expect(practice.answerResults).toHaveLength(1);
    expect(practice.answerResults[0]).toMatchObject({ questionId: 'q0', answer: '', isCorrect: false });
  });

  it('noto\'g\'ri javob noto\'g\'ri baholanadi', async () => {
    const all = questions();
    const baseSeed = generateSeed('user1', 'test1');
    const served = shuffleTest(all, 'user1', 'test1') as Served[];
    const q0 = served.find((q) => q.id === 'q0')!;
    const wrong = (q0.options as { label: string; text: string }[]).find((o) => o.text === 'q0-C')!.label;
    const practice = await gradePracticeSubset({
      questions: all, baseSeed, preserveOrder: false, questionIds: ['q0'], answers: [{ questionId: 'q0', answer: wrong, timeSpent: 1 }],
    });
    expect(practice.correct).toBe(0);
    expect(practice.answerResults[0].answer).toBe('C');
  });
});
