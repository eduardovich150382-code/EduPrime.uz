import { describe, expect, it } from 'vitest';
import { planQuestionOrder, shuffleArray, shuffleQuestionsWithSeed } from '../shuffle';
import { shufflePresentedQuestions } from '../exam-presentation';
import { groupBySection, sectionRange } from '../question-sections';

type Option = { label: string; text: string; image: null };
type Q = { id: string; type: string; options: Option[] | { left: string[]; right: string[] }; subjectId: string | null; tags: string[] };

const SEEDS = [0, 1, 42, 726, 123456, 2 ** 31 - 1];
const LABELS = ['A', 'B', 'C', 'D', 'E'];

// Bo'limlashdan OLDINGI shuffleQuestionsWithSeed — ekvivalentlik uchun
// o'zgartirilmagan nusxa (tartib va variantlar).
function legacyShuffleQuestionsWithSeed(questions: Q[], baseSeed: number, opts: { preserveOrder?: boolean } = {}): Q[] {
  const shuffledQuestions = opts.preserveOrder ? [...questions] : shuffleArray(questions, baseSeed);
  return shuffledQuestions.map((question, index) => {
    const optionSeed = baseSeed + index + 1;
    if (question.type === 'MATCHING') {
      const o = question.options as { left: string[]; right: string[] };
      const indexOrder = shuffleArray(o.left.map((_, i) => i), optionSeed);
      return { ...question, options: { left: o.left, right: indexOrder.map((i) => o.right[i]) } };
    }
    if (!Array.isArray(question.options)) return question;
    return { ...question, options: shuffleArray(question.options, optionSeed).map((opt, i) => ({ ...opt, label: LABELS[i] })) };
  });
}

// Bo'limlashdan OLDINGI shufflePresentedQuestions.
function legacyShufflePresented<T extends { subjectId?: string | null }>(questions: T[], seed: number): T[] {
  const groups: T[][] = [];
  for (const question of questions) {
    const last = groups[groups.length - 1];
    if (last && last[0].subjectId === question.subjectId) last.push(question);
    else groups.push([question]);
  }
  return groups.flatMap((group, index) => shuffleArray(group, seed + index));
}

function mc(id: string, tags: string[] = [], subjectId: string | null = null): Q {
  return {
    id, type: 'MULTIPLE_CHOICE', subjectId, tags,
    options: ['A', 'B', 'C', 'D'].map((label) => ({ label, text: `${id}-${label}`, image: null })),
  };
}

// 10 fizika / 5 kasb / 5 pedagogika — bazada ataylab aralash tartibda.
const SECTIONED: Q[] = Array.from({ length: 20 }, (_, i) => {
  const key = i % 4 === 1 ? 'kasb-standarti' : i % 4 === 3 ? 'pedagogika' : 'fizika';
  return mc(`q${i}`, ['mavzu:x', `section:${key}`]);
});
const sectionOf = (q: Q) => q.tags.find((t) => t.startsWith('section:'))!.slice('section:'.length);

const CASES: Record<string, { questions: Q[]; opts: { preserveOrder?: boolean; bySection?: boolean } }> = {
  'tegsiz': { questions: Array.from({ length: 12 }, (_, i) => mc(`n${i}`)), opts: { bySection: true } },
  'qisman tegli': { questions: [...SECTIONED.slice(0, 7), mc('bare')], opts: { bySection: true } },
  "to'liq tegli, bySection yo'q": { questions: SECTIONED, opts: {} },
  'preserveOrder (DTM)': { questions: Array.from({ length: 9 }, (_, i) => mc(`d${i}`, [], `s${Math.floor(i / 3)}`)), opts: { preserveOrder: true } },
  'MATCHING aralash': {
    questions: [mc('m0'), { id: 'm1', type: 'MATCHING', subjectId: null, tags: [], options: { left: ['a', 'b', 'c'], right: ['1', '2', '3'] } }, mc('m2')],
    opts: {},
  },
};

describe('planQuestionOrder — shart bajarilmaganda eski xatti-harakat', () => {
  for (const [name, { questions, opts }] of Object.entries(CASES)) {
    it.each(SEEDS)(`${name}: seed %i`, (seed) => {
      expect(shuffleQuestionsWithSeed(questions, seed, opts)).toEqual(legacyShuffleQuestionsWithSeed(questions, seed, opts));
    });
  }

  it.each(SEEDS)('shufflePresentedQuestions section maydonisiz eski bilan bir xil (seed %i)', (seed) => {
    const dtm = Array.from({ length: 15 }, (_, i) => mc(`d${i}`, [], i < 8 ? 'a' : 'b'));
    const plain = Array.from({ length: 15 }, (_, i) => mc(`p${i}`));
    expect(shufflePresentedQuestions(dtm, seed)).toEqual(legacyShufflePresented(dtm, seed));
    expect(shufflePresentedQuestions(plain, seed)).toEqual(legacyShufflePresented(plain, seed));
  });
});

describe('planQuestionOrder — bo\'limli attestatsiya', () => {
  it.each(SEEDS)('slot har doim eski shuffleArray indeksiga teng (seed %i)', (seed) => {
    const legacyIndex = new Map(shuffleArray(SECTIONED, seed).map((q, i) => [q.id, i]));
    const planned = planQuestionOrder(SECTIONED, seed, { bySection: true });
    expect(planned).toHaveLength(SECTIONED.length);
    for (const { question, slot } of planned) expect(slot).toBe(legacyIndex.get(question.id));
  });

  it.each(SEEDS)('bloklar SECTION_KEYS tartibida ketma-ket, variantlar o\'zgarmagan (seed %i)', (seed) => {
    const out = shuffleQuestionsWithSeed(SECTIONED, seed, { bySection: true }) as Q[];
    expect(out.map(sectionOf)).toEqual([...Array(10).fill('fizika'), ...Array(5).fill('kasb-standarti'), ...Array(5).fill('pedagogika')]);
    for (const key of ['fizika', 'kasb-standarti', 'pedagogika']) {
      expect(out.filter((q) => sectionOf(q) === key).map((q) => q.id).sort()).toEqual(SECTIONED.filter((q) => sectionOf(q) === key).map((q) => q.id).sort());
    }
    const flat = new Map(legacyShuffleQuestionsWithSeed(SECTIONED, seed).map((q) => [q.id, q.options]));
    for (const q of out) expect(q.options).toEqual(flat.get(q.id));
  });

  it("bo'lim ichida haqiqatan aralashadi", () => {
    const dbFizika = SECTIONED.filter((q) => sectionOf(q) === 'fizika').map((q) => q.id);
    const mixed = SEEDS.some((seed) => {
      const out = planQuestionOrder(SECTIONED, seed, { bySection: true }).map((e) => e.question);
      return out.slice(0, 10).map((q) => q.id).join() !== dbFizika.join();
    });
    expect(mixed).toBe(true);
  });

  it("mijoz aralashtirishi bloklarni buzmaydi va xarita oraliq ko'rsatadi", () => {
    const served = (shuffleQuestionsWithSeed(SECTIONED, 99, { bySection: true }) as Q[]).map((q) => ({ ...q, section: sectionOf(q) }));
    for (const seed of SEEDS) {
      const presented = shufflePresentedQuestions(served, seed);
      expect(presented.map((q) => q.section)).toEqual(served.map((q) => q.section));
      const groups = groupBySection(presented)!;
      expect(groups.map((g) => sectionRange(g.items.map((item) => item.index)))).toEqual([
        { from: 1, to: 10 }, { from: 11, to: 15 }, { from: 16, to: 20 },
      ]);
    }
  });
});
