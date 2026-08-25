/**
 * VIDEO_SOLUTION bloki uchun "reveal after quiz" qulfi. `revealAfterQuiz`
 * yoqilgan blok — foydalanuvchi darsning tekshiruvini (dars turi QUIZ bo'lsa
 * uning testId'si, yoki darsdagi QUIZ blokining testId'si) TOPSHIRMAGUNCHA
 * videoUrl bilan qaytmasligi kerak, aks holda javob kalitini oldindan ko'rish
 * mumkin bo'lib qoladi.
 *
 * Bu mantiq ikkita joyda ishlatiladi — GET /api/courses/[id]/learn (yozilgan
 * foydalanuvchi uchun to'liq kontent) va GET /api/courses/[id] (ochiq
 * preview endpoint'i). Ikkalasi HAM aynan shu qoidani qo'llasin, aks holda
 * preview orqali qulfni chetlab o'tish mumkin bo'ladi.
 */

export interface LessonForGating {
  id: string;
  type: string;
  testId: string | null;
  blocks: Array<{ type: string; testId: string | null }>;
}

// Har bir dars uchun "shu darsni ochish kaliti" bo'lgan test id'lar
// ro'yxati. "Topshirgan" — TestResult mavjudligi (o'tgan/o'tmaganidan
// qat'i nazar), chunki maqsad javob kalitini oldindan ko'rishning oldini
// olish, ball emas.
export function collectLessonQuizTestIds(lessons: LessonForGating[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const l of lessons) {
    const ids: string[] = [];
    if (l.type === 'QUIZ' && l.testId) ids.push(l.testId);
    for (const b of l.blocks) {
      if (b.type === 'QUIZ' && b.testId) ids.push(b.testId);
    }
    if (ids.length > 0) map.set(l.id, ids);
  }
  return map;
}

// `lessonQuizTestIds` qiymatlarining hammasini bitta tekis ro'yxatga
// yig'adi — TestResult so'rovi uchun `testId: { in: ... }`.
export function flattenGatingTestIds(lessonQuizTestIds: Map<string, string[]>): string[] {
  return Array.from(new Set(Array.from(lessonQuizTestIds.values()).flat()));
}

// Blokning videoUrl'ini qaytaradi — VIDEO_SOLUTION va revealAfterQuiz
// yoqilgan bo'lib, foydalanuvchi hali topshirmagan bo'lsa `null`.
// Foydalanuvchi umuman yo'q bo'lsa (masalan autentifikatsiyasiz preview),
// `submittedTestIds` bo'sh keladi — natijada bunday bloklar har doim `null`.
export function resolveSolutionBlockVideoUrl(params: {
  lessonId: string;
  block: { type: string; revealAfterQuiz: boolean; videoUrl: string | null };
  lessonQuizTestIds: Map<string, string[]>;
  submittedTestIds: Set<string>;
}): string | null {
  const { lessonId, block, lessonQuizTestIds, submittedTestIds } = params;
  if (block.type !== 'VIDEO_SOLUTION' || !block.revealAfterQuiz) return block.videoUrl;
  const quizIds = lessonQuizTestIds.get(lessonId) || [];
  const hasSubmitted = quizIds.some((tid) => submittedTestIds.has(tid));
  return hasSubmitted ? block.videoUrl : null;
}
