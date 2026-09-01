import { Prisma, QuestionType } from '@prisma/client';
import { db } from './db';
import { shuffleQuestionsWithSeed } from './shuffle';
import type { GradableQuestion } from './grading';
import {
  buildItemWhere,
  getRecentlyCorrectItemIds,
  pickItemsForSpec,
  type ItemSpec,
  type RelaxationStep,
} from './item-picker';
import { consumeBuiltTest } from './quota';
import { getRegeneratedHints, toLang } from './paramgen/regenerate';

/**
 * `TestSession.itemIds`dagi Item'larni SHU tartibda (findMany o'zi tartibni
 * kafolatlamaydi) to'liq (correctAnswer bilan) qaytaradi — bu massiv tartibi
 * `Question.order`ning o'rnini bosadi: GET (taqdimot) va submit (baholash)
 * ikkalasi ham shu tartibdan boshlanadi, keyin shuffleQuestionsWithSeed bilan
 * bir xil seed'da qayta aralashtiradi (grading.ts'dagi kabi).
 *
 * `itemPoints` — agar berilsa, har bir savolga shu xaritadagi ball beriladi
 * (kalit — Item.id, qarang `extractItemPoints`). Berilmasa yoki xaritada
 * yo'q bo'lsa, savol 1 ball oladi (Question.points'ning default qiymati
 * bilan bir xil, konstruktor odatiy holda og'irlik tanlashni qo'llab-
 * quvvatlamaydi). DTM Online kabi bo'lim ballari har xil sessiyalar
 * `TestSession.spec.itemPoints`da shu xaritani saqlaydi — ball POZITSIYA
 * emas, ITEM ID bo'yicha ekanligi muhim, chunki savollar `seed` bo'yicha
 * qayta aralashtiriladi (qarang `toPresentedQuestions`).
 *
 * Item o'chirilgan yoki keyinchalik nashrdan olib tashlangan bo'lsa —
 * natijada shunchaki tushib qoladi (itemIds ataylab Item'ga FK emas).
 */
export interface SessionQuestion extends GradableQuestion {
  images: string[];
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  subject: { nameUz: string; nameRu: string; nameEn: string };
  // S20a — Item o'zi `why`/`hints` saqlamaydi (Question'dan farqli) —
  // natija/yechish sahifalari shu ikkitasidan `paramgen/regenerate.ts`
  // orqali qayta hosil qiladi (qarang `toPresentedQuestions` va
  // `results/[id]/route.ts`dagi `attachDistractorWhy`).
  templateId: string | null;
  variantSig: string | null;
  lang: string;
}

export async function loadSessionItems(
  itemIds: string[],
  itemPoints?: Record<string, number>
): Promise<SessionQuestion[]> {
  const items = await db.item.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true, text: true, images: true, options: true, correctAnswer: true, type: true,
      explanation: true, explanationImages: true, videoUrl: true,
      templateId: true, variantSig: true, lang: true,
      subject: { select: { nameUz: true, nameRu: true, nameEn: true } },
    },
  });
  const byId = new Map(items.map((it) => [it.id, it]));

  return itemIds.reduce<SessionQuestion[]>((acc, itemId) => {
    const it = byId.get(itemId);
    if (it) acc.push({ ...it, points: itemPoints?.[itemId] ?? 1 });
    return acc;
  }, []);
}

/**
 * `TestSession.spec`dan (agar mavjud bo'lsa) `itemPoints` xaritasini xavfsiz
 * ajratib oladi. Oddiy konstruktor sessiyasida `spec` — sof `ItemSpec`
 * (itemPoints yo'q, `loadSessionItems` standart 1 ball beradi); DTM Online
 * kabi bo'lim-asosidagi sessiyalarda `spec` — `{ sections, itemPoints }`
 * (qarang `createSessionFromSections`). Shakl kutilganidek bo'lmasa (yoki
 * spec umuman yo'q) — `undefined`, chaqiruvchi shunda standart 1 ballga
 * qaytadi.
 */
export function extractItemPoints(spec: unknown): Record<string, number> | undefined {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return undefined;
  const rawItemPoints = (spec as Record<string, unknown>).itemPoints;
  if (!rawItemPoints || typeof rawItemPoints !== 'object' || Array.isArray(rawItemPoints)) return undefined;

  const itemPoints: Record<string, number> = {};
  for (const [itemId, points] of Object.entries(rawItemPoints as Record<string, unknown>)) {
    if (typeof points === 'number' && Number.isFinite(points)) itemPoints[itemId] = points;
  }
  return itemPoints;
}

