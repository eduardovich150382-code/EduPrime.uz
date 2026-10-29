import { routing } from './routing';

// Build vaqtida har locale uchun prerender qilinadigan sahifalar shuni
// eksport qiladi (bosh sahifa, /tg). `[locale]/layout.tsx` da emas: u yerda
// bo'lsa ostidagi har statik sahifa (/attestation, /tests, /pricing) build'da
// bazadan o'qib render bo'lishga majbur — lokal va CI build'da baza yo'q.
// Ular `noBuildTimeParams` ni eksport qiladi: birinchi so'rovda render bo'lib
// ISR keshiga tushadi.
export function generateLocaleStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Bazadan o'qiydigan statik sahifalar uchun: build'da hech qaysi locale
 * render qilinmaydi, birinchi so'rovda (blocking) render bo'lib `revalidate`
 * gacha keshlanadi. Busiz (umuman generateStaticParams bo'lmasa) Next
 * route'ni dinamik (ƒ) deb belgilaydi va `revalidate` ishlamaydi.
 */
export function noBuildTimeParams(): { locale: string }[] {
  return [];
}
