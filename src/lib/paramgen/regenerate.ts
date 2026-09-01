/**
 * Bazaga yozilgan parametrik savol (`templateId` + `variantSig`) uchun asl
 * variantni QAYTA HOSIL QILADI — S20a: distraktor izohi (`why`) va
 * ko'rsatmalar (`hints`) bazaga hech qachon yozilmagan, faqat shablonda
 * (`templates.json`) va generator xotirasida bor edi. Generator
 * determinilashgan (`paramgen.ts` — bir xil shablon + seed + lang har doim
 * bir xil variantlar to'plamini beradi), shuning uchun `seed.ts` bilan
 * AYNAN bir xil parametrlar bilan qayta ishga tushirilsa, saqlangan
 * `variantSig`ga mos variant topiladi — ma'lumot migratsiyasi shart emas.
 *
 * Muvaffaqiyatsiz bo'lishi mumkin: shablon `templates.json`dan
 * o'chirilgan/o'zgargan, korpus fayli topilmagan, yoki `variantSig` eski
 * (boshqa seed/count bilan yozilgan). Bunday holatda funksiyalar `null`
 * (yoki bo'sh massiv) qaytaradi — chaqiruvchi sahifani yiqitmasdan jimgina
 * o'tkazib yuborishi kerak (qabul mezoni).
 */
import fs from "fs";
import path from "path";
import { generateVariants, type Template, type Variant, type Lang } from "./paramgen";
import { PARAMGEN_SEED, PARAMGEN_PER_TEMPLATE } from "./constants";

let templatesCache: Template[] | null | undefined;

function loadTemplates(): Template[] | null {
  if (templatesCache !== undefined) return templatesCache;
  try {
    const raw = fs.readFileSync(path.join(__dirname, "templates.json"), "utf8");
    templatesCache = JSON.parse(raw) as Template[];
  } catch {
    templatesCache = null;
  }
  return templatesCache;
}

// Bitta so'rov (yoki bitta issiq server nusxasi) davomida bir xil
// (templateId, lang) bir necha marta so'ralishi mumkin (masalan bir nechta
// savol bir shablondan) — har birini faqat bir marta generatsiya qilamiz.
// Chegaralangan LRU: amalda bitta natijalar sahifasi 1-3 ta shablonga
// tegadi, shuning uchun 12 ta juftlik uzoq ishlaydigan server nusxasida ham
// xotirani cheksiz o'stirmaydi (68 shablon × til × 200 variant to'planib
// qolmasin deb).
const MAX_CACHED_TEMPLATES = 12;
const variantsCache = new Map<string, Variant[]>();

function variantsFor(templateId: string, lang: Lang): Variant[] | null {
  const cacheKey = `${templateId}:${lang}`;
  const cached = variantsCache.get(cacheKey);
  if (cached) {
    // Eng oxirgi ishlatilgan sifatida qayta qo'yamiz — Map kiritish
    // tartibini saqlaydi, shuning uchun qayta `set` uni oxiriga suradi va
    // pastdagi eviction eng ESKI (eng uzoq ishlatilmagan) juftlikni chiqarib
    // tashlaydi.
    variantsCache.delete(cacheKey);
    variantsCache.set(cacheKey, cached);
    return cached;
  }

  const templates = loadTemplates();
  const t = templates?.find((tpl) => tpl.id === templateId);
  if (!t) return null;

  let variants: Variant[];
  try {
    variants = generateVariants(t, { count: t.seedCount ?? PARAMGEN_PER_TEMPLATE, seed: PARAMGEN_SEED, lang });
  } catch {
    return null; // masalan korpus fayli o'qilmadi — jimgina o'tkazib yuboramiz
  }

  if (variantsCache.size >= MAX_CACHED_TEMPLATES) {
    const oldest = variantsCache.keys().next().value;
    if (oldest) variantsCache.delete(oldest);
  }
  variantsCache.set(cacheKey, variants);
  return variants;
}

/** DB'dagi erkin `lang: String`ni generator kutayotgan qat'iy turga keltiradi — noma'lum qiymatda "uz"ga tushadi. */
export function toLang(lang: string | null | undefined): Lang {
  return lang === "ru" || lang === "en" ? lang : "uz";
}

/** Saqlangan `variantSig`ga mos asl variantni qaytaradi, topilmasa `null`. */
export function regenerateVariant(templateId: string, variantSig: string, lang: Lang): Variant | null {
  const variants = variantsFor(templateId, lang);
  return variants?.find((v) => v.variantId === variantSig) ?? null;
}

/**
 * Foydalanuvchi tanlagan (noto'g'ri) variantning "nega xato" izohi —
 * natijalar sahifasida javob ostida bepul ko'rsatiladi. To'g'ri javob
 * uchun ham, `variantSig` topilmasa ham `null`.
 */
export function getDistractorWhy(
  templateId: string,
  variantSig: string,
  lang: Lang,
  chosenLabel: string
): string | null {
  const variant = regenerateVariant(templateId, variantSig, lang);
  if (!variant) return null;
  const choice = variant.choices.find((c) => c.key === chosenLabel && !c.correct);
  const why = choice?.why?.[lang] ?? choice?.why?.uz;
  return why?.trim() || null;
}

/** Shablonning ko'rsatmalari (progressiv — "Ko'rsatma" tugmasi birinchi, keyin ikkinchisini ochadi). Topilmasa bo'sh massiv. */
export function getRegeneratedHints(templateId: string, variantSig: string, lang: Lang): string[] {
  return regenerateVariant(templateId, variantSig, lang)?.hints ?? [];
}
