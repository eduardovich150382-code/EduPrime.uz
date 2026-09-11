import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, requireTeacher } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { MAX_IMPORT_PAGES } from '@/lib/import/constants';
import { logger } from '@/lib/logger';
import { checkImportQuota } from '@/lib/quota';

/** Qo'llab-quvvatlanadigan asl tillar — `ImportJob.sourceLang`. */
const SOURCE_LANGS = ['uz', 'ru', 'en'];

// POST /api/teacher/import — yangi import job yaratadi.
//
// Kvota SHU YERDA tekshiriladi, lekin sarflanmaydi: hisob `ImportJob`
// jadvalidan chiqariladi (lib/quota.ts#checkImportQuota), shuning uchun
// job yaratilishining o'zi hisobga kirishi mumkin va yarim yo'lda uzilgan
// import ertaga hisobdan tushib qoladi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const rateLimited = applyRateLimit(user.id, 10, 60000);
    if (rateLimited) return rateLimited;

    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json(
        { error: 'Ustoz profili topilmadi', code: 'NO_TEACHER_PROFILE' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { subjectId, fileName, fileUrl, sourceLang, pageCount } = body ?? {};

    if (typeof subjectId !== 'string' || !subjectId) {
      return NextResponse.json({ error: 'subjectId majburiy' }, { status: 400 });
    }
    if (typeof fileName !== 'string' || !fileName) {
      return NextResponse.json({ error: 'fileName majburiy' }, { status: 400 });
    }
    if (!SOURCE_LANGS.includes(sourceLang)) {
      return NextResponse.json({ error: 'sourceLang notogri' }, { status: 400 });
    }

    // Sahifa soni klientda ham tekshiriladi, lekin u yerdagi tekshiruvni
    // chetlab o'tish oson — chegara serverda ham qo'yiladi.
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      return NextResponse.json({ error: 'pageCount notogri' }, { status: 400 });
    }
    if (pageCount > MAX_IMPORT_PAGES) {
      return NextResponse.json(
        {
          error: `Fayl ${MAX_IMPORT_PAGES} sahifadan oshmasligi kerak`,
          code: 'TOO_MANY_PAGES',
          maxPages: MAX_IMPORT_PAGES,
        },
        { status: 400 },
      );
    }

    // SSRF himoyasi — `api/ai/import` dagi bilan bir xil naqsh.
    if (typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl majburiy' }, { status: 400 });
    }
    try {
      const parsed = new URL(fileUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'fileUrl protokoli notogri' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'fileUrl notogri' }, { status: 400 });
    }

    const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) {
      return NextResponse.json({ error: 'Fan topilmadi' }, { status: 400 });
    }

    const quota = await checkImportQuota(user.id, teacher.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: 'Kunlik import limiti tugadi',
          code: 'QUOTA_EXCEEDED',
          usedToday: quota.usedToday,
          limit: quota.limit,
        },
        { status: 429 },
      );
    }

    const job = await db.importJob.create({
      data: {
        teacherId: teacher.id,
        subjectId,
        fileName,
        fileUrl,
        fileKind: 'PDF',
        sourceLang,
        targetLang: sourceLang,
        pageCount,
        status: 'UPLOADED',
      },
      select: { id: true },
    });

    return NextResponse.json({ jobId: job.id, pagesDone: [] });
  } catch (error) {
    logger.error('POST /api/teacher/import error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