export interface PresentedQuestion {
  id: string;
  text: string;
  images: string[];
  options: unknown;
  type: QuestionType;
  points: number;
  /**
   * S20a — "Ko'rsatma" tugmasi uchun (progressiv: birinchi, keyin
   * ikkinchi...). Faqat parametrik savolda (templateId+variantSig bor) va
   * `preserveOrder` bo'lganda (bo'lim-asosidagi DTM Online) BO'SH — haqiqiy
   * imtihonni takrorlashi kerak (qarang `toPresentedQuestions`).
   */
  hints: string[];
}

/**
 * `TestSession.spec`da `sections` massivi bormi — bo'lim-asosidagi (DTM
 * Online, `createSessionFromSections`) sessiyalarda savol TARTIBI
 * (Matematika → Fizika → ... ) taqdimotning bir qismi, shuning uchun u
 * saqlanishi kerak (faqat variantlar aralashtiriladi). Oddiy konstruktor
 * sessiyasida (`createSessionFromSpec`) `spec` sof `ItemSpec` — `sections`
 * yo'q, savollar odatdagidek to'liq aralashtiriladi.
 *
 * !!! Bu funksiya GET (`toPresentedQuestions` orqali) VA submit
 * (`gradeSubmission`ga `preserveOrder` sifatida) ikkalasida ham CHAQIRILISHI
 * SHART — ikkisi bir xil natija bermasa, savol pozitsiyasi va unshuffle
 * formulasi mos kelmay qoladi va imtihonlar JIMGINA noto'g'ri baholanadi
 * (qarang CLAUDE.md — "Nozik joylar").
 */
export function sessionPreserveOrder(spec: unknown): boolean {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return false;
  const sections = (spec as Record<string, unknown>).sections;
  return Array.isArray(sections) && sections.length > 0;
}

export interface NavSection {
  label: string;
  count: number;
}

/**
 * `TestSession.spec.sections`dan (bor bo'lsa) `QuestionNav`ning `sections`
 * prop'iga mos `{label, count}[]` ro'yxatini ajratib oladi — guruhlash
 * uchun `subjectName` va `count` yetarli (qarang `SectionSpec`). Shakl
 * kutilganidek bo'lmasa — `undefined`, chaqiruvchi shunda tekis (guruhsiz)
 * ro'yxatga qaytadi.
 */
export function extractNavSections(spec: unknown): NavSection[] | undefined {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return undefined;
  const sections = (spec as Record<string, unknown>).sections;
  if (!Array.isArray(sections) || sections.length === 0) return undefined;

  const result: NavSection[] = [];
  for (const section of sections) {
    if (!section || typeof section !== 'object') return undefined;
    const subjectName = (section as Record<string, unknown>).subjectName;
    const count = (section as Record<string, unknown>).count;
    if (typeof subjectName !== 'string' || typeof count !== 'number') return undefined;
    result.push({ label: subjectName, count });
  }
  return result;
}

/**
 * GET/POST /api/sessions javobiga ketadigan (talabaga ko'rsatiladigan)
 * shakl — `correctAnswer`, `explanation`, `explanationImages`, `videoUrl`
 * chiqarib tashlanadi (submit'gacha ochilmasligi kerak). Variantlar har
 * doim `seed` bo'yicha aralashtiriladi; savol TARTIBI `preserveOrder`ga
 * bog'liq (qarang `sessionPreserveOrder`) — xuddi shu `seed` VA
 * `preserveOrder` submit paytida `gradeSubmission`ga beriladi, shu sababli
 * ikkala tomon bir xil tartibni ko'radi.
 */
export function toPresentedQuestions(
  items: SessionQuestion[],
  seed: number,
  preserveOrder: boolean
): PresentedQuestion[] {
  const shuffled = shuffleQuestionsWithSeed(items, seed, { preserveOrder });
  return shuffled.map(({ id, text, images, options, type, points, templateId, variantSig, lang }) => ({
    id, text, images, options, type, points,
    // `preserveOrder` — bo'lim-asosidagi (DTM Online) sessiyaning aynan shu
    // belgisi (qarang `sessionPreserveOrder`) — haqiqiy imtihonda ko'rsatma
    // bo'lmasligi kerak, shuning uchun bunda hisoblab ham o'tirmaymiz
    // (button yashirish yetarli emas — javobda umuman bo'lmasin).
    hints: preserveOrder || !templateId || !variantSig ? [] : getRegeneratedHints(templateId, variantSig, toLang(lang)),
  }));
}

