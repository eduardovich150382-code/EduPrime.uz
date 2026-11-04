// Header ma'lumoti (o'qilmaganlar soni + obuna) qachon so'raladi.
//
// Doimiy interval YO'Q: har so'rov Vercel funksiyasini uyg'otadi va CPU
// limitini yeydi, son esa shoshilinch emas. So'rov faqat:
//  - sahifa ochilganda (tab ko'rinib turgan bo'lsa; yashirin ochilgan bo'lsa
//    birinchi ko'ringanda);
//  - tab yashirindan ko'rinadiganga o'tganda, oxirgisidan kamida
//    `HEADER_REFRESH_MIN_MS` o'tgan bo'lsa (tez-tez tab almashtirish so'rov
//    yog'dirmasin).
// O'qilgan bildirishnoma esa so'rovsiz, mahalliy holatda darhol kamayadi
// (lib/me-header-store.ts → markNotificationsRead).
export const HEADER_REFRESH_MIN_MS = 5 * 60_000;

export interface RefreshEnv {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  now: () => number;
}

const browserEnv = (): RefreshEnv => ({ document, now: () => Date.now() });

/** Qaytgan funksiya — `useEffect` cleanup'i. */
export function startHeaderRefresh(refresh: () => void, env: RefreshEnv = browserEnv()): () => void {
  const isVisible = () => env.document.visibilityState === 'visible';
  let lastAt: number | null = null;
  const run = () => { lastAt = env.now(); refresh(); };

  if (isVisible()) run();

  const onVisibilityChange = () => {
    if (!isVisible()) return;
    if (lastAt === null || env.now() - lastAt >= HEADER_REFRESH_MIN_MS) run();
  };
  env.document.addEventListener('visibilitychange', onVisibilityChange);

  return () => env.document.removeEventListener('visibilitychange', onVisibilityChange);
}
