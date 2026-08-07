import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// DELETE /api/courses/[id]/reviews/[reviewId] — o'z sharhini o'chirish,
// yoki ADMIN har qanday sharhni moderatsiya sifatida o'chirishi mumkin.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id, reviewId } = await params;

    const review = await db.courseReview.findUnique({ where: { id: reviewId } });
    if (!review || review.courseId !== id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    if (review.userId !== user.id && (user.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.courseReview.delete({ where: { id: reviewId } });
    return NextResponse.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('DELETE /api/courses/[id]/reviews/[reviewId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
