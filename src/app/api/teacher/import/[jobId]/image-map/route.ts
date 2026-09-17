import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRealQuestion, sourceTextOf } from '@/lib/import/chat-export';
import { draftNumbersOf, type MapEntry } from '@/lib/import/image-match';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** `raw.images[].url` — buzuq yozuv tashlanadi, draftning o'zi esa qoladi. */
function imageUrlsOf(raw: Record<string, unknown>): string[] {
  if (!Array.isArray(raw.images)) return [];
  return raw.images
    .map((entry) => asRecord(entry).url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

// GET /api/teacher/import/[jobId]/image-map — jobdagi savol draftlarini o'qish
// tartibida, rasmlari va son belgilari bilan beradi.
//
// HAMMA savol drafti qaytariladi, faqat rasmlilari emas: klient chatdan kelgan
// N-savolni N-draftga moslaydi va rasmsizlarni tashlab yuborish indekslarni
// siljitib, butun moslashtiruvni buzardi. Bosqich bo'yicha filtr ham yo'q —
// tartib butun job bo'yicha hisoblanadi.
//
// Faqat O'QIYDI: necha marta chaqirilsa ham bir xil javob.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    const rows = await db.importDraft.findMany({
      where: { jobId: job.id },
      orderBy: { order: 'asc' },
      select: { order: true, textOriginal: true, text: true, optionsOriginal: true, raw: true },
    });

    const entries: MapEntry[] = rows.filter(isRealQuestion).map((row, index) => {
      const raw = asRecord(row.raw);
      return {
        index,
        order: row.order,
        images: imageUrlsOf(raw),
        numbers: draftNumbersOf(sourceTextOf(row.textOriginal || row.text, row.optionsOriginal), raw.number),
      };
    });

    logger.info('Import rasm xaritasi', {
      jobId: job.id,
      total: entries.length,
      images: entries.reduce((sum, e) => sum + e.images.length, 0),
    });

    return NextResponse.json({ jobId: job.id, total: entries.length, entries });
  } catch (error) {
    logger.error('GET /api/teacher/import/[jobId]/image-map error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
