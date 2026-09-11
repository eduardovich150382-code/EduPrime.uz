import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { db } from '@/lib/db';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

const utapi = new UTApi();

/** `importAsset` endpointi bilan bir xil chegara. */
const MAX_ASSET_BYTES = 2 * 1024 * 1024;

const ASSET_KINDS = ['FIGURE', 'OPTION', 'SKIPPED'];

/** Prisma unique-constraint xatosi (quota.ts dagi bilan bir xil naqsh). */
function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

function parseBBox(raw: unknown): { x: number; y: number; w: number; h: number } | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    const { x, y, w, h } = parsed ?? {};
    if ([x, y, w, h].some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;
    return { x, y, w, h };
  } catch {
    return null;
  }
}

// POST /api/teacher/import/[jobId]/assets — kesilgan chizmani saqlaydi.
//
// IDEMPOTENTLIK: kalit (jobId, page, sha256). Brauzer uzilib qayta yuborsa
// yoki foydalanuvchi oynani yopib qayta ochsa, ayni rasm yangi qator ham,
// yangi UploadThing fayli ham yaratmaydi.
//
// sha256 ni SERVER hisoblaydi, klientnikini qabul qilmaydi: aks holda soxta
// hash bilan dedupe'ni chalg'itib, bir xil rasmni cheksiz ko'paytirish yoki
// boshqa rasmning o'rniga yozish mumkin bo'lardi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file majburiy' }, { status: 400 });
    }
    if (file.type !== 'image/png') {
      return NextResponse.json({ error: 'Faqat PNG qabul qilinadi' }, { status: 400 });
    }
    if (file.size > MAX_ASSET_BYTES) {
      return NextResponse.json({ error: 'Rasm 2 MB dan oshmasligi kerak' }, { status: 400 });
    }

    const page = Number(formData.get('page'));
    if (!Number.isInteger(page) || page < 1) {
      return NextResponse.json({ error: 'page notogri' }, { status: 400 });
    }

    const bbox = parseBBox(formData.get('bbox'));
    if (!bbox) {
      return NextResponse.json({ error: 'bbox notogri' }, { status: 400 });
    }

    const widthPx = Number(formData.get('widthPx'));
    const heightPx = Number(formData.get('heightPx'));
    if (!Number.isInteger(widthPx) || !Number.isInteger(heightPx) || widthPx < 1 || heightPx < 1) {
      return NextResponse.json({ error: 'Rasm olchami notogri' }, { status: 400 });
    }

    const kindRaw = formData.get('kind');
    const kind = typeof kindRaw === 'string' && ASSET_KINDS.includes(kindRaw) ? kindRaw : 'FIGURE';

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    // 1. Avval qidiriladi — takroriy yuborishda UploadThing'ga umuman
    // tegilmaydi (tarmoq ham, kvota ham, saqlash joyi ham tejaladi).
    const existing = await db.importAsset.findFirst({
      where: { jobId: job.id, page, sha256 },
      select: { id: true, url: true },
    });
    if (existing) {
      return NextResponse.json({ assetId: existing.id, url: existing.url, deduped: true });
    }

    const uploaded = await utapi.uploadFiles(file);
    if (uploaded.error) {
      logger.error('POST import assets: UploadThing xatosi', { error: uploaded.error });
      return NextResponse.json({ error: 'Yuklash amalga oshmadi' }, { status: 502 });
    }

    try {
      const asset = await db.importAsset.create({
        data: { jobId: job.id, page, bbox, url: uploaded.data.url, sha256, widthPx, heightPx, kind },
        select: { id: true, url: true },
      });
      return NextResponse.json({ assetId: asset.id, url: asset.url, deduped: false });
    } catch (err) {
      // Poyga sharti: yuqoridagi qidiruvdan keyin parallel so'rov shu qatorni
      // yozib ulgurgan. Unique indeks aynan shuning uchun qo'yilgan —
      // "qidir, keyin yoz" ning o'zi kafolat bermaydi.
      if (!isUniqueConstraintError(err)) throw err;
      const raced = await db.importAsset.findFirst({
        where: { jobId: job.id, page, sha256 },
        select: { id: true, url: true },
      });
      if (!raced) throw err;
      return NextResponse.json({ assetId: raced.id, url: raced.url, deduped: true });
    }
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/assets error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
