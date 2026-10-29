'use client';

import { createContext } from 'react';

// Statik (ISR) sahifada `router.refresh()` shaxsiy qismni yangilamaydi — u
// klientda `/api/.../me` dan keladi. Obuna sotib olingach BuyOfferButton shu
// funksiyani ham chaqiradi; provider yo'q joyda (null) faqat refresh.
export const PersonalRefreshContext = createContext<(() => void) | null>(null);
