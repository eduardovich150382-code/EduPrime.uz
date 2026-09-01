import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// POST /api/explanations/[id]/vote — AI tushuntirishga ovoz berish (S20a).
// Bir foydalanuvchi bitta tushuntirishga faqat BIR MARTA ovoz beradi
// (`ExplanationVote.@@id([userId, explanationId])`), lekin ovozini
// o'zgartirishi mumkin (👍 dan 👎 ga) — bu holda `ItemExplanation.upvotes`/
// `downvotes` bitta tranzaksiyada mos ravishda yangilanadi. Xuddi shu
// (o'zgarishsiz) ovoz qayta yuborilsa — sanoq ikki marta hisoblanmasin deb
// jimgina rad etiladi (`changed: false`), sanoqlar o'zgarishsiz qaytadi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id: explanationId } = await params;
    const body = await request.json().catch(() => null);
    const value = (body as Record<string, unknown> | null)?.value;

    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: 'value +1 yoki -1 bo\'lishi kerak' }, { status: 400 });
    }

    const explanation = await db.itemExplanation.findUnique({
      where: { id: explanationId },
      select: { id: true },
    });
    if (!explanation) {
      return NextResponse.json({ error: 'Tushuntirish topilmadi' }, { status: 404 });
    }

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.explanationVote.findUnique({
        where: { userId_explanationId: { userId: user.id, explanationId } },
      });

      if (existing && existing.value === value) {
        // Xuddi shu ovoz qayta yuborilgan — sanoqqa tegmaymiz.
        const current = await tx.itemExplanation.findUniqueOrThrow({
          where: { id: explanationId },
          select: { upvotes: true, downvotes: true },
        });
        return { ...current, userVote: value, changed: false };
      }

      if (existing) {
        // Ovoz o'zgartirilmoqda (masalan 👍 → 👎) — eski tomonni kamaytirib,
        // yangisini oshiramiz, bitta so'rovda (increment: -1/+1 aralash).
        await tx.explanationVote.update({
          where: { userId_explanationId: { userId: user.id, explanationId } },
          data: { value },
        });
      } else {
        await tx.explanationVote.create({
          data: { userId: user.id, explanationId, value },
        });
      }

      const updated = await tx.itemExplanation.update({
        where: { id: explanationId },
        data: {
          upvotes: { increment: value === 1 ? 1 : existing?.value === 1 ? -1 : 0 },
          downvotes: { increment: value === -1 ? 1 : existing?.value === -1 ? -1 : 0 },
        },
        select: { upvotes: true, downvotes: true },
      });
      return { ...updated, userVote: value, changed: true };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/explanations/[id]/vote error:', err);
    return NextResponse.json({ error: 'Ovoz berishda xatolik yuz berdi' }, { status: 500 });
  }
}
