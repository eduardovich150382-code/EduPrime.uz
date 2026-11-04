import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ISR shartlari manbada — biri buzilsa sahifa jimgina yana har so'rovda
// serverda render bo'la boshlaydi (build ogohlantirmaydi). Natijaning
// o'zi PR'da `.next/prerender-manifest.json` bo'yicha tekshiriladi.
const app = path.resolve(__dirname, '../../app/[locale]');
const read = (file: string) => readFileSync(path.join(app, file), 'utf-8');
// Izohlar sababni tushuntirib `auth()`, `searchParams` ni tilga oladi — faqat kod tekshiriladi.
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PAGES = ['(public)/attestation/page.tsx', '(public)/pricing/page.tsx', '(public)/tests/page.tsx'];

describe('statik (ISR) public sahifalar', () => {
  it('katalog keshi 1 soat — sahifalardagi literal shu songa teng', () => {
    expect(readFileSync(path.resolve(__dirname, '../cache-tags.ts'), 'utf-8')).toMatch(/export const PUBLIC_CACHE_REVALIDATE_SEC = 3600;/);
  });

  it.each(PAGES)('%s: revalidate 3600, dinamik API yo‘q', (file) => {
    const source = code(file);
    expect(source).toMatch(/export const revalidate = 3600;/);
    expect(source).not.toMatch(/export const dynamic/);
    expect(source).not.toMatch(/\bauth\(/);
    expect(source).not.toMatch(/\bsearchParams\b/);
    expect(source).not.toMatch(/from 'next\/headers'/);
    expect(source).toMatch(/setRequestLocale\(locale\)/);
  });

  it('(public) layout sessiyani serverda o‘qimaydi', () => {
    expect(code('(public)/layout.tsx')).not.toMatch(/\bauth\(/);
  });

  // [locale]/layout.tsx da bo'lsa ostidagi har statik sahifa build'da bazadan
  // o'qib render bo'lardi — lokal/CI build'da baza yo'q.
  it('locale prerender faqat bosh sahifa va /tg da, 3 sahifa — build’siz ISR', () => {
    expect(code('layout.tsx')).not.toMatch(/export (function|const) generateStaticParams/);
    expect(read('page.tsx')).toMatch(/export const generateStaticParams = generateLocaleStaticParams/);
    expect(read('tg/layout.tsx')).toMatch(/export const generateStaticParams = generateLocaleStaticParams/);
    // Bo'sh ro'yxat: build'da render yo'q, birinchi so'rovda ISR. Umuman
    // bo'lmasa Next route'ni dinamik (ƒ) qiladi.
    for (const file of PAGES) expect(code(file)).toMatch(/export const generateStaticParams = noBuildTimeParams;/);
  });

  // /login: build'da har til uchun HTML. URL parametrlari faqat Suspense ichidagi
  // komponentda — aks holda build xato beradi yoki sahifa yana dinamik bo'ladi.
  it('/login statik: server sahifa, locale prerender, force-dynamic yo‘q', () => {
    const page = read('(auth)/login/page.tsx');
    expect(page).not.toMatch(/^'use client'/);
    expect(page).toMatch(/export const generateStaticParams = generateLocaleStaticParams;/);
    expect(code('(auth)/login/page.tsx')).toMatch(/setRequestLocale\(locale\)/);
    expect(code('(auth)/login/layout.tsx')).not.toMatch(/export const dynamic/);
    expect(code('(auth)/login/page.tsx')).not.toMatch(/\b(auth\(|searchParams|useSearchParams)\b|from 'next\/headers'/);
  });

  it('/login: useSearchParams faqat Suspense ichidagi LoginSearchParams da', () => {
    const form = readFileSync(path.resolve(__dirname, '../../components/auth/LoginForm.tsx'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const calls = form.match(/useSearchParams\(\)/g) ?? [];
    expect(calls).toHaveLength(1);
    const owner = form.slice(form.lastIndexOf('function ', form.indexOf('useSearchParams()')));
    expect(owner).toMatch(/^function LoginSearchParams\(/);
    expect(form).toMatch(/<Suspense fallback=\{null\}>\s*<LoginSearchParams \/>\s*<\/Suspense>/);
  });
});
