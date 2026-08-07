import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher, applyRateLimit } from '@/lib/api-auth';
import { importTestFromText } from '@/lib/gemini';

// POST /api/ai/quiz-from-text — kurs darsi matnidan (yoki istalgan matndan)
// AI orqali bitta bosishda tekshiruv (Test) yaratadi. Mavjud
// importTestFromText quvurini qayta ishlatadi — yangi AI integratsiya
// kerak emas, faqat natijadan darhol Test yozuvi yasaydi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const rateLimited = applyRateLimit(user.id, 15, 60000);
    if (rateLimited) return rateLimited;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Faqat ustoz profiliga ega foydalanuvchilar uchun" }, { status: 403 });
    }

    const body = await request.json();
    const { text, subjectId, titleUz } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ error: "Matn juda qisqa — AI savol ajratib ololmaydi" }, { status: 400 });
    }
    if (!subjectId) {
      return NextResponse.json({ error: 'subjectId required' }, { status: 400 });
    }

    const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { categoryId: true } });
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const result = await importTestFromText(text.slice(0, 8000));

    if (!result.questions || result.questions.length === 0) {
      return NextResponse.json(
        { error: "AI bu matndan savol ajratib ololmadi. Matnni to'ldiring yoki qo'lda test yarating.", warnings: result.warnings },
        { status: 422 }
      );
    }

    const test = await db.test.create({
      data: {
        titleUz: titleUz || `AI tekshiruv — ${new Date().toLocaleDateString('uz-UZ')}`,
        categoryId: subject.categoryId,
        subjectId,
        teacherId: teacher.id,
        duration: Math.max(10, Math.round(result.questions.length * 1.5)),
        questionCount: result.questions.length,
        isFree: true,
        accessType: 'free',
        isPublished: false,
        questions: {
          create: result.questions.map((q, index) => ({
            text: q.text,
            images: q.images || [],
            options: q.type === 'OPEN_ENDED' ? [] : (q.options as any) || [],
            correctAnswer: q.correctAnswer || '',
            type: q.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
            explanation: q.explanation || null,
            points: 1,
            order: index,
          })),
        },
      },
      select: { id: true, titleUz: true, questionCount: true },
    });

    return NextResponse.json({ test, warnings: result.warnings || [] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ai/quiz-from-text error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