export interface CreateSessionParams {
  userId: string;
  spec: ItemSpec;
  limit: number;
  durationMin: number;
  mode: 'FIXED' | 'ADAPTIVE';
  title: string;
  /**
   * `true` — S17 kunlik konstruktor test kvotasini sarflaydi (`lib/quota.ts`
   * — `consumeBuiltTest`). `POST /api/sessions` HAR DOIM `true` bilan
   * chaqiradi va so'rov tanasidan bu qiymatni HECH QACHON qabul qilmaydi —
   * mijoz shu bayroqni boshqarolmasin edi (kritik tuzatish: avval
   * `body.source === 'mastery'` kvota sarflashni butunlay chetlab o'tishga
   * imkon berardi, chunki `source` mijoz tomonidan erkin yuborilardi).
   * Bilim xaritasi mashq testlari kabi faqat SERVER tomonidan chaqiriladigan
   * yo'llar bu funksiyani to'g'ridan-to'g'ri `false` bilan chaqirishi
   * mumkin — HTTP marshrut orqali emas.
   */
  countsAgainstQuota: boolean;
}

export interface CreatedSession {
  id: string;
  title: string;
  mode: string;
  durationMin: number;
  startedAt: Date;
  expiresAt: Date;
  questionCount: number;
  questions: PresentedQuestion[];
}

export type CreateSessionError =
  | { status: 404; error: string }
  | { status: 429; error: string; code: 'BUILT_TEST_QUOTA_EXCEEDED'; usedToday: number; limit: number | null };

export type CreateSessionOutcome =
  | { ok: true; session: CreatedSession; relaxed: RelaxationStep[] }
  | { ok: false; error: CreateSessionError };

/**
 * ItemSpec bo'yicha virtual test sessiyasi yaratadi — `POST /api/sessions`
 * mantiqining o'zi shu yerga ko'chirilgan, shunday qilib kvota sarflash
 * qoidasi (`countsAgainstQuota`) FAQAT server kodi tomonidan belgilanadi,
 * hech qanday HTTP parametr orqali emas (qarang yuqoridagi izoh).
 */
export async function createSessionFromSpec(params: CreateSessionParams): Promise<CreateSessionOutcome> {
  const { userId, spec, limit, durationMin, mode, title, countsAgainstQuota } = params;

  const excludeItemIds = spec.excludeAnsweredCorrectlyDays
    ? await getRecentlyCorrectItemIds(userId, spec.excludeAnsweredCorrectlyDays)
    : [];

  // Sessiyaning o'zi bir martalik — har chaqiriqda yangi tasodifiy urug'
  // hosil qilinadi, GET va submit ORASIDA bir xil bo'lishi kifoya (shuning
  // uchun DB'da saqlanadi).
  const seed = Math.floor(Math.random() * 2 ** 31);
  const { ids: itemIds, relaxed } = await pickItemsForSpec({ spec, limit, seed, excludeItemIds });

  if (itemIds.length === 0) {
    return { ok: false, error: { status: 404, error: "Berilgan filtrga mos savol topilmadi" } };
  }

  // Kvota — sessiya YARATILGANDA hisoblanadi, tugatilganda emas. Havza bo'sh
  // chiqib 404 qaytadigan urinish kvotani sarflamasligi uchun shu tekshiruv
  // havza tasdiqlangandan KEYIN, lekin sessiya haqiqatan yaratilishidan
  // OLDIN turibdi.
  if (countsAgainstQuota) {
    const quota = await consumeBuiltTest(userId);
    if (!quota.allowed) {
      return {
        ok: false,
        error: {
          status: 429,
          error: `Bugungi bepul test tuzish limiti (${quota.limit} ta) tugadi. Ertaga yana ${quota.limit} ta bepul bo'ladi, yoki Premium tarifda cheksiz.`,
          code: 'BUILT_TEST_QUOTA_EXCEEDED',
          usedToday: quota.usedToday,
          limit: quota.limit,
        },
      };
    }
  }

  const now = new Date();
  const testSession = await db.testSession.create({
    data: {
      userId,
      title,
      spec: spec as Prisma.InputJsonValue,
      itemIds,
      seed,
      mode,
      durationMin,
      startedAt: now,
      expiresAt: new Date(now.getTime() + durationMin * 60_000),
    },
  });

  const items = await loadSessionItems(testSession.itemIds);
  const questions = toPresentedQuestions(items, testSession.seed, sessionPreserveOrder(spec));

  return {
    ok: true,
    session: {
      id: testSession.id,
      title: testSession.title,
      mode: testSession.mode,
      durationMin: testSession.durationMin,
      startedAt: testSession.startedAt,
      expiresAt: testSession.expiresAt,
      questionCount: questions.length,
      questions,
    },
    relaxed,
  };
}

