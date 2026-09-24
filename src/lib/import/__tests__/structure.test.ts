import { describe, expect, it, vi } from "vitest";
import type { ResolvedAnswer } from "../answer-key";
import {
  buildStructurePrompt,
  imageToken,
  normalizeStructured,
  structureBatch,
  type ModelCaller,
  type StructureInput,
} from "../structure";
import { RateLimitedError, RETRY_RESERVE_MS, STRUCTURE_CALL_TIMEOUT_MS } from "../structure-error";

function input(overrides: Partial<StructureInput> = {}): StructureInput {
  return {
    order: 0,
    number: 1,
    text: "1. Tezlik qancha?",
    images: [],
    pageImages: [{ page: 3, url: "https://cdn.example/page-3.jpg" }],
    regions: [{ page: 3, bbox: { x: 28, y: 100, w: 250, h: 120 } }],
    sourceLang: "uz",
    subject: "Fizika",
    givenKey: null,
    keyIssue: "NO_KEY_FOUND",
    ...overrides,
  };
}

const key = (letter: string): ResolvedAnswer => ({
  letter,
  source: { page: 3, kind: "page-key" },
});

describe("normalizeStructured — rasm tokenlari", () => {
  it("savol shartidagi token saqlanadi", () => {
    const token = imageToken("asset-1");
    const result = normalizeStructured(
      { text: `Grafikka qara ${token}`, options: [], correctAnswer: "", type: "OPEN_ENDED", notQuestion: false },
      input({ images: [{ assetId: "asset-1", url: "https://cdn.example/1.png" }] }),
    );

    expect(result.text).toBe(`Grafikka qara ${token}`);
    expect(result.issues).not.toContain("IMAGE_TOKEN_RESTORED");
  });

  it("beshta variant-rasm beshta imageToken ga taqsimlanadi", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const result = normalizeStructured(
      {
        text: "Qaysi grafik to'g'ri?",
        options: ids.map((id, i) => ({
          label: String.fromCharCode(65 + i),
          text: "",
          imageToken: imageToken(id),
        })),
        correctAnswer: "C",
        type: "MULTIPLE_CHOICE",
        notQuestion: false,
      },
      input({ images: ids.map((id) => ({ assetId: id, url: `https://cdn.example/${id}.png` })) }),
    );

    expect(result.options.map((o) => o.imageToken)).toEqual(ids.map(imageToken));
    expect(result.issues).not.toContain("IMAGE_TOKEN_RESTORED");
  });

  it("yo'qolgan token text oxiriga qaytariladi", () => {
    const result = normalizeStructured(
      { text: "Rasmsiz javob", options: [], correctAnswer: "", type: "OPEN_ENDED", notQuestion: false },
      input({ images: [{ assetId: "lost", url: "https://cdn.example/lost.png" }] }),
    );

    expect(result.text).toContain(imageToken("lost"));
    expect(result.issues).toContain("IMAGE_TOKEN_RESTORED");
  });

  it("o'ylab topilgan token olib tashlanadi, takrori ham", () => {
    const real = imageToken("real");
    const result = normalizeStructured(
      {
        text: `${real} va ${imageToken("uydirma")} va yana ${real}`,
        options: [],
        correctAnswer: "",
        type: "OPEN_ENDED",
        notQuestion: false,
      },
      input({ images: [{ assetId: "real", url: "https://cdn.example/real.png" }] }),
    );

    expect(result.text.match(/\[\[IMG:[^\]]*\]\]/g)).toEqual([real]);
  });
});

