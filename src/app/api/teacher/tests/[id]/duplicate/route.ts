import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// POST /api/teacher/tests/[id]/duplicate — testni nusxalash
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;

    // Find teacher
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Get original test with questions
    const original = await db.test.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        subject: { select: { nameUz: true, icon: true } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Only allow duplicating own tests (or admin)
    if (original.teacherId !== teacher.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create duplicate test
    const newTest = await db.test.create({
      data: {
        titleUz: `${original.titleUz} (nusxa)`,
        titleRu: original.titleRu ? `${original.titleRu} (копия)` : null,
        titleEn: original.titleEn ? `${original.titleEn} (copy)` : null,
        categoryId: original.categoryId,
        subjectId: original.subjectId,
        teacherId: teacher.id,
        price: original.price,
        isFree: original.isFree,
        duration: original.duration,
        questionCount: original.questionCount,
        format: original.format,
        difficulty: original.difficulty,
        coverImage: original.coverImage,
        videoSolution: original.videoSolution,
        writtenSolution: original.writtenSolution,
        isPublished: false, // Always start as draft
        questions: {
          create: original.questions.map((q) => ({
            text: q.text,
            images: q.images,
            options: q.options as any,
            correctAnswer: q.correctAnswer,
            type: q.type,
            explanation: q.explanation,
            explanationImages: q.explanationImages,
            videoUrl: q.videoUrl,
            points: q.points,
            order: q.order,
          })),
        },
      },
      include: {
        subject: { select: { nameUz: true, icon: true } },
      },
    });

    return NextResponse.json({
      test: {
        id: newTest.id,
        titleUz: newTest.titleUz,
        subject: newTest.subject,
        isPublished: newTest.isPublished,
        isFree: newTest.isFree,
        price: newTest.price,
        studentCount: 0,
        avgScore: 0,
      },
    });
  } catch (error) {
    console.error('POST /api/teacher/tests/[id]/duplicate error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
