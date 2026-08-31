import { db } from './db';
import { createSessionFromSections, type SectionSpec } from './sessions';
import { DTM_TITLE_PREFIX } from './dtm-online-shared';

export { DTM_TITLE_PREFIX };

/**
 * DTM Online — haqiqiy DTM imtihoni simulyatsiyasi. Har urinishda 90 ta
 * savol (2 mutaxassislik fani x30 + 3 majburiy fan x10) `TestSession`
 * sifatida yig'iladi — S18a'gacha bu alohida (katalogda ko'rinmaydigan)
 * `Test` va 90 ta `Question` qatori yozib yaratilardi, endi `lib/sessions.ts`
 * dagi umumiy konstruktor infratuzilmasi (`createSessionFromSections` →
 * `pickItemsForSpec`) qayta ishlatiladi: Item bazasidan tanlanadi, hech
 * qanday yangi Question qatori yozilmaydi. Har bo'limning bali
 * (`SectionSpec.pointsPerQuestion`) ITEM ID bo'yicha `TestSession.spec.
 * itemPoints`da saqlanadi — savollar taqdimotda `seed` bo'yicha
 * aralashtirilgani uchun POZITSIYA bo'yicha saqlash noto'g'ri ball berardi
 * (qarang `lib/sessions.ts` — `loadSessionItems`/`extractItemPoints`).
 */

export const DTM_MANDATORY_SUBJECTS = ['Matematika', "Ona tili va adabiyot", 'Tarix'] as const;

export const DTM_TOTAL_QUESTIONS = 90;
export const DTM_DURATION_MINUTES = 180;
export const DTM_MAX_SCORE = 189; // 30*3.1 + 30*2.1 + 30*1.1 (3x10*1.1)

/**
 * Majburiy (10 ta) bo'limlar uchun mavzu cheklovi — real DTM tuzilishiga
 * mos: Tarix majburiy qismida faqat O'zbekiston tarixi (Jahon tarixi emas),
 * Ona tili va adabiyotda faqat ona tili/grammatika (Adabiyot emas). Slug'lar
 * `prisma/seeds/topics/tarix.json` va `ona-tili-va-adabiyot.json`dagi
 * ILDIZ (root) tugun slug'lari bilan AYNAN mos — bu fayllar o'zgarsa shu
 * yerdagi qiymatlar ham yangilanishi kerak. Matematika (va boshqa har
 * qanday fan) uchun kirit yo'q — cheklovsiz, butun fan havzasidan tanlanadi.
 * MUTAXASSISLIK (30 ta) bo'limida bu cheklov UMUMAN qo'llanilmaydi.
 */
const MANDATORY_TOPIC_PATHS: Partial<Record<string, string[]>> = {
  'Tarix': ['ozbekiston-tarixi'],
  "Ona tili va adabiyot": ['ona-tili'],
};

export type DtmGenerationError =
  | { code: 'CATEGORY_NOT_FOUND' }
  | { code: 'MANDATORY_SUBJECT_MISSING'; subjectName: string }
  | { code: 'INSUFFICIENT_POOL'; subjectName: string; available: number; required: number };

export async function generateDtmOnlineExam(params: {
  userId: string;
  specialty1SubjectId: string;
  specialty2SubjectId: string;
}): Promise<
  | { ok: true; sessionId: string; titleUz: string; relaxedSections: string[] }
  | { ok: false; error: DtmGenerationError }
> {
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
  // bo'limlar 'easy' (asosan oson) og'irlik bilan tanlanadi (qarang
  // `lib/sessions.ts` — `biasToDifficultyRange`). Agar bitta fan (masalan
  // Matematika) ham mutaxassislik, ham majburiy sifatida ishtirok etsa — bu
  // ikki bo'lim shu tufayli boshqa-boshqa qiyinlikdagi savollarni oladi, va
  // `createSessionFromSections`dagi bo'limlar-orasi chetlatish ularning
  // takrorlanishining oldini oladi.
  const sections: SectionSpec[] = [
    { subjectId: specialty1.id, subjectName: specialty1.nameUz, count: 30, pointsPerQuestion: 3.1, bias: 'advanced' },
    { subjectId: specialty2.id, subjectName: specialty2.nameUz, count: 30, pointsPerQuestion: 2.1, bias: 'advanced' },
    ...mandatorySubjects.map((s) => ({
      subjectId: s.id, subjectName: s.nameUz, count: 10, pointsPerQuestion: 1.1, bias: 'easy' as const,
      topicPaths: MANDATORY_TOPIC_PATHS[s.nameUz],
    })),
  ];

  const titleUz = `${DTM_TITLE_PREFIX}${specialty1.nameUz} + ${specialty2.nameUz}`;

  // DTM Online alohida mahsulot — konstruktorning kunlik bepul test tuzish
  // limitiga (S17, `lib/quota.ts`) kirmaydi, shu sababli countsAgainstQuota
  // har doim false. (`DailyUsage.dtmOnline` hisoblagichi hozircha
  // to'ldirilmaydi — bu keyingi ishda qo'shiladi.)
  const outcome = await createSessionFromSections({
    userId,
    sections,
    durationMin: DTM_DURATION_MINUTES,
    mode: 'FIXED',
    title: titleUz,
    countsAgainstQuota: false,
  });

  if (!outcome.ok) {
    const { error } = outcome;
    if (error.status === 422) {
      return {
        ok: false,
        error: { code: 'INSUFFICIENT_POOL', subjectName: error.subjectName, available: error.available, required: error.required },
      };
    }
    // 404 (bo'limlar bo'sh) va 429 (kvota) DTM Online uchun amalda yuz
    // bermaydi — bo'limlar doim count>0 bilan beriladi va countsAgainstQuota
    // har doim false. Dasturiy invariant buzilsa, jimgina noto'g'ri xato
    // ko'rsatish o'rniga aniq yiqiladi.
    throw new Error(`createSessionFromSections DTM uchun kutilmagan xato qaytardi: ${error.status}`);
  }

  // Mavzu cheklovi (Tarix/Ona tili majburiy bo'limi) havza yetishmagani
  // sababli olib tashlangan bo'lsa — jimgina kengaymasin: server logiga
  // yoziladi (bu 4 616 tadan ~9% mavzuga bog'lanmagan savol tufayli kamdan
  // kam, lekin kutilishi mumkin bo'lgan holat).
  if (outcome.relaxedSections.length > 0) {
    console.warn(
      `generateDtmOnlineExam: mavzu cheklovi bo'shatildi (havza yetishmadi) — ${outcome.relaxedSections.join(', ')}`
    );
  }

  return { ok: true, sessionId: outcome.session.id, titleUz: outcome.session.title, relaxedSections: outcome.relaxedSections };
}

/**
 * DTM kategoriyasidagi mutaxassislik sifatida tanlash mumkin bo'lgan barcha
 * fanlar — majburiy 3 fan (Matematika, Ona tili va adabiyot, Tarix) ham shu
 * ro'yxatda: ular mutaxassislik sifatida tanlansa, majburiy 10 ta oson
 * savoldan tashqari, alohida 30 ta nisbatan o'rtacha/qiyin savol oladi
 * (generateDtmOnlineExam dagi bias + bo'limlar-orasi chetlatish mexanizmi orqali).
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
