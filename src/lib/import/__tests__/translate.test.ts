import { describe, expect, it, vi } from "vitest";
import type { StructuredOption } from "../structure";
import { RETRY_RESERVE_MS } from "../structure-error";
import {
  maskImageTokens,
  parseTranslateResponse,
  prepareInput,
  repairLatex,
  shouldTranslate,
  translateBatch,
  unmaskImageTokens,
  verifyTranslation,
  type TranslateCaller,
  type TranslateInput,
} from "../translate";
import { buildTranslatePrompt, glossaryFor } from "../translate-prompt";

const META = { sourceLang: "tr", targetLang: "uz", subject: "Fizika" };

function option(label: string, text: string, imageToken: string | null = null): StructuredOption {
  return { label, text, imageToken };
}

function input(overrides: Partial<TranslateInput> = {}): TranslateInput {
  return {
    order: 0,
    text: "Bir cismin hızı kaçtır?",
    options: [option("A", "2"), option("B", "3")],
    ...overrides,
  };
}

/** Haqiqiy tokenlar — aynan shu uzunlikdagi cuid modelni yiqitgandi. */
const IMG_A = "[[IMG:cmu2gfe670005lc0438g6uky5]]";
const IMG_B = "[[IMG:cmu2gfe670005lc0438g6uky6]]";
const IMG_C = "[[IMG:cmu2gfe670005lc0438g6uky7]]";

/** Modelning bir guruh uchun javobi — sxemadagi shakl. */
function answer(results: unknown[]): { json: unknown; tokens: number } {
  return { json: { results }, tokens: 100 };
}

/** Kvota xatosi — Gemini aynan shunday qaytaradi. */
function quota(): Error {
  return Object.assign(
    new Error("[429 Too Many Requests] You exceeded your current quota"),
    { status: 429 },
  );
}

// ---------------------------------------------------------------------------
// 1. Tillar teng bo'lsa model umuman chaqirilmaydi
// ---------------------------------------------------------------------------

