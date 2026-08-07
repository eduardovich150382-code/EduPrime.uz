import { db } from './db';

/**
 * DTM Online — haqiqiy DTM imtihoni simulyatsiyasi. Har urinishda 90 ta
 * savol (2 mutaxassislik fani x30 + 3 majburiy fan x10) bazadan avtomatik
 * yig'ib, alohida (katalogda ko'rinmaydigan) Test yaratiladi — mavjud
 * shuffle/grading/natijalar/taymer infratuzilmasi o'zgarishsiz qayta
 * ishlatiladi.
 */

export const DTM_MANDATORY_SUBJECTS = ['Matematika', "Ona tili va adabiyot", 'Tarix'] as const;

export const DTM_TOTAL_QUESTIONS = 90;
export const DTM_DURATION_MINUTES = 180;
export const DTM_MAX_SCORE = 189; // 30*3.1 + 30*2.1 + 30*1.1

interface SectionSpec {
  subjectId: string;
  subjectName: string;
  count: number;
  pointsPerQuestion: number;
}

export type DtmGenerationError =
  | { code: 'CATEGORY_NOT_FOUND' }
  | { code: 'MANDATORY_SUBJECT_MISSING'; subjectName: string }
  | { code: 'INSUFFICIENT_POOL'; subjectName: string; available: number; required: number };

type QuestionCandidate = {
  id: string;
  text: string;
  images: string[];
  options: unknown;
  correctAnswer: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'TRUE_FALSE' | 'MULTI_SELECT' | 'FILL_BLANK' | 'MATCHING';
  explanation: string | null;
  explanationImages: string[];
  topic: string | null;
  bloomLevel: string | null;
  difficulty: number | null;
};

type DifficultyBucket = 'easy' | 'medium' | 'hard';
const DIFFICULTY_BUCKET_ORDER: DifficultyBucket[] = ['easy', 'medium', 'hard'];

// Tegsiz (difficulty=null) savollar "medium" ga tushadi — bu ma'lumot hali
// oz bo'lgan davrda amaldagi mavzu-asosidagi tanlovga yaqin xatti-harakatni
// saqlaydi (aksariyat savollar shu guruhga tushadi), tegli savollar ko'payishi
// bilan balanslash asta-sekin kuchayadi.
function difficultyBucketOf(difficulty: number | null): DifficultyBucket {
  if (difficulty === null) return 'medium';
  if (difficulty <= 2) return 'easy';
  if (difficulty >= 4) return 'hard';
  return 'medium';
}

/**
 * Berilgan havzadan `want` ta savol tanlaydi: mavzu tegiga ko'ra guruhlab,
 * guruhlar orasida aylanma tartibda oladi (bitta mavzudan hammasi kelib
 * qolmasligi uchun), so'ng har chaqiruvda boshqacha tartib chiqishi uchun
 * ichki tasodifiy aralashtiradi.
 */
