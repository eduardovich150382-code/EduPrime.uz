import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { computeTopicStats, classifyTopics } from '@/lib/mastery';
import { resolveTopicNodes } from '@/lib/topic-bridge';

// GET /api/items/weak-topics — konstruktordagi ("/build") "Zaif mavzularim"
// chipi uchun: foydalanuvchining bilim xaritasidagi (computeTopicStats +
// classifyTopics, qarang lib/mastery.ts) eng zaif mavzularini topic-bridge
// orqali TopicNode'larga aylantirib, `spec.topicPaths` shakliga mos massiv
// qaytaradi. Ma'lumot yetarli bo'lmasa (hali test yechilmagan, yoki
// topilgan mavzular Item bankidagi hech qanday tugunga bog'lanmasa) — bo'sh
// massiv, xato emas: chaqiruvchi (frontend) shu holatni "hali ma'lumot yo'q"
// deb ko'rsatadi, filtrni o'zgartirmaydi.
//
// DIQQAT: bu yerdan qaytgan topicPaths bilan tuzilgan test — ODATIY
// konstruktor testi (kunlik test tuzish kvotasiga KIRADI). Bilim xaritasi
// sahifasidagi mashq tugmasi (lib/mastery.ts#generatePracticeSession)
// kvotasiz — ikkisi ataylab boshqa-boshqa yo'l.
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { stats } = await computeTopicStats(user.id);
    const { weak } = classifyTopics(stats);

    if (weak.length === 0) {
      return NextResponse.json({ topicPaths: [], subjectIds: [] });
    }

    // Zaif mavzular bir nechta fanga tegishli bo'lishi mumkin — har fan
    // uchun TopicNode'lar BITTA so'rovda olinadi (resolveTopicNodes), fanlar
    // sonidan ortiq so'rov bo'lmaydi.
    const topicsBySubject = new Map<string, string[]>();
    for (const w of weak) {
      const list = topicsBySubject.get(w.subjectId) || [];
      list.push(w.topic);
      topicsBySubject.set(w.subjectId, list);
    }

    const topicPaths = new Set<string>();
    const subjectIds = new Set<string>();
    for (const [subjectId, topics] of topicsBySubject) {
      const nodeMap = await resolveTopicNodes(subjectId, topics);
      for (const node of nodeMap.values()) {
        topicPaths.add(node.path);
        subjectIds.add(subjectId);
      }
    }

    return NextResponse.json({ topicPaths: Array.from(topicPaths), subjectIds: Array.from(subjectIds) });
  } catch (err) {
    console.error('GET /api/items/weak-topics error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
