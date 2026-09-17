import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireTeacher } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Ro'yxat tanlash uchun — eski importlar kerak bo'lsa ustoz ularni allaqachon yakunlagan. */
const LIMIT = 20;

// GET /api/teacher/import/jobs — ustozning oxirgi importlari.
//
// Rasm biriktirish ekrani jobId ni shu yerdan oladi: aks holda uni faqat
// brauzer tarixidan topish mumkin edi. Faqat O'QIYDI.
export async function GET() {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

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

    // Filtr faqat teacherId bo'yicha — begona import ro'yxatda hech qachon chiqmasin.
    const where: Prisma.ImportJobWhereInput = { teacherId: teacher.id };
    const rows = await db.importJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      select: { id: true, fileName: true, createdAt: true, _count: { select: { drafts: true } } },
    });

    return NextResponse.json({
      jobs: rows.map((row) => ({
        id: row.id,
        fileName: row.fileName,
        createdAt: row.createdAt,
        drafts: row._count.drafts,
      })),
    });
  } catch (error) {
    logger.error('GET /api/teacher/import/jobs error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
