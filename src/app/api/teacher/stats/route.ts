import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/stats — ustoz statistikasini olish
export async function GET() {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return NextResponse.json({
        totalTests: 0,
        totalViews: 0,
        totalStudents: 0,
        paidTestAttempts: 0,
      });
    }

    // Total tests count
    const totalTests = await db.test.count({
      where: { teacherId: teacher.id },
    });

    // Total test results (views/attempts)
    const totalViews = await db.testResult.count({
      where: { test: { teacherId: teacher.id } },
    });

    // Total unique students
    const uniqueStudents = await db.testResult.findMany({
      where: { test: { teacherId: teacher.id } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const totalStudents = uniqueStudents.length;

    // Total revenue: approximate based on paid test attempts
    // Note: This shows the number of paid test attempts, not confirmed payments
    const paidTests = await db.test.findMany({
      where: { teacherId: teacher.id, isFree: false },
      select: { id: true },
    });

    let paidTestAttempts = 0;
    if (paidTests.length > 0) {
      paidTestAttempts = await db.testResult.count({
        where: {
          testId: { in: paidTests.map((t) => t.id) },
        },
      });
    }

    return NextResponse.json({
      totalTests,
      totalViews,
      totalStudents,
      paidTestAttempts,
    });
  } catch (error) {
    console.error('GET /api/teacher/stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
