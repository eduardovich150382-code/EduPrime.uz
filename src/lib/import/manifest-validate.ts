import { IMPORT_SOURCE_LANGS, MAX_IMPORT_PAGES, MAX_SOURCE_PAGE } from './constants';
import type { Manifest, ManifestBlock, ManifestImage, ManifestPage } from './manifest';
import type { BBox } from './types';

/**
 * Manifestni qat'iy tekshirish — ./manifest dan ajratilgan (fayl 400 satrdan
 * oshmasin). Tashqariga ./manifest orqali eksport qilinadi, chaqiruvchilar
 * shu fayl haqida bilishi shart emas.
 */

export type ManifestErrorCode =
  | 'NO_MANIFEST'
  | 'BAD_JSON'
  | 'BAD_VERSION'
  | 'BAD_KIND'
  | 'BAD_FIELD'
  | 'UNKNOWN_LANG'
  | 'TOO_MANY_PAGES'
  | 'UNSAFE_PATH'
  | 'MISSING_FILE'
  | 'NOT_PNG';

/**
 * Xato — kod va detal, tayyor matn EMAS: foydalanuvchiga ko'rinadigan matn
 * `messages/*.json` da, sahifa uni kod bo'yicha tarjima qiladi.
 */
export interface ManifestError {
  code: ManifestErrorCode;
  detail?: string;
}

export const MANIFEST_FILE = 'manifest.json';

// ---------------------------------------------------------------------------
// 1. ZIP ichidan manifestni topish
// ---------------------------------------------------------------------------

/**
 * `manifest.json` qaysi papkada ekanini aniqlaydi.
 *
 * Skript uni ZIP ildiziga qo'yadi, lekin Windows'da papkani "Siqilgan
 * papka" qilib yuborish hammasini bitta ichki papkaga o'raydi. Faqat YAGONA
 * ichki manifest qabul qilinadi — ikkitasi bo'lsa qaysi biri to'g'ri ekanini
 * taxmin qilmaymiz.
 */
export function locateManifest(names: readonly string[]): { prefix: string } | null {
  if (names.includes(MANIFEST_FILE)) return { prefix: '' };
  const nested = names.filter((n) => /^[^/]+\/manifest\.json$/.test(n));
  if (nested.length !== 1) return null;
  return { prefix: nested[0].slice(0, -MANIFEST_FILE.length) };
}

// ---------------------------------------------------------------------------
// 2. Qat'iy tekshiruv
// ---------------------------------------------------------------------------

/** Tekshiruv ichida birinchi xatoda chiqish uchun — tashqariga chiqmaydi. */
class ManifestInvalid extends Error {
  constructor(readonly error: ManifestError) {
    super(error.code);
  }
}

function fail(code: ManifestErrorCode, detail?: string): never {
  throw new ManifestInvalid({ code, detail });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('BAD_FIELD', where);
  return value;
}

function integer(value: unknown, where: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    fail('BAD_FIELD', where);
  }
  return value as number;
}

function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail('BAD_FIELD', where);
  return value;
}

function bbox(value: unknown, where: string): BBox {
  if (!isRecord(value)) fail('BAD_FIELD', where);
  const box = {
    x: finite(value.x, `${where}.x`),
    y: finite(value.y, `${where}.y`),
    w: finite(value.w, `${where}.w`),
    h: finite(value.h, `${where}.h`),
  };
  if (box.w < 0) fail('BAD_FIELD', `${where}.w`);
  if (box.h < 0) fail('BAD_FIELD', `${where}.h`);
  return box;
}

/**
 * ZIP ichidagi yo'l — zip-slip himoyasi.
 *
 * Fayl hozir faqat xotiradan o'qiladi va diskka yozilmaydi, lekin yo'l
 * manifestdan keladi, manifestni esa ustoz qo'lda tahrirlashi yoki begona
 * fayl bo'lishi mumkin. `..`, mutlaq yo'l va teskari chiziq bu yerda to'xtaydi —
 * keyinchalik kim bu yo'lni fayl tizimiga ulasa ham xavfsiz qolsin.
 */
function zipPath(value: unknown, where: string, files: ReadonlySet<string>): string {
  if (typeof value !== 'string' || value.length === 0) fail('BAD_FIELD', where);
  const segments = value.split('/');
  const unsafe =
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    /^[a-zA-Z]:/.test(value) ||
    segments.some((s) => s === '' || s === '.' || s === '..');
  if (unsafe) fail('UNSAFE_PATH', value);
  // `/assets` marshruti PNG (yoki klient qayta kodlagan JPEG) qabul qiladi;
  // skript har doim PNG yozadi, boshqasi — qo'lda aralashtirilgan fayl.
  if (!value.toLowerCase().endsWith('.png')) fail('NOT_PNG', value);
  if (!files.has(value)) fail('MISSING_FILE', value);
  return value;
}

