import { describe, expect, it } from "vitest";
import { buildExportBlock, buildExportChunk, renderMarkdown, type ExportDraft } from "../chat-export";
import type { StructuredOption } from "../structure";

/** Haqiqiy tokenlar — aynan shu uzunlikdagi cuid modelni yiqitgandi (PR #159). */
const ID_A = "cmu2gfe670005lc0438g6uky5";
const ID_B = "cmu2gfe670005lc0438g6uky6";

function option(label: string, text: string, imageToken: string | null = null): StructuredOption {
  return { label, text, imageToken };
}

function draft(overrides: Partial<ExportDraft> = {}): ExportDraft {
  return {
    order: 12,
    text: "Rasmdagi eshik sharnirlar atrofida aylanadi.",
    options: [],
    images: [],
    ...overrides,
  };
}

describe("buildExportBlock — sarlavha va variantlar", () => {
  it("### <order> sarlavhasi qo'yiladi", () => {
    expect(buildExportBlock(draft({ order: 7 })).body).toMatch(/^### 7\n/);
  });

  it("xom blokda (variantlar bo'sh) faqat matn chiqadi", () => {
    const body = buildExportBlock(draft({ text: "1. Savol\nA) bir B) ikki" })).body;

    expect(body).toBe("### 12\n1. Savol\nA) bir B) ikki");
  });

  it("strukturalangan draft variantlari alohida qator bo'lib chiqadi", () => {
    const body = buildExportBlock(
      draft({ text: "Savol", options: [option("A", "bir"), option("B", "ikki")] }),
    ).body;

    expect(body).toBe("### 12\nSavol\nA) bir\nB) ikki");
  });

  it("buzuq yorliq indeksdan tiklanadi", () => {
    const body = buildExportBlock(
      draft({ text: "Savol", options: [option("", "bir"), option("2", "ikki")] }),
    ).body;

    expect(body).toContain("A) bir");
    expect(body).toContain("B) ikki");
  });
});

describe("buildExportBlock — rasm tokenlari", () => {
  it("haqiqiy token chiqishga TUSHMAYDI, o'rniga qisqasi qo'yiladi", () => {
    const block = buildExportBlock(draft({ images: [ID_A] }));

    expect(block.body).toContain("[[IMG1]]");
    expect(block.body).not.toContain("[[IMG:");
    expect(block.tokenMap).toEqual({ IMG1: `[[IMG:${ID_A}]]` });
  });

  it("matnda tokeni yo'q rasm (BLOCK bosqichi) matn oxiriga qo'shiladi", () => {
    // `BLOCK` draftining matnida `[[IMG:...]]` UMUMAN bo'lmaydi — rasmlar
    // `raw.images` da turadi. Shu qadamsiz rasm chatga umuman yetib bormasdi.
    const block = buildExportBlock(draft({ text: "Savol matni", images: [ID_A, ID_B] }));

    expect(block.body).toBe("### 12\nSavol matni\n[[IMG1]]\n[[IMG2]]");
    expect(Object.keys(block.tokenMap)).toEqual(["IMG1", "IMG2"]);
  });

  it("matnda allaqachon turgan token JOYIDA qoladi va takrorlanmaydi", () => {
    const block = buildExportBlock(
      draft({ text: `Grafikka qara [[IMG:${ID_A}]] va javob ber`, images: [ID_A] }),
    );

    expect(block.body).toBe("### 12\nGrafikka qara [[IMG1]] va javob ber");
    expect(Object.keys(block.tokenMap)).toHaveLength(1);
  });

  it("variantning imageToken maydoni O'SHA variant matniga ko'chadi", () => {
    const block = buildExportBlock(
      draft({
        text: "Savol",
        options: [option("A", "bir", `[[IMG:${ID_A}]]`), option("B", "ikki")],
        images: [ID_A],
      }),
    );

    expect(block.body).toBe("### 12\nSavol\nA) bir\n[[IMG1]]\nB) ikki");
    expect(block.tokenMap).toEqual({ IMG1: `[[IMG:${ID_A}]]` });
  });

  it("har draft tokenlarni YANGIDAN raqamlaydi", () => {
    const blocks = buildExportChunk([
      draft({ order: 1, images: [ID_A] }),
      draft({ order: 2, images: [ID_B] }),
    ]);

    expect(blocks[0].tokenMap).toEqual({ IMG1: `[[IMG:${ID_A}]]` });
    expect(blocks[1].tokenMap).toEqual({ IMG1: `[[IMG:${ID_B}]]` });
  });
});

describe("renderMarkdown", () => {
  it("bloklar bo'sh qator bilan ajratiladi", () => {
    const text = renderMarkdown(buildExportChunk([draft({ order: 1, text: "Bir" }), draft({ order: 2, text: "Ikki" })]));

    expect(text).toBe("### 1\nBir\n\n### 2\nIkki");
  });

  it("bo'sh qism bo'sh matn beradi", () => {
    expect(renderMarkdown([])).toBe("");
  });
});
