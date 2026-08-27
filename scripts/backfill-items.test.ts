import { describe, expect, it } from "vitest";
import {
  BankQuestionRow,
  QuestionRow,
  computeDuplicateKey,
  createEmptyState,
  normalizeText,
  normalizeTopicToSlug,
  planBackfill,
  resolveVisibilityFromAccessType,
} from "./backfill-items-lib";

// ===================== Sof yordamchi funksiyalar =====================

describe("normalizeText", () => {
  it("bo'shliqlarni siqadi va kichik harfga o'tkazadi", () => {
    expect(normalizeText("  Kvadrat   tenglama  ")).toBe("kvadrat tenglama");
  });

  it("lotin apostrof variantlarini bir xillashtiradi", () => {
    const variants = ["O'zbekiston", "O‘zbekiston", "O’zbekiston", "Oʻzbekiston", "Oʼzbekiston"];
    const normalized = variants.map(normalizeText);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("ozbekiston");
  });
});

describe("computeDuplicateKey", () => {
  const subjectId = "subj_fizika";

  it("bir xil subject+text+correctAnswer uchun bir xil kalit beradi (registr/bo'shliq farqidan qat'i nazar)", () => {
    const a = computeDuplicateKey(subjectId, "Erkin tushish tezligi qanday?", "A");
    const b = computeDuplicateKey(subjectId, "  erkin   TUSHISH tezligi qanday?  ", "a");
    expect(a).toBe(b);
  });

  it("har xil subjectId uchun har xil kalit beradi", () => {
    const a = computeDuplicateKey("subj_fizika", "Savol matni", "A");
    const b = computeDuplicateKey("subj_matematika", "Savol matni", "A");
    expect(a).not.toBe(b);
  });

  it("har xil correctAnswer uchun har xil kalit beradi", () => {
    const a = computeDuplicateKey(subjectId, "Savol matni", "A");
    const b = computeDuplicateKey(subjectId, "Savol matni", "B");
    expect(a).not.toBe(b);
  });

  it("64 ta hex belgidan iborat SHA-256 xesh qaytaradi", () => {
    expect(computeDuplicateKey(subjectId, "x", "A")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("normalizeTopicToSlug", () => {
  it("erkin matnni TopicNode.slug formatiga o'giradi", () => {
    expect(normalizeTopicToSlug("Erkin tushish")).toBe("erkin-tushish");
    expect(normalizeTopicToSlug("  Kvadrat tenglama!  ")).toBe("kvadrat-tenglama");
    expect(normalizeTopicToSlug("O'zbekiston tarixi")).toBe("ozbekiston-tarixi");
  });
});

describe("resolveVisibilityFromAccessType", () => {
  it("'free' uchun PUBLIC qaytaradi", () => {
    expect(resolveVisibilityFromAccessType("free")).toBe("PUBLIC");
  });

  it("boshqa barcha accessType uchun PRIVATE qaytaradi", () => {
    for (const t of ["premium", "teacher", "premium_teacher", "paid"]) {
      expect(resolveVisibilityFromAccessType(t)).toBe("PRIVATE");
    }
  });
});

// ===================== planBackfill (integratsion, bazasiz) =====================

function makeBankRow(overrides: Partial<BankQuestionRow> = {}): BankQuestionRow {
  return {
    id: "bank_1",
    teacherId: "teacher_1",
    subjectId: "subj_fizika",
    text: "Yorug'lik tezligi qancha?",
    images: [],
    options: [{ label: "A", text: "300000 km/s" }],
    correctAnswer: "A",
    type: "MULTIPLE_CHOICE",
    explanation: null,
    explanationImages: [],
    topic: null,
    bloomLevel: null,
    difficulty: null,
    ...overrides,
  };
}

function makeQuestionRow(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "q_1",
    testId: "test_1",
    testSubjectId: "subj_fizika",
    testAccessType: "premium",
    testTeacherId: "teacher_1",
    text: "Erkin tushish tezlanishi qancha?",
    images: [],
    options: [{ label: "A", text: "9.8 m/s^2" }],
    correctAnswer: "A",
    type: "MULTIPLE_CHOICE",
    explanation: null,
    explanationImages: [],
    videoUrl: null,
    topic: null,
    bloomLevel: null,
    difficulty: null,
    subjectId: null,
    order: 0,
    points: 1,
    templateId: null,
    variantSig: null,
    grade: [],
    exams: [],
    lang: "uz",
    tags: [],
    source: "manual",
    ...overrides,
  };
}

describe("planBackfill — BankQuestion", () => {
  it("har BankQuestion uchun yangi Item rejalashtiradi, legacyBankId va PRIVATE visibility bilan", () => {
    const state = createEmptyState();
    const plan = planBackfill([makeBankRow()], [], state);

    expect(plan.report.bankItemsCreated).toBe(1);
    expect(plan.newItems).toHaveLength(1);
    expect(plan.newItems[0].data.legacyBankId).toBe("bank_1");
    expect(plan.newItems[0].data.visibility).toBe("PRIVATE");
  });

  it("idempotent: allaqachon ko'chirilgan BankQuestion (legacyBankId bo'yicha) qayta yaratilmaydi", () => {
    // Bazadan qayta yuklangan holatni simulyatsiya qiladi: birinchi apply
    // dan keyin loadExistingState() shu qatorni migratedBankIds'da topgan
    // bo'lardi.
    const state = createEmptyState();
    state.migratedBankIds.set("bank_1", "item_already_existing");

    const plan = planBackfill([makeBankRow()], [], state);

    expect(plan.report.bankItemsCreated).toBe(0);
    expect(plan.report.bankItemsAlreadyMigrated).toBe(1);
    expect(plan.newItems).toHaveLength(0);
  });
});

describe("planBackfill — Question dublikat aniqlash", () => {
  it("bir xil subject+text+correctAnswer'ga ega ikkita Question uchun faqat bitta Item yaratadi", () => {
    const state = createEmptyState();
    const rows = [
      makeQuestionRow({ id: "q_1", testId: "test_1" }),
      makeQuestionRow({ id: "q_2", testId: "test_2", text: "  ERKIN tushish   tezlanishi qancha?" }),
    ];

    const plan = planBackfill([], rows, state);

    expect(plan.report.questionItemsCreated).toBe(1);
    expect(plan.report.questionDuplicatesLinked).toBe(1);
    expect(plan.newItems).toHaveLength(1);
    // Ikkala Question ham o'z Test'iga TestItem orqali bog'langan — biri
    // yangi Item'ga, ikkinchisi xuddi shu Item'ga.
    expect(plan.testItems).toHaveLength(2);
    expect(plan.testItems[0].itemRef).toEqual(plan.testItems[1].itemRef);
  });

  it("BankQuestion'dan ko'chirilgan Item bilan bir xil mazmunli Question uni qayta yaratmay, o'shanga bog'lanadi", () => {
    const state = createEmptyState();
    const bankRow = makeBankRow({ id: "bank_1", text: "Bir xil savol matni", correctAnswer: "B" });
    const questionRow = makeQuestionRow({
      id: "q_1",
      text: "  bir xil   SAVOL matni  ",
      correctAnswer: "b",
      subjectId: "subj_fizika",
    });

    const plan = planBackfill([bankRow], [questionRow], state);

    expect(plan.report.bankItemsCreated).toBe(1);
    expect(plan.report.questionItemsCreated).toBe(0);
    expect(plan.report.questionDuplicatesLinked).toBe(1);
    expect(plan.newItems).toHaveLength(1); // faqat bank'dan kelgan Item
    expect(plan.testItems[0].itemRef).toEqual({ kind: "new", tempId: "bank:bank_1" });
  });

  it("har xil fanlarga tegishli bir xil matnli savollar dublikat hisoblanmaydi", () => {
    const state = createEmptyState();
    const rows = [
      makeQuestionRow({ id: "q_1", testId: "test_1", testSubjectId: "subj_fizika" }),
      makeQuestionRow({ id: "q_2", testId: "test_2", testSubjectId: "subj_matematika" }),
    ];

    const plan = planBackfill([], rows, state);

    expect(plan.report.questionItemsCreated).toBe(2);
    expect(plan.report.questionDuplicatesLinked).toBe(0);
  });
});

describe("planBackfill — visibility", () => {
  it("Test.accessType='free' bo'lsa Item PUBLIC bo'ladi", () => {
    const state = createEmptyState();
    const plan = planBackfill([], [makeQuestionRow({ testAccessType: "free" })], state);
    expect(plan.newItems[0].data.visibility).toBe("PUBLIC");
  });

  it("Test.accessType='premium' bo'lsa Item PRIVATE bo'ladi", () => {
    const state = createEmptyState();
    const plan = planBackfill([], [makeQuestionRow({ testAccessType: "premium" })], state);
    expect(plan.newItems[0].data.visibility).toBe("PRIVATE");
  });
});

describe("planBackfill — mavzu (topic) bog'lanishi", () => {
  it("normallashtirilgan slug mos kelsa ItemTopic rejalashtiradi", () => {
    const state = createEmptyState();
    state.topicSlugsBySubject.set("subj_fizika", new Map([["erkin-tushish", "topic_1"]]));

    const plan = planBackfill([], [makeQuestionRow({ topic: "Erkin tushish", subjectId: "subj_fizika" })], state);

    expect(plan.report.topicsLinked).toBe(1);
    expect(plan.itemTopics).toHaveLength(1);
    expect(plan.itemTopics[0].topicId).toBe("topic_1");
    expect(plan.report.topicsUnmatched).toHaveLength(0);
  });

  it("mos slug topilmasa bog'lamaydi va hisobotga yozadi", () => {
    const state = createEmptyState();
    state.topicSlugsBySubject.set("subj_fizika", new Map([["erkin-tushish", "topic_1"]]));

    const plan = planBackfill([], [makeQuestionRow({ topic: "Mavjud bo'lmagan mavzu", subjectId: "subj_fizika" })], state);

    expect(plan.itemTopics).toHaveLength(0);
    expect(plan.report.topicsUnmatched).toEqual([
      { source: "question", sourceId: "q_1", subjectId: "subj_fizika", topic: "Mavjud bo'lmagan mavzu" },
    ]);
  });

  it("topic bo'sh/null bo'lsa na bog'laydi, na hisobotga yozadi", () => {
    const state = createEmptyState();
    const plan = planBackfill([], [makeQuestionRow({ topic: null })], state);

    expect(plan.itemTopics).toHaveLength(0);
    expect(plan.report.topicsUnmatched).toHaveLength(0);
  });
});

describe("planBackfill — TestItem", () => {
  it("allaqachon mavjud (testId, itemId) juftligi uchun qayta TestItem rejalashtirmaydi", () => {
    const state = createEmptyState();
    state.migratedQuestionIds.set("q_1", "item_existing");
    state.existingTestItemKeys.add("test_1:e:item_existing");

    const plan = planBackfill([], [makeQuestionRow({ id: "q_1", testId: "test_1" })], state);

    expect(plan.testItems).toHaveLength(0);
    expect(plan.report.questionItemsAlreadyMigrated).toBe(1);
  });

  it("order va points asl Question qiymatlaridan olinadi", () => {
    const state = createEmptyState();
    const plan = planBackfill([], [makeQuestionRow({ order: 3, points: 2.1 })], state);

    expect(plan.testItems[0]).toMatchObject({ order: 3, points: 2.1 });
  });
});
