/**
 * `backfill-items.ts` uchun sof (bazasiz) mantiq: dublikat aniqlash, mavzu
 * matnini TopicNode.slug bilan moslashtirish va butun ko'chirish rejasini
 * (`BackfillPlan`) hisoblash. Bazaga bog'liq emas — shuning uchun testlar
 * (backfill-items.test.ts) haqiqiy Prisma Client'siz, to'g'ridan-to'g'ri shu
 * funksiyalarni tekshiradi (prisma/seeds/topic-tree.ts bilan bir xil naqsh).
 *
 * `execute*` (haqiqiy yozish) qismi backfill-items.ts'da — bu fayl faqat
 * "nima qilish kerak"ni hisoblaydi, "qanday qilish"ni emas.
 */
import crypto from "crypto";

// ===================== Sof yordamchi funksiyalar =====================

/**
 * Lotin apostrof variantlarini (', ', ʻ, ʼ, `) olib tashlaydi va
 * bo'shliqlarni siqadi — "O'zbekiston" va "Oʻzbekiston" bir xil matn
 * sifatida solishtirilsin (lib/dtm-online.ts#normalizeUzText bilan bir xil
 * naqsh, lekin bu yerda mustaqil — skript src/lib ga bog'liq bo'lmasin).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dublikat aniqlash kaliti: subjectId + normallashtirilgan text +
 * normallashtirilgan correctAnswer bo'yicha SHA-256 xesh. Bank'dan yoki
 * Question'dan kelganidan qat'i nazar — bir xil mazmun bir xil kalitga
 * tushadi, shuning uchun Item jadvalida haqiqiy kanonizatsiya ta'minlanadi
 * (nafaqat Question'lar orasida, balki BankQuestion'dan ko'chirilgan
 * Item'larga nisbatan ham).
 */
