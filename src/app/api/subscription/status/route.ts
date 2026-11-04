import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { loadSubscriptionStatusFor } from '@/lib/subscription-status';

// ESKIRGAN: yangi klient `/api/me/header` dan oladi. Deploy paytida ochiq
// turgan tablar va eski JS uchun qoldirilgan — keyinroq o'chiriladi.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await loadSubscriptionStatusFor(session.user.id, new Date()));
  } catch (error) {
    logger.error('GET /api/subscription/status error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
