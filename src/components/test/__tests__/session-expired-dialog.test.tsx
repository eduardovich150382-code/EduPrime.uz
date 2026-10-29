import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import SessionExpiredDialog from '../SessionExpiredDialog';
import { readPracticeCheck } from '../PracticeSolve';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

const all = { uz, ru, en } as const;
type Locale = keyof typeof all;

function render(locale: Locale, returnPath: string) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={all[locale]} timeZone="Asia/Tashkent">
      <SessionExpiredDialog returnPath={returnPath} onClose={() => {}} />
    </NextIntlClientProvider>,
  );
}

// renderToStaticMarkup apostrofni qochiradi.
const esc = (text: string) => text.replace(/'/g, '&#x27;');

describe('SessionExpiredDialog — topshirishda 401', () => {
  it.each<[Locale, string, string]>([
    ['uz', '/tests/t1/solve', 'href="/login?callbackUrl=%2Ftests%2Ft1%2Fsolve"'],
    ['ru', '/ru/tests/t1/solve', 'href="/ru/login?callbackUrl=%2Fru%2Ftests%2Ft1%2Fsolve"'],
    ['en', '/en/tests/t1/solve', 'href="/en/login?callbackUrl=%2Fen%2Ftests%2Ft1%2Fsolve"'],
  ])('%s: tarjima qilingan xabar va shu test sahifasiga qaytaradigan login havolasi', (locale, returnPath, href) => {
    const html = render(locale, returnPath);
    const t = all[locale].exam.sessionExpired;
    expect(html).toContain(esc(t.title));
    expect(html).toContain(esc(t.body));
    expect(html).toContain(esc(t.login));
    expect(html).toContain(href);
    expect(html).not.toContain('Unauthorized');
  });

  it("o'zbekcha matn so'ralgandek", () => {
    expect(uz.exam.sessionExpired.body).toBe('Javoblaringiz saqlangan — qayta kiring va topshiring.');
    expect(uz.exam.sessionExpired.login).toBe('Qayta kirish');
  });

  it('returnTo parametri callbackUrl ichida yo\'qolmaydi', () => {
    const html = render('uz', '/tests/t1/solve?returnTo=%2Fcourses%2Fc1%2Flearn');
    expect(html).toContain(`callbackUrl=${encodeURIComponent('/tests/t1/solve?returnTo=%2Fcourses%2Fc1%2Flearn')}`.replace(/&/g, '&amp;'));
  });

  it("tugmalar mobil uchun ≥44px", () => {
    const html = render('uz', '/tests/t1/solve');
    expect(html).toMatch(/<a class="[^"]*min-h-11[^"]*" href="\/login/);
    expect(html).toMatch(/<button type="button" class="exam-control w-full"/);
  });
});

describe('PracticeSolve — mashqni tekshirishda 401', () => {
  const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('401 — sessiya tugagan, xato emas', async () => {
    expect(await readPracticeCheck(json({ error: 'Unauthorized' }, 401))).toEqual({ kind: 'expired' });
  });
  it.each([400, 403, 404, 500])('%i — avvalgidek xato', async (status) => {
    expect(await readPracticeCheck(json({ error: 'x' }, status))).toEqual({ kind: 'error' });
  });
  it("200, lekin practice yo'q yoki JSON buzuq — xato", async () => {
    expect(await readPracticeCheck(json({}, 200))).toEqual({ kind: 'error' });
    expect(await readPracticeCheck(new Response('<html>', { status: 200 }))).toEqual({ kind: 'error' });
  });
  it('200 — natija', async () => {
    const practice = { questions: [] };
    expect(await readPracticeCheck(json({ practice }, 200))).toEqual({ kind: 'ok', practice });
  });

  it.each<[Locale, string]>([
    ['uz', '/tests/t1/solve?practice=r1&returnTo=%2Fcourses%2Fc1%2Flearn'],
    ['ru', '/ru/tests/t1/solve?practice=r1'],
    ['en', '/en/tests/t1/solve?practice=r1'],
  ])("%s: mashq matni (qoralama va'da qilinmaydi), til va query saqlanadi", (locale, returnPath) => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={all[locale]} timeZone="Asia/Tashkent">
        <SessionExpiredDialog variant="practice" returnPath={returnPath} onClose={() => {}} />
      </NextIntlClientProvider>,
    );
    const t = all[locale].exam.sessionExpired;
    expect(html).toContain(esc(t.practiceBody));
    expect(html).not.toContain(esc(t.body));
    const prefix = locale === 'uz' ? '' : `/${locale}`;
    expect(html).toContain(`href="${prefix}/login?callbackUrl=${encodeURIComponent(returnPath)}"`);
  });
});
