import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import uz from '@/messages/uz.json';
import { AttestationCountdown } from '../AttestationCountdown';
import { AttestationBanner } from '@/components/tests/AttestationBanner';

// /attestation va /tests statik (ISR) — eski render'da server hisoblagan kun
// soni noto'g'ri bo'lardi. SSR'da (va shu bilan hydration'da) son yo'q,
// sana bor; son klientda chiqadi (useDaysUntil).
const render = (node: React.ReactNode) => renderToStaticMarkup(
  <NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent">{node}</NextIntlClientProvider>,
);

describe('attestatsiya hisoblagichi — SSR', () => {
  it('hero: sana ko‘rinadi, kun soni o‘rnida faqat joy (ko‘rinmas)', () => {
    const html = render(<AttestationCountdown dateKey="2099-12-01" dateLabel="1-dekabr" />);
    expect(html).toContain('1-dekabr');
    expect(html).toContain('<span class="invisible">00</span>');
  });
  it('/tests banneri: son serverda chiqmaydi, joyi band', () => {
    const html = render(<AttestationBanner attestationDate="2099-12-01" />);
    expect(html).toContain('invisible');
    // 2099 gacha ~26 000 kun — server shu sonni chiqarmasligi kerak.
    expect(html).not.toMatch(/>\d{4,}</);
  });
});
