import { describe, expect, it } from "vitest";
import { incomingDuplicates, isPristineDraft, mergeImported } from "../merge-imported";
import { toImportedCore } from "../imported-question";
import type { AIImportedQuestion } from "@/types";

describe("isPristineDraft", () => {
  it("bitta bo'sh savol — hali ochilgan holida", () => {
    expect(isPristineDraft([{ text: "" }])).toBe(true);
  });

  it("bo'sh ro'yxat ham", () => {
    expect(isPristineDraft([])).toBe(true);
  });

  it("ikkita bo'sh savol — ustoz qo'shgan, so'ralsin", () => {
    expect(isPristineDraft([{ text: "" }, { text: "" }])).toBe(false);
  });

  it("matn bor — ustozning mehnati", () => {
    expect(isPristineDraft([{ text: "2+2=?" }])).toBe(false);
  });
});

describe("mergeImported — append", () => {
  it("MAVJUD savollar aynan o'sha obyektlar bo'lib qoladi", () => {
    // Havola ayniyati — `TestResult.answers` FK himoyasi. Nusxalash yo'li
    // ochiq qolsa, `id` tushib qolishi va keyingi saqlash savollarni
    // o'chirib qayta yaratishi mumkin (#170/#172).
    const existing = [
      { id: "q1", text: "bir" },
      { id: "q2", text: "ikki" },
    ];
    const incoming = [{ text: "uch" }];
    const result = mergeImported(existing, incoming, "append");

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(existing[0]);
    expect(result[1]).toBe(existing[1]);
    expect(result[2]).toBe(incoming[0]);
  });

  it("yangi savollarda id bo'lmaydi", () => {
    const incoming = [{ text: "uch" }];
    const result = mergeImported([{ id: "q1", text: "bir" }], incoming, "append");
    expect(result[1]).not.toHaveProperty("id");
  });

  it("kirish massivlarini o'zgartirmaydi", () => {
    const existing = [{ id: "q1", text: "bir" }];
    mergeImported(existing, [{ text: "uch" }], "append");
    expect(existing).toHaveLength(1);
  });
});

describe("mergeImported — replace", () => {
  it("faqat yangilarini qoldiradi", () => {
    const existing = [{ id: "q1", text: "bir" }];
    const incoming = [{ text: "uch" }];
    const result = mergeImported(existing, incoming, "replace");

    expect(result).toEqual(incoming);
    expect(result).not.toContain(existing[0]);
  });
});

describe("incomingDuplicates", () => {
  it("ikkala ro'yxatda ham bor savolni sanaydi", () => {
    const result = incomingDuplicates(
      [{ text: "bir" }, { text: "ikki" }],
      [{ text: "ikki" }, { text: "uch" }],
    );
    expect(result.count).toBe(1);
    expect(result.groups).toHaveLength(1);
  });

  it("faqat qo'shilayotganlar ichidagi takrorni SANAMAYDI", () => {
    // Uni saqlashdan oldingi DuplicateQuestionsDialog tutadi — ikkita
    // raqobatdosh ogohlantirish chalkashtirardi.
    const result = incomingDuplicates([{ text: "bir" }], [{ text: "uch" }, { text: "uch" }]);
    expect(result.count).toBe(0);
    expect(result.groups).toEqual([]);
  });

  it("faqat bo'shliq bilan farq qiladigan matnni sanaydi", () => {
    // #169 dagi normalizeQuestionText qayta ishlatilganining isboti.
    const result = incomingDuplicates([{ text: "2 + 2" }], [{ text: "2  +\n2" }]);
    expect(result.count).toBe(1);
  });

  it("bo'sh matnli savollar sanalmaydi", () => {
    const result = incomingDuplicates([{ text: "" }], [{ text: "" }]);
    expect(result.count).toBe(0);
  });
});

describe("toImportedCore", () => {
  const base: AIImportedQuestion = {
    text: "2+2=?",
    options: [{ label: "A", text: "4", image: null }],
    correctAnswer: "A",
    confidence: 0.9,
  };

  it("OPEN_ENDED da variantlar bo'sh", () => {
    expect(toImportedCore({ ...base, type: "OPEN_ENDED" }).options).toEqual([]);
  });

  it("variantsiz variantli savolga A/B/C/D qo'yiladi", () => {
    const core = toImportedCore({ ...base, options: [] });
    expect(core.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(core.options.every((o) => o.image === null)).toBe(true);
  });

  it("difficulty berilmasa null", () => {
    expect(toImportedCore(base).difficulty).toBeNull();
  });

  it("natijada id kaliti yo'q — server yangi id beradi", () => {
    expect(toImportedCore(base)).not.toHaveProperty("id");
  });

  it("aiConfidence o'tkaziladi", () => {
    expect(toImportedCore(base).aiConfidence).toBe(0.9);
  });
});
