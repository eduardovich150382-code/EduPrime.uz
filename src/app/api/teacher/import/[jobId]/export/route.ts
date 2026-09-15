import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildChatPrompt } from '@/lib/import/chat-prompt';
import { buildExportChunk, renderMarkdown, type ExportDraft } from '@/lib/import/chat-export';
import type { StructuredOption } from '@/lib/import/structure';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/**
 * Bir qismdagi savollar soni — standart va chegara.
 *
 * 50 — chat oynasiga bir marta tashlanadigan oqilona hajm. Chegara bor, chunki
 * `size` URL dan keladi: cheksiz qism butun jobni bitta javobga tiqib,
 * funksiyaning xotirasini yeb qo'yardi.
 */
const DEFAULT_SIZE = 50;
const MAX_SIZE = 200;

/**
 * Chatga chiqadigan draftlar: avtomatik yo'l hali tegmagan yoki unda yiqilgan.
 *
 * Aynan shu uchta bosqich: `BLOCK` — umuman boshlanmagan; `STRUCTURE_FAILED`
 * va `TRANSLATE_FAILED` — avtomatik yo'l uch urinishdan keyin taslim bo'lgan.
 * Ya'ni avtomatik yo'l yarmida to'xtab qolsa, qolgani shu yerdan chiqadi.
 */
const EXPORTABLE: Prisma.ImportDraftWhereInput = {
  OR: [
    { raw: { path: ['stage'], equals: 'BLOCK' } },
    { raw: { path: ['stage'], equals: 'STRUCTURE_FAILED' } },
    { raw: { path: ['stage'], equals: 'TRANSLATE_FAILED' } },
  ],
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** `options`/`optionsOriginal` Json ustunini variantlar massiviga aylantiradi. */
function parseOptions(value: unknown): StructuredOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const o = asRecord(entry);
    return {
      label: typeof o.label === 'string' ? o.label : String.fromCharCode(65 + index),
      text: typeof o.text === 'string' ? o.text : '',
      imageToken: typeof o.imageToken === 'string' && o.imageToken ? o.imageToken : null,
    };
  });
}

/** `raw.images[].assetId` — savolga ulangan kesilgan rasmlar. */
function parseImages(raw: Record<string, unknown>): string[] {
  if (!Array.isArray(raw.images)) return [];
  return raw.images
    .map((entry) => asRecord(entry).assetId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** URL dagi musbat butun son — noto'g'ri qiymat standartga tushadi. */
function parsePositive(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

// GET /api/teacher/import/[jobId]/export — savollarni chatga tashlanadigan
// matn ko'rinishida beradi.
//
// `?prompt=1` — ustoz chatga BIRINCHI tashlaydigan ko'rsatma (bazaga tegmaydi).
// `?after=<order>&size=50` — savollarning navbatdagi qismi.
//
// QISMLARGA BO'LISH KURSOR BILAN, `skip` BILAN EMAS. Tanlov bosqich bo'yicha
// filtrlangan to'plam ustida, `apply` esa draftlarni `READY` ga o'tkazib ularni
// o'sha to'plamdan chiqarib yuboradi. 120 savolli kitobda birinchi 50 tasi
// qo'llangach qolgan to'plam 70 ta bo'lardi va `skip: 50` ustozni 101–120 ga
// olib borardi — 51–100 hech qachon eksport qilinmasdi va ustoz buni sezmasdi
// ham. `order > after` esa bosqich o'zgarishidan qat'i nazar to'g'ri ishlaydi.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    // `jobSelect` da tillar va fan yo'q — ular faqat promptga kerak.
    const meta = await db.importJob.findUnique({
      where: { id: job.id },
      select: { sourceLang: true, targetLang: true, subject: { select: { nameUz: true } } },
    });

    const markdown = (body: string, headers: Record<string, string> = {}) =>
      new NextResponse(body, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers },
      });

    if (request.nextUrl.searchParams.get('prompt') === '1') {
      return markdown(
        buildChatPrompt({
          sourceLang: meta?.sourceLang ?? 'uz',
          targetLang: meta?.targetLang ?? 'uz',
          subject: meta?.subject?.nameUz ?? '',
        }),
      );
    }

    const size = parsePositive(request.nextUrl.searchParams.get('size'), DEFAULT_SIZE, MAX_SIZE);

    // Parametr BORLIGI alohida tekshiriladi: `Number(null)` — 0, ya'ni
    // tekshiruvsiz birinchi so'rov ham `order > 0` bo'lib, 0-savolni jimgina
    // tashlab ketardi (`order` aynan 0 dan boshlanadi — grouping.ts#draftOrder).
    const afterParam = request.nextUrl.searchParams.get('after');
    const after = Number(afterParam);
    const cursor: Prisma.ImportDraftWhereInput =
      afterParam !== null && Number.isInteger(after) ? { order: { gt: after } } : {};

    const where = { jobId: job.id, ...EXPORTABLE };
    const remaining = await db.importDraft.count({ where });

    const rows = await db.importDraft.findMany({
      where: { ...where, ...cursor },
      orderBy: { order: 'asc' },
      take: size,
      select: { id: true, order: true, textOriginal: true, text: true, optionsOriginal: true, raw: true },
    });

    // Kalit qatori sifatida allaqachon aniqlangan blok chatga YUBORILMAYDI:
    // uning tarjimasi ham, javobi ham yo'q. Avtomatik yo'l ham aynan shu
    // maydonga qarab blokni modelga yubormaydi (structure/route.ts).
    const drafts: (ExportDraft & { id: string; raw: Record<string, unknown> })[] = rows
      .map((row) => {
        const raw = asRecord(row.raw);
        const options = parseOptions(row.optionsOriginal);
        return {
          id: row.id,
          raw,
          order: row.order,
          text: row.textOriginal || row.text,
          options,
          images: parseImages(raw),
        };
      })
      .filter((draft) => draft.raw.notQuestion !== true);

    const blocks = buildExportChunk(drafts);

    // Xarita draftga YOZILADI: `apply` qisqa tokenni faqat shu orqali haqiqiy
    // rasmga qaytara oladi. Qayta eksport tokenlarni qaytadan raqamlaydi va
    // xaritani ustidan yozadi — `apply` doim OXIRGI eksportga qaraydi.
    const writes = blocks.map((block, index) => {
      const draft = drafts[index];
      return db.importDraft.update({
        where: { id: draft.id },
        data: { raw: { ...draft.raw, tokenMap: block.tokenMap } as unknown as Prisma.InputJsonValue },
      });
    });
    if (writes.length > 0) await db.$transaction(writes);

    const headers: Record<string, string> = { 'X-Import-Total': String(remaining) };
    // Kursor SO'NGGI O'QILGAN qatordan olinadi, chatga chiqqanidan emas:
    // tashlab yuborilgan kalit qatori oxirida tursa, aks holda keyingi so'rov
    // o'sha joyda aylanib qolardi.
    if (rows.length === size) headers['X-Import-Next-After'] = String(rows[rows.length - 1].order);

    logger.info('Import eksporti', {
      jobId: job.id,
      after: afterParam !== null && Number.isInteger(after) ? after : null,
      size,
      rows: rows.length,
      blocks: blocks.length,
      remaining,
    });

    return markdown(renderMarkdown(blocks), headers);
  } catch (error) {
    logger.error('GET /api/teacher/import/[jobId]/export error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
