import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// PUT /api/teacher/courses/[id]/curriculum — bo'lim va darslarni bir yo'la
// yangilash. Mavjud bo'lim/darslar ID saqlab qolib yangilanadi (savollarni
// saqlashdagi bir xil naqsh) — shu sababli LessonProgress kabi keyingi
// bosqichdagi bog'lanishlar buzilmaydi.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections array required' }, { status: 400 });
    }

    const course = await db.course.findUnique({ where: { id }, include: { teacher: true } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if ((user.role as string) !== 'ADMIN' && course.teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // QUIZ darslar faqat o'zining testlariga ishora qilishi mumkin
    const referencedTestIds: string[] = Array.from(
      new Set(
        sections.flatMap((s: any) =>
          (s.lessons || [])
            .filter((l: any) => l.type === 'QUIZ' && l.testId)
            .map((l: any) => l.testId as string)
        )
      )
    );
    if (referencedTestIds.length > 0) {
      const ownedTests = await db.test.findMany({
        where: { id: { in: referencedTestIds }, teacherId: course.teacherId },
        select: { id: true },
      });
      const ownedIds = new Set(ownedTests.map((t) => t.id));
      if (referencedTestIds.some((tid) => !ownedIds.has(tid))) {
        return NextResponse.json(
          { error: "Faqat o'zingizning testlaringizni tekshiruv sifatida biriktirishingiz mumkin" },
          { status: 400 }
        );
      }
    }

    const existingSections = await db.courseSection.findMany({ where: { courseId: id }, select: { id: true } });
    const existingSectionIds = new Set(existingSections.map((s) => s.id));
    const incomingSectionIds = sections
      .map((s: any) => s.id)
      .filter((sid: any) => typeof sid === 'string' && existingSectionIds.has(sid));

    await db.$transaction(async (tx) => {
      await tx.courseSection.deleteMany({
        where: { courseId: id, id: { notIn: incomingSectionIds.length ? incomingSectionIds : ['__none__'] } },
      });

      for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const s = sections[sIndex];
        let sectionId: string;

        if (s.id && existingSectionIds.has(s.id)) {
          await tx.courseSection.update({ where: { id: s.id }, data: { titleUz: s.titleUz, order: sIndex } });
          sectionId = s.id;
        } else {
          const created = await tx.courseSection.create({ data: { courseId: id, titleUz: s.titleUz, order: sIndex } });
          sectionId = created.id;
        }

        const incomingLessons = s.lessons || [];
        const existingLessons = await tx.courseLesson.findMany({ where: { sectionId }, select: { id: true } });
        const existingLessonIds = new Set(existingLessons.map((l) => l.id));
        const incomingLessonIds = incomingLessons
          .map((l: any) => l.id)
          .filter((lid: any) => typeof lid === 'string' && existingLessonIds.has(lid));

        await tx.courseLesson.deleteMany({
          where: { sectionId, id: { notIn: incomingLessonIds.length ? incomingLessonIds : ['__none__'] } },
        });

        for (let lIndex = 0; lIndex < incomingLessons.length; lIndex++) {
          const l = incomingLessons[lIndex];
          const lessonData = {
            titleUz: l.titleUz,
            order: lIndex,
            type: l.type || 'VIDEO',
            videoUrl: l.videoUrl || null,
            content: l.content || null,
            testId: l.type === 'QUIZ' ? (l.testId || null) : null,
            durationMinutes: l.durationMinutes || null,
            isPreviewable: !!l.isPreviewable,
          };
          if (l.id && existingLessonIds.has(l.id)) {
            await tx.courseLesson.update({ where: { id: l.id }, data: lessonData });
          } else {
            await tx.courseLesson.create({ data: { sectionId, ...lessonData } });
          }
        }
      }
    });

    return NextResponse.json({ message: 'Curriculum updated' });
  } catch (error) {
    console.error('PUT /api/teacher/courses/[id]/curriculum error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
