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
  bias: DifficultyBias;
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
 * Bo'lim qiyinlik og'irligi: mutaxassislik fani (30 savol) uchun 'advanced'
 * (avval o'rta+qiyin havzadan, yetmasa osondan to'ldiriladi), majburiy fan
 * (10 savol) uchun 'easy' (avval oson havzadan, yetmasa o'rta/qiyindan
 * to'ldiriladi). Bitta fan (masalan Matematika) ham majburiy, ham
 * mutaxassislik sifatida tanlangan bo'lsa, ikkala bo'lim shu tufayli har
 * xil qiyinlikdagi savollarni oladi — va excludeIds orqali bir xil savol
 * ikki marta chiqmasligi kafolatlanadi.
 */
type DifficultyBias = 'easy' | 'advanced';

/**
 * Bitta bo'lim uchun savol tanlaydi: bias'ga qarab avval mos qiyinlik
 * havzasidan, yetmasa qolganidan to'ldiradi; har guruh ichida mavzu bo'yicha
 * diversifikatsiya qilinadi (pickByTopicRoundRobin). excludeIds — boshqa
 * bo'lim allaqachon olib qo'ygan savollarni takrorlamaslik uchun (bir xil
 * fan ikki bo'limda ishtirok etganda). Umumiy havza yetarli bo'lmasa null
 * qaytaradi.
 */
async function pickSectionQuestions(
  subjectId: string,
  count: number,
  excludeIds: Set<string>,
  bias: DifficultyBias
): Promise<QuestionCandidate[] | null> {
  const all = await db.question.findMany({
    where: { test: { subjectId, isPublished: true } },
    select: {
      id: true, text: true, images: true, options: true, correctAnswer: true, type: true,
      explanation: true, explanationImages: true, topic: true, bloomLevel: true, difficulty: true,
    },
  });
  const candidates = all.filter((q) => !excludeIds.has(q.id));

  if (candidates.length < count) return null;

  const buckets: Record<DifficultyBucket, QuestionCandidate[]> = { easy: [], medium: [], hard: [] };
  for (const q of candidates) buckets[difficultyBucketOf(q.difficulty)].push(q);

  const primaryPool = bias === 'easy' ? buckets.easy : [...buckets.medium, ...buckets.hard];
  const fallbackPool = bias === 'easy' ? [...buckets.medium, ...buckets.hard] : buckets.easy;

  const picked = pickByTopicRoundRobin(primaryPool, count);
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((q) => q.id));
    const leftover = fallbackPool.filter((q) => !pickedIds.has(q.id));
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

  // Mutaxassislik bo'limlari 'advanced' (asosan o'rta+qiyin), majburiy
  // bo'limlar 'easy' (asosan oson) og'irlik bilan tanlanadi. Agar bitta fan
  // (masalan Matematika) ham mutaxassislik, ham majburiy sifatida ishtirok
  // etsa — bu ikki bo'lim shu tufayli boshqa-boshqa qiyinlikdagi savollar
  // oladi, va usedIds ularning takrorlanishining oldini oladi (pastda).
  const sections: SectionSpec[] = [
    { subjectId: specialty1.id, subjectName: specialty1.nameUz, count: 30, pointsPerQuestion: 3.1, bias: 'advanced' },
    { subjectId: specialty2.id, subjectName: specialty2.nameUz, count: 30, pointsPerQuestion: 2.1, bias: 'advanced' },
    ...mandatorySubjects.map((s) => ({
      subjectId: s.id, subjectName: s.nameUz, count: 10, pointsPerQuestion: 1.1, bias: 'easy' as const,
    })),
  ];

  const usedIds = new Set<string>();
  const picks: { section: SectionSpec; questions: QuestionCandidate[] }[] = [];
  for (const section of sections) {
    const picked = await pickSectionQuestions(section.subjectId, section.count, usedIds, section.bias);
    if (!picked) {
      const available = await db.question.count({
        where: { test: { subjectId: section.subjectId, isPublished: true }, id: { notIn: [...usedIds] } },
      });
      return {
        ok: false,
        error: { code: 'INSUFFICIENT_POOL', subjectName: section.subjectName, available, required: section.count },
      };
    }
    for (const q of picked) usedIds.add(q.id);
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

/**
 * DTM kategoriyasidagi mutaxassislik sifatida tanlash mumkin bo'lgan barcha
 * fanlar — majburiy 3 fan (Matematika, Ona tili va adabiyot, Tarix) ham shu
 * ro'yxatda: ular mutaxassislik sifatida tanlansa, majburiy 10 ta oson
 * savoldan tashqari, alohida 30 ta nisbatan o'rtacha/qiyin savol oladi
 * (generateDtmOnlineExam dagi bias + usedIds mexanizmi orqali).
 */
export async function getDtmSpecialtySubjects() {
  const category = await db.testCategory.findFirst({ where: { type: 'DTM' }, select: { id: true } });
  if (!category) return [];
  return db.subject.findMany({
    where: { categoryId: category.id },
    select: { id: true, nameUz: true, icon: true },
    orderBy: { order: 'asc' },
  });
}