// ===================== Bo'lim-asosidagi sessiya (DTM Online) =====================

/**
 * Bitta bo'lim (masalan "30 ta mutaxassislik fani, 3.1 balldan, advanced
 * og'irlik bilan") — `createSessionFromSections`ga beriladigan tuzilma.
 * `bias` `pickItemsForSpec`ning qiyinlik oralig'iga (`ItemSpec.difficultyMin/
 * Max`) aylantiriladi: 'easy' — asosan oson (1-2), 'advanced' — asosan
 * o'rta+qiyin (3-5) havzadan tanlaydi (Item.difficulty 1-5 shkalasi,
 * `QuestionEditorForm.tsx`dagi bilan bir xil).
 *
 * `topicPaths` — ixtiyoriy, `ItemSpec.topicPaths`ga o'tadi (masalan DTM
 * majburiy Tarix bo'limi faqat "ozbekiston-tarixi" shoxini xohlaydi, Jahon
 * tarixini emas — qarang `dtm-online.ts`). Havza (qiyinlik VA mavzu bilan
 * birga) yetarli bo'lmasa, `pickItemsForSpec`ning o'zidagi bo'shatish
 * (relaxation) mantig'i AVVAL qiyinlik cheklovini, keyin (hali yetmasa)
 * mavzu cheklovini olib tashlaydi va butun fan havzasidan to'ldiradi — bu
 * DTM Online eski (Test-asosidagi) generatorining "asosiy havza + zaxira"
 * (`fetchCandidatesWithFallback`) fallback'iga muqobil. Mavzu cheklovi
 * olib tashlangan bo'lsa, chaqiruvchi buni `createSessionFromSections`ning
 * `relaxedSections` natijasidan bilib oladi (jimgina kengaymaydi).
 */
export interface SectionSpec {
  subjectId: string;
  subjectName: string;
  count: number;
  pointsPerQuestion: number;
  bias: 'easy' | 'advanced';
  topicPaths?: string[];
}

function biasToDifficultyRange(bias: SectionSpec['bias']): { min: number; max: number } {
  return bias === 'easy' ? { min: 1, max: 2 } : { min: 3, max: 5 };
}

export interface CreateSessionFromSectionsParams {
  userId: string;
  sections: SectionSpec[];
  durationMin: number;
  mode: 'FIXED' | 'ADAPTIVE';
  title: string;
  /** createSessionFromSpec'dagi bilan bir xil qoida — qarang shu faylning yuqorisidagi izoh. */
  countsAgainstQuota: boolean;
}

export type CreateSessionFromSectionsError =
  | { status: 404; error: string }
  | { status: 429; error: string; code: 'BUILT_TEST_QUOTA_EXCEEDED'; usedToday: number; limit: number | null }
  | {
      status: 422;
      error: string;
      code: 'SECTION_INSUFFICIENT_POOL';
      subjectName: string;
      available: number;
      required: number;
    };

export type CreateSessionFromSectionsOutcome =
  | { ok: true; session: CreatedSession; relaxedSections: string[] }
  | { ok: false; error: CreateSessionFromSectionsError };

/**
 * `sections`dagi har bir bo'lim uchun ALOHIDA `pickItemsForSpec` chaqiradi
 * (bo'lim subjectId + bias'iga mos qiyinlik oralig'i, bor bo'lsa
 * `topicPaths` bilan) va natijalarni bitta sessiyaga birlashtiradi. Boshqa
 * bo'lim allaqachon olib qo'ygan item'lar (`excludeItemIds`) takrorlanmasligi
 * uchun bo'limlar KETMA-KET (parallel emas) tanlanadi — bitta fan (masalan
 * Matematika) ham mutaxassislik, ham majburiy bo'lim sifatida ishtirok etsa,
 * ikkalasi har xil savol olishi shu tartib bilan kafolatlanadi.
 *
 * Ballar POZITSIYA emas, ITEM ID bo'yicha `itemPoints`ga yoziladi va
 * `TestSession.spec.itemPoints` sifatida saqlanadi — `toPresentedQuestions`
 * savollarni `seed` bo'yicha aralashtirgandan keyin ham to'g'ri ball
 * ko'rsatilishi shu orqali kafolatlanadi (qarang `loadSessionItems`).
 *
 * `relaxedSections` — `topicPaths` berilgan bo'limlardan qaysi biri
 * (`subjectName` bo'yicha) havza yetishmagani sababli mavzu cheklovisiz
 * to'ldirilganini bildiradi (`pickItemsForSpec`ning `relaxed` natijasida
 * `'neighborTopics'` bo'lsa). Bo'sh massiv — barcha bo'lim o'z mavzu
 * cheklovi ichida to'liq to'ldirilgan.
 */
