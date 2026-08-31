import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { buildItemWhere, parseItemSpec } from '@/lib/item-picker';
import { buildTopicTree, countItemsPerTopic } from '@/lib/topic-tree';
import { locales, defaultLocale } from '@/i18n/config';

// POST /api/topics — konstruktor ekranidagi ("/build") mavzular daraxti:
// tanlangan fan(lar)ning TopicNode daraxtini, joriy filtrga (topicPaths'dan
// TASHQARI hammasi — daraxtning o'zi mavzu bo'yicha oldindan kesilmaydi,
// aks holda har tugun faqat o'zini ko'rsatgan bo'lardi) mos savollar soni
// bilan qaytaradi. Bu marshrut `/[locale]` segmentidan tashqarida (middleware
// API yo'llarini next-intl'dan chetlab o'tadi), shuning uchun locale server
// tarafda avtomatik aniqlanmaydi — mijoz o'zining joriy tilini `locale`
// maydonida yuboradi.
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;

    const rawLocale = (body as Record<string, unknown> | null)?.locale;
    const locale = locales.includes(rawLocale as (typeof locales)[number]) ? (rawLocale as string) : defaultLocale;

    // Fan tanlanmagan bo'lsa daraxt ma'nosiz (qaysi fan mavzulari?) —
    // bo'sh javob qaytariladi, DB'ga bormaymiz.
    if (!spec.subjectIds?.length) {
      return NextResponse.json({ tree: [] });
    }

    const topics = await db.topicNode.findMany({
      where: { subjectId: { in: spec.subjectIds } },
      select: { id: true, parentId: true, path: true, level: true, nameUz: true, nameRu: true, nameEn: true, order: true },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });

    if (topics.length === 0) {
      return NextResponse.json({ tree: [] });
    }

    const specWithoutTopics = { ...spec };
    delete specWithoutTopics.topicPaths;
    const candidates = await db.item.findMany({
      where: buildItemWhere(specWithoutTopics),
      select: { id: true, topics: { select: { topic: { select: { path: true } } } } },
    });

    const counts = countItemsPerTopic(
      candidates.map((c) => ({ id: c.id, topicPaths: c.topics.map((t) => t.topic.path) })),
      topics
    );

    return NextResponse.json({ tree: buildTopicTree(topics, counts, locale) });
  } catch (err) {
    console.error('POST /api/topics error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
