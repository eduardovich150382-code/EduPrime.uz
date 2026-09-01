import { db } from './db';
import { createSessionFromSpec } from './sessions';
import type { ItemSpec } from './item-picker';
import { resolveTopicNodes } from './topic-bridge';

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

// So'nggi shuncha kun ichida TO'G'RI javob berilgan savollarni mashqdan
// chetlaymiz — mashqning maqsadi mavzuni o'rgatish, yodda qolgan javobni
// takrorlatish emas. `getRecentlyCorrectItemIds` ikki bosqichli qidiradi
// (Item.id VA Item.legacyQuestionId orqali), shuning uchun S18a'gacha
// (eski Question jadvaliga) yozilgan natijalar ham hisobga olinadi — S26
// (Attempt jadvali) kutilmaydi. 30 kundan eskisi baribir esdan chiqadi —
// qayta berish foydali.
const EXCLUDE_RECENTLY_CORRECT_DAYS = 30;

/**
 * Zaif mavzu bo'yicha shaxsiy mashq sessiyasi yaratadi — S18a konstruktor
 * infratuzilmasi (`createSessionFromSpec`) orqali Item bankidan tanlab,
 * `TestSession` sifatida qaytaradi (Test/Question qatorlari yozilmaydi).
 * Mavzu nomi ("Kinematika") avval `topic-bridge#resolveTopicNodes` orqali
 * `TopicNode`ga aylantiriladi va `spec.topicPaths`ga o'tadi; mos tugun
 * topilmasa, mavzu cheklovisiz, faqat fan bo'yicha sessiya yaratiladi —
 * mashq umuman ishlamay qolgandan ko'ra, kengroq (lekin baribir foydali)
 * sessiya yaxshiroq.
 *
 * Birinchi urinish `excludeAnsweredCorrectlyDays` bilan (yuqoridagi izoh) —
 * agar shu cheklov havzani bo'shatib qo'ysa (masalan kichik mavzu, deyarli
 * hammasi yaqinda to'g'ri javob berilgan), IKKINCHI urinish shu cheklovsiz
 * qilinadi: takrorlangan savol bilan mashq — mashq umuman ishlamay
 * qolgandan yaxshiroq. `pickItemsForSpec`ning o'zi bu chetlatishni
 * bo'shatmaydi (u spec maydoni emas, alohida parametr), shuning uchun
 * qayta urinish shu yerda, qo'lda qilinadi.
 *
 * Kunlik konstruktor test tuzish kvotasini SARFLAMAYDI
 * (`countsAgainstQuota: false`) — bu qaror server tomonidan qat'iy
 * belgilangan, chaqiruvchidan (so'rov tanasidan) kelmaydi (qarang
 * `lib/sessions.ts#CreateSessionParams`).
 *
 * Ikkala urinish ham havza bo'sh chiqsa — `null` qaytadi, chaqiruvchi
 * mavjud nashr qilingan testni tavsiya qilishga o'tadi.
 */
export async function generatePracticeSession(params: {
  userId: string;
  topic: string;
  subjectId: string;
  count?: number;
}): Promise<{ id: string; title: string; questionCount: number } | null> {
  const { userId, topic, subjectId, count = 10 } = params;

  const topicMap = await resolveTopicNodes(subjectId, [topic]);
  const node = topicMap.get(topic);

  const baseSpec: ItemSpec = {
    subjectIds: [subjectId],
    ...(node ? { topicPaths: [node.path] } : {}),
  };

  const createParams = {
    userId,
    limit: count,
    durationMin: Math.max(10, Math.round(count * 1.5)),
    mode: 'FIXED' as const,
    title: `Shaxsiy mashq: ${topic}`,
    countsAgainstQuota: false,
  };

  const withExclusion = await createSessionFromSpec({
    ...createParams,
    spec: { ...baseSpec, excludeAnsweredCorrectlyDays: EXCLUDE_RECENTLY_CORRECT_DAYS },
  });
  if (withExclusion.ok) {
    const { session } = withExclusion;
    return { id: session.id, title: session.title, questionCount: session.questionCount };
  }

  const withoutExclusion = await createSessionFromSpec({ ...createParams, spec: baseSpec });
  if (!withoutExclusion.ok) return null;
  const { session } = withoutExclusion;
  return { id: session.id, title: session.title, questionCount: session.questionCount };
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
