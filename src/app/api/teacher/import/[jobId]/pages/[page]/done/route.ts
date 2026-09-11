import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MAX_SOURCE_PAGE } from '@/lib/import/constants';
import { parsePagesDone, requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

// POST /api/teacher/import/[jobId]/pages/[page]/done — sahifaning rasmlari
// yuklanganini belgilaydi. Savollar bu yerda YOZILMAYDI: ular butun hujjat
// bo'yicha guruhlanadi (savol sahifa chegarasidan o'tadi) va barcha sahifalar
// tugagach `/blocks` ga bir marta ketadi (lib/import/grouping.ts).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; page: string }> },
) {
  try {
    const { jobId, page: rawPage } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    // `page` — ASL PDF sahifa raqami (skript 23–24-betni kesib olsa
    // pageCount 2, page esa 23), shuning uchun `pageCount` bilan cheklanmaydi.
    const page = Number(rawPage);
    if (!Number.isInteger(page) || page < 1 || page > MAX_SOURCE_PAGE) {
      return NextResponse.json({ error: 'page notogri' }, { status: 400 });
    }

    // BITTA atomik SQL. O'qib-keyin-yozish ataylab ishlatilmaydi: Read
    // Committed izolyatsiyasida ikki so'rov ikkalasi ham eski massivni o'qib,
    // biri ikkinchisini bosib ketishi mumkin (lost update —
    // quota.ts#bumpDailyUsage izohidagi bilan aynan bir xil xavf). CASE
    // takroriy chaqiruvda massivni o'zgarishsiz qoldiradi.
    await db.$executeRaw`
      UPDATE "ImportJob"
      SET "pagesDone" = CASE
            WHEN "pagesDone" @> to_jsonb(${page}::int) THEN "pagesDone"
            ELSE "pagesDone" || to_jsonb(${page}::int)
          END
      WHERE id = ${job.id}
    `;

    const updated = await db.importJob.findUnique({
      where: { id: job.id },
      select: { pagesDone: true },
    });
    const pagesDoneCount = parsePagesDone(updated?.pagesDone).length;
    return NextResponse.json({ pagesDoneCount, complete: pagesDoneCount >= job.pageCount });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/pages/[page]/done error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
