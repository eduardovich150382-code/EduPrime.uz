import { db } from './db';

/**
 * Bilim xaritasi — talabaning barcha TestResult'lari bo'yicha mavzu
 * darajasidagi tahlil, shaxsiy mashq testi generatsiyasi va o'sish rejasi.
 *
 * Mavzu teglari ixtiyoriy (Question.topic) bo'lgani uchun bu yerdagi hamma
 * hisob-kitob faqat TEGLANGAN savollarga tayanadi — teglanmagan savollar
 * xaritada ko'rinmaydi. Bu chegara — ma'lumot yetarli bo'lmasa xarita bo'sh
 * yoki qisman bo'ladi, lekin hech qachon noto'g'ri xulosa chiqarmaydi.
 */

const MIN_ATTEMPTS_FOR_CONFIDENCE = 3;

export interface TopicStat {
  topic: string;
  subjectId: string;
  subjectName: string;
  subjectIcon: string | null;
  attempts: number;
  correct: number;
  rate: number; // 0-100
}

interface AnswerRecord {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

export async function computeTopicStats(userId: string): Promise<{
  stats: TopicStat[];
  correctlyAnsweredQuestionIds: Set<string>;
  totalAttempts: number;
}> {
  const results = await db.testResult.findMany({
    where: { userId },
    select: { answers: true },
    orderBy: { completedAt: 'desc' },
    take: 200,
  });

  const questionIds = new Set<string>();
  for (const r of results) {
    for (const a of (r.answers as unknown as AnswerRecord[]) || []) {
      if (a.questionId) questionIds.add(a.questionId);
    }
  }

  if (questionIds.size === 0) {
    return { stats: [], correctlyAnsweredQuestionIds: new Set(), totalAttempts: 0 };
  }

  const questions = await db.question.findMany({
    where: { id: { in: Array.from(questionIds) } },
    select: {
      id: true,
      topic: true,
      test: { select: { subjectId: true, subject: { select: { nameUz: true, icon: true } } } },
    },
  });
  const qMap = new Map(questions.map((q) => [q.id, q]));

  const buckets = new Map<string, {
    topic: string; subjectId: string; subjectName: string; subjectIcon: string | null;
    attempts: number; correct: number;
  }>();
  const correctlyAnsweredQuestionIds = new Set<string>();
  let totalAttempts = 0;

  for (const r of results) {
    for (const a of (r.answers as unknown as AnswerRecord[]) || []) {
      if (!a.questionId || !a.answer) continue; // javob berilmagan savol bilim darajasini aks ettirmaydi
      const q = qMap.get(a.questionId);
      if (!q || !q.topic) continue; // mavzu tegisiz savollar xaritaga kirmaydi

      totalAttempts++;
      if (a.isCorrect) correctlyAnsweredQuestionIds.add(a.questionId);

      const key = `${q.test.subjectId}::${q.topic}`;
      const bucket = buckets.get(key) || {
        topic: q.topic,
        subjectId: q.test.subjectId,
        subjectName: q.test.subject.nameUz,
        subjectIcon: q.test.subject.icon,
        attempts: 0,
        correct: 0,
      };
      bucket.attempts++;
      if (a.isCorrect) bucket.correct++;
      buckets.set(key, bucket);
    }
  }

  const stats: TopicStat[] = Array.from(buckets.values()).map((b) => ({
    ...b,
    rate: b.attempts > 0 ? Math.round((b.correct / b.attempts) * 100) : 0,
  }));

  return { stats, correctlyAnsweredQuestionIds, totalAttempts };
}

export function classifyTopics(stats: TopicStat[]) {
  const confident = stats.filter((s) => s.attempts >= MIN_ATTEMPTS_FOR_CONFIDENCE);
  const insufficient = stats
    .filter((s) => s.attempts < MIN_ATTEMPTS_FOR_CONFIDENCE)
    .sort((a, b) => b.attempts - a.attempts);

  const strong = confident.filter((s) => s.rate >= 75).sort((a, b) => b.rate - a.rate);
  const weak = confident.filter((s) => s.rate < 50).sort((a, b) => a.rate - b.rate);
  const medium = confident
    .filter((s) => s.rate >= 50 && s.rate < 75)
    .sort((a, b) => a.rate - b.rate);

  return { strong, medium, weak, insufficient };
}

/**
 * Zaif mavzu bo'yicha shaxsiy mashq testi yaratadi — platformadagi barcha
 * nashr qilingan testlardan o'sha mavzu tegi bilan belgilangan savollarni
 * yig'ib, talaba uchun alohida (katalogda ko'rinmaydigan) Test yaratadi.
 * Savollar bazasi (BankQuestion) hali kam to'lgan bo'lishi mumkinligi
 * sababli, allaqachon mavjud va ko'proq bo'lgan Question havzasidan
 * foydalaniladi. Havza juda kichik bo'lsa (odam qo'lda ishlagudek bo'lmasa),
 * null qaytaradi — chaqiruvchi mavjud testni tavsiya qilishga o'tadi.
 */
export async function generatePracticeTest(params: {
  topic: string;
  subjectId: string;
  excludeCorrectIds: Set<string>;
  count?: number;
}): Promise<{ id: string; titleUz: string; questionCount: number } | null> {
  const { topic, subjectId, excludeCorrectIds, count = 10 } = params;

  const candidates = await db.question.findMany({
    where: { topic, test: { subjectId, isPublished: true } },
    select: {
      text: true, images: true, options: true, correctAnswer: true, type: true,
      explanation: true, explanationImages: true, topic: true, bloomLevel: true, id: true,
    },
    take: 60,
  });

  const MIN_POOL = 4;
  if (candidates.length < MIN_POOL) return null;

  const fresh = candidates.filter((q) => !excludeCorrectIds.has(q.id));
  const pool = fresh.length >= MIN_POOL ? fresh : candidates;
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { categoryId: true } });
  if (!subject) return null;

  const test = await db.test.create({
    data: {
      titleUz: `Shaxsiy mashq: ${topic}`,
      categoryId: subject.categoryId,
      subjectId,
      teacherId: null,
      duration: Math.max(10, Math.round(picked.length * 1.5)),
      questionCount: picked.length,
      isFree: true,
      accessType: 'free',
      isPublished: false,
      questions: {
        create: picked.map((q, index) => ({
          text: q.text,
          images: q.images,
          options: q.options as any,
          correctAnswer: q.correctAnswer,
          type: q.type,
          explanation: q.explanation,
          explanationImages: q.explanationImages,
          topic: q.topic,
          bloomLevel: q.bloomLevel,
          points: 1,
          order: index,
        })),
      },
    },
    select: { id: true, titleUz: true, questionCount: true },
  });

  return test;
}

