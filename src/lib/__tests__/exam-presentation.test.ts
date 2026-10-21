import { describe, expect, it } from 'vitest';
import { canAutoAdvance, hasExamAnswer, isPhysicsSubject, orderResultsBySubmission, restoreQuestionOrder, shufflePresentedQuestions } from '../exam-presentation';
import { restoreTestDraft } from '../test-draft';
import { calculatorStep, initialCalculator } from '../exam-calculator';

describe('imtihon taqdimoti', () => {
  it('yangi urinishda tartib yangilanadi, bo‘limlar va variant obyektlari saqlanadi', () => {
    const questions = Array.from({ length: 30 }, (_, index) => ({ id: `q${index}`, subjectId: index < 15 ? 'physics' : 'math', options: [{ label: 'A', text: String(index) }] }));
    const first = shufflePresentedQuestions(questions, 42), second = shufflePresentedQuestions(questions, 73);
    expect(first.map(q => q.id)).not.toEqual(second.map(q => q.id));
    expect(first.slice(0, 15).every(q => q.subjectId === 'physics')).toBe(true);
    expect(first.slice(15).every(q => q.subjectId === 'math')).toBe(true);
    for (const q of first) expect(q.options).toBe(questions.find(original => original.id === q.id)?.options);
    expect(new Set(first.map(q => q.id)).size).toBe(30);
  });

  it('yangilashda savol va unga berilgan javob birga tiklanadi', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
    const draft = restoreTestDraft(questions, JSON.stringify({ questionIds: ['q3', 'q1', 'q2'], answers: { 0: 'B' }, currentQuestion: 2, flagged: [0], questionTimeSpent: { 0: 12 }, autoNext: false }));
    expect(draft?.questions[0].id).toBe('q3'); expect(draft?.answers[0]).toBe('B');
    expect(draft?.current).toBe(2); expect(draft?.questionTimeSpent[0]).toBe(12); expect(draft?.autoNext).toBe(false);
    expect(restoreTestDraft(questions, JSON.stringify({ questionIds: ['q1', 'q1', 'q3'], answers: { 0: 'B' } }))).toBeNull();
    expect(restoreTestDraft(questions, '{')).toBeNull();
  });

  it('eski qoralamani API tartibida tiklaydi, begona indekslarni olmaydi', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    const draft = restoreTestDraft(questions, JSON.stringify({ answers: { 0: 'A', 4: 'B', '-1': 'C' }, flagged: [1, 7], currentQuestion: 99 }));
    expect(draft?.questions).toBe(questions); expect(draft?.answers).toEqual({ 0: 'A' });
    expect(draft?.flagged).toEqual([1]); expect(draft?.current).toBe(0);
  });

  it('natija xaritasi to‘liq urinish tartibini qabul qiladi, buzilgan tartibda savol yo‘qolmaydi', () => {
    const answers = [{ questionId: 'q1', isCorrect: true }, { questionId: 'q2', isCorrect: false }];
    expect(orderResultsBySubmission(answers, ['q2', 'q1'])).toEqual([answers[1], answers[0]]);
    for (const ids of [['q1'], ['q1', 'q1'], ['q1', 'missing']]) expect(orderResultsBySubmission(answers, ids)).toBe(answers);
    expect(restoreQuestionOrder([{ id: 'q1' }], ['unknown'])).toBeNull();
  });

  it('avtomatik o‘tish ko‘p javobli va matnli savollarni uzib qo‘ymaydi', () => {
    expect(canAutoAdvance('MULTIPLE_CHOICE', 'B')).toBe(true); expect(canAutoAdvance('TRUE_FALSE', 'A')).toBe(true);
    for (const type of ['MULTI_SELECT', 'OPEN_ENDED', 'FILL_BLANK', 'MATCHING']) expect(canAutoAdvance(type, 'B')).toBe(false);
    expect(canAutoAdvance('MULTIPLE_CHOICE', '')).toBe(false);
    for (const answer of ['', ' ', '[]', '["", " "]', '[null,null]']) expect(hasExamAnswer(answer)).toBe(false);
    for (const answer of ['A', '0', '[0,null]', '["", "12"]']) expect(hasExamAnswer(answer)).toBe(true);
  });

  it('kalkulyator faqat fizika faniga tegishli', () => {
    expect(isPhysicsSubject({ nameUz: 'Fizika' })).toBe(true);
    expect(isPhysicsSubject({ nameRu: 'Физика' })).toBe(true);
    expect(isPhysicsSubject({ nameEn: 'Physics' })).toBe(true);
    expect(isPhysicsSubject({ nameUz: 'Matematika' })).toBe(false);
    expect(isPhysicsSubject()).toBe(false);
  });
});

describe('fizika kalkulyatori', () => {
  const calculate = (keys: string[]) => keys.reduce(calculatorStep, initialCalculator).display;
  it('fizika hisobini ketma-ket bajaradi', () => {
    expect(calculate(['3', '0', 'x²', '+', '4', '0', 'x²', '=', '√'])).toBe('50');
    expect(calculate(['1', '÷', '4', '='])).toBe('0.25');
    expect(calculate(['2', '.', '5', '±', '×', '4', '='])).toBe('-10');
  });
  it('nolga bo‘lish va manfiy ildizdan keyin qayta ishlaydi', () => {
    expect(calculate(['9', '÷', '0', '='])).toBe('error');
    expect(calculate(['9', '±', '√'])).toBe('error');
    expect(calculate(['9', '÷', '0', '=', '2'])).toBe('2');
  });
});
