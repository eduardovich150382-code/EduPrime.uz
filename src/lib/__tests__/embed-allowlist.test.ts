import { describe, expect, it } from "vitest";
import { isAllowedEmbedUrl, EMBED_ALLOWED_DOMAINS } from "../embed-allowlist";

describe("isAllowedEmbedUrl", () => {
  it("ruxsat etilgan domenni (https) qabul qiladi", () => {
    expect(isAllowedEmbedUrl("https://www.geogebra.org/m/abc123")).toBe(true);
    expect(isAllowedEmbedUrl("https://www.desmos.com/calculator/xyz")).toBe(true);
  });

  it("ruxsat etilgan domenning subdomenini ham qabul qiladi", () => {
    expect(isAllowedEmbedUrl("https://ggbm.at.geogebra.org/m/abc")).toBe(true);
  });

  it("ruxsat etilmagan domenni rad etadi", () => {
    expect(isAllowedEmbedUrl("https://phet.colorado.edu/en/simulation/x")).toBe(false);
    expect(isAllowedEmbedUrl("https://evil.example.com")).toBe(false);
  });

  it("oddiy http (https emas) rad etiladi", () => {
    expect(isAllowedEmbedUrl("http://www.geogebra.org/m/abc")).toBe(false);
  });

  it("javascript: sxemasini rad etadi", () => {
    expect(isAllowedEmbedUrl("javascript:alert(1)")).toBe(false);
  });

  it("data: sxemasini rad etadi", () => {
    expect(isAllowedEmbedUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("domen nomiga o'xshab ko'rinadigan, lekin boshqa hostdagi hiyla-nayrangni rad etadi", () => {
    // "geogebra.org.evil.com" — geogebra.org bilan TUGAMAYDI (evil.com bilan tugaydi)
    expect(isAllowedEmbedUrl("https://geogebra.org.evil.com/x")).toBe(false);
    // "notgeogebra.org" — "geogebra.org" bilan tugaydi, lekin '.' chegarasisiz — rad etilishi kerak
    expect(isAllowedEmbedUrl("https://notgeogebra.org/x")).toBe(false);
  });

  it("noto'g'ri formatdagi URL'ni rad etadi", () => {
    expect(isAllowedEmbedUrl("not a url")).toBe(false);
    expect(isAllowedEmbedUrl("")).toBe(false);
  });

  it("EMBED_ALLOWED_DOMAINS faqat geogebra.org va desmos.com (PhET litsenziya noaniqligi sababli chiqarilgan)", () => {
    expect(EMBED_ALLOWED_DOMAINS).toEqual(["geogebra.org", "desmos.com"]);
  });
});
