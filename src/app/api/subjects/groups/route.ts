import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { groupSubjectsByName } from '@/lib/subject-groups';

export interface SubjectGroupResponse {
  name: string;
  subjectIds: string[];
  itemCount: number;
}

// Bu ma'lumot kamdan-kam o'zgaradi (yangi fan yoki savol nashr qilinganda
// gina) — oddiy xotira keshi (5 daqiqa) ortiqcha DB so'rovlarining oldini
// oladi. Serverless instansiyalar orasida ulashilmaydi, lekin shu yetarli.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: SubjectGroupResponse[]; expiresAt: number } | null = null;

// Bir xil nomdagi fan har `TestCategory`da (DTM, SCHOOL, ...) ALOHIDA
// `Subject` qatoriga ega — filtr/ko'rib chiqish ekranlari (ItemBrowser,
// /build fan chip'lari, kurslar katalogi) buni tekis ro'yxat sifatida
// ko'rsatsa, har fan kategoriyalar soncha (5 martagacha) takrorlanadi va
// foydalanuvchi qaysi qatorda savol borligini bilmay bo'sh qatorni tanlab
// qoladi ("kategoriya tuzog'i"). Shu marshrut YAGONA MANBA: fan nomlarini
// guruhlaydi (lib/subject-groups.ts#groupSubjectsByName) va har guruh uchun
// nashr etilgan/ochiq (PUBLISHED+PUBLIC) savollar sonini qo'shadi.
//
// DIQQAT: faqat FILTRLASH uchun — test/kurs/savol bankiga savol qo'shishda
// o'qituvchi kategoriyani ATAYLAB tanlaydi, u yerlarda `/api/subjects`
// (guruhlanmagan, kategoriyasi bilan) ishlatiladi va o'zgarishsiz qoladi.
export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return NextResponse.json({ groups: cache.data });
    }

    const subjects = await db.subject.findMany({ select: { id: true, nameUz: true } });
    const groups = groupSubjectsByName(subjects);

    const counts = await db.item.groupBy({
      by: ['subjectId'],
      where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      _count: true,
    });
    const countBySubjectId = new Map(counts.map((c) => [c.subjectId, c._count]));

    // `itemCount === 0` bo'lgan guruhlar javobda YO'Q — bo'sh fan hech
    // qayerda ko'rinmasin (aynan shu "bo'sh qatorni tanlab qolish" muammosi
    // uchun yozilgan marshrut).
    const result: SubjectGroupResponse[] = groups
      .map((g) => ({
        name: g.name,
        subjectIds: g.ids,
        itemCount: g.ids.reduce((sum, id) => sum + (countBySubjectId.get(id) ?? 0), 0),
      }))
      .filter((g) => g.itemCount > 0);

    cache = { data: result, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json({ groups: result });
  } catch (err) {
    console.error('GET /api/subjects/groups error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
