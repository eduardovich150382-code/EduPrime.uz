import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { computeChecksum, normalizeLineEndings } from "./make-manual-migration";

describe("normalizeLineEndings", () => {
  it("CRLF va yolg'iz CR ni LF ga aylantiradi", () => {
    const crlf = 'CREATE TABLE "Foo" (\r\n  "id" TEXT NOT NULL\r\n);\r\n';
    const cr = 'CREATE TABLE "Foo" (\r  "id" TEXT NOT NULL\r);\r';
    const lf = 'CREATE TABLE "Foo" (\n  "id" TEXT NOT NULL\n);\n';

    expect(normalizeLineEndings(crlf)).toBe(lf);
    expect(normalizeLineEndings(cr)).toBe(lf);
    expect(normalizeLineEndings(lf)).toBe(lf);
  });
});

describe("computeChecksum", () => {
  it("ma'lum mazmun uchun kutilgan SHA-256 hex qiymatini qaytaradi", () => {
    const content = 'CREATE TABLE "Foo" (\n  "id" TEXT NOT NULL\n);\n';
    const expected = crypto.createHash("sha256").update(content, "utf8").digest("hex");

    expect(computeChecksum(content)).toBe(expected);
    // Prisma checksum'i har doim 64 ta hex belgidan iborat (SHA-256).
    expect(computeChecksum(content)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("CRLF va LF variantlari normallashtirilgach bir xil checksum beradi", () => {
    const lf = 'ALTER TABLE "Bar" ADD COLUMN "x" INTEGER;\n';
    const crlf = 'ALTER TABLE "Bar" ADD COLUMN "x" INTEGER;\r\n';

    const checksumFromLf = computeChecksum(normalizeLineEndings(lf));
    const checksumFromCrlf = computeChecksum(normalizeLineEndings(crlf));

    expect(checksumFromCrlf).toBe(checksumFromLf);
  });

  it("mazmun o'zgarsa checksum ham o'zgaradi", () => {
    const a = computeChecksum("SELECT 1;\n");
    const b = computeChecksum("SELECT 2;\n");

    expect(a).not.toBe(b);
  });
});
