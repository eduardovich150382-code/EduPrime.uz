import { describe, expect, it } from 'vitest';
import type { AIImportedQuestion } from '@/types';
import { mapQuestionForApi } from '@/lib/question/map-for-api';
import { toImportedTestQuestion } from '../imported-question';
import { mergeImported } from '../merge-imported';
import { parsePastedQuestions } from '../pasted-json';
import { parseQuestionPoints } from '../question-points';
import { uploadInlineImages } from '../upload-inline-images';

const question: AIImportedQuestion = {
  text: '2+2=?',
  options: [
    { label: 'A', text: '4', image: null },
    { label: 'B', text: '5', image: null },
  ],
  correctAnswer: 'A',
  confidence: 1,
};

describe('JSON importidagi ball', () => {
  it.each([
    { ...question, points: 2 },
    { text: '2+2=?', options: ['4', '5'], answer: 'A', points: 2 },
  ])('ikkala JSON shaklida 2 ball saqlanadi', (raw) => {
    const parsed = parsePastedQuestions(JSON.stringify({ questions: [raw] }));
    expect(parsed.problems).toEqual([]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.questions[0].points).toBe(2);
    expect(toImportedTestQuestion(parsed.questions[0]).points).toBe(2);
  });

  it('50 savol import, media va API mappingdan keyin ham 100 ball bo‘ladi', async () => {
    const image = 'data:image/png;base64,YWJj';
    const raw = Array.from({ length: 50 }, (_, i) => ({
      ...question, text: `${i + 1}-savol`, points: 2,
      images: [image], explanationImages: [image], tags: ['section:fizika'],
      topic: 'nyuton-qonunlari',
    }));
    const parsed = parsePastedQuestions(JSON.stringify({ questions: raw }));
    const uploaded = await uploadInlineImages(parsed.questions,
      async () => 'https://example.test/physics.png');
    const drafts = uploaded.map((q) => toImportedTestQuestion(q));
    const payload = drafts.map(mapQuestionForApi);

    expect(payload).toHaveLength(50);
    expect(payload.every((q) => q.points === 2)).toBe(true);
    expect(payload.reduce((total, q) => total + q.points, 0)).toBe(100);
    expect(payload[0]).toMatchObject({
      images: ['https://example.test/physics.png'],
      explanationImages: ['https://example.test/physics.png'],
      tags: ['section:fizika'], topic: 'nyuton-qonunlari', correctAnswer: 'A',
    });
  });

  it('ball berilmagan mock savoli 2, oddiy test savoli 1 ball oladi', () => {
    const parsed = parsePastedQuestions(JSON.stringify([question])).questions[0];
    expect(parsed.points).toBeUndefined();
    expect(toImportedTestQuestion(parsed, 2).points).toBe(2);
    expect(toImportedTestQuestion(parsed).points).toBe(1);
  });

  it('mock standarti JSONda aniq berilgan ballni almashtirmaydi', () => {
    expect(toImportedTestQuestion({ ...question, points: 5 }, 2).points).toBe(5);
    expect(toImportedTestQuestion({ ...question, points: 1 }, 2).points).toBe(1);
  });

  it('oxiriga import qilish mavjud savollarning ID va balliga tegmaydi', () => {
    type Draft = ReturnType<typeof toImportedTestQuestion> & { id?: string };
    const existing: Draft[] = [{ ...toImportedTestQuestion(question), id: 'saved', points: 7 }];
    const incoming = [toImportedTestQuestion({ ...question, points: 2 })];
    const merged = mergeImported(existing, incoming, 'append');
    expect(merged[0]).toBe(existing[0]);
    expect(merged[0]).toMatchObject({ id: 'saved', points: 7 });
    expect(merged[1].points).toBe(2);
  });
});

describe('ball chegaralari', () => {
  it.each([1, 2, 100])('%s ball qabul qilinadi', (points) => {
    expect(parseQuestionPoints(points)).toBe(points);
  });

  it.each([undefined, null, '2', 0, -1, 2.5, 101, NaN, Infinity])(
    '%s muharrir chegarasiga mos kelmasa standart qiymat ishlatiladi', (points) => {
      expect(parseQuestionPoints(points)).toBeUndefined();
      const parsed = parsePastedQuestions(JSON.stringify([{ ...question, points }]));
      expect(parsed.questions[0].points).toBeUndefined();
      expect(toImportedTestQuestion(parsed.questions[0], 2).points).toBe(2);
    },
  );
});
