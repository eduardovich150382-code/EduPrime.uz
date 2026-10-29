'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

// Standart holatda next-auth har tab almashganda (visibilitychange)
// `/api/auth/session` ga so'rov yuboradi — bu Vercel'da eng ko'p CPU
// yeyayotgan route edi. Sessiyada faqat id, rol, til, telegramId, ism va
// rasm bor; obuna holati alohida `/api/subscription/status` dan keladi,
// shuning uchun fokusda qayta so'rashga ehtiyoj yo'q. Kirish/chiqish
// (`signIn`/`signOut`) next-auth'ning o'zi sessiyani yangilaydi, boshqa
// tablar storage hodisasi orqali biladi; profil `update()` ni aniq chaqiradi.
export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </NextAuthSessionProvider>
  );
}
