import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/question-bank — o'qituvchining shaxsiy savollar bazasi
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) return NextResponse.json({ questions: [] });

    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get('subjectId');
    const search = searchParams.get('search');

    const where: any = { teacherId: teacher.id };
    if (subjectId) where.subjectId = subjectId;
    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await db.bankQuestion.findMany({
      where,
      include: { subject: { select: { nameUz: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('GET /api/teacher/question-bank error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/teacher/question-bank — bazaga yangi savol qo'shish
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Faqat ustoz profiliga ega foydalanuvchilar uchun" }, { status: 403 });
    }

    const body = await request.json();
    const { subjectId, text, images, options, correctAnswer, type, explanation, explanationImages, topic, bloomLevel } = body;

    if (!subjectId || !text || !correctAnswer) {
      return NextResponse.json({ error: 'subjectId, text, correctAnswer required' }, { status: 400 });
    }

    const question = await db.bankQuestion.create({
      data: {
        teacherId: teacher.id,
        subjectId,
        text,
        images: images || [],
        options: options || [],
        correctAnswer,
        type: type || 'MULTIPLE_CHOICE',
        explanation: explanation || null,
        explanationImages: explanationImages || [],
        topic: topic || null,
        bloomLevel: bloomLevel || null,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teacher/question-bank error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
