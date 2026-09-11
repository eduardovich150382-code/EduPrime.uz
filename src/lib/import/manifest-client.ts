import { unzipSync } from 'fflate';
import { ASSET_JPEG_QUALITY, MAX_IMPORT_ASSET_BYTES } from './constants';
import { shrinkPlan, type PixelSize } from './image-budget';
import {
  MANIFEST_FILE,
  locateManifest,
  parseManifest,
  toUploadGroup,
  type Manifest,
  type ManifestError,
  type ManifestPage,
  type QuestionGroup,
  type UploadGroup,
} from './manifest';
import type { BBox } from './types';

/**
 * Brauzer qatlami: ZIP'ni ochish, rasmni `/assets` chegarasiga sig'dirish va
 * yuklash. Qaror mantig'i (tekshiruv, guruhlash, sig'dirish rejasi) sof
 * fayllarda — ./manifest va ./image-budget; bu yerda faqat fflate, canvas va
 * `fetch`.
 */

/** Ochilgan ZIP — fayllar hali xotiraga CHIQARILMAGAN. */
export interface ZipSource {
  bytes: Uint8Array;
  /** `manifest.json` joylashgan papka (`''` yoki `Innova/`). */
  prefix: string;
}

/**
 * ZIP'dan faqat berilgan fayllarni chiqaradi.
 *
 * `unzipSync` `filter` bilan chaqiriladi, butun arxiv bilan emas: 40
 * sahifalik ZIP ochilganda ~40 MB PNG bo'ladi, telefon brauzeri esa uni
 * siqilgan nusxa bilan birga ushlab turolmasligi mumkin. Sahifama-sahifa
 * chiqarilganda xotirada bir vaqtda bitta sahifaning fayllari bo'ladi.
 * Markaziy katalogni qayta o'qish arzon — u arxiv oxirida, bir necha KB.
 */
export function extractFiles(zip: ZipSource, paths: readonly string[]): Map<string, Uint8Array> {
  const wanted = new Set(paths.map((p) => zip.prefix + p));
  const out = unzipSync(zip.bytes, { filter: (file) => wanted.has(file.name) });
  const result = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(out)) result.set(name.slice(zip.prefix.length), data);
  return result;
}

/** ZIP'ni ochib, manifestni topadi va tekshiradi. */
export function openManifestZip(
  bytes: Uint8Array,
): { zip: ZipSource; manifest: Manifest; manifestBytes: Uint8Array } | { error: ManifestError } {
  let names: string[] = [];
  try {
    // Filtr hech narsani chiqarmaydi — faqat nomlar ro'yxati olinadi.
    unzipSync(bytes, {
      filter: (file) => {
        if (!file.name.endsWith('/')) names.push(file.name);
        return false;
      },
    });
  } catch {
    names = [];
  }

  const located = locateManifest(names);
  if (!located) return { error: { code: 'NO_MANIFEST' } };
  const zip: ZipSource = { bytes, prefix: located.prefix };

  const manifestBytes = extractFiles(zip, [MANIFEST_FILE]).get(MANIFEST_FILE);
  if (!manifestBytes) return { error: { code: 'NO_MANIFEST' } };

  let raw: unknown;
  try {
    // `TextDecoder` sukut bo'yicha BOM'ni tashlaydi — manifest qo'lda
    // Windows Notepad'da saqlangan bo'lsa ham `JSON.parse` yiqilmaydi.
    raw = JSON.parse(new TextDecoder('utf-8').decode(manifestBytes));
  } catch {
    return { error: { code: 'BAD_JSON' } };
  }

  const files = new Set(
    names.filter((n) => n.startsWith(zip.prefix)).map((n) => n.slice(zip.prefix.length)),
  );
  const parsed = parseManifest(raw, files);
  if ('error' in parsed) return parsed;
  return { zip, manifest: parsed.manifest, manifestBytes };
}

// ---------------------------------------------------------------------------
// Rasmni 2 MB ga sig'dirish
// ---------------------------------------------------------------------------

export interface FittedImage {
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

/**
 * `Uint8Array` ni `BlobPart` sifatida berish — fflate `ArrayBufferLike`
 * ustidagi massiv qaytaradi, DOM turlari esa aniq `ArrayBuffer` talab qiladi.
 * Nusxa olinmaydi: fflate natijasi `SharedArrayBuffer` emas.
 */
function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}

