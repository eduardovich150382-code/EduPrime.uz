import { describe, expect, it } from 'vitest';
import { bankQuestionsToDrafts, type BankQuestionChoice } from '../bank-selection';
import { mergeImported, isPristineDraft } from '@/lib/import/merge-imported';

const defaults = [{ label: 'A', text: '', image: null }, { label: 'B', text: '', image: null }];
const choice = (over: Partial<BankQuestionChoice> = {}): BankQuestionChoice => ({
  id: 'bank-1', text: 'Savol', type: 'MULTIPLE_CHOICE', options: [{ label: 'A', text: '3', image: 'https://utfs.io/option.avif' }, { label: 'B', text: '4', image: null }],
  correctAnswer: 'B', images: ['https://utfs.io/question.avif'], explanationImages: ['https://utfs.io/solution.avif'], ...over,
});

describe('bazadan bir nechta savol qo\'shish', () => {
  it('20 ta savol tartibi va uchala rasm maydonini saqlaydi, bank ID sini nusxalamaydi', () => {
    const source = Array.from({ length: 20 }, (_, i) => choice({ id: `bank-${i}`, text: `Savol ${i}` }));
    const result = bankQuestionsToDrafts(source, defaults);
    expect(result.map(q => q.text)).toEqual(source.map(q => q.text));
    for (const question of result) {
      expect(question).not.toHaveProperty('id');
      expect(question.images).toEqual(source[0].images);
      expect(question.explanationImages).toEqual(source[0].explanationImages);
      expect(question.options[0].image).toBe('https://utfs.io/option.avif');
      expect(question.points).toBe(1);
    }
    result[0].options[0].text = 'Changed';
    expect((source[0].options as typeof defaults)[0].text).toBe('3');
    expect(result[1].options[0].text).toBe('3');
  });

  it('mavjud test savoli ID sini saqlagan holda oxiriga qo\'shadi', () => {
    const saved = { text: 'Saved', id: 'test-question-1' };
    const incoming = bankQuestionsToDrafts([choice(), choice({ id: 'bank-2' })], defaults);
    const existing = [saved];
    const result = mergeImported(existing, incoming, isPristineDraft(existing) ? 'replace' : 'append');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(saved);
    expect(result[0]).toHaveProperty('id', 'test-question-1');
    const blank = [{ text: '' }];
    expect(mergeImported(blank, incoming, isPristineDraft(blank) ? 'replace' : 'append')).toHaveLength(2);
  });

  it('FILL_BLANK sinonimlarini yo\'qotmaydi', () => {
    const [result] = bankQuestionsToDrafts([choice({ type: 'FILL_BLANK', correctAnswer: JSON.stringify([['elektron', 'electron'], ['musbat']]) })], defaults);
    expect(result.blankAnswers).toEqual(['elektron, electron', 'musbat']);
    expect(result.correctAnswer).toBe('');
  });

  it('MATCHING canonical juftliklarini tartibida oladi', () => {
    const [result] = bankQuestionsToDrafts([choice({ type: 'MATCHING', options: { left: ['q', 'E'], right: ['C', 'N/C'] }, correctAnswer: '' })], defaults);
    expect(result.matchingPairs).toEqual([{ left: 'q', right: 'C' }, { left: 'E', right: 'N/C' }]);
  });

  it.each(['MULTI_SELECT', 'TRUE_FALSE', 'OPEN_ENDED'] as const)('%s javobini o\'zgartirmaydi', (type) => {
    const [result] = bankQuestionsToDrafts([choice({ type, correctAnswer: 'answer' })], defaults);
    expect(result.type).toBe(type);
    expect(result.correctAnswer).toBe('answer');
  });
});
