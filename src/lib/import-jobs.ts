import { NextResponse } from 'next/server';
import { requireTeacher } from './api-auth';
import { db } from './db';

/**
 * Import marshrutlari uchun umumiy kirish tekshiruvi.
 *
 * `src/lib/import/` emas, shu yerda turadi: o'sha papka ataylab sof (baza,
 * tarmoq va brauzerga bog'liq emas) va shu sababli PDF'siz test qilinadi —
 * unga Prisma'ni kiritish o'sha xususiyatni buzardi.
 */

const jobSelect = {
  id: true,
  teacherId: true,
  status: true,
  pageCount: true,
  blockCount: true,
  pagesDone: true,
} as const;

export type OwnedJob = {
  id: string;
  teacherId: string;
  status: string;
  pageCount: number;
  blockCount: number;
  pagesDone: unknown;
};

type JobAccessResult =
  | { error: NextResponse; teacher: null; job: null }
  | { error: null; teacher: { id: string }; job: OwnedJob };

/**
 * Ustozni aniqlaydi va berilgan job unga tegishli ekanini tekshiradi.
 *
 * Begona va mavjud bo'lmagan job BIR XIL 404 qaytaradi — 403 bilan ajratilsa,
 * javobning o'zi "bu id li import bor" degan ma'lumotni oshkor qilardi.
 */
export async function requireOwnedJob(jobId: string): Promise<JobAccessResult> {
  const { user, error } = await requireTeacher();
  if (error) return { error, teacher: null, job: null };

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!teacher) {
    return {
      error: NextResponse.json(
        { error: 'Ustoz profili topilmadi', code: 'NO_TEACHER_PROFILE' },
        { status: 403 },
      ),
      teacher: null,
      job: null,
    };
  }

  const job = await db.importJob.findUnique({ where: { id: jobId }, select: jobSelect });
  if (!job || job.teacherId !== teacher.id) {
    return {
      error: NextResponse.json({ error: 'Import topilmadi', code: 'NOT_FOUND' }, { status: 404 }),
      teacher: null,
      job: null,
    };
  }

  return { error: null, teacher, job: job as OwnedJob };
}

/** `ImportJob.pagesDone` Json ustunini son massiviga aylantiradi. */
export function parsePagesDone(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}