describe("normalizeStructured — correctAnswer uchala holati", () => {
  it("kalit bor va model bilan mos → correctAnswer = kalit, mismatch yo'q", () => {
    const result = normalizeStructured(
      { text: "S", options: [], correctAnswer: "B", type: "MULTIPLE_CHOICE", notQuestion: false },
      input({ givenKey: key("B"), keyIssue: null }),
    );

    expect(result.correctAnswer).toBe("B");
    expect(result.answerMismatch).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it("kalit bor va model boshqa harf berdi → correctAnswer = KALIT, mismatch: true", () => {
    const result = normalizeStructured(
      {
        text: "S",
        options: [],
        correctAnswer: "D",
        explanation: "Men ildizni boshqacha hisobladim",
        type: "MULTIPLE_CHOICE",
        notQuestion: false,
      },
      input({ givenKey: key("B"), keyIssue: null }),
    );

    expect(result.correctAnswer).toBe("B");
    expect(result.answerMismatch).toBe(true);
    expect(result.explanation).not.toBe("");
  });

  it("kalit yo'q → correctAnswer = modelning yechimi, mismatch yo'q, kod qoladi", () => {
    const noKey = normalizeStructured(
      { text: "S", options: [], correctAnswer: "D", type: "MULTIPLE_CHOICE", notQuestion: false },
      input({ givenKey: null, keyIssue: "NO_KEY_FOUND" }),
    );

    expect(noKey.correctAnswer).toBe("D");
    expect(noKey.answerMismatch).toBe(false);
    expect(noKey.issues).toContain("NO_KEY_FOUND");

    const ambiguous = normalizeStructured(
      { text: "S", options: [], correctAnswer: "A", type: "MULTIPLE_CHOICE", notQuestion: false },
      input({ givenKey: null, keyIssue: "KEY_AMBIGUOUS" }),
    );

    expect(ambiguous.correctAnswer).toBe("A");
    expect(ambiguous.answerMismatch).toBe(false);
    expect(ambiguous.issues).toContain("KEY_AMBIGUOUS");
  });
});

describe("normalizeStructured — maydonlarni tozalash", () => {
  it("noto'g'ri metama'lumot faqat o'zini yo'qotadi, savol qoladi", () => {
    const result = normalizeStructured(
      {
        text: "Savol",
        options: [{ label: "A", text: "1" }],
        correctAnswer: "A",
        type: "NIMADIR",
        bloomLevel: "O'YLASH",
        difficulty: 9,
        confidence: 4,
        notQuestion: false,
      },
      input(),
    );

    expect(result.text).toBe("Savol");
    expect(result.type).toBe("MULTIPLE_CHOICE");
    expect(result.bloomLevel).toBe("");
    expect(result.difficulty).toBeNull();
    expect(result.confidence).toBe(1);
  });

  it("notQuestion o'tkaziladi", () => {
    const result = normalizeStructured({ text: "", options: [], correctAnswer: "", notQuestion: true }, input());
    expect(result.notQuestion).toBe(true);
  });
});

describe("structureBatch", () => {
  const ok = (order: number) => ({
    text: `Savol ${order}`,
    options: [],
    correctAnswer: "A",
    type: "MULTIPLE_CHOICE",
    notQuestion: false,
  });

  /** Testda kutish yo'q — qayta urinish jadvali `structure-error.test.ts` da. */
  const noWait = { sleep: async () => {} };

  it("6 talik paketda bitta chaqiruv yiqilsa, qolgan 5 tasi saqlanadi", async () => {
    const inputs = Array.from({ length: 6 }, (_, i) => input({ order: i, text: `${i}. Savol` }));
    const failure = Object.assign(new Error("schema invalid"), { status: 400 });
    const call: ModelCaller = vi.fn(async (i: StructureInput) => {
      if (i.order === 2) throw failure;
      return { json: ok(i.order), tokens: 100 };
    });

    const { outcomes } = await structureBatch(inputs, call, undefined, noWait);

    expect(outcomes).toHaveLength(6);
    expect(outcomes.filter((o) => o.failed).map((o) => o.order)).toEqual([2]);
    expect(outcomes.filter((o) => !o.failed)).toHaveLength(5);
    expect(outcomes.find((o) => o.order === 4)!.question!.text).toBe("Savol 4");
    expect(outcomes.reduce((sum, o) => sum + o.tokens, 0)).toBe(500);
    // Sabab YO'QOLMAYDI: marshrut uni `raw.lastError` ga yozadi.
    expect(outcomes.find((o) => o.order === 2)!.error).toBe(failure);
  });

  it("vaqtinchalik chegarada qayta uriniladi, doimiy xatoda esa yo'q", async () => {
    const attempts = new Map<number, number>();
    const call: ModelCaller = async (i: StructureInput) => {
      const seen = (attempts.get(i.order) ?? 0) + 1;
      attempts.set(i.order, seen);
      // 0-savol birinchi urinishda vaqtinchalik nosozlikka uriladi, ikkinchisida o'tadi.
      if (i.order === 0 && seen === 1) throw Object.assign(new Error("unavailable"), { status: 503 });
      if (i.order === 1) throw Object.assign(new Error("bad request"), { status: 400 });
      return { json: ok(i.order), tokens: 10 };
    };

    const { outcomes } = await structureBatch([input({ order: 0 }), input({ order: 1 })], call, 6, noWait);

    expect(attempts.get(0)).toBe(2);
    expect(outcomes.find((o) => o.order === 0)!.failed).toBe(false);
    // 400 qayta urinilmaydi — bekorga pul va vaqt ketmasin.
    expect(attempts.get(1)).toBe(1);
    expect(outcomes.find((o) => o.order === 1)!.failed).toBe(true);
  });

  it("kvota tugagani yiqilish emas — deferred va rateLimited belgisi bilan qaytadi", async () => {
    const error = new RateLimitedError();
    const call: ModelCaller = vi.fn(async (i: StructureInput) => {
      if (i.order === 0) throw error;
      return { json: ok(i.order), tokens: 10, model: "b-flash" };
    });

    const { outcomes } = await structureBatch([input({ order: 0 }), input({ order: 1 })], call, 6, noWait);

    const limited = outcomes.find((o) => o.order === 0)!;
    // Blokning nuqsoni emas: marshrut uni terminal qilmaydi.
    expect(limited).toMatchObject({ failed: false, deferred: true, rateLimited: true, error });
    // Javob bergan model natijaga o'tadi — `raw.model` shundan yoziladi.
    expect(outcomes.find((o) => o.order === 1)!.model).toBe("b-flash");
  });

  it("paket o'lchamidan ko'p blok bosqichma-bosqich ishlanadi", async () => {
    const inputs = Array.from({ length: 13 }, (_, i) => input({ order: i }));
    let inFlight = 0;
    let peak = 0;
    const call: ModelCaller = async (i: StructureInput) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight--;
      return { json: ok(i.order), tokens: 1 };
    };

    const { outcomes } = await structureBatch(inputs, call, 6);

    expect(outcomes.map((o) => o.order)).toEqual(inputs.map((i) => i.order));
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("muddat tugaganda keyingi to'lqin BOSHLANMAYDI, boshlangani esa tugaydi", async () => {
    const inputs = Array.from({ length: 12 }, (_, i) => input({ order: i }));
    let left = 40000;
    const call: ModelCaller = vi.fn(async (i: StructureInput) => {
      // `await` SHART: usiz birinchi chaqiruv byudjetni qolgan beshtasi
      // tekshiruvdan o'tishidan oldin tugatib qo'yardi.
      await Promise.resolve();
      left = -1;
      return { json: ok(i.order), tokens: 1 };
    });

    const result = await structureBatch(inputs, call, 6, { ...noWait, remaining: () => left });

    expect(call).toHaveBeenCalledTimes(6);
    expect(result.batches).toBe(1);
    expect(result.deadlineHit).toBe(true);
    // To'lqin O'RTASIDA uzilmaydi: boshlangan oltitaning hammasi natijada bor.
    expect(result.outcomes.map((o) => o.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.outcomes.every((o) => o.question !== null)).toBe(true);
  });

  it("zaxiradan kam vaqt qolganda yangi to'lqin OCHILMAYDI", async () => {
    // 0 dan katta, lekin `RETRY_RESERVE_MS` dan kichik — `withRetry` bu vaqtda
    // chaqiruvni qabul qilmaydi. Sikl ham to'xtashi shart: aks holda u
    // ishlamaydigan to'lqinlarni ochaverar va `deadlineHit` `false` qolardi.
    const inputs = Array.from({ length: 12 }, (_, i) => input({ order: i }));
    const call: ModelCaller = vi.fn(async (i: StructureInput) => ({ json: ok(i.order), tokens: 1 }));

    const result = await structureBatch(inputs, call, 6, {
      ...noWait,
      remaining: () => RETRY_RESERVE_MS - 1000,
    });

    expect(call).not.toHaveBeenCalled();
    expect(result.batches).toBe(1);
    expect(result.deadlineHit).toBe(true);
    // Faqat birinchi to'lqin — qolgan oltitasiga umuman tegilmaydi.
    expect(result.outcomes.map((o) => o.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.outcomes.every((o) => o.deferred === true && o.failed === false)).toBe(true);
  });

  it("hammasi ulgursa deadlineHit: false", async () => {
    const inputs = Array.from({ length: 7 }, (_, i) => input({ order: i }));
    const call: ModelCaller = async (i: StructureInput) => ({ json: ok(i.order), tokens: 1 });

    const result = await structureBatch(inputs, call, 6, { ...noWait, remaining: () => 30000 });

    expect(result.batches).toBe(2);
    expect(result.deadlineHit).toBe(false);
    expect(result.outcomes).toHaveLength(7);
  });

  it("vaqt yetmagan blok deferred bo'ladi, failed EMAS", async () => {
    const call: ModelCaller = vi.fn(async () => ({ json: ok(0), tokens: 1 }));

    const { outcomes } = await structureBatch([input({ order: 0 })], call, 6, {
      ...noWait,
      remaining: () => 1000,
    });

    // Byudjet zaxiradan kam — chaqiruv umuman qilinmaydi.
    expect(call).not.toHaveBeenCalled();
    expect(outcomes[0]).toMatchObject({ deferred: true, failed: false, question: null });
  });

  it("osilib qolgan chaqiruv o'z chegarasida uziladi va butun to'lqinni ushlamaydi", async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    let left = 40000;
    // Hech qachon javob qaytarmaydigan chaqiruv — faqat `abort` ga javob beradi.
    const call: ModelCaller = vi.fn(
      (_i: StructureInput, signal?: AbortSignal) =>
        new Promise<{ json: unknown; tokens: number }>((_, reject) => {
          signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("Request aborted when fetching gemini"), { name: "AbortError" })),
          );
        }),
    );

    const promise = structureBatch([input({ order: 0 })], call, 6, {
      ...noWait,
      remaining: () => left,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms });
        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {},
    });

    await Promise.resolve();
    // Chegara: min(STRUCTURE_CALL_TIMEOUT_MS, byudjet - zaxira).
    expect(timers[0].ms).toBe(Math.min(STRUCTURE_CALL_TIMEOUT_MS, 40000 - RETRY_RESERVE_MS));

    left = 5000; // uzilgandan keyin qayta urinishga vaqt qolmadi
    timers[0].fn();
    const { outcomes } = await promise;

    expect(outcomes[0]).toMatchObject({ deferred: true, failed: false });
  });
});

