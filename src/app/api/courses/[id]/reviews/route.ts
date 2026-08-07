import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { requireAuth, applyRateLimit } from '@/lib/api-auth';

// GET /api/courses/[id]/reviews — ommaviy: sharhlar ro'yxati + o'rtacha
// baho. Kirgan foydalanuvchi bo'lsa, uning o'z sharhi alohida qaytariladi
// (frontend tahrirlash formasi uchun).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [reviews, aggregate, session] = await Promise.all([
      db.courseReview.findMany({
        where: { courseId: id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      db.courseReview.aggregate({
        where: { courseId: id },
        _avg: { rating: true },
        _count: true,
      }),
      auth(),
    ]);

    const userId = session?.user?.id;
    const myReview = userId ? reviews.find((r) => r.userId === userId) || null : null;

    return NextResponse.json({
      avgRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      reviewCount: aggregate._count,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: r.user.name || "Foydalanuvchi",
      })),
      myReview,
    });
  } catch (error) {
    console.error('GET /api/courses/[id]/reviews error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/courses/[id]/reviews — o'z sharhini qo'shish yoki yangilash
// (bitta foydalanuvchi bitta kursga bitta sharh — unique constraint,
// upsert). Faqat kursga yozilgan foydalanuvchilarga ochiq.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const rateLimitError = applyRateLimit(user.id, 10, 60000);
    if (rateLimitError) return rateLimitError;

    const { id } = await params;
    const body = await request.json();
    const rating = Number(body.rating);
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Baho 1 dan 5 gacha butun son bo\'lishi kerak' }, { status: 400 });
    }

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Sharh qoldirish uchun avval kursga yozilishingiz kerak" }, { status: 403 });
    }

    const review = await db.courseReview.upsert({
      where: { userId_courseId: { userId: user.id, courseId: id } },
      update: { rating, comment: comment || null },
      create: { userId: user.id, courseId: id, rating, comment: comment || null },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error('POST /api/courses/[id]/reviews error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
