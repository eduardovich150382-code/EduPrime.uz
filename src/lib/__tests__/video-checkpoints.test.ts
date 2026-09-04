import { describe, expect, it } from "vitest";
import { parseCheckpoints, checkpointsToStorage, MAX_CHECKPOINTS } from "../video-checkpoints";

describe("parseCheckpoints", () => {
  it("null/undefined uchun bo'sh massiv qaytaradi (hali hech narsa saqlanmagan)", () => {
    expect(parseCheckpoints(null)).toEqual([]);
    expect(parseCheckpoints(undefined)).toEqual([]);
  });

  it("massiv bo'lmagan qiymatni rad etadi", () => {
    expect(parseCheckpoints("not-an-array")).toBeNull();
    expect(parseCheckpoints({})).toBeNull();
  });

  it("to'g'ri checkpoints'ni vaqt bo'yicha tartiblab qaytaradi", () => {
    const result = parseCheckpoints([
      { atSeconds: 30, itemId: "item2" },
      { atSeconds: 5, itemId: "item1" },
    ]);
    expect(result).toEqual([
      { atSeconds: 5, itemId: "item1" },
      { atSeconds: 30, itemId: "item2" },
    ]);
  });

  it("manfiy atSeconds'ni rad etadi", () => {
    expect(parseCheckpoints([{ atSeconds: -1, itemId: "item1" }])).toBeNull();
  });

  it("bo'sh itemId'ni rad etadi", () => {
    expect(parseCheckpoints([{ atSeconds: 5, itemId: "" }])).toBeNull();
  });

  it("noto'g'ri turdagi maydonlarni rad etadi", () => {
    expect(parseCheckpoints([{ atSeconds: "5", itemId: "item1" }])).toBeNull();
    expect(parseCheckpoints([{ atSeconds: 5, itemId: 123 }])).toBeNull();
  });

  it("bir xil vaqtga ikkita nuqtani rad etadi", () => {
    expect(parseCheckpoints([{ atSeconds: 5, itemId: "item1" }, { atSeconds: 5, itemId: "item2" }])).toBeNull();
  });

  it(`${MAX_CHECKPOINTS} tadan ko'p bo'lsa rad etadi`, () => {
    const many = Array.from({ length: MAX_CHECKPOINTS + 1 }, (_, i) => ({ atSeconds: i, itemId: `item${i}` }));
    expect(parseCheckpoints(many)).toBeNull();
  });

  it(`aynan ${MAX_CHECKPOINTS} tani qabul qiladi`, () => {
    const exact = Array.from({ length: MAX_CHECKPOINTS }, (_, i) => ({ atSeconds: i, itemId: `item${i}` }));
    expect(parseCheckpoints(exact)).toHaveLength(MAX_CHECKPOINTS);
  });
});

describe("checkpointsToStorage", () => {
  it("bo'sh massivni null'ga aylantiradi", () => {
    expect(checkpointsToStorage([])).toBeNull();
  });

  it("bo'sh bo'lmagan massivni o'zgarishsiz qaytaradi", () => {
    const checkpoints = [{ atSeconds: 5, itemId: "item1" }];
    expect(checkpointsToStorage(checkpoints)).toEqual(checkpoints);
  });
});
