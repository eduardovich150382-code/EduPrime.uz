import type { NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

// Shaxsiy GET endpoint'lar (`/api/*/me`) statik sahifadan `?locale=` bilan
// chaqiriladi — noma'lum qiymat asosiy tilga tushadi.
export function requestLocale(request: NextRequest): Locale {
  const raw = request.nextUrl.searchParams.get('locale');
  return (locales as readonly string[]).includes(raw ?? '') ? (raw as Locale) : defaultLocale;
}
