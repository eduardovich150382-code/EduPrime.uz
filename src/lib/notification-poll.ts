// Header'dagi o'qilmagan bildirishnomalar soni. Har so'rov Vercel funksiyasini
// uyg'otadi va CPU limitini yeydi; son shoshilinch emas — 5 daqiqa yetarli.
// Yashirin tabda so'rov yuborilmaydi: foydalanuvchi qaytganda bir marta
// yangilanadi, shunda son baribir yangi ko'rinadi.
export const NOTIFICATION_POLL_MS = 5 * 60_000;

export interface PollEnv {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  setInterval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval: (id: ReturnType<typeof setInterval>) => void;
}

const browserEnv = (): PollEnv => ({
  document,
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
});

/** Darhol bir marta so'raydi; qaytgan funksiya `useEffect` cleanup'i. */
export function startNotificationPolling(fetchCount: () => void, env: PollEnv = browserEnv()): () => void {
  const isVisible = () => env.document.visibilityState === 'visible';

  if (isVisible()) fetchCount();
  const interval = env.setInterval(() => {
    if (isVisible()) fetchCount();
  }, NOTIFICATION_POLL_MS);

  const onVisibilityChange = () => {
    if (isVisible()) fetchCount();
  };
  env.document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    env.clearInterval(interval);
    env.document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
