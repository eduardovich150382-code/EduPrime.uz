/**
 * `validate-templates-lib.test.ts` tekshiruv mantig'ining o'zini sinaydi.
 * Bu fayl esa CLI ulanishini (argv, fayl o'qish, exit code) — haqiqiy
 * `scripts/validate-templates.ts` skriptini bola jarayon sifatida ishga
 * tushirib, ataylab buzilgan `templates.json` uchun nomuvaffaqiyatli exit
 * code bilan chiqishini tasdiqlaydi.
 */
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import type { Template } from "../src/lib/paramgen/paramgen";

const SCRIPT_PATH = path.join(__dirname, "validate-templates.ts");
// Lokal `tsx` binarini to'g'ridan-to'g'ri chaqiramiz ("npx tsx" emas, u
// Windows'da ENOENT beradi). Windows'da .cmd faylni ishga tushirish shart
// ravishda shellni talab qiladi (execFileSync + shell:false -> EINVAL),
// shuning uchun `execSync` (butun buyruq — doim shell orqali) ishlatiladi;
// yo'llar shu testning o'zi yaratgan vaqtinchalik fayl, tashqi kirish yo'q
// bo'lgani uchun qo'lda qo'shtirnoqlash xavfsiz.
const TSX_BIN = path.join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx"
);

function quote(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

const validTemplate: Template = {
  id: "cli-test-valid",
  subject: "Matematika",
  topic: "Test mavzu",
  grade: [9],
  exams: ["DTM"],
  difficulty: 1,
  params: [
    { name: "a", type: "int", min: 2, max: 9 },
    { name: "b", type: "int", min: 2, max: 9 },
  ],
  constraints: ["a != b"],
  answer: { expr: "a + b" },
  distractors: [
    { expr: "a - b", why: { uz: "ayirish bilan aralashtirilgan" } },
    { expr: "a * b", why: { uz: "ko'paytirish bilan aralashtirilgan" } },
    { expr: "a + b + 1", why: { uz: "bittaga xato qo'shilgan" } },
  ],
  stem: { uz: "{a} + {b} nechaga teng?" },
  solution: { uz: "{a} + {b} = {ans}" },
};

function writeTempTemplates(templates: Template[]): string {
  const file = path.join(os.tmpdir(), `validate-templates-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(templates), "utf8");
  return file;
}

function runCli(templatesPath: string): { status: number; stdout: string; stderr: string } {
  const cmd = `${quote(TSX_BIN)} ${quote(SCRIPT_PATH)} ${quote(templatesPath)}`;
  try {
    const stdout = execSync(cmd, { encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { status: err.status, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

describe("scripts/validate-templates.ts (CLI)", () => {
  it("to'g'ri shablonlar fayli uchun exit code 0 bilan chiqadi", () => {
    const file = writeTempTemplates([validTemplate]);
    try {
      const result = runCli(file);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Hammasi toza");
    } finally {
      fs.unlinkSync(file);
    }
  }, 30_000);

  it("ataylab buzilgan shablonlar fayli uchun exit code 1 bilan chiqadi va xatoni ko'rsatadi", () => {
    const broken: Template = { ...validTemplate, id: "cli-test-broken", topic: "", grade: [] };
    const file = writeTempTemplates([broken]);
    try {
      const result = runCli(file);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("cli-test-broken");
      expect(result.stderr).toMatch(/topic|grade/);
    } finally {
      fs.unlinkSync(file);
    }
  }, 30_000);
});
