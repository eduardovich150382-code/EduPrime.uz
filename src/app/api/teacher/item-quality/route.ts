import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';
import { topDistractor } from '@/lib/item-stats';

// Klassik item-analysis chegaralari (Ebel tasnifi) — 0.2'dan past
// diskriminatsiya "zaif/tashlab yuborilishi kerak" hisoblanadi.
const LOW_DISCRIMINATION_THRESHOLD = 0.2;
const EASY_THRESHOLD = 0.95;
const HARD_THRESHOLD = 0.15;
// Sahifa cheksiz o'sib ketmasligi uchun — eng yomon/ekstremal 100 tasi yetarli.
const MAX_ROWS = 100;

const STAT_INCLUDE = {
  item: {
    select: {
      id: true,
      text: true,
      type: true,
      subject: { select: { nameUz: true } },
    },
  },
} satisfies Prisma.ItemStatInclude;

type ItemStatWithItem = Prisma.ItemStatGetPayload<{ include: typeof STAT_INCLUDE }>;

async function fetchStats(where: Prisma.ItemStatWhereInput, orderBy: Prisma.ItemStatOrderByWithRelationInput) {
  return db.itemStat.findMany({
    where,
    orderBy,
    take: MAX_ROWS,
    include: STAT_INCLUDE,
  });
}

function toRow(stat: ItemStatWithItem) {
  return {
    itemId: stat.itemId,
    text: stat.item.text,
    subjectName: stat.item.subject.nameUz,
    type: stat.item.type,
    pValue: stat.pValue,
    discrimination: stat.discrimination,
    attempts: stat.attempts,
    topDistractor: topDistractor(stat.distractorHits as Record<string, number> | null),
  };
}

// GET /api/teacher/item-quality — S27: savol sifati nazorati. Fan/muallif
// bo'yicha CHEKLANMAGAN (bu ItemStat/Attempt umumiy platforma statistikasi —
// generatsiya qilingan/parametrik savollarning aksariyati aniq bitta
// o'qituvchiga tegishli emas, `question-bank`dagi kabi teacherId bo'yicha
// filtrlash bu yerda ma'nosiz). Ikkita ro'yxat qaytaradi:
//   - lowDiscrimination — kuchli va zaif talabani ajratmaydigan (ehtimol
//     chalkash/noto'g'ri) savollar
//   - extremeDifficulty — deyarli hamma to'g'ri (pValue > 0.95) yoki
//     deyarli hech kim to'g'ri topa olmagan (pValue < 0.15) savollar
export async function GET() {
  try {
    const { error } = await requireTeacher();
    if (error) return error;

    const [lowDiscriminationStats, extremeDifficultyStats] = await Promise.all([
      fetchStats({ discrimination: { lt: LOW_DISCRIMINATION_THRESHOLD } }, { discrimination: 'asc' }),
      fetchStats({ OR: [{ pValue: { gt: EASY_THRESHOLD } }, { pValue: { lt: HARD_THRESHOLD } }] }, { pValue: 'asc' }),
    ]);

    return NextResponse.json({
      lowDiscrimination: lowDiscriminationStats.map(toRow),
      extremeDifficulty: extremeDifficultyStats.map(toRow),
    });
  } catch (error) {
    console.error('GET /api/teacher/item-quality error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
