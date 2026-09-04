/**
 * "Shu foydalanuvchi shu darsning shu qo'shimcha materialini ko'ra oladimi"
 * tekshiruvi — `GET /api/courses/[id]/learn` bilan BIR XIL qoida bo'yicha
 * javob beradi: kursga yozilgan (yoki egasi/ADMIN — preview) bo'lishi va
 * dars sequentialUnlock bo'yicha qulflanmagan bo'lishi kerak. Uch xil
 * manba (PRACTICE bloki — S22b, va VIDEO/VIDEO_SOLUTION nazorat nuqtalari —
 * S23) shu faylda, chunki hammasi bir xil "kurs kirish + dars qulfi"
 * tekshiruviga tayanadi (`checkCourseLessonGate`) — ikkitadan ortiq marshrut
 * bir xil DB so'rovlarini takrorlamasin deb shu yerga chiqarilgan.
 *
 * `lib/course-lock.ts`ning o'zi TEGILMAYDI (CLAUDE.md) — bu yerda faqat
 * uning sof `computeLockedLessonIds` funksiyasi chaqiriladi.
 */
import { db } from './db';
import { computeLockedLessonIds } from './course-lock';
import { collectLessonQuizTestIds, isSolutionBlockUnlocked } from './solution-lock';
import { parseCheckpoints, type Checkpoint } from './video-checkpoints';

interface GateCourse {
  id: string;
  teacherId: string;
  sequentialUnlock: boolean;
  teacher: { userId: string };
  sections: { lessons: { id: string; type: string; minPassPercent: number | null }[] }[];
}

type GateResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * "Kursga kirish huquqi bormi + shu dars qulflanmaganmi" — PRACTICE va
 * checkpoint access funksiyalarining barchasi shu ikki qoidani bir xil
 * tartibda tekshiradi (avval yozilganlik, keyin — yozilgan bo'lsa — qulf).
 */
async function checkCourseLessonGate(
  course: GateCourse,
  lessonId: string,
  userId: string,
  role: string
): Promise<GateResult> {
  const enrollment = await db.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  const isOwnerOrAdmin = role === 'ADMIN' || course.teacher.userId === userId;
  if (!enrollment && !isOwnerOrAdmin) {
    return { ok: false, status: 403, error: 'Siz bu kursga yozilmagansiz' };
  }

  // Preview (yozilmagan egasi/admin) — hech narsa qulflanmaydi, GET
  // /api/courses/[id]/learn'dagi bilan bir xil qoida.
  if (enrollment) {
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const progressRows = await db.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessons.map((l) => l.id) } },
      select: { lessonId: true, completed: true, bestScorePercent: true },
    });
    const lockedLessonIds = computeLockedLessonIds(
      allLessons,
      new Map(progressRows.map((p) => [p.lessonId, { completed: p.completed, bestScorePercent: p.bestScorePercent }])),
      course.sequentialUnlock
    );
    if (lockedLessonIds.has(lessonId)) {
      return { ok: false, status: 403, error: 'Bu dars hali qulflangan' };
    }
  }

  return { ok: true };
}

// ===================== PRACTICE bloki (S22b) =====================

export interface PracticeBlockAccess {
  id: string;
  labelUz: string | null;
  itemIds: string[];
}

export type PracticeAccessResult =
  | { ok: true; block: PracticeBlockAccess }
  | { ok: false; status: number; error: string };