export async function createSessionFromSections(
  params: CreateSessionFromSectionsParams
): Promise<CreateSessionFromSectionsOutcome> {
  const { userId, sections, durationMin, mode, title, countsAgainstQuota } = params;

  const seed = Math.floor(Math.random() * 2 ** 31);
  const excludeItemIds: string[] = [];
  const itemIds: string[] = [];
  const itemPoints: Record<string, number> = {};
  const relaxedSections: string[] = [];

  for (const section of sections) {
    const range = biasToDifficultyRange(section.bias);
    const spec: ItemSpec = {
      subjectIds: [section.subjectId],
      difficultyMin: range.min,
      difficultyMax: range.max,
      ...(section.topicPaths?.length ? { topicPaths: section.topicPaths } : {}),
    };
    const { ids: pickedIds, relaxed } = await pickItemsForSpec({ spec, limit: section.count, seed, excludeItemIds });
    if (section.topicPaths?.length && relaxed.includes('neighborTopics')) {
      relaxedSections.push(section.subjectName);
    }

    if (pickedIds.length < section.count) {
      // Xabarda ko'rsatiladigan "mavjud" son — qiyinlik cheklovisiz, butun
      // fan havzasi (boshqa bo'lim allaqachon olganlarni hisobga olmagan
      // holda) — foydalanuvchiga "necha ta yetishmayapti" haqida to'g'ri
      // tasavvur berish uchun.
      const available = await db.item.count({
        where: buildItemWhere({ subjectIds: [section.subjectId] }, excludeItemIds),
      });
      return {
        ok: false,
        error: {
          status: 422,
          error: `"${section.subjectName}" fani bo'yicha bazada yetarli savol yo'q (${available}/${section.count}).`,
          code: 'SECTION_INSUFFICIENT_POOL',
          subjectName: section.subjectName,
          available,
          required: section.count,
        },
      };
    }

    for (const id of pickedIds) {
      excludeItemIds.push(id);
      itemIds.push(id);
      itemPoints[id] = section.pointsPerQuestion;
    }
  }

  if (itemIds.length === 0) {
    return { ok: false, error: { status: 404, error: "Berilgan bo'limlarga mos savol topilmadi" } };
  }

  // Kvota — sessiya YARATILGANDA hisoblanadi (createSessionFromSpec bilan bir xil qoida).
  if (countsAgainstQuota) {
    const quota = await consumeBuiltTest(userId);
    if (!quota.allowed) {
      return {
        ok: false,
        error: {
          status: 429,
          error: `Bugungi bepul test tuzish limiti (${quota.limit} ta) tugadi. Ertaga yana ${quota.limit} ta bepul bo'ladi, yoki Premium tarifda cheksiz.`,
          code: 'BUILT_TEST_QUOTA_EXCEEDED',
          usedToday: quota.usedToday,
          limit: quota.limit,
        },
      };
    }
  }

  const spec = { sections, itemPoints };
  const now = new Date();
  const testSession = await db.testSession.create({
    data: {
      userId,
      title,
      spec: spec as unknown as Prisma.InputJsonValue,
      itemIds,
      seed,
      mode,
      durationMin,
      startedAt: now,
      expiresAt: new Date(now.getTime() + durationMin * 60_000),
    },
  });

  const items = await loadSessionItems(testSession.itemIds, itemPoints);
  const questions = toPresentedQuestions(items, testSession.seed, sessionPreserveOrder(spec));

  return {
    ok: true,
    session: {
      id: testSession.id,
      title: testSession.title,
      mode: testSession.mode,
      durationMin: testSession.durationMin,
      startedAt: testSession.startedAt,
      expiresAt: testSession.expiresAt,
      questionCount: questions.length,
      questions,
    },
    relaxedSections,
  };
}
