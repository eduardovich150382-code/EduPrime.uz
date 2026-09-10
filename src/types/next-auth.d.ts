import type { UserRole } from '@/types';

// NextAuth v5 modul augmentatsiyasi. `auth.ts` dagi `session` callback
// `role`, `lang` va `telegramId` ni sessiyaga qo'shadi, lekin SDK'ning
// standart `Session["user"]` turida bu maydonlar yo'q — shu sababli kod
// bo'ylab `(session.user as any).role` naqshi tarqalgan edi. Bu yerda tur
// kengaytiriladi, natijada `any` siz o'qish mumkin va maydon nomidagi
// xatoni kompilyator ushlaydi.
//
// DIQQAT: bu fayldagi maydonlar `auth.ts` callback'lari haqiqatan yozadigan
// qiymatlarga mos bo'lishi shart — aks holda tur yolg'on va'da bergan bo'ladi.

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      lang: string;
      telegramId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// JWT turi `@auth/core/jwt` da e'lon qilingan; `next-auth/jwt` uni faqat
// `export *` bilan uzatadi, shuning uchun o'sha nom orqali augmentatsiya
// birlashmaydi — manba modulning o'zi kengaytiriladi.
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    lang?: string;
    telegramId?: string | null;
    // Provayder ma'lumoti va Google uchun kechiktirilgan DB sinxronizatsiya
    // bayrog'i — `jwt` callback shu maydonlar orqali holat saqlaydi.
    provider?: string;
    providerAccountId?: string;
    googleId?: string;
    needsDbSync?: boolean;
  }
}

export {};