export function computeDuplicateKey(
  subjectId: string,
  text: string,
  correctAnswer: string
): string {
  const raw = `${subjectId}::${normalizeText(text)}::${normalizeText(correctAnswer)}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

const SLUG_SAFE_RE = /[^a-z0-9]+/g;

/**
 * Erkin "topic" matnini TopicNode.slug formatiga o'giradi — faqat kichik
 * lotin harflar, raqamlar va tire (prisma/seeds/topic-tree.ts#SLUG_RE bilan
 * bir xil format). Moslik faqat ANIQ shu formatdagi slug bilan qidiriladi —
 * taxminiy ("fuzzy") moslashtirish yo'q: noto'g'ri bog'lash noto'g'ri bilim
 * xaritasiga olib keladi, shuning uchun mos kelmasa hisobotga yozib,
 * bog'lanmay qoladi (aniq emaslikdan ko'ra bog'lanmagan holat afzal).
 */
export function normalizeTopicToSlug(topic: string): string {
  return normalizeText(topic)
    .replace(SLUG_SAFE_RE, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Test.accessType='free' bo'lsa savol matni testni yechayotgan har bir
 * foydalanuvchiga bepul ko'rinadi — shu Item ham PUBLIC bo'lishi kerak.
 * Boshqa barcha accessType (premium, teacher, premium_teacher, paid)
 * pullik — Item PRIVATE qoladi (CLAUDE.md: paywall, lib/access.ts).
 */
export function resolveVisibilityFromAccessType(accessType: string): "PUBLIC" | "PRIVATE" {
  return accessType === "free" ? "PUBLIC" : "PRIVATE";
}

// ===================== Kirish qatorlari =====================

export interface BankQuestionRow {
  id: string;
  teacherId: string;
  subjectId: string;
  text: string;
  images: string[];
  options: unknown;
  correctAnswer: string;
  type: string;
  explanation: string | null;
  explanationImages: string[];
  topic: string | null;
  bloomLevel: string | null;
  difficulty: number | null;
}

export interface QuestionRow {
  id: string;
  testId: string;
  /** Test.subjectId — Question.subjectId null bo'lsa shunga tushiladi. */
  testSubjectId: string;
  testAccessType: string;
  testTeacherId: string | null;
  text: string;
  images: string[];
  options: unknown;
  correctAnswer: string;
  type: string;
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  topic: string | null;
  bloomLevel: string | null;
  difficulty: number | null;
  /** Faqat generatsiya qilingan savollarda to'ldirilgan (masalan DTM Online) — bo'sh bo'lsa testSubjectId ishlatiladi. */
  subjectId: string | null;
  order: number;
  points: number;
  templateId: string | null;
  variantSig: string | null;
  grade: number[];
  exams: string[];
  lang: string;
  tags: string[];
  source: string; // "manual" | "parametric"
}

// ===================== Reja tuzilmalari =====================

/**
 * Item'ga havola — "new" bo'lsa hali bazada yo'q, chunki cuid id faqat
 * haqiqiy INSERT vaqtida hosil bo'ladi (Item.id — Prisma-darajasidagi
 * default, DB-darajasida emas). Shu sababli reja bosqichida item'lar
 * o'zaro shu vaqtinchalik `tempId` orqali bog'lanadi; haqiqiy id faqat
 * ijro (execute) bosqichida, yozuv hosil bo'lgach ma'lum bo'ladi.
 */
export type ItemRef = { kind: "existing"; id: string } | { kind: "new"; tempId: string };

export interface PlannedItemData {
  authorTeacherId: string | null;
  subjectId: string;
  text: string;
  images: string[];
  options: unknown;
  correctAnswer: string;
  type: string;
  explanation: string | null;
  explanationImages: string[];
  explanationSource: "AUTHORED" | "NONE";
  videoUrl: string | null;
  grade: number[];
  exams: string[];
  bloomLevel: string | null;
  difficulty: number | null;
  tags: string[];
  lang: string;
  source: "MANUAL" | "PARAMETRIC";
  visibility: "PUBLIC" | "PRIVATE";
  templateId: string | null;
  variantSig: string | null;
  legacyQuestionId?: string;
  legacyBankId?: string;
}

export interface PlannedNewItem {
  tempId: string;
  data: PlannedItemData;
}

export interface PlannedTestItem {
  testId: string;
  itemRef: ItemRef;
  order: number;
  points: number;
}

export interface PlannedItemTopic {
  itemRef: ItemRef;
  topicId: string;
}

export interface UnmatchedTopic {
  source: "bank" | "question";
  sourceId: string;
  subjectId: string;
  topic: string;
}

export interface BackfillReport {
  bankItemsCreated: number;
  bankItemsAlreadyMigrated: number;
  questionItemsCreated: number;
  questionItemsAlreadyMigrated: number;
  questionDuplicatesLinked: number;
  testItemsPlanned: number;
  topicsLinked: number;
  topicsUnmatched: UnmatchedTopic[];
}

export interface BackfillPlan {
  newItems: PlannedNewItem[];
  testItems: PlannedTestItem[];
  itemTopics: PlannedItemTopic[];
  report: BackfillReport;
}

/**
 * Ko'chirishdan oldingi bazaning hozirgi holati — dublikat va idempotentlik
 * tekshiruvlari uchun kerak bo'lgan hamma narsa. `backfill-items.ts`
 * bazadan yuklaydi, testlarda qo'lda tuziladi.
 *
 * DIQQAT: quyidagi `plan*` funksiyalari shu obyekt ichidagi Map/Set'larni
 * JOYIDA (in place) yangilaydi — bank savollari uchun reja tuzilgach, xuddi
 * shu holat savollar uchun rejaga uzatiladi, shunda ikkinchisi birinchisida
 * yangi yaratilgan Item'larni ham dublikat sifatida ko'ra oladi.
 */
export interface ExistingItemsState {
  /** legacyBankId -> Item.id, avvalgi ishga tushirishda ko'chirilgan. */
  migratedBankIds: Map<string, string>;
  /** legacyQuestionId -> Item.id, avvalgi ishga tushirishda ko'chirilgan. */
  migratedQuestionIds: Map<string, string>;
  /** Dublikat kaliti -> ItemRef — bazadagi barcha mavjud Item'lar (manbasidan qat'i nazar) + shu ishga tushirishda rejalashtirilgan yangilari. */
  duplicateKeyToItemRef: Map<string, ItemRef>;
  /** `${testId}:e:${itemId}` — allaqachon mavjud TestItem juftliklari. */
  existingTestItemKeys: Set<string>;
  /** `e:${itemId}:${topicId}` — allaqachon mavjud ItemTopic juftliklari. */
  existingItemTopicKeys: Set<string>;
  /** subjectId -> (slug -> TopicNode.id). */
  topicSlugsBySubject: Map<string, Map<string, string>>;
}

export function createEmptyState(): ExistingItemsState {
  return {
    migratedBankIds: new Map(),
    migratedQuestionIds: new Map(),
    duplicateKeyToItemRef: new Map(),
    existingTestItemKeys: new Set(),
    existingItemTopicKeys: new Set(),
    topicSlugsBySubject: new Map(),
  };
}

function itemRefKey(ref: ItemRef): string {
  return ref.kind === "existing" ? `e:${ref.id}` : `n:${ref.tempId}`;
}

/**
 * `topic` mos TopicNode'ga topilsa `itemTopics`ga, topilmasa
 * `report.topicsUnmatched`ga qo'shadi. `topic` bo'sh/`null` bo'lsa hech
 * narsa qilmaydi — savolda mavzu tegi umuman bo'lmasligi xato emas.
 */
function linkTopic(
  subjectId: string,
  topic: string | null,
  itemRef: ItemRef,
  source: "bank" | "question",
  sourceId: string,
  state: ExistingItemsState,
  itemTopics: PlannedItemTopic[],
  plannedItemTopicKeys: Set<string>,
  unmatched: UnmatchedTopic[]
): boolean {
  if (!topic || !topic.trim()) return false;

  const slug = normalizeTopicToSlug(topic);
  const topicId = state.topicSlugsBySubject.get(subjectId)?.get(slug);

  if (!topicId) {
    unmatched.push({ source, sourceId, subjectId, topic });
    return false;
  }

  const key = `${itemRefKey(itemRef)}:${topicId}`;
  if (itemRef.kind === "existing" && state.existingItemTopicKeys.has(`e:${itemRef.id}:${topicId}`)) {
    return false; // allaqachon bog'langan — qayta yozmaymiz
  }
  if (plannedItemTopicKeys.has(key)) return false; // shu ishga tushirishda allaqachon rejalashtirilgan

  plannedItemTopicKeys.add(key);
  itemTopics.push({ itemRef, topicId });
  return true;
}

/**
 * Har BankQuestion uchun Item rejalashtiradi. Allaqachon ko'chirilgan
 * qatorlar o'tkazib yuboriladi (faqat mavzu bog'lanishi qayta tekshiriladi
 * — oldingi ishga tushirish yarim to'xtagan bo'lishi mumkin).
 */
export function planBankQuestions(
  rows: BankQuestionRow[],
  state: ExistingItemsState,
  itemTopics: PlannedItemTopic[],
  plannedItemTopicKeys: Set<string>,
  unmatched: UnmatchedTopic[]
): { newItems: PlannedNewItem[]; created: number; alreadyMigrated: number; topicsLinked: number } {
  const newItems: PlannedNewItem[] = [];
  let created = 0;
  let alreadyMigrated = 0;
  let topicsLinked = 0;

  for (const row of rows) {
    const existingId = state.migratedBankIds.get(row.id);
    if (existingId) {
      alreadyMigrated++;
      if (linkTopic(row.subjectId, row.topic, { kind: "existing", id: existingId }, "bank", row.id, state, itemTopics, plannedItemTopicKeys, unmatched)) {
        topicsLinked++;
      }
      continue;
    }

    const tempId = `bank:${row.id}`;
    const itemRef: ItemRef = { kind: "new", tempId };
    const data: PlannedItemData = {
      authorTeacherId: row.teacherId,
      subjectId: row.subjectId,
      text: row.text,
      images: row.images,
      options: row.options,
      correctAnswer: row.correctAnswer,
      type: row.type,
      explanation: row.explanation,
      explanationImages: row.explanationImages,
      explanationSource: row.explanation ? "AUTHORED" : "NONE",
      videoUrl: null,
      grade: [],
      exams: [],
      bloomLevel: row.bloomLevel,
      difficulty: row.difficulty,
      tags: [],
      lang: "uz",
      source: "MANUAL",
      // Bank savollari standart PRIVATE — Test'ga bog'lanmagan, shuning
      // uchun accessType'dan kelib chiqadigan bepul/pullik qoidasi yo'q.
      visibility: "PRIVATE",
      templateId: null,
      variantSig: null,
      legacyBankId: row.id,
    };

    newItems.push({ tempId, data });
    created++;

    const dupKey = computeDuplicateKey(row.subjectId, row.text, row.correctAnswer);
    if (!state.duplicateKeyToItemRef.has(dupKey)) {
      state.duplicateKeyToItemRef.set(dupKey, itemRef);
    }

    if (linkTopic(row.subjectId, row.topic, itemRef, "bank", row.id, state, itemTopics, plannedItemTopicKeys, unmatched)) {
      topicsLinked++;
    }
  }

  return { newItems, created, alreadyMigrated, topicsLinked };
}

/**
 * Har Question uchun: mavjud bo'lsa o'tkazib yuboradi (idempotentlik),
 * mazmuni bo'yicha dublikat topilsa mavjud Item'ga bog'laydi, aks holda
 * yangi Item rejalashtiradi. Har holatda ham TestItem rejalashtiriladi —
 * bu Question qaysi Test'ga tegishli ekanini saqlab qolish uchun shart.
 */
export function planQuestions(
  rows: QuestionRow[],
  state: ExistingItemsState,
  itemTopics: PlannedItemTopic[],
  plannedItemTopicKeys: Set<string>,
  unmatched: UnmatchedTopic[]
): {
  newItems: PlannedNewItem[];
  testItems: PlannedTestItem[];
  created: number;
  alreadyMigrated: number;
  duplicatesLinked: number;
  topicsLinked: number;
} {
  const newItems: PlannedNewItem[] = [];
  const testItems: PlannedTestItem[] = [];
  const plannedTestItemKeys = new Set<string>();
  let created = 0;
  let alreadyMigrated = 0;
  let duplicatesLinked = 0;
  let topicsLinked = 0;

  for (const row of rows) {
    const effectiveSubjectId = row.subjectId ?? row.testSubjectId;
    let itemRef: ItemRef;

    const existingId = state.migratedQuestionIds.get(row.id);
    if (existingId) {
      itemRef = { kind: "existing", id: existingId };
      alreadyMigrated++;
    } else {
      const dupKey = computeDuplicateKey(effectiveSubjectId, row.text, row.correctAnswer);
      const existingRef = state.duplicateKeyToItemRef.get(dupKey);
      if (existingRef) {
        itemRef = existingRef;
        duplicatesLinked++;
      } else {
        const tempId = `question:${row.id}`;
        itemRef = { kind: "new", tempId };
        const data: PlannedItemData = {
          authorTeacherId: row.testTeacherId,
          subjectId: effectiveSubjectId,
          text: row.text,
          images: row.images,
          options: row.options,
          correctAnswer: row.correctAnswer,
          type: row.type,
          explanation: row.explanation,
          explanationImages: row.explanationImages,
          explanationSource: row.explanation ? "AUTHORED" : "NONE",
          videoUrl: row.videoUrl,
          grade: row.grade,
          exams: row.exams,
          bloomLevel: row.bloomLevel,
          difficulty: row.difficulty,
          tags: row.tags,
          lang: row.lang,
          source: row.source === "parametric" ? "PARAMETRIC" : "MANUAL",
          visibility: resolveVisibilityFromAccessType(row.testAccessType),
          templateId: row.templateId,
          variantSig: row.variantSig,
          legacyQuestionId: row.id,
        };
        newItems.push({ tempId, data });
        created++;
        state.duplicateKeyToItemRef.set(dupKey, itemRef);
      }
    }

    const testItemKey = `${row.testId}:${itemRefKey(itemRef)}`;
    const alreadyExists =
      itemRef.kind === "existing" && state.existingTestItemKeys.has(`${row.testId}:e:${itemRef.id}`);
    if (!alreadyExists && !plannedTestItemKeys.has(testItemKey)) {
      plannedTestItemKeys.add(testItemKey);
      testItems.push({ testId: row.testId, itemRef, order: row.order, points: row.points });
    }

    if (linkTopic(effectiveSubjectId, row.topic, itemRef, "question", row.id, state, itemTopics, plannedItemTopicKeys, unmatched)) {
      topicsLinked++;
    }
  }

  return { newItems, testItems, created, alreadyMigrated, duplicatesLinked, topicsLinked };
}

/**
 * To'liq ko'chirish rejasini hisoblaydi: avval BankQuestion'lar, keyin
 * Question'lar (shu tartibda — bank Item'lari savollar uchun dublikat
 * nishoni sifatida ham ishlatiladi). `state` chaqiruvchidan kelgan
 * obyektning o'zi — joyida yangilanadi, shuning uchun bir marta
 * ishlatilgach uni qayta ishlatmang (yangisini `createEmptyState()` bilan
 * oling yoki bazadan qayta yuklang).
 */
export function planBackfill(
  bankRows: BankQuestionRow[],
  questionRows: QuestionRow[],
  state: ExistingItemsState
): BackfillPlan {
  const itemTopics: PlannedItemTopic[] = [];
  const plannedItemTopicKeys = new Set<string>();
  const unmatched: UnmatchedTopic[] = [];

  const bankResult = planBankQuestions(bankRows, state, itemTopics, plannedItemTopicKeys, unmatched);
  const questionResult = planQuestions(questionRows, state, itemTopics, plannedItemTopicKeys, unmatched);

  const newItems = [...bankResult.newItems, ...questionResult.newItems];

  return {
    newItems,
    testItems: questionResult.testItems,
    itemTopics,
    report: {
      bankItemsCreated: bankResult.created,
      bankItemsAlreadyMigrated: bankResult.alreadyMigrated,
      questionItemsCreated: questionResult.created,
      questionItemsAlreadyMigrated: questionResult.alreadyMigrated,
      questionDuplicatesLinked: questionResult.duplicatesLinked,
      testItemsPlanned: questionResult.testItems.length,
      topicsLinked: bankResult.topicsLinked + questionResult.topicsLinked,
      topicsUnmatched: unmatched,
    },
  };
}
