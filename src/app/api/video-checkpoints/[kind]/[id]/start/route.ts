import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { loadLessonVideoCheckpointAccess, loadVideoSolutionCheckpointAccess } from '@/lib/lesson-access';
import { createSessionFromSpec } from '@/lib/sessions';

// `kind` — nazorat nuqtalarining manbasi: darsning asosiy videosi (VIDEO
// turi CourseLesson) yoki VIDEO_SOLUTION bloki. Ikkalasi ham BIR XIL
// oqimga tayanadi (kirish tekshiruvidan tashqari — qarang lib/lesson-access.ts),
// shu sababli ikkita alohida marshrut yozish o'rniga bitta parametrlangan
// marshrut ishlatilgan.
const KINDS = ['lesson', 'block'] as const;
type Kind = (typeof KINDS)[number];

// PRACTICE bloki (practice/start) bilan bir xil — muddat ahamiyatsiz,
// checkpoint/check muddatni tekshirmaydi (TestSession.durationMin majburiy maydon).
const PRACTICE_DURATION_MIN = 240;

// POST /api/video-checkpoints/[kind]/[id]/start — video ko'rish boshlanganda
// bir marta chaqiriladi: shu video(lar)ning barcha nazorat nuqtalari uchun
// bitta baholanmaydigan mashq "davri" ochadi (PRACTICE bloki bilan AYNAN bir
// xil naqsh — `createSessionFromSpec`, `countsAgainstQuota: false`, TestResult
// hech qachon yaratilmaydi). Frontend (VideoWithCheckpoints) shu javobdagi
// `checkpoints` (atSeconds+itemId) va `questions` (savol matni) asosida
// pleyerni to'xtatib savol ko'rsatadi — GET /api/courses/[id]/learn
// itemId'larni HECH QACHON qaytarmaydi (PRACTICE'dagi itemCount naqshi bilan
// bir xil — savol matni faqat shu marshrut orqali, kirish tasdiqlangandan
// keyin chiqadi).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { kind, id } = await params;
    if (!KINDS.includes(kind as Kind)) {
      return NextResponse.json({ error: "Noto'g'ri manba turi" }, { status: 400 });
    }

    const access = kind === 'lesson'
      ? await loadLessonVideoCheckpointAccess(id, user.id, user.role)
      : await loadVideoSolutionCheckpointAccess(id, user.id, user.role);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { checkpoints, label } = access.access;
    if (checkpoints.length === 0) {
      return NextResponse.json({ error: 'Bu videoda nazorat nuqtalari yo\'q' }, { status: 404 });
    }

    const itemIds = checkpoints.map((c) => c.itemId);
    const outcome = await createSessionFromSpec({
      userId: user.id,
      spec: { onlyItemIds: itemIds },
      limit: itemIds.length,
      durationMin: PRACTICE_DURATION_MIN,
      mode: 'FIXED',
      title: label || 'Video nazorat nuqtasi',
      countsAgainstQuota: false,
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error.error }, { status: outcome.error.status });
    }

    return NextResponse.json({
      sessionId: outcome.session.id,
      checkpoints,
      questions: outcome.session.questions,
    });
  } catch (err) {
    console.error('POST /api/video-checkpoints/[kind]/[id]/start error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
