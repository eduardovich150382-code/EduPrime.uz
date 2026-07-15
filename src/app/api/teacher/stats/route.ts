import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/teacher/stats — ustoz statistikasini olish
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id as string },
    });

    if (!teacher) {
      return NextResponse.json({
        totalTests: 0,
        totalViews: 0,
        totalStudents: 0,
        totalRevenue: 0,
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

    // Total revenue (sum of test price * number of results for paid tests)
    const paidTests = await db.test.findMany({
      where: { teacherId: teacher.id, isFree: false },
      select: { id: true, price: true },
    });

    let totalRevenue = 0;
    if (paidTests.length > 0) {
      for (const test of paidTests) {
        const resultCount = await db.testResult.count({
          where: { testId: test.id },
        });
        totalRevenue += test.price * resultCount;
      }
    }

    return NextResponse.json({
      totalTests,
      totalViews,
      totalStudents,
      totalRevenue,
    });
  } catch (error) {
    console.error('GET /api/teacher/stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