function pickByTopicRoundRobin(pool: QuestionCandidate[], want: number): QuestionCandidate[] {
  if (want <= 0 || pool.length === 0) return [];

  const byTopic = new Map<string, QuestionCandidate[]>();
  for (const q of pool) {
    const key = q.topic || '__umumiy__';
    const list = byTopic.get(key) || [];
    list.push(q);
    byTopic.set(key, list);
  }
  for (const list of byTopic.values()) list.sort(() => Math.random() - 0.5);

  const topicKeys = Array.from(byTopic.keys()).sort(() => Math.random() - 0.5);
  const picked: QuestionCandidate[] = [];
  let round = 0;
  while (picked.length < want) {
    let addedThisRound = false;
    for (const key of topicKeys) {
      if (picked.length >= want) break;
      const list = byTopic.get(key)!;
      if (round < list.length) {
        picked.push(list[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  return picked;
}

/**
 * Bitta bo'lim uchun savol tanlaydi: avval qiyinlik darajasiga ko'ra
 * (oson/o'rta/qiyin) taxminan teng ulushga bo'lib, har guruh ichida mavzu
 * bo'yicha diversifikatsiya qilinadi (yuqoridagi pickByTopicRoundRobin).
 * Biror guruh yetarli bo'lmasa, qolgan savollar qolgan havzadan to'ldiriladi
 * — shu sababli balanslash "iloji boricha teng", qat'iy shart emas. Umumiy
 * havza yetarli bo'lmasa null qaytaradi.
 */
async function pickSectionQuestions(subjectId: string, count: number): Promise<QuestionCandidate[] | null> {
  const candidates = await db.question.findMany({
    where: { test: { subjectId, isPublished: true } },
    select: {
      id: true, text: true, images: true, options: true, correctAnswer: true, type: true,
      explanation: true, explanationImages: true, topic: true, bloomLevel: true, difficulty: true,
    },
  });

  if (candidates.length < count) return null;

  const buckets: Record<DifficultyBucket, QuestionCandidate[]> = { easy: [], medium: [], hard: [] };
  for (const q of candidates) buckets[difficultyBucketOf(q.difficulty)].push(q);

  const perBucketTarget = Math.ceil(count / DIFFICULTY_BUCKET_ORDER.length);
  const pickedIds = new Set<string>();
  const picked: QuestionCandidate[] = [];

  for (const bucket of DIFFICULTY_BUCKET_ORDER) {
    const chunk = pickByTopicRoundRobin(buckets[bucket], perBucketTarget);
    for (const q of chunk) {
      if (picked.length >= count) break;
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  if (picked.length < count) {
    const leftover = candidates.filter((q) => !pickedIds.has(q.id));
    picked.push(...pickByTopicRoundRobin(leftover, count - picked.length));
  }

  return picked.sort(() => Math.random() - 0.5).slice(0, count);
}

export async function generateDtmOnlineExam(params: {
  userId: string;
  specialty1SubjectId: string;
  specialty2SubjectId: string;
}): Promise<{ ok: true; testId: string; titleUz: string } | { ok: false; error: DtmGenerationError }> {
  const { userId, specialty1SubjectId, specialty2SubjectId } = params;

  const category = await db.testCategory.findFirst({ where: { type: 'DTM' }, select: { id: true } });
  if (!category) return { ok: false, error: { code: 'CATEGORY_NOT_FOUND' } };

  const [mandatorySubjects, specialty1, specialty2] = await Promise.all([
    db.subject.findMany({
      where: { categoryId: category.id, nameUz: { in: [...DTM_MANDATORY_SUBJECTS] } },
      select: { id: true, nameUz: true },
    }),
    db.subject.findUnique({ where: { id: specialty1SubjectId }, select: { id: true, nameUz: true } }),
    db.subject.findUnique({ where: { id: specialty2SubjectId }, select: { id: true, nameUz: true } }),
  ]);

  if (mandatorySubjects.length !== DTM_MANDATORY_SUBJECTS.length) {
    const found = new Set(mandatorySubjects.map((s) => s.nameUz));
    const missing = DTM_MANDATORY_SUBJECTS.find((n) => !found.has(n))!;
    return { ok: false, error: { code: 'MANDATORY_SUBJECT_MISSING', subjectName: missing } };
  }
  if (!specialty1 || !specialty2) {
    return { ok: false, error: { code: 'MANDATORY_SUBJECT_MISSING', subjectName: 'Mutaxassislik fani' } };
  }

  const sections: SectionSpec[] = [
    { subjectId: specialty1.id, subjectName: specialty1.nameUz, count: 30, pointsPerQuestion: 3.1 },
    { subjectId: specialty2.id, subjectName: specialty2.nameUz, count: 30, pointsPerQuestion: 2.1 },
    ...mandatorySubjects.map((s) => ({
      subjectId: s.id, subjectName: s.nameUz, count: 10, pointsPerQuestion: 1.1,
    })),
  ];

  const picks: { section: SectionSpec; questions: QuestionCandidate[] }[] = [];
  for (const section of sections) {
    const picked = await pickSectionQuestions(section.subjectId, section.count);
    if (!picked) {
      const available = await db.question.count({ where: { test: { subjectId: section.subjectId, isPublished: true } } });
      return {
        ok: false,
        error: { code: 'INSUFFICIENT_POOL', subjectName: section.subjectName, available, required: section.count },
      };
    }
    picks.push({ section, questions: picked });
  }

  let order = 0;
  const questionCreates = picks.flatMap(({ section, questions }) =>
    questions.map((q) => ({
      text: q.text,
      images: q.images,
      options: q.options as any,
      correctAnswer: q.correctAnswer,
      type: q.type,
      explanation: q.explanation,
      explanationImages: q.explanationImages,
      topic: q.topic,
      bloomLevel: q.bloomLevel,
      difficulty: q.difficulty,
      subjectId: section.subjectId,
      points: section.pointsPerQuestion,
      order: order++,
    }))
  );

  const titleUz = `DTM Online — ${specialty1.nameUz} + ${specialty2.nameUz}`;

  const test = await db.test.create({
    data: {
      titleUz,
      categoryId: category.id,
      subjectId: specialty1.id,
      teacherId: null,
      userId,
      duration: DTM_DURATION_MINUTES,
      questionCount: questionCreates.length,
      isFree: true,
      accessType: 'free',
      isPublished: false,
      questions: { create: questionCreates },
    },
    select: { id: true, titleUz: true },
  });

  return { ok: true, testId: test.id, titleUz: test.titleUz };
}

/** DTM kategoriyasidagi mutaxassislik sifatida tanlash mumkin bo'lgan fanlar — majburiy 3 tasi bundan tashqarida. */
export async function getDtmSpecialtySubjects() {
  const category = await db.testCategory.findFirst({ where: { type: 'DTM' }, select: { id: true } });
  if (!category) return [];
  return db.subject.findMany({
    where: { categoryId: category.id, nameUz: { notIn: [...DTM_MANDATORY_SUBJECTS] } },
    select: { id: true, nameUz: true, icon: true },
    orderBy: { order: 'asc' },
  });
}
