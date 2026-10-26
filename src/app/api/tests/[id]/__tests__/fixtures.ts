/**
 * GET /api/tests/[id], submit va practice-check testlari uchun umumiy savol
 * to'plamlari. Turlar ataylab aralash — aralashtirish (variant urug'i
 * `baseSeed + slot + 1`) har bir turda boshqacha qo'llanadi, shu sababli
 * bitta turdagi to'plam slot moslashuvi xatosini yashirib qo'yishi mumkin.
 */
type Option = { label: string; text: string; image: null };

export interface FixtureQuestion {
  id: string;
  text: string;
  images: string[];
  type: string;
  points: number;
  order: number;
  subjectId: string | null;
  hints: string[];
  tags: string[];
  options: Option[] | { left: string[]; right: string[] } | [];
  correctAnswer: string;
}

const mcOptions = (id: string, count = 4): Option[] =>
  ['A', 'B', 'C', 'D', 'E'].slice(0, count).map((label) => ({ label, text: `${id}-${label}`, image: null }));

const SECTIONS = ['fizika', 'kasb-standarti', 'pedagogika'];

function base(i: number, tags: string[], subjectId: string | null = null) {
  return { id: `q${i}`, text: `Savol ${i}`, images: [], points: 1, order: i, subjectId, hints: [`h${i}`], tags };
}

/** Oddiy fan testi: barcha savol turlari bir to'plamda. */
export function mixedQuestions(): FixtureQuestion[] {
  return Array.from({ length: 12 }, (_, i): FixtureQuestion => {
    const b = base(i, ['mavzu:x']);
    switch (i % 6) {
      case 1: return { ...b, type: 'MULTI_SELECT', options: mcOptions(b.id, 5), correctAnswer: 'A,C' };
      case 2: return { ...b, type: 'MATCHING', options: { left: ['L0', 'L1', 'L2'], right: ['R0', 'R1', 'R2'] }, correctAnswer: '' };
      case 3: return { ...b, text: `Savol ${i}: ___ va ___`, type: 'FILL_BLANK', options: [], correctAnswer: JSON.stringify([['x'], ['y']]) };
      case 4: return { ...b, type: 'OPEN_ENDED', options: [], correctAnswer: `javob${i}` };
      case 5: return { ...b, type: 'TRUE_FALSE', options: mcOptions(b.id, 2), correctAnswer: 'A' };
      default: return { ...b, type: 'MULTIPLE_CHOICE', options: mcOptions(b.id), correctAnswer: 'B' };
    }
  });
}

/** Generatsiya qilingan (subjectId bor) test — savol tartibi saqlanadi. */
export function preserveOrderQuestions(): FixtureQuestion[] {
  return Array.from({ length: 8 }, (_, i) => ({
    ...base(i, [], i < 4 ? 'subj-a' : 'subj-b'), type: 'MULTIPLE_CHOICE', options: mcOptions(`q${i}`), correctAnswer: 'B',
  }));
}

/** Bo'limli attestatsiya: bazada bo'limlar ataylab aralash. */
export function sectionQuestions(): FixtureQuestion[] {
  return Array.from({ length: 12 }, (_, i) => ({
    ...base(i, ['mavzu:x', `section:${sectionOf(`q${i}`)}`]), type: i % 5 === 4 ? 'MULTI_SELECT' : 'MULTIPLE_CHOICE',
    options: mcOptions(`q${i}`), correctAnswer: i % 5 === 4 ? 'A,C' : 'B',
  }));
}

export function sectionOf(id: string): string {
  return SECTIONS[Number(id.slice(1)) % 3];
}

export const SECTION_ORDER = SECTIONS;
