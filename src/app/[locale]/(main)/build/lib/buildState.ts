/**
 * `/build` konstruktor ekranining holati — sof (React'siz, DOM'siz)
 * funksiyalar shu yerda, shunda URL<->holat aylanishi va presetlar
 * BuildClient.tsx'dan mustaqil sinovdan o'tkazilishi mumkin.
 */

export interface BuildState {
  exams: string[];
  subjectIds: string[];
  grades: number[];
  topicPaths: string[];
  difficultyMin: number;
  difficultyMax: number;
  questionCount: number;
  durationMin: number;
  /** `true` bo'lsa, questionCount o'zgarishi durationMin'ni avtomatik qayta hisoblamaydi — foydalanuvchi (yoki preset) uni ataylab shu qiymatga qo'ygan. */
  durationManual: boolean;
  bloomLevels: string[];
  types: string[];
  lang: string[];
}

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const GRADES = [5, 6, 7, 8, 9, 10, 11] as const;

export const EXAMS: { value: string; label: string }[] = [
  { value: 'dtm', label: 'DTM' },
  { value: 'maktab', label: 'Maktab' },
  { value: 'milliy', label: 'Milliy sertifikat' },
];

export const QUESTION_TYPES: { value: string; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Bir javobli' },
  { value: 'MULTI_SELECT', label: "Ko'p javobli" },
  { value: 'TRUE_FALSE', label: "To'g'ri/Noto'g'ri" },
  { value: 'FILL_BLANK', label: "Bo'sh joy" },
  { value: 'MATCHING', label: 'Moslashtirish' },
  { value: 'OPEN_ENDED', label: 'Ochiq savol' },
];

export const BLOOM_LEVELS: { value: string; label: string }[] = [
  { value: 'BILISH', label: 'Bilish' },
  { value: 'TUSHUNISH', label: 'Tushunish' },
  { value: 'QOLLASH', label: "Qo'llash" },
  { value: 'TAHLIL', label: 'Tahlil' },
  { value: 'BAHOLASH', label: 'Baholash' },
  { value: 'YARATISH', label: 'Yaratish' },
];

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Ruscha' },
  { value: 'en', label: 'Inglizcha' },
];

/** 1 savolga o'rtacha 1.5 daqiqa — `lib/mastery.ts#generatePracticeTest`dagi bilan bir xil formula. */
export function estimateDurationMin(questionCount: number): number {
  return Math.max(10, Math.round(questionCount * 1.5));
}

export function defaultBuildState(): BuildState {
  const questionCount = 20;
  return {
    exams: [],
    subjectIds: [],
    grades: [],
    topicPaths: [],
    difficultyMin: DIFFICULTY_MIN,
    difficultyMax: DIFFICULTY_MAX,
    questionCount,
    durationMin: estimateDurationMin(questionCount),
    durationManual: false,
    bloomLevels: [],
    types: [],
    lang: [],
  };
}

// ===================== URL <-> holat =====================

const CSV_STRING_KEYS: { key: keyof BuildState; param: string }[] = [
  { key: 'exams', param: 'e' },
  { key: 'subjectIds', param: 's' },
  { key: 'topicPaths', param: 't' },
  { key: 'bloomLevels', param: 'b' },
  { key: 'types', param: 'ty' },
  { key: 'lang', param: 'l' },
];

function parseGrades(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((g) => parseInt(g, 10))
    .filter((g) => Number.isInteger(g) && GRADES.includes(g as (typeof GRADES)[number]));
}