export interface GrowthScheduleEntry {
  label: string;
  focusTopics: string[];
  description: string;
}

export interface GrowthSchedule {
  week: GrowthScheduleEntry[];
  month: GrowthScheduleEntry[];
  sixMonths: GrowthScheduleEntry[];
}

/**
 * Deterministik jadval — AI emas, oddiy taqsimot algoritmi. Muhim: jadvalning
 * o'zi har doim izchil va oldindan aytib bo'ladigan bo'lishi kerak (AI
 * ba'zan real bo'lmagan reja tuzishi mumkin); AI faqat matn/tavsiya
 * darajasida ishlatiladi (bu funksiyadan tashqarida, ko'ring: generateGrowthPlanTips).
 */
export function buildGrowthSchedule(weakTopics: string[], mediumTopics: string[]): GrowthSchedule {
  const week: GrowthScheduleEntry[] = [];
  const top2 = weakTopics.slice(0, 2);
  if (top2.length > 0) {
    week.push({
      label: '1-3-kun',
      focusTopics: top2,
      description: `Eng zaif mavzu(lar)ga chuqur e'tibor: kuniga 10-15 ta mashq savoli.`,
    });
  }
  if (weakTopics.length > 2) {
    week.push({
      label: '4-5-kun',
      focusTopics: weakTopics.slice(2, 4),
      description: 'Navbatdagi zaif mavzular ustida ishlash.',
    });
  }
  week.push({
    label: '6-7-kun',
    focusTopics: top2,
    description: "Haftalik takrorlash + o'sha mavzulardan mini-test yeching.",
  });

  const month: GrowthScheduleEntry[] = [];
  const allFocus = [...weakTopics, ...mediumTopics];
  for (let w = 0; w < 4; w++) {
    const slice = allFocus.slice(w * 2, w * 2 + 2);
    if (w < 3) {
      month.push({
        label: `${w + 1}-hafta`,
        focusTopics: slice.length ? slice : weakTopics.slice(0, 2),
        description: w === 0
          ? 'Eng zaif mavzulardan boshlang.'
          : "O'tgan haftada ko'rilgan mavzularni qisqa takrorlab, yangilariga o'ting.",
      });
    } else {
      month.push({
        label: '4-hafta',
        focusTopics: weakTopics.slice(0, 3),
        description: "Umumiy nazorat: barcha zaif mavzular bo'yicha to'liq hajmdagi test yeching va natijani qayta tekshiring.",
      });
    }
  }

  const sixMonths: GrowthScheduleEntry[] = [
    {
      label: '1-2-oy',
      focusTopics: weakTopics,
      description: "Barcha zaif mavzularni asosiy darajada o'zlashtirish — haftasiga kamida 3 marta mashq.",
    },
    {
      label: '3-4-oy',
      focusTopics: mediumTopics,
      description: "O'rtacha darajadagi mavzularni mustahkamlab, kuchli darajaga olib chiqish.",
    },
    {
      label: '5-oy',
      focusTopics: [...weakTopics, ...mediumTopics].slice(0, 4),
      description: "Barcha mavzular bo'yicha aralash, to'liq hajmdagi nazorat testlari.",
    },
    {
      label: '6-oy',
      focusTopics: [],
      description: "Yakuniy tekshiruv: eng zaif bo'lgan mavzularga qayta qaytib, bilim xaritasini yangilang.",
    },
  ];

  return { week, month, sixMonths };
}
