import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// Temporary debug endpoint — remove after fixing
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const role = (session.user as any)?.role;

    // 1. Check user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    // 2. Check teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId },
    });

    // 3. Check tests (without include)
    let testsRaw: any[] = [];
    if (teacher) {
      testsRaw = await db.test.findMany({
        where: { teacherId: teacher.id },
        select: { id: true, titleUz: true, isPublished: true, subjectId: true, teacherId: true },
      });
    }

    // 4. Check all published tests
    const allPublished = await db.test.findMany({
      where: { isPublished: true },
      select: { id: true, titleUz: true, subjectId: true, teacherId: true },
    });

    // 5. Check subjects
    const subjects = await db.subject.findMany({
      select: { id: true, nameUz: true, categoryId: true },
    });

    // 6. Try full query (like /api/teacher/tests does)
    let fullQueryResult: any = null;
    let fullQueryError: any = null;
    if (teacher) {
      try {
        fullQueryResult = await db.test.findMany({
          where: { teacherId: teacher.id },
          include: {
            subject: { select: { nameUz: true, icon: true } },
          },
        });
      } catch (e: any) {
        fullQueryError = e.message || String(e);
      }
    }

    return NextResponse.json({
      user,
      role,
      teacher,
      testsRaw,
      allPublished,
      subjects,
      fullQueryResult,
      fullQueryError,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
