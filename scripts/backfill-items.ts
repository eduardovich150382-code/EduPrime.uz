/**
 * MUHIM: bu skript Prisma Client orqali bazaga ulanadi, lekin loyihada
 * hozircha na lokal bazaga, na GitHub runner'idan Neon'ga ulanish yo'q
 * (CLAUDE.md) — shuning uchun bu fayl hozircha ishga tushirib bo'lmaydi.
 * Amaldagi variant — `scripts/generate-backfill-sql.ts` orqali hosil
 * qilingan sof SQL (`prisma/backfill/01-items.sql`), Neon SQL Editor'ga
 * qo'lda qo'yiladi. Bu fayl bazaga ulanish tiklangan kunda, `--apply` bilan
 * qayta ishlatish uchun saqlab qolingan — ikkalasi ham bir xil mantiqni
 * (dublikat aniqlash, mavzu moslashtirish) amalga oshiradi.
 *
 * Mavjud Question/BankQuestion yozuvlarini kanonik Item jadvaliga
 * ko'chiradi (prisma/schema.prisma#Item — hozircha faqat sxema, hech qanday
 * oqim undan foydalanmaydi). Rejalashtirish mantig'i (dublikat aniqlash,
 * mavzu moslashtirish) bazasiz, sof funksiyalar sifatida
 * `backfill-items-lib.ts`da — shu fayl faqat bazadan o'qiydi, rejani
 * hisoblatadi va (--apply bo'lsa) yozadi.
 *
 * IDEMPOTENT: qayta ishga tushirilsa dublikat yaratmaydi —
 * Item.legacyBankId / Item.legacyQuestionId orqali "allaqachon ko'chirilgan"
 * qatorlar o'tkazib yuboriladi, TestItem/ItemTopic uchun ham mavjud
 * juftliklar oldindan tekshiriladi (backfill-items-lib.ts#ExistingItemsState).
 *
 * Standart holat — DRY-RUN: hech narsa yozilmaydi, faqat hisobot chiqadi.
 * Yozish uchun ANIQ `--apply` kerak:
 *   npx tsx scripts/backfill-items.ts            # dry-run (standart)
 *   npx tsx scripts/backfill-items.ts --dry-run   # dry-run (aniq)
 *   npx tsx scripts/backfill-items.ts --apply     # haqiqiy yozish
 *
 * CLAUDE.md: bu skript hech qachon lokal terminaldan prod bazaga qarshi
 * ishga tushirilmasin. PR faqat kodni o'z ichiga oladi — ishga tushirish
 * loyiha egasining zimmasida, ulanish mavjud bo'lgan muhitda.
 *
 * Question yoki BankQuestion'dan HECH NARSA o'chirilmaydi yoki
 * o'zgartirilmaydi — bu faqat qo'shimcha (additive) ko'chirish.
 */
import { ExplanationSource, ItemSource, ItemVisibility, Prisma, QuestionType } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  BankQuestionRow,
  ExistingItemsState,
  ItemRef,
  PlannedItemData,
  PlannedItemTopic,
  PlannedNewItem,
  PlannedTestItem,
  QuestionRow,
  computeDuplicateKey,
  planBackfill,
} from "./backfill-items-lib";

// Bir tranzaksiyada nechta yozuv — CLAUDE.md: "katta tranzaksiya Neon'da
// timeout beradi", shuning uchun bo'laklab (bir marta 100 tadan) bajariladi.
const BATCH_SIZE = 100;