function parsePage(raw: unknown, where: string, files: ReadonlySet<string>): ManifestPage {
  if (!isRecord(raw)) fail('BAD_FIELD', where);

  const page = integer(raw.page, `${where}.page`, 1, MAX_SOURCE_PAGE);
  const width = finite(raw.width, `${where}.width`);
  const height = finite(raw.height, `${where}.height`);
  if (width <= 0) fail('BAD_FIELD', `${where}.width`);
  if (height <= 0) fail('BAD_FIELD', `${where}.height`);

  const blocks = array(raw.blocks, `${where}.blocks`).map((b, i): ManifestBlock => {
    const at = `${where}.blocks[${i}]`;
    if (!isRecord(b)) fail('BAD_FIELD', at);
    if (typeof b.text !== 'string') fail('BAD_FIELD', `${at}.text`);
    return {
      order: integer(b.order, `${at}.order`, 0, Number.MAX_SAFE_INTEGER),
      bbox: bbox(b.bbox, `${at}.bbox`),
      text: b.text,
    };
  });

  const images = array(raw.images, `${where}.images`).map((img, i): ManifestImage => {
    const at = `${where}.images[${i}]`;
    if (!isRecord(img)) fail('BAD_FIELD', at);
    return {
      order: integer(img.order, `${at}.order`, 0, Number.MAX_SAFE_INTEGER),
      bbox: bbox(img.bbox, `${at}.bbox`),
      file: zipPath(img.file, `${at}.file`, files),
    };
  });

  const result: ManifestPage = { page, width, height, blocks, images };
  if (raw.pageImage !== undefined && raw.pageImage !== null) {
    result.pageImage = zipPath(raw.pageImage, `${where}.pageImage`, files);
  }
  return result;
}

/**
 * Manifestni qat'iy tekshiradi va TOZA nusxasini qaytaradi (ortiqcha
 * maydonlar tashlanadi).
 *
 * `files` — ZIP ichidagi fayl yo'llari, manifest papkasiga nisbatan.
 * Birinchi xatoda to'xtaydi: detal (masalan `pages[0].blocks[2].bbox.x`)
 * skriptdagi xatoni aniq ko'rsatadi, xatolar ro'yxati esa ustozga
 * foydasiz — skript bitta joyda buziladi.
 */
export function parseManifest(
  raw: unknown,
  files: ReadonlySet<string>,
): { manifest: Manifest } | { error: ManifestError } {
  try {
    if (!isRecord(raw)) fail('BAD_FIELD', '(root)');
    if (raw.version !== 1) fail('BAD_VERSION', String(raw.version));
    if (raw.kind !== 'auto' && raw.kind !== 'scanned') fail('BAD_KIND', String(raw.kind));
    if (typeof raw.sourceFile !== 'string' || raw.sourceFile.trim() === '') {
      fail('BAD_FIELD', 'sourceFile');
    }
    // Noma'lum til jimgina 'uz' ga TUSHIRILMAYDI: skriptda `ASL_TIL`
    // noto'g'ri qolgan bo'lsa, ustoz buni shu yerda bilib olishi kerak.
    if (typeof raw.sourceLang !== 'string') fail('BAD_FIELD', 'sourceLang');
    if (!(IMPORT_SOURCE_LANGS as readonly string[]).includes(raw.sourceLang)) {
      fail('UNKNOWN_LANG', raw.sourceLang);
    }

    const rawPages = array(raw.pages, 'pages');
    if (rawPages.length === 0) fail('BAD_FIELD', 'pages');
    if (rawPages.length > MAX_IMPORT_PAGES) fail('TOO_MANY_PAGES', String(rawPages.length));
    if (raw.pageCount !== rawPages.length) fail('BAD_FIELD', 'pageCount');

    const pages = rawPages.map((p, i) => parsePage(p, `pages[${i}]`, files));
    // Sahifa raqami `pagesDone` va `ImportAsset.page` kaliti — takrorlansa
    // ikki sahifa bir-birining natijasini bosib ketardi.
    const seen = new Set<number>();
    pages.forEach((p, i) => {
      if (seen.has(p.page)) fail('BAD_FIELD', `pages[${i}].page`);
      seen.add(p.page);
    });

    return {
      manifest: {
        version: 1,
        kind: raw.kind,
        sourceFile: raw.sourceFile,
        sourceLang: raw.sourceLang,
        pageCount: pages.length,
        pages,
      },
    };
  } catch (err) {
    if (err instanceof ManifestInvalid) return { error: err.error };
    throw err;
  }
}
