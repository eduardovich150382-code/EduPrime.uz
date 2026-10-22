import type { TestType } from '@prisma/client';

// /tests sahifasining filtr holati URL'da yashaydi (?type=&subject=&q=&sort=) —
// havola ulashilganda yoki sahifa yangilanganda xuddi shu filtr ochilishi
// uchun. Bu fayl URL <-> holat o'girishini sof funksiyalarda saqlaydi, shunda
// mantiq komponentsiz (Vitest'da) tekshiriladi.

// Ko'rsatish tartibi — dizayn hujjatidagi (docs/design/testlar-ui.md) tartib,
// enum tartibi emas.
export const TEST_GOALS = [
  'ATTESTATION',
  'CERTIFICATE',
  'DTM',
  'SCHOOL',
  'PRESIDENT_SCHOOL',
  'SAT',
  'GRE',
] as const satisfies readonly TestType[];

export type TestGoal = (typeof TEST_GOALS)[number];
export type TestsSort = 'newest' | 'popular';

export interface TestsFilters {
  type: TestGoal | null; // null — "Hammasi"
  subject: string | null;
  q: string;
  sort: TestsSort;
}

export const DEFAULT_FILTERS: TestsFilters = { type: null, subject: null, q: '', sort: 'newest' };

// API ham shu chegarani qo'yadi — juda uzun q bilan ILIKE so'rovini
// bazaga yubormaslik uchun.
export const MAX_QUERY_LENGTH = 100;

function isTestGoal(value: string | null): value is TestGoal {
  return value !== null && (TEST_GOALS as readonly string[]).includes(value);
}

interface ParamsLike {
  get(name: string): string | null;
}

export function parseFilters(params: ParamsLike): TestsFilters {
  const rawType = params.get('type');
  // Noma'lum type (eski yoki qo'lda buzilgan havola) xato ko'rsatish o'rniga
  // "Hammasi" ga tushadi.
  const type = isTestGoal(rawType) ? rawType : null;
  // Fan faqat maqsad ichida ma'noga ega: "Hammasi" tanlanganda fan qatori
  // ko'rinmaydi, demak URL'dagi ortiqcha subject jimgina filtrlab qolmasin.
  const subject = type ? params.get('subject')?.trim() || null : null;
  const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  const sort: TestsSort = params.get('sort') === 'popular' ? 'popular' : 'newest';
  return { type, subject, q, sort };
}

// Standart qiymatlar URL'ga yozilmaydi — /tests toza qoladi va
// menyudagi ATTESTATION_HREF ('/tests?type=ATTESTATION') bilan bir xil
// ko'rinadi. Bo'sh bo'lsa '' qaytaradi, aks holda '?' bilan boshlanadi.
export function buildQuery(filters: TestsFilters): string {
  const params = new URLSearchParams();
  if (filters.type) {
    params.set('type', filters.type);
    if (filters.subject) params.set('subject', filters.subject);
  }
  const q = filters.q.trim();
  if (q) params.set('q', q);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildTestsApiQuery(filters: TestsFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.type && filters.subject) params.set('subject', filters.subject);
  const q = filters.q.trim();
  if (q) params.set('q', q);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return params.toString();
}

interface TargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

// "/" tugmasi qidiruvga fokus beradi, lekin foydalanuvchi biror maydonda
// yozayotgan bo'lsa (masalan kasr yoki sana kiritsa) belgini o'g'irlamasin.
export function isTypingTarget(target: TargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