describe("shouldTranslate", () => {
  it("tillar teng bo'lsa tarjima kerak emas", () => {
    expect(shouldTranslate("uz", "uz")).toBe(false);
    // Manifestda "uz-UZ" ham uchraydi — u ham o'sha til.
    expect(shouldTranslate("uz-UZ", "uz")).toBe(false);
    expect(shouldTranslate(" UZ ", "uz")).toBe(false);
  });

  it("tillar boshqa bo'lsa tarjima kerak", () => {
    expect(shouldTranslate("tr", "uz")).toBe(true);
    expect(shouldTranslate("en", "uz")).toBe(true);
  });

  it("tillar teng bo'lganda hech qanday chaqiruv qilinmaydi", async () => {
    // Marshrut `shouldTranslate` ni `createTranslateCaller()` dan OLDIN
    // tekshiradi, shuning uchun chaqiruvchi umuman yaratilmaydi ham.
    const call = vi.fn<TranslateCaller>();
    if (shouldTranslate("uz", "uz")) {
      await translateBatch([input()], { ...META, sourceLang: "uz" }, call);
    }
    expect(call).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3–4. LaTeX tuzatish — haqiqiy funksiya, mock'siz
// ---------------------------------------------------------------------------

describe("repairLatex — ochiq LaTeX ni o'rash", () => {
  it("dollarsiz \\frac o'raladi va LATEX_WRAPPED qo'yiladi", () => {
    const result = repairLatex("Cevap \\frac{5}{2} olur");
    expect(result.text).toBe("Cevap $\\frac{5}{2}$ olur");
    expect(result.issues).toContain("LATEX_WRAPPED");
    expect(result.issues).not.toContain("LATEX_REPAIRED");
  });

  it("$ ichidagi \\frac ikkinchi marta o'ralmaydi", () => {
    const result = repairLatex("Cevap $\\frac{5}{2}$ olur");
    expect(result.text).toBe("Cevap $\\frac{5}{2}$ olur");
    expect(result.issues).toEqual([]);
  });

  it("\\sqrt, \\vec, \\times va \\theta ham o'raladi", () => {
    expect(repairLatex("x = \\sqrt{3}").text).toBe("x = $\\sqrt{3}$");
    expect(repairLatex("F = \\vec{a}").text).toBe("F = $\\vec{a}$");
    expect(repairLatex("2 \\times 3").text).toBe("2 $\\times$ 3");
    expect(repairLatex("açı \\theta").text).toBe("açı $\\theta$");
  });

  it("LaTeX bo'lmagan matn tegilmaydi", () => {
    const result = repairLatex("Bir cismin ağırlığı 5 N dir.");
    expect(result.text).toBe("Bir cismin ağırlığı 5 N dir.");
    expect(result.issues).toEqual([]);
  });
});

describe("repairLatex — buzilgan buyruqni tiklash", () => {
  it("rac{P}{2} tiklanadi va o'raladi", () => {
    // PDF matn qatlamida `\f` escape sifatida yo'qoladi — bu haqiqiy nuqson.
    const result = repairLatex("Cevap rac{P}{2} olur");
    expect(result.text).toBe("Cevap $\\frac{P}{2}$ olur");
    expect(result.issues).toContain("LATEX_REPAIRED");
    expect(result.issues).toContain("LATEX_WRAPPED");
  });

  it("qrt, ec, imes va heta ham tiklanadi", () => {
    expect(repairLatex("qrt{3}").text).toBe("$\\sqrt{3}$");
    expect(repairLatex("ec{F}").text).toBe("$\\vec{F}$");
    expect(repairLatex("2 imes 3").text).toBe("2 $\\times$ 3");
    expect(repairLatex("heta").text).toBe("$\\theta$");
  });

  it("to'g'ri yozilgan buyruq QAYTA tuzatilmaydi", () => {
    // `\frac{` ichida `rac{` bor — oldidagi harf tekshirilmasa, u yana bir
    // marta "tuzatilib" matnni buzardi.
    const result = repairLatex("$\\frac{1}{2}$ va $\\sqrt{2}$ va $\\vec{v}$");
    expect(result.text).toBe("$\\frac{1}{2}$ va $\\sqrt{2}$ va $\\vec{v}$");
    expect(result.issues).toEqual([]);
  });

  it("oddiy so'z ichidagi bo'lak tuzatilmaydi", () => {
    // "times" ichida `imes` bor, lekin oldida harf turibdi.
    const result = repairLatex("three times faster");
    expect(result.text).toBe("three times faster");
    expect(result.issues).toEqual([]);
  });

  it("toq $ bo'lsa o'ralmaydi, faqat LATEX_UNBALANCED qo'yiladi", () => {
    const result = repairLatex("$\\frac{1}{2} va rac{P}{2}");
    expect(result.issues).toContain("LATEX_REPAIRED");
    expect(result.issues).toContain("LATEX_UNBALANCED");
    expect(result.issues).not.toContain("LATEX_WRAPPED");
    // Tiklash baribir ishlagan, lekin o'rash — yo'q.
    expect(result.text).toBe("$\\frac{1}{2} va \\frac{P}{2}");
  });
});

describe("prepareInput", () => {
  it("matn va variantlarni tuzatadi, kodlarni birlashtiradi", () => {
    const prepared = prepareInput(
      input({ text: "rac{P}{2} nedir?", options: [option("A", "\\sqrt{3}"), option("B", "2")] }),
    );
    expect(prepared.input.text).toBe("$\\frac{P}{2}$ nedir?");
    expect(prepared.input.options[0].text).toBe("$\\sqrt{3}$");
    expect(prepared.input.options[1].text).toBe("2");
    expect(prepared.issues).toContain("LATEX_REPAIRED");
    expect(prepared.issues).toContain("LATEX_WRAPPED");
    // Kodlar TAKRORLANMAYDI — matn ham, variant ham o'ralgan bo'lsa ham bitta.
    expect(prepared.issues.filter((i) => i === "LATEX_WRAPPED")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 2, 5a. Tekshiruv — yiqitadigan va yiqitmaydigan nuqsonlar
// ---------------------------------------------------------------------------

describe("verifyTranslation — yiqitadigan nuqsonlar", () => {
  it("rasm tokeni yo'qolsa IMAGE_TOKEN_LOST", () => {
    const source = input({ text: "Şekildeki gibi [[IMG:a1]]", options: [] });
    const verdict = verifyTranslation(source, { text: "Rasmdagidek", options: [] });
    expect(verdict.fatal).toBe("IMAGE_TOKEN_LOST");
  });

  it("variantdagi imageToken yo'qolsa ham IMAGE_TOKEN_LOST", () => {
    const source = input({ text: "Qaysi grafik?", options: [option("A", "", "[[IMG:a1]]")] });
    const verdict = verifyTranslation(source, { text: "Qaysi grafik?", options: [option("A", "")] });
    expect(verdict.fatal).toBe("IMAGE_TOKEN_LOST");
  });

  it("tokenlar o'z joyida qolsa o'tadi", () => {
    const source = input({ text: "Şekildeki gibi [[IMG:a1]]", options: [] });
    const verdict = verifyTranslation(source, { text: "Rasmdagidek [[IMG:a1]]", options: [] });
    expect(verdict.fatal).toBeNull();
  });

  it("variantlar soni o'zgarsa OPTION_COUNT_MISMATCH", () => {
    const verdict = verifyTranslation(input(), { text: "Tezlik qancha?", options: [option("A", "2")] });
    expect(verdict.fatal).toBe("OPTION_COUNT_MISMATCH");
  });

  it("yorliq joyi o'zgarsa OPTION_LABEL_MISMATCH", () => {
    const verdict = verifyTranslation(input(), {
      text: "Tezlik qancha?",
      options: [option("B", "2"), option("A", "3")],
    });
    expect(verdict.fatal).toBe("OPTION_LABEL_MISMATCH");
  });

  it("$ soni toq bo'lsa LATEX_UNBALANCED", () => {
    const verdict = verifyTranslation(input(), {
      text: "Tezlik $\\frac{1}{2} qancha?",
      options: [option("A", "2"), option("B", "3")],
    });
    expect(verdict.fatal).toBe("LATEX_UNBALANCED");
  });

  it("model yangi buzuq buyruq yasasa LATEX_COMMAND_BROKEN", () => {
    // Manba tuzatilgan holda kirgan, demak bu nuqson modelniki — oxirgi to'siq.
    const verdict = verifyTranslation(input({ options: [] }), {
      text: "Javob rac{P}{2} ga teng",
      options: [],
    });
    expect(verdict.fatal).toBe("LATEX_COMMAND_BROKEN");
  });
});

describe("verifyTranslation — NUMBER_MISMATCH bayrog'i", () => {
  it("son o'zgarsa bayroq qo'yiladi, lekin yiqilmaydi", () => {
    const source = input({ text: "Uzunluğu 4 metre olan çubuk", options: [] });
    const verdict = verifyTranslation(source, { text: "Uzunligi 5 metr bo'lgan sterjen", options: [] });
    expect(verdict.fatal).toBeNull();
    expect(verdict.flags).toContain("NUMBER_MISMATCH");
  });

  it("so'z son bo'lib qolsa ham faqat bayroq — bu to'g'ri tarjima bo'lishi mumkin", () => {
    const source = input({ text: "iki cisim", options: [] });
    const verdict = verifyTranslation(source, { text: "2 jism", options: [] });
    expect(verdict.fatal).toBeNull();
    expect(verdict.flags).toContain("NUMBER_MISMATCH");
  });

  it("vergulli o'nlik nuqtaga aylansa bayroq qo'yilmaydi", () => {
    const source = input({ text: "sin 37 = 0,6", options: [] });
    const verdict = verifyTranslation(source, { text: "sin 37 = 0.6", options: [] });
    expect(verdict.flags).not.toContain("NUMBER_MISMATCH");
  });

  it("sonlar saqlansa bayroq yo'q", () => {
    const source = input({ text: "Ağırlığı 5 N, uzunluğu 2 m", options: [] });
    const verdict = verifyTranslation(source, { text: "Og'irligi 5 N, uzunligi 2 m", options: [] });
    expect(verdict.flags).toEqual([]);
  });

  it("variantlardagi sonlar ham sanaladi", () => {
    const source = input({ options: [option("A", "2"), option("B", "3")] });
    const verdict = verifyTranslation(source, {
      text: "Tezlik nechaga teng?",
      options: [option("A", "2"), option("B", "4")],
    });
    expect(verdict.fatal).toBeNull();
    expect(verdict.flags).toContain("NUMBER_MISMATCH");
  });
});

// ---------------------------------------------------------------------------
// Rasm tokenlarini maskalash
// ---------------------------------------------------------------------------

describe("maskImageTokens / unmaskImageTokens", () => {
  it("aylanish asl matnni AYNAN qaytaradi", () => {
    const text = `Şekildeki gibi ${IMG_A} va ${IMG_B} verilmiştir`;
    const options = [option("A", `Grafik ${IMG_C}`), option("B", "2")];

    const masked = maskImageTokens(text, options);

    // Modelga cuid UMUMAN ko'rinmaydi — yiqilishning sababi shunda edi.
    expect(masked.text).toBe("Şekildeki gibi [[IMG1]] va [[IMG2]] verilmiştir");
    expect(masked.options[0].text).toBe("Grafik [[IMG3]]");
    expect(masked.text).not.toContain("cmu2");

    const back = unmaskImageTokens(masked.text, masked.options, masked.map);

    expect(back.text).toBe(text);
    expect(back.options[0].text).toBe(options[0].text);
    expect(back.options[1].text).toBe("2");
    expect(back.issues).toEqual([]);
  });

  it("model tokenni tashlab yuborsa u O'Z maydoni oxiriga qaytadi", () => {
    const options = [option("A", `Grafik ${IMG_B}`), option("B", "2")];
    const masked = maskImageTokens(`Şekilde ${IMG_A} verilmiştir`, options);

    // Model ikkala tokenni ham yozmadi.
    const back = unmaskImageTokens(
      "Rasmda berilgan",
      [option("A", "Grafik"), option("B", "2")],
      masked.map,
    );

    expect(back.text).toBe(`Rasmda berilgan ${IMG_A}`);
    // Variantdan yo'qolgan rasm savol matniga KO'CHMAYDI — bu chalg'ituvchi bo'lardi.
    expect(back.options[0].text).toBe(`Grafik ${IMG_B}`);
    expect(back.issues).toEqual(["IMAGE_TOKEN_MOVED"]);
  });

  it("xaritada yo'q token o'chiriladi", () => {
    const masked = maskImageTokens(`Şekilde ${IMG_A} verilmiştir`, []);

    const back = unmaskImageTokens("Rasmda [[IMG1]] va [[IMG7]] berilgan", [], masked.map);

    expect(back.text).toBe(`Rasmda ${IMG_A} va  berilgan`);
    expect(back.issues).toEqual(["IMAGE_TOKEN_INVALID"]);
  });

  it("takrorlangan token o'chiriladi, yozilmagani qaytariladi", () => {
    // Model [[IMG1]] ni ikki marta yozdi, [[IMG2]] ni umuman yozmadi.
    const options = [option("A", IMG_A), option("B", IMG_B)];
    const source = input({ text: "Grafiklerden hangisi?", options });
    const masked = maskImageTokens(source.text, options);

    const back = unmaskImageTokens(
      masked.text,
      [option("A", "[[IMG1]] [[IMG1]]"), option("B", "")],
      masked.map,
    );

    // A da rasm BIR marta, B esa o'z joyida — to'plam manbadagidek qoladi.
    // O'chgan tokendan qolgan bo'shliq matnni buzmaydi, shuning uchun kesiladi.
    expect(back.options[0].text.trimEnd()).toBe(IMG_A);
    expect(back.options[1].text).toBe(IMG_B);
    expect(back.issues).toContain("IMAGE_TOKEN_INVALID");
    expect(back.issues).toContain("IMAGE_TOKEN_MOVED");
    // Eng muhimi: bunday javob ham tekshiruvdan o'tadi.
    expect(verifyTranslation(source, { text: back.text, options: back.options }).fatal).toBeNull();
  });

  it("tokensiz savolga tegilmaydi", () => {
    const options = [option("A", "2"), option("B", "3")];
    const masked = maskImageTokens("Hız kaçtır?", options);

    expect(masked.text).toBe("Hız kaçtır?");
    expect(masked.map.size).toBe(0);

    const back = unmaskImageTokens("Tezlik nechaga teng?", options, masked.map);

    expect(back.text).toBe("Tezlik nechaga teng?");
    expect(back.options).toEqual(options);
    expect(back.issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5–6. Guruh tarjimasi — variantlar va rim raqamlari
// ---------------------------------------------------------------------------

describe("translateBatch — natija yozish", () => {
  it("son bo'lgan variant aynan qaytadi va tarjima saqlanadi", async () => {
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        {
          order: 0,
          text: "Jismning tezligi nechaga teng?",
          options: [
            { label: "A", text: "2" },
            { label: "B", text: "3" },
          ],
          issues: [],
          confidence: 0.9,
        },
      ]),
    );

    const { outcomes } = await translateBatch([input()], META, call);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].failed).toBe(false);
    expect(outcomes[0].result?.text).toBe("Jismning tezligi nechaga teng?");
    expect(outcomes[0].result?.options.map((o) => o.text)).toEqual(["2", "3"]);
  });

  it("rim raqamli variantlar lug'atdagidek tarjima qilinadi", async () => {
    const source = input({
      order: 7,
      text: "Buna göre, hangileri artar?",
      options: [option("A", "Yalnız I"), option("B", "I ve II"), option("C", "Hiçbiri")],
    });
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        {
          order: 7,
          text: "Bunga ko'ra, qaysilari ortadi?",
          options: [
            { label: "A", text: "Faqat I" },
            { label: "B", text: "I va II" },
            { label: "C", text: "Hech biri" },
          ],
          issues: [],
          confidence: 0.95,
        },
      ]),
    );

    const { outcomes } = await translateBatch([source], META, call);

    expect(outcomes[0].result?.options.map((o) => o.text)).toEqual(["Faqat I", "I va II", "Hech biri"]);
  });

  it("promptda rim raqamlari jadvali va lug'at bo'ladi", () => {
    const prompt = buildTranslatePrompt({ items: [input()], ...META });
    expect(prompt).toContain('"Yalnız I" → "Faqat I"');
    expect(prompt).toContain('"Hiçbiri" → "Hech biri"');
    expect(prompt).toContain("hız → tezlik");
    // Inglizcha bo'lim kirmasin — token bekorga ketmasin.
    expect(prompt).not.toContain("velocity → tezlik");
  });

  it("tekshiruvdan o'tmagan savol yiqiladi, guruhdagi qolgani saqlanadi", async () => {
    const first = input({ order: 0, options: [option("A", "2"), option("B", "3")] });
    const second = input({ order: 1, text: "Hız kaçtır?", options: [] });
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        // Birinchisida variant yo'qolgan.
        {
          order: 0,
          text: "Tezlik nechaga teng?",
          options: [{ label: "A", text: "2" }],
          issues: [],
          confidence: 0.9,
        },
        { order: 1, text: "Tezlik nechaga teng?", options: [], issues: [], confidence: 0.9 },
      ]),
    );

    const { outcomes } = await translateBatch([first, second], META, call);

    const failedOne = outcomes.find((o) => o.order === 0);
    expect(failedOne?.failed).toBe(true);
    expect(failedOne?.result).toBeNull();
    expect((failedOne?.error as Error).message).toBe("OPTION_COUNT_MISMATCH");
    // Javobning o'zi logga tushsin: kod NIMA yiqilganini aytadi, nega
    // yiqilganini esa faqat matn ko'rsatadi.
    expect(failedOne?.sample).toContain("Tezlik nechaga teng?");

    const okOne = outcomes.find((o) => o.order === 1);
    expect(okOne?.failed).toBe(false);
    expect(okOne?.result?.text).toBe("Tezlik nechaga teng?");
  });

  it("modelga cuid yuborilmaydi, tokenni yo'qotsa ham savol saqlanadi", async () => {
    const source = input({ text: `Şekildeki gibi ${IMG_A}`, options: [] });
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([{ order: 0, text: "Rasmdagidek", options: [], issues: [], confidence: 0.9 }]),
    );

    const { outcomes } = await translateBatch([source], META, call);

    expect(call.mock.calls[0][0].items[0].text).toBe("Şekildeki gibi [[IMG1]]");

    // Token yo'qolgani endi YIQITMAYDI — u matn oxiriga qaytariladi.
    expect(outcomes[0].failed).toBe(false);
    expect(outcomes[0].result?.text).toBe(`Rasmdagidek ${IMG_A}`);
    expect(outcomes[0].result?.issues).toContain("IMAGE_TOKEN_MOVED");
  });

  it("variantning imageToken i manbadan saqlanadi", async () => {
    const source = input({
      text: "Hangi grafik?",
      options: [option("A", "", IMG_A), option("B", "", IMG_B)],
    });
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        {
          order: 0,
          text: "Qaysi grafik?",
          options: [
            { label: "A", text: "" },
            { label: "B", text: "" },
          ],
          issues: [],
          confidence: 0.9,
        },
      ]),
    );

    const { outcomes } = await translateBatch([source], META, call);

    // Model bu maydonni umuman ko'rmaydi, shuning uchun uni yo'qota olmaydi.
    expect(outcomes[0].failed).toBe(false);
    expect(outcomes[0].result?.options.map((o) => o.imageToken)).toEqual([IMG_A, IMG_B]);
  });

  it("promptga cuid ham, imageToken maydoni ham tushmaydi", () => {
    const source = input({ text: `Şekildeki gibi ${IMG_A}`, options: [option("A", "2", IMG_B)] });
    const masked = maskImageTokens(source.text, source.options);

    const prompt = buildTranslatePrompt({
      items: [{ order: 0, text: masked.text, options: masked.options }],
      ...META,
    });

    expect(prompt).toContain("[[IMG1]]");
    expect(prompt).not.toContain("[[IMG:");
    expect(prompt).not.toContain("imageToken");
  });

  it("javobda qaytmagan savol RESULT_MISSING bilan yiqiladi", async () => {
    const call = vi.fn<TranslateCaller>().mockResolvedValue(answer([]));
    const { outcomes } = await translateBatch([input()], META, call);
    expect(outcomes[0].failed).toBe(true);
    expect((outcomes[0].error as Error).message).toBe("RESULT_MISSING");
  });

  it("token xarajati guruhga bir marta sanaladi", async () => {
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        { order: 0, text: "a", options: [], issues: [], confidence: 1 },
        { order: 1, text: "b", options: [], issues: [], confidence: 1 },
      ]),
    );

    const { outcomes } = await translateBatch(
      [input({ order: 0, text: "a", options: [] }), input({ order: 1, text: "b", options: [] })],
      META,
      call,
      { group: 2 },
    );

    // Javob 100 token — ikkiga ko'paytirilmasin.
    expect(outcomes.reduce((sum, o) => sum + o.tokens, 0)).toBe(100);
  });

  it("manba kodlari va model kodlari birlashadi", async () => {
    const call = vi.fn<TranslateCaller>().mockResolvedValue(
      answer([
        { order: 0, text: "$\\frac{P}{2}$ nechaga teng?", options: [], issues: ["LATEX_UNCERTAIN"], confidence: 0.4 },
      ]),
    );

    const { outcomes } = await translateBatch(
      [input({ text: "rac{P}{2} nedir?", options: [] })],
      META,
      call,
    );

    expect(outcomes[0].result?.issues).toContain("LATEX_REPAIRED");
    expect(outcomes[0].result?.issues).toContain("LATEX_WRAPPED");
    expect(outcomes[0].result?.issues).toContain("LATEX_UNCERTAIN");
  });
});