describe("normalizeStructured — muallif yechimi", () => {
  it("ko'p qatorli LaTeX'li yechim aynan saqlanadi", () => {
    const solution = [
      "Yechim:",
      "$a = \\frac{v - v_0}{t} = \\frac{20}{4} = 5\\ \\text{m/s}^2$",
      "",
      "Javob: $5\\ \\text{m/s}^2$",
    ].join("\n");

    const result = normalizeStructured(
      {
        text: "Tezlanishni toping",
        options: [],
        correctAnswer: "5",
        explanation: solution,
        type: "OPEN_ENDED",
        notQuestion: false,
      },
      input(),
    );

    expect(result.explanation).toBe(solution);
  });

  it("yechim bo'lmasa explanation bo'sh qoladi", () => {
    const result = normalizeStructured(
      { text: "S", options: [], correctAnswer: "5", type: "OPEN_ENDED", notQuestion: false },
      input(),
    );

    expect(result.explanation).toBe("");
  });
});

describe("buildStructurePrompt", () => {
  it("kalit berilganda tekshirish qoidasi bor, kalit yo'qda esa o'z yechimi", () => {
    const withKey = buildStructurePrompt(input({ givenKey: key("C"), keyIssue: null }));
    expect(withKey).toContain("BERILGAN KALIT: C");
    expect(withKey).toContain("answerMismatch");

    const without = buildStructurePrompt(input());
    expect(without).toContain("NO_KEY_FOUND");
    expect(without).toContain("O'Z\n  yechimingni yoz");
  });

  it("muallif yechimini aynan ko'chirish qoidasi ikkala tarmoqda ham bor", () => {
    const prompts = [
      buildStructurePrompt(input()),
      buildStructurePrompt(input({ givenKey: key("C"), keyIssue: null })),
    ];

    for (const prompt of prompts) {
      expect(prompt).toContain("YECHIM (MUALLIF)");
      expect(prompt).toContain("Yechim:");
      expect(prompt).toContain("AYNAN ko'chir");
      expect(prompt).toContain("O'ZINGDAN yechim YOZMA");
    }
  });

  it("kalit bor tarmog'ida mismatch izohi faqat muallif yechimi yo'qda so'raladi", () => {
    const withKey = buildStructurePrompt(input({ givenKey: key("C"), keyIssue: null }));

    expect(withKey).toContain("matnda muallif yechimi bo'lsa");
    expect(withKey).toContain("Muallif yechimi\n  yo'q bo'lsa");
  });

  it("rasm tokenlari ro'yxati va bbox promptga tushadi", () => {
    const prompt = buildStructurePrompt(
      input({ images: [{ assetId: "a1", url: "https://cdn.example/a1.png" }] }),
    );

    expect(prompt).toContain(imageToken("a1"));
    expect(prompt).toContain("3-bet");
    expect(prompt).toContain("TARJIMA QILMA");
  });
});
