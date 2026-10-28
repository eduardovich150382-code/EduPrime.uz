// Sahifa 'use client' — segment konfiguratsiyasi faqat shu yerda bo'la oladi.
// [locale] layout statik bo'lgach u prerender qilinardi, lekin butun oqim
// `useSearchParams` dagi bir martalik tokenga bog'liq — avvalgidek serverda.
export const dynamic = 'force-dynamic';

export default function TelegramCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
