import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionView } from '@/lib/subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';
import uz from '@/messages/uz.json';

const m = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock('../useSubscriptionStatus', () => ({ useSubscriptionStatus: m.status }));
vi.mock('next/navigation', () => ({ usePathname: () => '/tests' }));
vi.mock('@/i18n/routing', async (original) => ({ ...await original<typeof import('@/i18n/routing')>(), usePathname: () => '/tests' }));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));
import Sidebar from '@/components/layout/Sidebar';
function render(role: string | null = 'USER') {
  return renderToStaticMarkup(<NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent" now={now}>
    <Sidebar role={role} mobileOpen={true} setMobileOpen={() => {}} />
  </NextIntlClientProvider>);
}
beforeEach(() => { m.status.mockReset(); });

describe('Sidebar haqiqiy obuna holati', () => {
  it('obunachiga taklif ham, "Faol obunalar" bloki ham yo‘q — muddat header belgisida', () => {
    m.status.mockReturnValue({ subscriptions: [subscriptionView(sub())], hasAnyScope: true });
    const html = render();
    expect(html).not.toContain('Faol obunalar'); expect(html).not.toContain('Attestatsiya · Fizika');
    expect(html).not.toContain('Obuna olish'); expect(html).not.toContain('Premium'); expect(html).not.toContain('Bepul');
  });
  it('ruxsatda taklif yo‘q; obunasizda pricing taklifi bor; yuklanishda yashirin', () => {
    m.status.mockReturnValue({ subscriptions: [], hasAnyScope: true }); expect(render()).not.toContain('Obuna olish');
    m.status.mockReturnValue({ subscriptions: [], hasAnyScope: false }); expect(render()).toContain('Obuna olish');
    m.status.mockReturnValue(null); expect(render()).not.toContain('Obuna olish');
    expect(render(null)).toContain('Obuna olish');
  });
});
