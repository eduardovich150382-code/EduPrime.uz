// Testlar bo'limidagi asosiy/ikkinchi darajali tugmalar (docs/design/testlar-ui.md).
// 'use client' faylidan tashqarida — server komponentlar ham shu satrlarni
// import qila oladi (client moduldan import qilingan qiymat RSC'da havola bo'ladi).
export const primaryButton =
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700';
export const secondaryButton =
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100';
