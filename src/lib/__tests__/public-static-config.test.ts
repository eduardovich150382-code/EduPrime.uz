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
  it.each(PAGES)('%s: revalidate 300, dinamik API yo‘q', (file) => {
    const source = code(file);
    expect(source).toMatch(/export const revalidate = 300;/);
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
});
