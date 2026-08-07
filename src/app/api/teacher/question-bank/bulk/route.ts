import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// POST /api/teacher/question-bank/bulk — bir nechta savolni bitta so'rovda
// bazaga qo'shadi (masalan test yaratishda kiritilgan savollarni "Hammasini
// bazaga saqlash" tugmasi orqali). Har bir element yakka POST /api/teacher/
// question-bank bilan bir xil talablarga bo'ysunadi (subjectId, text,
// correctAnswer majburiy) — yaroqsizlari o'tkazib yuboriladi, jarayon
// to'xtamaydi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Faqat ustoz profiliga ega foydalanuvchilar uchun" }, { status: 403 });
    }

    const body = await request.json();
    const items = Array.isArray(body.questions) ? body.questions : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Saqlash uchun savol topilmadi" }, { status: 400 });
    }

    const valid = items.filter(
      (q: any) => q && typeof q === 'object' && q.subjectId && q.text && q.correctAnswer !== undefined && q.correctAnswer !== ''
    );
    const skipped = items.length - valid.length;
    if (valid.length === 0) {
      return NextResponse.json({ error: "Hech bir savol yaroqli emas (matn va to'g'ri javob to'ldirilishi kerak)" }, { status: 400 });
    }

    const { count } = await db.bankQuestion.createMany({
      data: valid.map((q: any) => ({
        teacherId: teacher.id,
        subjectId: q.subjectId,
        text: q.text,
        images: q.images || [],
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        type: q.type || 'MULTIPLE_CHOICE',
        explanation: q.explanation || null,
        explanationImages: q.explanationImages || [],
        topic: q.topic || null,
        bloomLevel: q.bloomLevel || null,
        difficulty: Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5 ? q.difficulty : null,
      })),
    });

    return NextResponse.json({ count, skipped }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teacher/question-bank/bulk error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
