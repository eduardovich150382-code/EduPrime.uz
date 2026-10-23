import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkTestAccess } from '@/lib/access';
import { resolveTestVisibility } from '@/lib/test-visibility';
import { logger } from '@/lib/logger';

/**
 * GET /api/subscription/check-access?testId=xxx
 * Testga foydalanuvchining ruxsati borligini tekshiradi.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const testId = request.nextUrl.searchParams.get('testId');
    if (!testId) {
      return NextResponse.json({ error: 'testId required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Get test info
    const test = await db.test.findUnique({
      where: { id: testId },
      select: {
        id: true, isFree: true, accessType: true, price: true, titleUz: true,
        isPublished: true, userId: true, teacher: { select: { userId: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Javobda sarlavha bor — qoralama testda GET /api/tests/[id] bilan bir xil
    // qaror (lib/test-visibility.ts), aks holda id orqali nom oshkor bo'ladi.
    const visible = await resolveTestVisibility(
      { id: test.id, isPublished: test.isPublished, ownerUserIds: [test.teacher?.userId, test.userId] },
      { userId, role: session.user.role }
    );
    if (!visible) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Free tests — always accessible
    if (test.isFree || test.accessType === 'free') {
      return NextResponse.json({ hasAccess: true, reason: 'free' });
    }

    // Qaror checkTestAccess'da — savollarni beradigan GET /api/tests/[id] va
    // submit bilan bitta funksiya. Avval bu yerda alohida nusxa bo'lib,
    // Purchase jadvalini tekshirmas edi: Purchase orqali sotib olganlar
    // "Test yopiq" ko'rardi. Role bazadan — sessiyadagi eskirgan bo'lishi mumkin.
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (await checkTestAccess(userId, test, user?.role)) {
      return NextResponse.json({ hasAccess: true, reason: grantReason(test.accessType, user?.role) });
    }

    // No access
    return NextResponse.json({
      hasAccess: false,
      accessType: test.accessType,
      price: test.price,
      testTitle: test.titleUz,
    });
  } catch (error) {
    logger.error('GET /api/subscription/check-access error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Eski `reason` qiymatlari saqlanadi. Hozir uni hech kim o'qimaydi (solve
// sahifasi faqat hasAccess/accessType/price/testTitle ga qaraydi), lekin
// javob shakli o'zgarmasin.
function grantReason(accessType: string, role: string | undefined): string {
  if (role === 'ADMIN') return 'admin';
  if (accessType === 'premium') return 'premium_subscription';
  if (accessType === 'teacher') return 'teacher_subscription';
  if (accessType === 'premium_teacher') return 'subscription';
  return 'purchased';
}
