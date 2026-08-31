import { describe, expect, it, vi } from "vitest";
import {
  applyRelaxationStep,
  bucketOfDifficulty,
  buildItemWhere,
  difficultyQuota,
  makeSeedSequence,
  nextRelaxationStep,
  parseItemSpec,
  pickItems,
  relaxTopicPathsToParents,
  roundRobinFlatten,
  summarizeCandidates,
  type ItemSpec,
  type PickableItem,
} from "../item-picker";

// item-picker.ts DB'ga bog'liq bitta funksiya (getRecentlyCorrectItemIds)
// ham eksport qiladi — u shu faylda sinovdan o'tkazilmaydi, lekin import
// vaqtida haqiqiy PrismaClient yaratilmasligi uchun `db` mock qilinadi
// (access.test.ts dagi bilan bir xil konvensiya).
vi.mock("../db", () => ({ db: {} }));

describe("roundRobinFlatten", () => {
  it("barcha elementlarni saqlaydi — yo'qolmaydi, takrorlanmaydi", () => {
    const items = Array.from({ length: 23 }, (_, i) => ({ id: `i${i}`, group: `g${i % 5}` }));
    const flat = roundRobinFlatten(items, (x) => x.group, makeSeedSequence(1));
    expect(flat).toHaveLength(items.length);
    expect(new Set(flat.map((x) => x.id)).size).toBe(items.length);
  });

  it("dastlabki N ta natija N ta turli guruhdan keladi (round 0 to'liq tarqaladi)", () => {
    // Bitta katta guruh (A, 50 ta) + 9 ta bir donali guruh — jami 10 ta
    // distinct guruh. Round-robin bo'lsa, dastlabki 10 ta elementning
    // guruhlari 10 ta HAM XIL bo'lishi shart (A dan faqat bittasi kiradi).
    const items: { id: string; group: string }[] = [];
    for (let i = 0; i < 50; i++) items.push({ id: `a${i}`, group: "A" });
    for (let g = 0; g < 9; g++) items.push({ id: `s${g}`, group: `single${g}` });

    const flat = roundRobinFlatten(items, (x) => x.group, makeSeedSequence(7));
    const first10Groups = new Set(flat.slice(0, 10).map((x) => x.group));
    expect(first10Groups.size).toBe(10);

    // 11-elementdan boshlab endi faqat "A" guruhi qolgan (boshqalar tugagan)
    expect(flat.slice(10).every((x) => x.group === "A")).toBe(true);
  });

  it("bir xil seed ketma-ketligi bilan izchil (reproducible) natija beradi", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, group: `g${i % 4}` }));
    const a = roundRobinFlatten(items, (x) => x.group, makeSeedSequence(99));
    const b = roundRobinFlatten(items, (x) => x.group, makeSeedSequence(99));
    expect(a).toEqual(b);
  });

  it("bo'sh massiv bilan ishlaydi", () => {
    expect(roundRobinFlatten([], (x: { group: string }) => x.group, makeSeedSequence(1))).toEqual([]);
  });
});

describe("bucketOfDifficulty", () => {
  it("tegsiz (null) qiyinlik doim 'medium'", () => {
    expect(bucketOfDifficulty(null, { min: 1, max: 5 })).toBe("medium");
  });

  it("to'liq [1,5] oraliqda standart chegaralar", () => {
    expect(bucketOfDifficulty(1, { min: 1, max: 5 })).toBe("easy");
    expect(bucketOfDifficulty(2, { min: 1, max: 5 })).toBe("easy");
    expect(bucketOfDifficulty(3, { min: 1, max: 5 })).toBe("medium");
    expect(bucketOfDifficulty(4, { min: 1, max: 5 })).toBe("hard");
    expect(bucketOfDifficulty(5, { min: 1, max: 5 })).toBe("hard");
  });

  it("tor oraliqda (masalan [3,5]) uchdan-bir chegaralar shu oraliq ICHIDA hisoblanadi", () => {
    // span=2: [3, 3.67) easy, [3.67, 4.33) medium, [4.33,5] hard
    expect(bucketOfDifficulty(3, { min: 3, max: 5 })).toBe("easy");
    expect(bucketOfDifficulty(4, { min: 3, max: 5 })).toBe("medium");
    expect(bucketOfDifficulty(5, { min: 3, max: 5 })).toBe("hard");
  });

  it("oraliqdan tashqari qiymatlar chegaraga qisiladi (clamp)", () => {
    expect(bucketOfDifficulty(1, { min: 3, max: 5 })).toBe("easy");
    expect(bucketOfDifficulty(10, { min: 3, max: 5 })).toBe("hard");
  });

  it("nol uzunlikdagi oraliqda (min===max) doim 'medium'", () => {
    expect(bucketOfDifficulty(3, { min: 3, max: 3 })).toBe("medium");
  });
});