function parseArgs(argv: string[]): { apply: boolean } {
  const hasApply = argv.includes("--apply");
  const hasDryRun = argv.includes("--dry-run");

  if (hasApply && hasDryRun) {
    console.error("Xato: --apply va --dry-run birga berilmaydi.");
    process.exit(1);
  }

  // Standart holat — dry-run. Yozish uchun ANIQ --apply talab qilinadi.
  return { apply: hasApply };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ===================== Bazadan hozirgi holatni yuklash =====================

async function loadExistingState(): Promise<ExistingItemsState> {
  const [bankMigrated, questionMigrated, allItems, testItemPairs, itemTopicPairs, topicNodes] = await Promise.all([
    db.item.findMany({ where: { legacyBankId: { not: null } }, select: { id: true, legacyBankId: true } }),
    db.item.findMany({ where: { legacyQuestionId: { not: null } }, select: { id: true, legacyQuestionId: true } }),
    db.item.findMany({ select: { id: true, subjectId: true, text: true, correctAnswer: true } }),
    db.testItem.findMany({ select: { testId: true, itemId: true } }),
    db.itemTopic.findMany({ select: { itemId: true, topicId: true } }),
    db.topicNode.findMany({ select: { id: true, subjectId: true, slug: true } }),
  ]);

  const migratedBankIds = new Map<string, string>();
  for (const row of bankMigrated) {
    if (row.legacyBankId) migratedBankIds.set(row.legacyBankId, row.id);
  }

  const migratedQuestionIds = new Map<string, string>();
  for (const row of questionMigrated) {
    if (row.legacyQuestionId) migratedQuestionIds.set(row.legacyQuestionId, row.id);
  }

  const duplicateKeyToItemRef = new Map<string, ItemRef>();
  for (const row of allItems) {
    const key = computeDuplicateKey(row.subjectId, row.text, row.correctAnswer);
    // Bir nechta mavjud Item bir xil kalitga tushishi mumkin emas (bu
    // skriptning o'zi buni oldini oladi), lekin ehtiyot uchun — birinchisi
    // g'olib.
    if (!duplicateKeyToItemRef.has(key)) {
      duplicateKeyToItemRef.set(key, { kind: "existing", id: row.id });
    }
  }

  const existingTestItemKeys = new Set(testItemPairs.map((p) => `${p.testId}:e:${p.itemId}`));
  const existingItemTopicKeys = new Set(itemTopicPairs.map((p) => `e:${p.itemId}:${p.topicId}`));

  const topicSlugsBySubject = new Map<string, Map<string, string>>();
  for (const node of topicNodes) {
    if (!topicSlugsBySubject.has(node.subjectId)) {
      topicSlugsBySubject.set(node.subjectId, new Map());
    }
    topicSlugsBySubject.get(node.subjectId)!.set(node.slug, node.id);
  }

  return {
    migratedBankIds,
    migratedQuestionIds,
    duplicateKeyToItemRef,
    existingTestItemKeys,
    existingItemTopicKeys,
    topicSlugsBySubject,
  };
}

async function loadBankQuestions(): Promise<BankQuestionRow[]> {
  const rows: BankQuestionRow[] = [];
  let skip = 0;

  for (;;) {
    const page = await db.bankQuestion.findMany({
      orderBy: { id: "asc" },
      skip,
      take: BATCH_SIZE,
    });
    if (page.length === 0) break;

    for (const q of page) {
      rows.push({
        id: q.id,
        teacherId: q.teacherId,
        subjectId: q.subjectId,
        text: q.text,
        images: q.images,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type,
        explanation: q.explanation,
        explanationImages: q.explanationImages,
        topic: q.topic,
        bloomLevel: q.bloomLevel,
        difficulty: q.difficulty,
      });
    }
    skip += BATCH_SIZE;
  }

  return rows;
}

async function loadQuestions(): Promise<QuestionRow[]> {
  const rows: QuestionRow[] = [];
  let skip = 0;

  for (;;) {
    const page = await db.question.findMany({
      orderBy: { id: "asc" },
      skip,
      take: BATCH_SIZE,
      include: { test: { select: { subjectId: true, accessType: true, teacherId: true } } },
    });
    if (page.length === 0) break;

    for (const q of page) {
      rows.push({
        id: q.id,
        testId: q.testId,
        testSubjectId: q.test.subjectId,
        testAccessType: q.test.accessType,
        testTeacherId: q.test.teacherId,
        text: q.text,
        images: q.images,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type,
        explanation: q.explanation,
        explanationImages: q.explanationImages,
        videoUrl: q.videoUrl,
        topic: q.topic,
        bloomLevel: q.bloomLevel,
        difficulty: q.difficulty,
        subjectId: q.subjectId,
        order: q.order,
        points: q.points,
        templateId: q.templateId,
        variantSig: q.variantSig,
        grade: q.grade,
        exams: q.exams,
        lang: q.lang,
        tags: q.tags,
        source: q.source,
      });
    }
    skip += BATCH_SIZE;
  }

  return rows;
}

// ===================== Rejani bajarish (--apply) =====================

function toItemCreateInput(data: PlannedItemData): Prisma.ItemUncheckedCreateInput {
  return {
    authorTeacherId: data.authorTeacherId,
    subjectId: data.subjectId,
    text: data.text,
    images: data.images,
    options: data.options as Prisma.InputJsonValue,
    correctAnswer: data.correctAnswer,
    type: data.type as QuestionType,
    explanation: data.explanation,
    explanationImages: data.explanationImages,
    explanationSource: data.explanationSource as ExplanationSource,
    videoUrl: data.videoUrl,
    grade: data.grade,
    exams: data.exams,
    bloomLevel: data.bloomLevel,
    difficulty: data.difficulty,
    tags: data.tags,
    lang: data.lang,
    source: data.source as ItemSource,
    visibility: data.visibility as ItemVisibility,
    templateId: data.templateId,
    variantSig: data.variantSig,
    legacyQuestionId: data.legacyQuestionId ?? null,
    legacyBankId: data.legacyBankId ?? null,
  };
}

/** Barcha yangi Item'larni bo'laklab yozadi, `tempId -> haqiqiy id` xaritasini qaytaradi. */
async function executeNewItems(newItems: PlannedNewItem[]): Promise<Map<string, string>> {
  const tempIdToRealId = new Map<string, string>();
  const batches = chunk(newItems, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const created = await db.$transaction(batch.map((planned) => db.item.create({ data: toItemCreateInput(planned.data) })));
    created.forEach((row, idx) => tempIdToRealId.set(batch[idx].tempId, row.id));
    console.log(`  Item yozildi: ${tempIdToRealId.size}/${newItems.length}`);
  }

  return tempIdToRealId;
}

function resolveItemId(ref: ItemRef, tempIdToRealId: Map<string, string>): string {
  if (ref.kind === "existing") return ref.id;
  const id = tempIdToRealId.get(ref.tempId);
  if (!id) {
    throw new Error(`Ichki xato: "${ref.tempId}" uchun hali yozilgan Item id topilmadi.`);
  }
  return id;
}

async function executeTestItems(testItems: PlannedTestItem[], tempIdToRealId: Map<string, string>): Promise<void> {
  const batches = chunk(testItems, BATCH_SIZE);
  let written = 0;

  for (const batch of batches) {
    await db.$transaction(
      batch.map((ti) =>
        db.testItem.create({
          data: {
            testId: ti.testId,
            itemId: resolveItemId(ti.itemRef, tempIdToRealId),
            order: ti.order,
            points: ti.points,
          },
        })
      )
    );
    written += batch.length;
    console.log(`  TestItem yozildi: ${written}/${testItems.length}`);
  }
}

async function executeItemTopics(itemTopics: PlannedItemTopic[], tempIdToRealId: Map<string, string>): Promise<void> {
  const batches = chunk(itemTopics, BATCH_SIZE);
  let written = 0;

  for (const batch of batches) {
    await db.$transaction(
      batch.map((it) =>
        db.itemTopic.create({
          data: {
            itemId: resolveItemId(it.itemRef, tempIdToRealId),
            topicId: it.topicId,
          },
        })
      )
    );
    written += batch.length;
    console.log(`  ItemTopic yozildi: ${written}/${itemTopics.length}`);
  }
}

// ===================== Hisobot =====================

function printReport(plan: Awaited<ReturnType<typeof planBackfill>>, dryRun: boolean): void {
  const { report } = plan;

  console.log("");
  console.log(dryRun ? "===== DRY-RUN HISOBOTI (hech narsa yozilmadi) =====" : "===== YOZISH YAKUNLANDI =====");
  console.log(`BankQuestion -> Item: ${report.bankItemsCreated} yaratildi, ${report.bankItemsAlreadyMigrated} allaqachon ko'chirilgan edi`);
  console.log(
    `Question -> Item: ${report.questionItemsCreated} yaratildi, ${report.questionDuplicatesLinked} dublikat sifatida mavjud Item'ga bog'landi, ${report.questionItemsAlreadyMigrated} allaqachon ko'chirilgan edi`
  );
  console.log(`TestItem: ${report.testItemsPlanned} ${dryRun ? "yaratilgan bo'lardi" : "yaratildi"}`);
  console.log(`ItemTopic: ${report.topicsLinked} bog'landi`);
  console.log(`Mavzuga bog'lanmagan savollar: ${report.topicsUnmatched.length}`);

  if (report.topicsUnmatched.length > 0) {
    console.log("");
    console.log("  Mavzuga bog'lanmagan ro'yxat (manba, id, subjectId, topic):");
    for (const u of report.topicsUnmatched) {
      console.log(`    - [${u.source}] ${u.sourceId} (subject=${u.subjectId}): "${u.topic}"`);
    }
  }
}

// ===================== main =====================

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2));
  const dryRun = !apply;

  console.log(dryRun ? "Rejim: DRY-RUN (yozilmaydi)" : "Rejim: APPLY (bazaga yoziladi)");
  console.log("Bazadan hozirgi holat yuklanmoqda...");
  const state = await loadExistingState();

  console.log("BankQuestion va Question yuklanmoqda...");
  const [bankRows, questionRows] = await Promise.all([loadBankQuestions(), loadQuestions()]);
  console.log(`Topildi: ${bankRows.length} ta BankQuestion, ${questionRows.length} ta Question.`);

  const plan = planBackfill(bankRows, questionRows, state);

  if (dryRun) {
    printReport(plan, true);
    return;
  }

  console.log(`Yozish boshlanmoqda: ${plan.newItems.length} ta Item, ${plan.testItems.length} ta TestItem, ${plan.itemTopics.length} ta ItemTopic.`);
  const tempIdToRealId = await executeNewItems(plan.newItems);
  await executeTestItems(plan.testItems, tempIdToRealId);
  await executeItemTopics(plan.itemTopics, tempIdToRealId);

  printReport(plan, false);
}

// Faqat to'g'ridan-to'g'ri `npx tsx scripts/backfill-items.ts` orqali
// chaqirilganda ishga tushadi — test fayli pure funksiyalarni shu yon
// ta'sirsiz (bazaga ulanmasdan) import qila oladi.
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
