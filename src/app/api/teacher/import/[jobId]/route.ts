import { NextResponse } from 'next/server';
import { parsePagesDone, requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

// GET /api/teacher/import/[jobId] — job holati.
//
// Brauzer uzilib qayta ulanganda quvur shu javobga qarab ishini davom
// ettiradi: `pagesDone` dagi sahifalar qaytadan ishlanmaydi.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      pageCount: job.pageCount,
      blockCount: job.blockCount,
      pagesDone: parsePagesDone(job.pagesDone),
    });
  } catch (error) {
    logger.error('GET /api/teacher/import/[jobId] error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