export async function loadPracticeBlockAccess(
  blockId: string,
  userId: string,
  role: string
): Promise<PracticeAccessResult> {
  const block = await db.lessonBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      type: true,
      labelUz: true,
      itemIds: true,
      lesson: {
        select: {
          id: true,
          section: {
            select: {
              course: {
                select: {
                  id: true,
                  teacherId: true,
                  sequentialUnlock: true,
                  teacher: { select: { userId: true } },
                  sections: {
                    orderBy: { order: 'asc' },
                    select: {
                      lessons: {
                        orderBy: { order: 'asc' },
                        select: { id: true, type: true, minPassPercent: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!block || block.type !== 'PRACTICE') {
    return { ok: false, status: 404, error: 'Blok topilmadi' };
  }

  const gate = await checkCourseLessonGate(block.lesson.section.course, block.lesson.id, userId, role);
  if (!gate.ok) return gate;

  return { ok: true, block: { id: block.id, labelUz: block.labelUz, itemIds: block.itemIds } };
}

// ===================== Video nazorat nuqtalari (S23) =====================

export interface VideoCheckpointAccess {
  /** Vaqt bo'yicha tartiblangan nuqtalar — front-end (VideoWithCheckpoints) shu bilan qachon to'xtatishni biladi. */
  checkpoints: Checkpoint[];
  /** Yaratiladigan TestSession sarlavhasi uchun. */
  label: string | null;
}

export type VideoCheckpointAccessResult =
  | { ok: true; access: VideoCheckpointAccess }
  | { ok: false; status: number; error: string };

/** VIDEO turi CourseLesson (darsning asosiy videosi) uchun nazorat nuqtalari kirish tekshiruvi. */
export async function loadLessonVideoCheckpointAccess(
  lessonId: string,
  userId: string,
  role: string
): Promise<VideoCheckpointAccessResult> {
  const lesson = await db.courseLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      type: true,
      titleUz: true,
      checkpoints: true,
      section: {
        select: {
          course: {
            select: {
              id: true,
              teacherId: true,
              sequentialUnlock: true,
              teacher: { select: { userId: true } },
              sections: {
                orderBy: { order: 'asc' },
                select: {
                  lessons: {
                    orderBy: { order: 'asc' },
                    select: { id: true, type: true, minPassPercent: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson || lesson.type !== 'VIDEO') {
    return { ok: false, status: 404, error: 'Dars topilmadi' };
  }

  const gate = await checkCourseLessonGate(lesson.section.course, lesson.id, userId, role);
  if (!gate.ok) return gate;

  const checkpoints = parseCheckpoints(lesson.checkpoints) ?? [];
  return { ok: true, access: { checkpoints, label: lesson.titleUz } };
}

/** VIDEO_SOLUTION bloki uchun nazorat nuqtalari kirish tekshiruvi — `revealAfterQuiz` qulfi videoUrl bilan BIR XIL (isSolutionBlockUnlocked). */
export async function loadVideoSolutionCheckpointAccess(
  blockId: string,
  userId: string,
  role: string
): Promise<VideoCheckpointAccessResult> {
  const block = await db.lessonBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      type: true,
      labelUz: true,
      revealAfterQuiz: true,
      checkpoints: true,
      lesson: {
        select: {
          id: true,
          type: true,
          testId: true,
          blocks: { select: { type: true, testId: true } },
          section: {
            select: {
              course: {
                select: {
                  id: true,
                  teacherId: true,
                  sequentialUnlock: true,
                  teacher: { select: { userId: true } },
                  sections: {
                    orderBy: { order: 'asc' },
                    select: {
                      lessons: {
                        orderBy: { order: 'asc' },
                        select: { id: true, type: true, minPassPercent: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!block || block.type !== 'VIDEO_SOLUTION') {
    return { ok: false, status: 404, error: 'Blok topilmadi' };
  }

  const gate = await checkCourseLessonGate(block.lesson.section.course, block.lesson.id, userId, role);
  if (!gate.ok) return gate;

  if (block.revealAfterQuiz) {
    const lessonQuizTestIds = collectLessonQuizTestIds([
      { id: block.lesson.id, type: block.lesson.type, testId: block.lesson.testId, blocks: block.lesson.blocks },
    ]);
    const gatingIds = lessonQuizTestIds.get(block.lesson.id) || [];
    let submittedTestIds = new Set<string>();
    if (gatingIds.length > 0) {
      const submitted = await db.testResult.findMany({
        where: { userId, testId: { in: gatingIds } },
        select: { testId: true },
        distinct: ['testId'],
      });
      submittedTestIds = new Set(submitted.map((r) => r.testId).filter((tid): tid is string => !!tid));
    }
    const unlocked = isSolutionBlockUnlocked({
      lessonId: block.lesson.id,
      block: { type: block.type, revealAfterQuiz: block.revealAfterQuiz },
      lessonQuizTestIds,
      submittedTestIds,
    });
    if (!unlocked) {
      return { ok: false, status: 403, error: 'Bu blok hali qulflangan' };
    }
  }

  const checkpoints = parseCheckpoints(block.checkpoints) ?? [];
  return { ok: true, access: { checkpoints, label: block.labelUz } };
}