// ---------------------------------------------------------------------------
// 7. Kvota — zanjir tugasa deferred
// ---------------------------------------------------------------------------

describe("translateBatch — kvota", () => {
  it("RateLimitedError guruhni deferred qiladi, yiqitmaydi", async () => {
    const { RateLimitedError } = await import("../structure-error");
    const call = vi.fn<TranslateCaller>().mockRejectedValue(new RateLimitedError());

    const { outcomes } = await translateBatch(
      [input({ order: 0 }), input({ order: 1 })],
      META,
      call,
      { group: 2 },
    );

    expect(outcomes).toHaveLength(2);
    for (const outcome of outcomes) {
      expect(outcome.rateLimited).toBe(true);
      expect(outcome.deferred).toBe(true);
      // Kvota — tashqi chegara, savolning nuqsoni emas: terminal bo'lmasin.
      expect(outcome.failed).toBe(false);
      expect(outcome.result).toBeNull();
    }
  });

  it("429 qayta urinilmaydi — zanjir hal qiladi", async () => {
    const call = vi.fn<TranslateCaller>().mockRejectedValue(quota());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await translateBatch([input()], META, call, { sleep });

    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. Muddat — uchala qavat
// ---------------------------------------------------------------------------

describe("translateBatch — vaqt byudjeti", () => {
  it("vaqt yetmasa chaqiruv UMUMAN boshlanmaydi", async () => {
    const call = vi.fn<TranslateCaller>();
    const { outcomes } = await translateBatch([input()], META, call, {
      remaining: () => RETRY_RESERVE_MS - 1,
    });

    expect(call).not.toHaveBeenCalled();
    expect(outcomes[0].deferred).toBe(true);
    expect(outcomes[0].failed).toBe(false);
  });

  it("chaqiruv chegarasi qolgan vaqtdan oshmaydi", async () => {
    // Bu S4 dagi FUNCTION_INVOCATION_TIMEOUT ning aynan sababi edi: chegara
    // konstantadan olinsa, kech boshlangan chaqiruv `maxDuration` dan oshardi.
    const timers: number[] = [];
    const call = vi.fn<TranslateCaller>().mockResolvedValue(answer([]));

    await translateBatch([input()], META, call, {
      remaining: () => RETRY_RESERVE_MS + 5000,
      setTimer: ((fn: () => void, ms: number) => {
        timers.push(ms);
        return setTimeout(fn, 60000);
      }) as unknown as NonNullable<Parameters<typeof translateBatch>[3]>["setTimer"],
      clearTimer: clearTimeout,
    });

    // Byudjetdan 5000 ms qolgan — chegara CALL_TIMEOUT (30000) emas, o'sha.
    expect(timers).toEqual([5000]);
  });

  it("muddat tugasa qolgan guruhlarga tegilmaydi", async () => {
    const call = vi.fn<TranslateCaller>().mockResolvedValue(answer([]));

    const { batches, deadlineHit, outcomes } = await translateBatch(
      [input({ order: 0 }), input({ order: 1 }), input({ order: 2 }), input({ order: 3 })],
      META,
      call,
      {
        group: 1,
        concurrency: 1,
        // Birinchi chaqiruvdan keyin byudjet tugaydi. Hisoblagich emas,
        // chaqiruvlar soni: `remaining` ni `withRetry` ham chaqiradi,
        // shuning uchun oddiy sanoq mo'rt bo'lardi.
        remaining: () => (call.mock.calls.length === 0 ? 60000 : 0),
      },
    );

    expect(deadlineHit).toBe(true);
    expect(batches).toBe(1);
    // Faqat birinchi guruh natija berdi, qolgan uchtasiga tegilmadi.
    expect(outcomes).toHaveLength(1);
    expect(call).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Lug'at va javobni o'qish
// ---------------------------------------------------------------------------

describe("glossaryFor", () => {
  it("manba tiliga mos bo'limni qaytaradi", () => {
    expect(glossaryFor("tr")["hız"]).toBe("tezlik");
    expect(glossaryFor("tr")["şekil"]).toBe("rasm");
    expect(glossaryFor("en")["velocity"]).toBe("tezlik");
    // "tr-TR" ham turkcha.
    expect(glossaryFor("tr-TR")["kuvvet"]).toBe("kuch");
  });

  it("noma'lum til uchun bo'sh — lug'atsiz tarjima yiqilgandan yaxshiroq", () => {
    expect(glossaryFor("de")).toEqual({});
    expect(glossaryFor("")).toEqual({});
  });
});

describe("parseTranslateResponse", () => {
  it("natijalarni order bo'yicha xaritaga soladi", () => {
    // Model tartibni almashtirib qaytarsa ham savollar chalkashmasin.
    const map = parseTranslateResponse({
      results: [
        { order: 5, text: "besh", options: [] },
        { order: 2, text: "ikki", options: [] },
      ],
    });
    expect(map.get(5)?.text).toBe("besh");
    expect(map.get(2)?.text).toBe("ikki");
  });

  it("buzilgan javob bo'sh xarita beradi", () => {
    expect(parseTranslateResponse(null).size).toBe(0);
    expect(parseTranslateResponse({}).size).toBe(0);
    expect(parseTranslateResponse({ results: "axlat" }).size).toBe(0);
  });

  it("order i yo'q natija tashlanadi", () => {
    const map = parseTranslateResponse({ results: [{ text: "a", options: [] }] });
    expect(map.size).toBe(0);
  });

  it("yorliqsiz variantga A, B, C qo'yiladi", () => {
    const map = parseTranslateResponse({
      results: [{ order: 0, text: "a", options: [{ text: "x" }, { text: "y" }] }],
    });
    expect(map.get(0)?.options.map((o) => o.label)).toEqual(["A", "B"]);
  });
});