function parseIntParam(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isInteger(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** `BuildState`ni `useSearchParams()`ga mos `URLSearchParams`ga aylantiradi — standart qiymatlar qatnashmaydi, URL toza qoladi. */
export function buildStateToParams(state: BuildState): URLSearchParams {
  const params = new URLSearchParams();
  const def = defaultBuildState();

  for (const { key, param } of CSV_STRING_KEYS) {
    const value = state[key] as string[];
    if (value.length) params.set(param, value.join(','));
  }
  if (state.grades.length) params.set('g', state.grades.join(','));
  if (state.difficultyMin !== def.difficultyMin) params.set('dmin', String(state.difficultyMin));
  if (state.difficultyMax !== def.difficultyMax) params.set('dmax', String(state.difficultyMax));
  if (state.questionCount !== def.questionCount) params.set('n', String(state.questionCount));
  if (state.durationMin !== def.durationMin || state.durationManual) params.set('d', String(state.durationMin));
  if (state.durationManual) params.set('dm', '1');

  return params;
}

/** `URLSearchParams`dan `BuildState` tiklaydi — noto'g'ri/tanilmagan qiymatlar jimgina standartga tushadi (hech qachon xato bermaydi, sahifa har doim ochiladi). */
export function buildStateFromParams(params: URLSearchParams): BuildState {
  const def = defaultBuildState();

  const csv = (param: string) => {
    const raw = params.get(param);
    return raw ? raw.split(',').filter(Boolean) : [];
  };

  const questionCount = parseIntParam(params.get('n'), def.questionCount, 1, 200);
  const durationManual = params.get('dm') === '1';
  const durationMin = parseIntParam(params.get('d'), estimateDurationMin(questionCount), 1, 600);
  const difficultyMin = parseIntParam(params.get('dmin'), def.difficultyMin, DIFFICULTY_MIN, DIFFICULTY_MAX);
  const difficultyMax = parseIntParam(params.get('dmax'), def.difficultyMax, DIFFICULTY_MIN, DIFFICULTY_MAX);

  return {
    exams: csv('e'),
    subjectIds: csv('s'),
    grades: parseGrades(params.get('g')),
    topicPaths: csv('t'),
    difficultyMin: Math.min(difficultyMin, difficultyMax),
    difficultyMax: Math.max(difficultyMin, difficultyMax),
    questionCount,
    durationMin,
    durationManual,
    bloomLevels: csv('b'),
    types: csv('ty'),
    lang: csv('l'),
  };
}

// ===================== Item bank spec'ga aylantirish =====================

export interface ItemSpecLike {
  subjectIds?: string[];
  topicPaths?: string[];
  grades?: number[];
  exams?: string[];
  difficultyMin?: number;
  difficultyMax?: number;
  types?: string[];
  bloomLevels?: string[];
  lang?: string[];
  onlyItemIds?: string[];
}

/** `BuildState`ni `/api/items/count`, `/api/items/search`, `/api/sessions` qabul qiladigan spec shakliga o'giradi. `onlyItemIds` alohida (URL'da saqlanmaydigan) holatdan keladi — bu funksiyaga tashqaridan uzatiladi. */
export function buildStateToItemSpec(state: BuildState, onlyItemIds?: string[]): ItemSpecLike {
  const spec: ItemSpecLike = {};
  if (state.subjectIds.length) spec.subjectIds = state.subjectIds;
  if (state.topicPaths.length) spec.topicPaths = state.topicPaths;
  if (state.grades.length) spec.grades = state.grades;
  if (state.exams.length) spec.exams = state.exams;
  if (state.difficultyMin !== DIFFICULTY_MIN) spec.difficultyMin = state.difficultyMin;
  if (state.difficultyMax !== DIFFICULTY_MAX) spec.difficultyMax = state.difficultyMax;
  if (state.types.length) spec.types = state.types;
  if (state.bloomLevels.length) spec.bloomLevels = state.bloomLevels;
  if (state.lang.length) spec.lang = state.lang;
  if (onlyItemIds?.length) spec.onlyItemIds = onlyItemIds;
  return spec;
}

// ===================== Tez boshlash presetlari =====================

export type PresetOverride = Partial<Pick<BuildState, 'exams' | 'questionCount' | 'durationMin' | 'durationManual' | 'difficultyMin' | 'difficultyMax'>>;

/**
 * "Kechagi xatolarim" bu yerda YO'Q — u `onlyItemIds`ni server'dan
 * (`GET /api/items/yesterday-mistakes`) olib kelishi kerak, shuning uchun
 * BuildClient.tsx'da alohida (async) ishlov beriladi. "Zaif mavzularim"
 * umuman yo'q — bilim xaritasi hozircha Item bankiga bog'lanmagan (qarang:
 * PR tavsifidagi "Keyingi sessiyaga" bo'limi).
 */
export const PRESETS: { id: string; label: string; apply: () => PresetOverride }[] = [
  {
    id: 'dtm90',
    label: 'DTM 90',
    apply: () => ({ exams: ['dtm'], questionCount: 90, durationMin: estimateDurationMin(90), durationManual: true }),
  },
  {
    id: 'fast10',
    label: 'Tez 10 daqiqa',
    apply: () => ({ questionCount: 10, durationMin: 10, durationManual: true }),
  },
  {
    id: 'block',
    label: 'Blok imtihon',
    apply: () => ({
      questionCount: 30,
      durationMin: estimateDurationMin(30),
      durationManual: true,
      difficultyMin: DIFFICULTY_MIN,
      difficultyMax: DIFFICULTY_MAX,
    }),
  },
];
