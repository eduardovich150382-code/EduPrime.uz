import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';

const m = vi.hoisted(() => ({ status: vi.fn(), session: vi.fn(), pathname: vi.fn(() => '/tests') }));
vi.mock('@/components/ui/useSubscriptionStatus', () => ({ useSubscriptionStatus: m.status }));
vi.mock('next-auth/react', () => ({ useSession: m.session }));
vi.mock('@/i18n/routing', async (original) => ({ ...await original<typeof import('@/i18n/routing')>(), usePathname: m.pathname }));
import HeaderSubscription from '../HeaderSubscription';

const user = { data: { user: { id: 'u1', role: 'USER' } }, status: 'authenticated' };
function render(compact = false) {
  return renderToStaticMarkup(<NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent" now={now}>
    <HeaderSubscription compact={compact} />
  </NextIntlClientProvider>).replace(/<!-- -->/g, '');
}
const physics = (endDate: string, id = 's1') => subscriptionView(sub({ id, endDate: new Date(endDate) }));

beforeEach(() => { m.status.mockReset(); m.session.mockReset(); m.pathname.mockReturnValue('/tests'); m.session.mockReturnValue(user); });

describe('Header obuna joyi', () => {
  it('obunasiz: "Obuna olish" → /pricing, toj/Premium yo‘q', () => {
    m.status.mockReturnValue({ subscriptions: [], hasAnyScope: false });
    const html = render();
    expect(html).toContain('Obuna olish'); expect(html).toContain('href="/pricing"'); expect(html).not.toContain('Premium');
    expect(render(true)).toContain('>Obuna<');
  });
  it('attestatsiya sahifasida → /pricing?goal=ATTESTATION; mehmonga ham CTA', () => {
    m.pathname.mockReturnValue('/attestation');
    m.status.mockReturnValue({ subscriptions: [], hasAnyScope: false });
    expect(render()).toContain('href="/pricing?goal=ATTESTATION"');
    m.session.mockReturnValue({ data: null, status: 'unauthenticated' }); m.status.mockReturnValue(null);
    expect(render()).toContain('href="/pricing?goal=ATTESTATION"');
  });
  it('yuklanishda, ADMIN va admin ruxsati (UserPermission) bo‘lsa — hech narsa', () => {
    m.status.mockReturnValue(null); expect(render()).toBe('');
    m.session.mockReturnValue({ data: null, status: 'loading' }); expect(render()).toBe('');
    m.session.mockReturnValue({ data: { user: { id: 'a', role: 'ADMIN' } }, status: 'authenticated' }); expect(render()).toBe('');
    m.session.mockReturnValue(user); m.status.mockReturnValue({ subscriptions: [], hasAnyScope: true }); expect(render()).toBe('');
  });
  it('attestatsiya-fizika obunachisi: "Fizika · 16 kun", CTA yo‘q, sariq emas', () => {
    m.status.mockReturnValue({ subscriptions: [physics('2026-11-10T12:00:00+05:00')], hasAnyScope: true });
    const html = render();
    expect(html).toContain('Fizika</span><span class="shrink-0 whitespace-nowrap">· 16 kun');
    expect(html).not.toContain('Obuna olish'); expect(html).not.toContain('bg-[#ffedd5]'); expect(html).toContain('aria-expanded="false"');
  });
  it('bir nechta obuna: eng yaqini + "+1"; ≤3 kunda sariq', () => {
    m.status.mockReturnValue({ subscriptions: [physics('2026-10-27T12:00:00+05:00'), physics('2026-11-10T12:00:00+05:00', 's2')], hasAnyScope: true });
    const html = render();
    expect(html).toContain('· 2 kun'); expect(html).toContain('+1'); expect(html).toContain('bg-[#ffedd5]');
  });
  it('eski tarifda "Eski tarif", Premium emas', () => {
    m.status.mockReturnValue({ subscriptions: [subscriptionView(sub({ plan: 'PREMIUM', product: null, productId: null, subjects: [], endDate: new Date('2026-11-10T12:00:00+05:00') }))], hasAnyScope: true });
    const html = render();
    expect(html).toContain('Eski tarif'); expect(html).not.toContain('Premium');
  });
});
