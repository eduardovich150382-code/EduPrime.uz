import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

const MAX_BLOCKS_PER_LESSON = 8;
const BLOCK_TYPES = ['FILE', 'QUIZ', 'VIDEO_SOLUTION'] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

// PUT /api/teacher/courses/[id]/curriculum — bo'lim va darslarni bir yo'la
// yangilash. Mavjud bo'lim/dars/blok ID saqlab qolib yangilanadi (savollarni
// saqlashdagi bir xil naqsh) — shu sababli LessonProgress kabi keyingi
// bosqichdagi bog'lanishlar buzilmaydi.
//
// Har bir dars endi ixtiyoriy `blocks[]` ham qabul qiladi — darsning asosiy
// kontentiga (type/videoUrl/content/testId/fileUrl) QO'SHIMCHA material
// (fayl, qo'shimcha test, video-yechim). Bu — sof qo'shimcha: darsning o'zi
// (type va h.k.) hech qanday o'zgarishsiz, avvalgidek saqlanadi. Bloklar
// LessonProgress/course-lock/creditQuizLessonProgress mantig'iga umuman
// ta'sir qilmaydi — faqat ko'rsatish uchun.
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

    // Bloklarni oldindan tekshirish (transaksiyadan tashqarida, tez va aniq
    // xato xabari uchun): son chegarasi, tur to'g'riligi, tur bo'yicha shart
    // qilingan maydon bo'sh emasligi.
    for (const s of sections) {
      for (const l of (s.lessons || [])) {
        const blocks = Array.isArray(l.blocks) ? l.blocks : [];
        if (blocks.length > MAX_BLOCKS_PER_LESSON) {
          return NextResponse.json(
            { error: `Har bir darsda ko'pi bilan ${MAX_BLOCKS_PER_LESSON} ta qo'shimcha blok bo'lishi mumkin` },
            { status: 400 }
          );
        }
        for (const b of blocks) {
          if (!BLOCK_TYPES.includes(b.type)) {
            return NextResponse.json({ error: `Noto'g'ri blok turi: ${b.type}` }, { status: 400 });
          }
          if (b.type === 'FILE' && !b.fileUrl) {
            return NextResponse.json({ error: "Fayl bloki uchun fayl yuklanishi shart" }, { status: 400 });
          }
          if (b.type === 'VIDEO_SOLUTION' && !b.videoUrl) {
            return NextResponse.json({ error: "Video-yechim bloki uchun video havolasi shart" }, { status: 400 });
          }
          if (b.type === 'QUIZ' && !b.testId) {
            return NextResponse.json({ error: "Qo'shimcha test bloki uchun test tanlanishi shart" }, { status: 400 });
          }
        }
      }
    }

    // QUIZ darslar va QUIZ bloklari faqat o'zining testlariga ishora qilishi mumkin
    const referencedTestIds: string[] = Array.from(
      new Set(
        sections.flatMap((s: any) =>
          (s.lessons || []).flatMap((l: any) => {
            const ids: string[] = [];
            if (l.type === 'QUIZ' && l.testId) ids.push(l.testId);
            for (const b of (l.blocks || [])) {
              if (b.type === 'QUIZ' && b.testId) ids.push(b.testId);
            }
            return ids;
          })
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
            videoUrl: l.type === 'VIDEO' ? (l.videoUrl || null) : null,
            content: l.type === 'TEXT' ? (l.content || null) : null,
            testId: l.type === 'QUIZ' ? (l.testId || null) : null,
            fileUrl: l.type === 'PDF' ? (l.fileUrl || null) : null,
            minPassPercent: l.type === 'QUIZ' && Number.isInteger(l.minPassPercent) && l.minPassPercent >= 1 && l.minPassPercent <= 100
              ? l.minPassPercent
              : null,
            durationMinutes: l.durationMinutes || null,
            isPreviewable: !!l.isPreviewable,
          };

          let lessonId: string;
          if (l.id && existingLessonIds.has(l.id)) {
            await tx.courseLesson.update({ where: { id: l.id }, data: lessonData });
            lessonId = l.id;
          } else {
            const createdLesson = await tx.courseLesson.create({ data: { sectionId, ...lessonData } });
            lessonId = createdLesson.id;
          }

          // Qo'shimcha bloklar — ataylab eski darslar (blocks yuborilmagan yoki
          // bo'sh) uchun hech qanday yozuv qilinmaydi, ular blokssiz qolaveradi.
          const incomingBlocks: any[] = Array.isArray(l.blocks) ? l.blocks : [];
          const existingBlocks = await tx.lessonBlock.findMany({ where: { lessonId }, select: { id: true } });
          const existingBlockIds = new Set(existingBlocks.map((b) => b.id));
          const incomingBlockIds = incomingBlocks
            .map((b) => b.id)
            .filter((bid) => typeof bid === 'string' && existingBlockIds.has(bid));

          await tx.lessonBlock.deleteMany({
            where: { lessonId, id: { notIn: incomingBlockIds.length ? incomingBlockIds : ['__none__'] } },
          });

          for (let bIndex = 0; bIndex < incomingBlocks.length; bIndex++) {
            const b = incomingBlocks[bIndex];
            const blockData = {
              type: b.type as BlockType,
              order: bIndex,
              labelUz: b.labelUz || null,
              fileUrl: b.type === 'FILE' ? (b.fileUrl || null) : null,
              videoUrl: b.type === 'VIDEO_SOLUTION' ? (b.videoUrl || null) : null,
              testId: b.type === 'QUIZ' ? (b.testId || null) : null,
            };
            if (b.id && existingBlockIds.has(b.id)) {
              await tx.lessonBlock.update({ where: { id: b.id }, data: blockData });
            } else {
              await tx.lessonBlock.create({ data: { lessonId, ...blockData } });
            }
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
