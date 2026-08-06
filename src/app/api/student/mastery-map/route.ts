import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { hasActiveSubscription } from '@/lib/access';
import { computeTopicStats, classifyTopics, generatePracticeTest, buildGrowthSchedule } from '@/lib/mastery';
import { generateGrowthPlanTips } from '@/lib/gemini';

// GET /api/student/mastery-map — Bilim xaritasi: tashxis, tavsiya testlar,
// shaxsiy o'sish rejasi. Premium/Ustoz tarifida cheksiz, bepul tarifda
// faqat 1 marta (User.masteryMapFreeViewedAt orqali belgilanadi).
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { stats, correctlyAnsweredQuestionIds, totalAttempts } = await computeTopicStats(user.id);

    // Hali hech narsa yo'q bo'lsa — tarif cheklovini sarflamasdan, shunchaki
    // bo'sh holatni qaytaramiz (talaba birinchi testni yechishi kerak).
    if (totalAttempts === 0) {
      return NextResponse.json({ hasData: false, isFreeTierView: false });
    }

    let isFreeTierView = false;
    if (user.role !== 'ADMIN') {
      const { premium, teacher } = await hasActiveSubscription(user.id);
      if (!premium && !teacher) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { masteryMapFreeViewedAt: true },
        });
        if (dbUser?.masteryMapFreeViewedAt) {
          return NextResponse.json(
            {
              error: 'LIMIT_REACHED',
              message: "Bepul tarifda Bilim xaritasidan faqat 1 marta foydalanish mumkin. Davom etish uchun Premium yoki Ustoz tarifiga o'ting.",
            },
            { status: 403 }
          );
        }
        isFreeTierView = true;
      }
    }

    const { strong, medium, weak, insufficient } = classifyTopics(stats);

    // Eng zaif 3 ta mavzu uchun mashq testi — avval bazadan generatsiya
    // qilishga urinadi, havza kichik bo'lsa mavjud nashr qilingan testni tavsiya qiladi.
    const topWeak = weak.slice(0, 3);
    const recommendations = (
      await Promise.all(
        topWeak.map(async (t) => {
          const generated = await generatePracticeTest({
            topic: t.topic,
            subjectId: t.subjectId,
            excludeCorrectIds: correctlyAnsweredQuestionIds,
          });
          if (generated) {
            return {
              topic: t.topic,
              subjectName: t.subjectName,
              testId: generated.id,
              testTitle: generated.titleUz,
              questionCount: generated.questionCount,
              kind: 'GENERATED' as const,
            };
          }
          const fallbackTest = await db.test.findFirst({
            where: { subjectId: t.subjectId, isPublished: true },
            orderBy: { createdAt: 'desc' },
            select: { id: true, titleUz: true, questionCount: true },
          });
          if (!fallbackTest) return null;
          return {
            topic: t.topic,
            subjectName: t.subjectName,
            testId: fallbackTest.id,
            testTitle: fallbackTest.titleUz,
            questionCount: fallbackTest.questionCount,
            kind: 'EXISTING' as const,
          };
        })
      )
    ).filter((r): r is NonNullable<typeof r> => r !== null);

    const weakTopicNames = weak.map((w) => w.topic);
    const mediumTopicNames = medium.map((w) => w.topic);
    const schedule = buildGrowthSchedule(weakTopicNames, mediumTopicNames);

    const allScheduleTopics = Array.from(
      new Set([
        ...schedule.week.flatMap((e) => e.focusTopics),
        ...schedule.month.flatMap((e) => e.focusTopics),
        ...schedule.sixMonths.flatMap((e) => e.focusTopics),
      ])
    );
    const tips = await generateGrowthPlanTips(allScheduleTopics);

    if (isFreeTierView) {
      await db.user.update({ where: { id: user.id }, data: { masteryMapFreeViewedAt: new Date() } });
    }

    return NextResponse.json({
      hasData: true,
      isFreeTierView,
      strong,
      medium,
      weak,
      insufficient,
      recommendations,
      schedule,
      tips,
    });
  } catch (error) {
    console.error('GET /api/student/mastery-map error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