describe("difficultyQuota", () => {
  it("20/60/20 taqsimotni beradi", () => {
    expect(difficultyQuota(100)).toEqual({ easy: 20, medium: 60, hard: 20 });
    expect(difficultyQuota(10)).toEqual({ easy: 2, medium: 6, hard: 2 });
  });

  it("yumaloqlashdan qolgan qism har doim 'medium'ga tushadi (jami limit bilan bir xil)", () => {
    const quota = difficultyQuota(7); // 20% of 7 = 1.4 -> round 1, 1
    expect(quota.easy + quota.medium + quota.hard).toBe(7);
  });

  it("limit<=0 bo'lsa hammasi nol", () => {
    expect(difficultyQuota(0)).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});

describe("pickItems — qiyinlik taqsimoti", () => {
  it("havza yetarli bo'lganda tanlangan itemlar 20/60/20 nisbatga aniq mos keladi", () => {
    const candidates: PickableItem[] = [];
    for (let d = 1; d <= 5; d++) {
      for (let i = 0; i < 100; i++) {
        candidates.push({ id: `d${d}-${i}`, templateId: `t${d}-${i}`, difficulty: d });
      }
    }

    const picked = pickItems(candidates, { limit: 100, range: { min: 1, max: 5 }, seedFn: makeSeedSequence(1) });
    expect(picked).toHaveLength(100);

    const easy = picked.filter((p) => (p.difficulty ?? 0) <= 2).length; // bucket: {1,2}
    const medium = picked.filter((p) => p.difficulty === 3).length; // bucket: {3}
    const hard = picked.filter((p) => (p.difficulty ?? 0) >= 4).length; // bucket: {4,5}

    expect(easy).toBe(20);
    expect(medium).toBe(60);
    expect(hard).toBe(20);
  });

  it("bitta guruh (masalan qiyin) havzasi kvotadan kichik bo'lsa, qolgan o'rin boshqa nomzoddan to'ldiriladi — limit baribir to'ladi", () => {
    const candidates: PickableItem[] = [
      ...Array.from({ length: 50 }, (_, i) => ({ id: `e${i}`, templateId: `te${i}`, difficulty: 1 })),
      ...Array.from({ length: 50 }, (_, i) => ({ id: `m${i}`, templateId: `tm${i}`, difficulty: 3 })),
      { id: "h0", templateId: "th0", difficulty: 5 }, // faqat 1 ta qiyin savol, kvota (20% of 20 = 4) yetmaydi
    ];

    const picked = pickItems(candidates, { limit: 20, range: { min: 1, max: 5 }, seedFn: makeSeedSequence(3) });
    expect(picked).toHaveLength(20); // limit baribir to'ladi
  });
});

describe("pickItems — shablon xilma-xilligi", () => {
  it("bitta shablonning ko'p varianti boshqa shablonlarni siqib chiqarmaydi", () => {
    const candidates: PickableItem[] = [
      ...Array.from({ length: 40 }, (_, i) => ({ id: `dom${i}`, templateId: "dominant", difficulty: 3 })),
      ...Array.from({ length: 8 }, (_, i) => ({ id: `uniq${i}`, templateId: `uniq-t${i}`, difficulty: 3 })),
    ];

    // Faqat 'medium' kvotasi ishlasin deb butun limitni shu bucketga to'g'ri
    // keladigan qilib tanlaymiz: limit=10 => medium kvota=6.
    const picked = pickItems(candidates, { limit: 10, range: { min: 1, max: 5 }, seedFn: makeSeedSequence(5) });
    const distinctTemplatesPicked = new Set(picked.map((p) => p.templateId)).size;

    // 6 ta 'medium' o'rindan hech bo'lmasa yarmi turli shablonlardan bo'lishi kerak —
    // round-robin bo'lmaganda "dominant" barcha o'rinlarni olib qo'yardi.
    expect(distinctTemplatesPicked).toBeGreaterThan(1);
  });
});

describe("nextRelaxationStep — cheklov bo'shatish tartibi", () => {
  it("avval qiyinlik, keyin sinf, keyin qo'shni mavzular tartibida bo'shatadi", () => {
    const spec: ItemSpec = { difficultyMin: 2, difficultyMax: 4, grades: [9], topicPaths: ["mexanika/kinematika"] };

    const step1 = nextRelaxationStep(spec, []);
    expect(step1).toBe("difficulty");

    const step2 = nextRelaxationStep(spec, ["difficulty"]);
    expect(step2).toBe("grade");

    const step3 = nextRelaxationStep(spec, ["difficulty", "grade"]);
    expect(step3).toBe("neighborTopics");

    const step4 = nextRelaxationStep(spec, ["difficulty", "grade", "neighborTopics"]);
    expect(step4).toBeNull();
  });

  it("spec'da mavjud bo'lmagan cheklov o'tkazib yuboriladi", () => {
    const spec: ItemSpec = { grades: [9] }; // qiyinlik va topicPaths berilmagan
    expect(nextRelaxationStep(spec, [])).toBe("grade");
    expect(nextRelaxationStep(spec, ["grade"])).toBeNull();
  });
});

describe("applyRelaxationStep", () => {
  it("'difficulty' — difficultyMin/Max'ni olib tashlaydi, qolganini saqlaydi", () => {
    const spec: ItemSpec = { difficultyMin: 2, difficultyMax: 4, grades: [9] };
    const relaxed = applyRelaxationStep(spec, "difficulty");
    expect(relaxed).toEqual({ grades: [9] });
    expect(spec.difficultyMin).toBe(2); // asl spec o'zgarmaydi
  });

  it("'grade' — grades'ni olib tashlaydi", () => {
    const spec: ItemSpec = { grades: [9, 10], exams: ["dtm"] };
    expect(applyRelaxationStep(spec, "grade")).toEqual({ exams: ["dtm"] });
  });

  it("'neighborTopics' — har yo'lni ota tuguniga ko'taradi", () => {
    const spec: ItemSpec = { topicPaths: ["mexanika/kinematika/erkin-tushish", "fizika/optika"] };
    expect(applyRelaxationStep(spec, "neighborTopics")).toEqual({
      topicPaths: ["mexanika/kinematika", "fizika"],
    });
  });

  it("'neighborTopics' — ildiz darajasidagi yo'l qolsa topicPaths butunlay olib tashlanadi", () => {
    const spec: ItemSpec = { topicPaths: ["mexanika"] };
    expect(applyRelaxationStep(spec, "neighborTopics")).toEqual({});
  });
});

describe("relaxTopicPathsToParents", () => {
  it("bitta darajaga ko'taradi va dublikatlarni birlashtiradi", () => {
    expect(relaxTopicPathsToParents(["a/b/c", "a/b/d"])).toEqual(["a/b"]);
  });

  it("ildiz darajasidagi yo'llarni chiqarib tashlaydi", () => {
    expect(relaxTopicPathsToParents(["root1", "a/b"])).toEqual(["a"]);
  });
});

describe("buildItemWhere", () => {
  it("har doim faqat PUBLISHED+PUBLIC itemlarni so'raydi", () => {
    const where = buildItemWhere({});
    expect(where.status).toBe("PUBLISHED");
    expect(where.visibility).toBe("PUBLIC");
  });

  it("bo'sh spec — qo'shimcha filtrsiz", () => {
    const where = buildItemWhere({});
    expect(where.subjectId).toBeUndefined();
    expect(where.OR).toBeUndefined();
    expect(where.grade).toBeUndefined();
    expect(where.difficulty).toBeUndefined();
  });

  it("subjectIds, grades, exams, types, bloomLevels to'g'ri Prisma operatorlariga aylanadi", () => {
    const where = buildItemWhere({
      subjectIds: ["s1", "s2"],
      grades: [9, 10],
      exams: ["dtm"],
      types: ["MULTIPLE_CHOICE"],
      bloomLevels: ["BILISH"],
    });
    expect(where.subjectId).toEqual({ in: ["s1", "s2"] });
    expect(where.grade).toEqual({ hasSome: [9, 10] });
    expect(where.exams).toEqual({ hasSome: ["dtm"] });
    expect(where.type).toEqual({ in: ["MULTIPLE_CHOICE"] });
    expect(where.bloomLevel).toEqual({ in: ["BILISH"] });
  });

  it("topicPaths prefiks (startsWith) bo'yicha OR shart hosil qiladi", () => {
    const where = buildItemWhere({ topicPaths: ["mexanika", "optika"] });
    expect(where.OR).toEqual([
      { topics: { some: { topic: { path: { startsWith: "mexanika" } } } } },
      { topics: { some: { topic: { path: { startsWith: "optika" } } } } },
    ]);
  });

  it("difficultyMin/Max faqat berilgan tomonlarini qo'yadi", () => {
    expect(buildItemWhere({ difficultyMin: 2 }).difficulty).toEqual({ gte: 2 });
    expect(buildItemWhere({ difficultyMax: 4 }).difficulty).toEqual({ lte: 4 });
    expect(buildItemWhere({ difficultyMin: 2, difficultyMax: 4 }).difficulty).toEqual({ gte: 2, lte: 4 });
  });

  it("excludeItemIds berilsa id notIn bilan chetlatiladi", () => {
    const where = buildItemWhere({}, ["x1", "x2"]);
    expect(where.id).toEqual({ notIn: ["x1", "x2"] });
  });

  it("lang berilsa in bilan filtrlanadi", () => {
    expect(buildItemWhere({ lang: ["uz", "ru"] }).lang).toEqual({ in: ["uz", "ru"] });
  });

  it("onlyItemIds berilsa id in bilan cheklanadi", () => {
    const where = buildItemWhere({ onlyItemIds: ["a1", "a2"] });
    expect(where.id).toEqual({ in: ["a1", "a2"] });
  });

  it("onlyItemIds va excludeItemIds birga berilsa, ikkalasi ham bitta id shartiga birlashadi", () => {
    const where = buildItemWhere({ onlyItemIds: ["a1", "a2"] }, ["a2"]);
    expect(where.id).toEqual({ in: ["a1", "a2"], notIn: ["a2"] });
  });

  it("onlyItemIds boshqa shartlarni almashtirmaydi — AND bo'lib qoladi", () => {
    const where = buildItemWhere({ onlyItemIds: ["a1"], subjectIds: ["s1"], difficultyMin: 2 });
    expect(where.subjectId).toEqual({ in: ["s1"] });
    expect(where.difficulty).toEqual({ gte: 2 });
    expect(where.id).toEqual({ in: ["a1"] });
  });
});

describe("summarizeCandidates", () => {
  it("total, byDifficulty va distinctTemplates'ni to'g'ri hisoblaydi", () => {
    const summary = summarizeCandidates([
      { id: "1", templateId: "t1", difficulty: 2 },
      { id: "2", templateId: "t1", difficulty: 2 }, // bir xil shablon — distinctTemplates'ga 1 marta hisoblanadi
      { id: "3", templateId: null, difficulty: 4 }, // shablonsiz — o'z id'si bo'yicha alohida hisoblanadi
      { id: "4", templateId: null, difficulty: null }, // tegsiz — byDifficulty'ga kirmaydi, totalga kiradi
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byDifficulty).toEqual({ 2: 2, 4: 1 });
    expect(summary.distinctTemplates).toBe(3); // t1, "3", "4"
  });

  it("bo'sh ro'yxat uchun nol qiymatlar", () => {
    expect(summarizeCandidates([])).toEqual({ total: 0, byDifficulty: {}, distinctTemplates: 0 });
  });
});

describe("parseItemSpec", () => {
  it("to'liq to'g'ri spec'ni qabul qiladi", () => {
    const body = {
      subjectIds: ["s1"],
      topicPaths: ["mexanika"],
      grades: [9],
      exams: ["dtm"],
      difficultyMin: 1,
      difficultyMax: 3,
      types: ["MULTIPLE_CHOICE"],
      bloomLevels: ["BILISH"],
      excludeAnsweredCorrectlyDays: 30,
    };
    const result = parseItemSpec(body);
    expect("spec" in result).toBe(true);
    if ("spec" in result) expect(result.spec).toEqual(body);
  });

  it("bo'sh obyektni bo'sh spec sifatida qabul qiladi", () => {
    const result = parseItemSpec({});
    expect("spec" in result).toBe(true);
    if ("spec" in result) expect(result.spec).toEqual({});
  });

  it("obyekt bo'lmagan tanani rad etadi", () => {
    expect("error" in parseItemSpec(null)).toBe(true);
    expect("error" in parseItemSpec("x")).toBe(true);
  });

  it("noto'g'ri turdagi maydonlarni rad etadi", () => {
    expect("error" in parseItemSpec({ grades: ["9"] })).toBe(true);
    expect("error" in parseItemSpec({ subjectIds: "s1" })).toBe(true);
    expect("error" in parseItemSpec({ types: ["NOT_A_TYPE"] })).toBe(true);
  });

  it("difficultyMin difficultyMax'dan katta bo'lsa rad etadi", () => {
    expect("error" in parseItemSpec({ difficultyMin: 4, difficultyMax: 2 })).toBe(true);
  });

  it("lang va onlyItemIds'ni qabul qiladi", () => {
    const result = parseItemSpec({ lang: ["uz"], onlyItemIds: ["i1", "i2"] });
    expect("spec" in result).toBe(true);
    if ("spec" in result) expect(result.spec).toEqual({ lang: ["uz"], onlyItemIds: ["i1", "i2"] });
  });

  it("onlyItemIds 200 tadan ko'p bo'lsa rad etadi", () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => `id${i}`);
    expect("error" in parseItemSpec({ onlyItemIds: tooMany })).toBe(true);
  });
});