async function encodeJpeg(bitmap: ImageBitmap, size: PixelSize): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // JPEG'da shaffoflik yo'q — oq fon bo'lmasa shaffof joylar qora chiqadi.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', ASSET_JPEG_QUALITY),
    );
  } finally {
    // Safari canvas xotirasini element o'chirilganda emas, o'lcham nolga
    // tushganda bo'shatadi — 40 sahifada bu sezilarli.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * PNG'ni `/assets` chegarasiga sig'diradi: sig'sa o'zicha, aks holda JPEG,
 * keyin `shrinkPlan` bo'yicha kichraytirish. Sig'masa `null` — chaqiruvchi
 * o'tkazib yuboradi va yakunda aytadi.
 */
export async function fitAsset(bytes: Uint8Array): Promise<FittedImage | null> {
  const png = toBlob(bytes, 'image/png');
  const bitmap = await createImageBitmap(png);
  try {
    if (png.size <= MAX_IMPORT_ASSET_BYTES) {
      return { blob: png, widthPx: bitmap.width, heightPx: bitmap.height };
    }
    for (const size of shrinkPlan(bitmap.width, bitmap.height)) {
      const jpeg = await encodeJpeg(bitmap, size);
      if (jpeg && jpeg.size <= MAX_IMPORT_ASSET_BYTES) {
        return { blob: jpeg, widthPx: size.width, heightPx: size.height };
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}

// ---------------------------------------------------------------------------
// Serverga yuborish
// ---------------------------------------------------------------------------

/** `ImportAsset.kind` — manifest yo'lida faqat shu ikkitasi. */
export type ManifestAssetKind = 'FIGURE' | 'PAGE';

/**
 * Rasmni mavjud multipart `/assets` marshrutiga yuboradi.
 *
 * 400 — shu rasmning o'zi yaroqsiz (masalan server boshqacha o'lchadi):
 * `null`, import davom etadi. Qolgan xatolar — throw: 401/404 da (sessiya
 * tugagan, job begona) har bir rasmni jimgina "o'tkazib yuborish" butun
 * importni rasmsiz qoldirardi. 5xx va tarmoq xatosida sahifa
 * `pagesDone` ga tushmaydi va qayta ulanishda qaytadan ishlanadi, server
 * sha256 bo'yicha dublikat yaratmaydi.
 */
export async function uploadAsset(
  jobId: string,
  input: { page: number; bbox: BBox; image: FittedImage; kind: ManifestAssetKind },
): Promise<string | null> {
  const { page, bbox, image, kind } = input;
  const ext = image.blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const form = new FormData();
  form.set('file', new File([image.blob], `p${page}.${ext}`, { type: image.blob.type }));
  form.set('page', String(page));
  form.set('bbox', JSON.stringify(bbox));
  form.set('widthPx', String(image.widthPx));
  form.set('heightPx', String(image.heightPx));
  form.set('kind', kind);
  // sha256 YUBORILMAYDI — serverning o'zi hisoblaydi.

  const res = await fetch(`/api/teacher/import/${jobId}/assets`, { method: 'POST', body: form });
  if (res.status === 400) return null;
  if (!res.ok) throw new Error(`assets ${res.status}`);
  const data = (await res.json()) as { assetId: string };
  return data.assetId;
}

/** Bitta sahifaning savollarini yozadi va sahifani `pagesDone` ga qo'shadi. */
export async function sendGroups(
  jobId: string,
  body: { page: number; pageImageAssetId: string | null; groups: UploadGroup[] },
): Promise<void> {
  const res = await fetch(`/api/teacher/import/${jobId}/blocks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`blocks ${res.status}`);
}

/**
 * Bitta sahifani to'liq yuboradi: rasmlar (`FIGURE`), sahifa aksi (`PAGE`),
 * keyin savol guruhlari. Guruhlar OXIRIDA ketadi — `/blocks` sahifani
 * `pagesDone` ga qo'shadi, rasmlar esa undan oldin serverda bo'lishi kerak.
 */
export async function uploadManifestPage(
  jobId: string,
  zip: ZipSource,
  page: ManifestPage,
  groups: QuestionGroup[],
): Promise<{ images: number; skipped: number }> {
  const paths = [...page.images.map((img) => img.file), ...(page.pageImage ? [page.pageImage] : [])];
  const files = extractFiles(zip, [...new Set(paths)]);
  let images = 0;
  let skipped = 0;

  // Bir xil rasm sahifada ikki joyda turishi mumkin (PyMuPDF bitta xref'ni
  // ikki marta joylaydi) — u bir marta yuklanadi.
  const assetIds = new Map<string, string>();
  for (const image of page.images) {
    if (assetIds.has(image.file)) continue;
    const bytes = files.get(image.file);
    const fitted = bytes ? await fitAsset(bytes) : null;
    const assetId = fitted
      ? await uploadAsset(jobId, { page: page.page, bbox: image.bbox, image: fitted, kind: 'FIGURE' })
      : null;
    if (assetId) {
      assetIds.set(image.file, assetId);
      images++;
    } else {
      skipped++;
    }
  }

  let pageImageAssetId: string | null = null;
  const pageBytes = page.pageImage ? files.get(page.pageImage) : undefined;
  if (pageBytes) {
    const fitted = await fitAsset(pageBytes);
    if (fitted) {
      pageImageAssetId = await uploadAsset(jobId, {
        page: page.page,
        bbox: { x: 0, y: 0, w: page.width, h: page.height },
        image: fitted,
        kind: 'PAGE',
      });
    }
    if (!pageImageAssetId) skipped++;
  }

  await sendGroups(jobId, {
    page: page.page,
    pageImageAssetId,
    groups: groups.map((g) => toUploadGroup(g, assetIds)),
  });
  return { images, skipped };
}
