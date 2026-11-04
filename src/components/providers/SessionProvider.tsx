'use client';

import { SessionProvider as NextAuthSessionProvider, getSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { ReactNode, useEffect } from 'react';
import { SESSION_REFRESHED_AT_KEY, shouldRefreshSession } from '@/lib/session-refresh';

// Standart holatda next-auth har tab almashganda (visibilitychange)
// `/api/auth/session` ga so'rov yuboradi — bu Vercel'da eng ko'p CPU
// yeyayotgan route edi. Sessiyada faqat id, rol, til, telegramId, ism va
// rasm bor; obuna holati alohida `/api/me/header` dan keladi,
// shuning uchun fokusda qayta so'rashga ehtiyoj yo'q. Kirish/chiqish
// (`signIn`/`signOut`) next-auth'ning o'zi sessiyani yangilaydi, boshqa
// tablar storage hodisasi orqali biladi; profil `update()` ni aniq chaqiradi.
//
// `session` — serverda (layout'da) allaqachon o'qilgan sessiya. Berilsa
// next-auth uni boshlang'ich qiymat qiladi va mount'da `/api/auth/session`
// so'ralmaydi. Berilmasa (`(public)` sahifalar — statik HTML, kim ochganini
// bilmaydi) avvalgidek klientda so'raladi.
export default function SessionProvider({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      {session ? <SlidingSessionRefresh /> : null}
      {children}
    </NextAuthSessionProvider>
  );
}

// JWT cookie (24 soat) faqat `GET /api/auth/session` javobida qayta
// imzolanib uzayadi — server `auth()` RSC ichida cookie yoza olmaydi.
// Sessiya serverdan berilganda o'sha so'rov ketmaydi, shuning uchun faqat
// (main) sahifalarini ochadigan foydalanuvchi 24 soatdan keyin chiqib
// ketardi. Har sahifada emas, `REFRESH_INTERVAL_MS` da bir marta fonda
// so'raymiz — cookie uzayishda davom etadi, CPU esa deyarli sarflanmaydi.
function SlidingSessionRefresh() {
  useEffect(() => {
    let last: number | null = null;
    try {
      const raw = window.localStorage.getItem(SESSION_REFRESHED_AT_KEY);
      last = raw ? Number(raw) : null;
    } catch {
      // localStorage yopiq (private rejim) — har yuklashda so'rash
      // avvalgi xatti-harakat, ya'ni xavfsiz zaxira.
    }
    const now = Date.now();
    if (!shouldRefreshSession(last, now)) return;
    try {
      window.localStorage.setItem(SESSION_REFRESHED_AT_KEY, String(now));
    } catch {
      // yuqoridagi izohga qarang
    }
    // `broadcast: false` — boshqa tablar storage hodisasidan keyin har biri
    // o'zi qayta so'ramasin (next-auth sukut bo'yicha xabar tarqatadi).
    void getSession({ broadcast: false }).catch(() => {});
  }, []);
  return null;
}
