import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import uz from '@/messages/uz.json';

const m = vi.hoisted(() => ({ pathname: '/admin', status: vi.fn() }));
vi.mock('@/components/ui/useSubscriptionStatus', () => ({ useSubscriptionStatus: m.status }));
vi.mock('next/navigation', () => ({ usePathname: () => `/ru${m.pathname}` }));
vi.mock('@/i18n/routing', async (original) => ({
  ...await original<typeof import('@/i18n/routing')>(),
  usePathname: () => m.pathname,
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('next-auth/react', () => ({ signOut: vi.fn(), useSession: () => ({ status: 'authenticated' }) }));
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

function render(node: React.ReactNode) {
  return renderToStaticMarkup(<NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent">{node}</NextIntlClientProvider>);
}
const sidebar = (mode?: 'admin') => render(<Sidebar role="ADMIN" mode={mode} mobileOpen={false} setMobileOpen={() => {}} />);
// aria-current="page" bo'lgan havolaning matni.
const activeLabels = (html: string) => [...html.matchAll(/aria-current="page"[^>]*>(?:<svg[\s\S]*?<\/svg>)?<span[^>]*>([^<]+)</g)].map((x) => x[1]);

beforeEach(() => { m.status.mockReturnValue(null); });

describe('admin Sidebar', () => {
  it('/admin ichida faqat guruhlangan admin menyusi', () => {
    m.pathname = '/admin/tests/abc/reyting';
    const html = sidebar('admin');
    for (const group of ['Umumiy', 'Kontent', 'Moliya', 'Marketing', 'Tizim']) expect(html).toContain(group);
    expect(html).toContain('Saytga qaytish');
    expect(html).not.toContain('Tariflar');
    expect(activeLabels(html)).toEqual(['Testlar']);
  });

  it('sayt sahifalarida admin uchun bitta "Admin panel" havolasi', () => {
    m.pathname = '/dashboard';
    const html = sidebar();
    expect(html.match(/href="\/admin"/g)).toHaveLength(1);
    expect(html).not.toContain('Mahsulot va narxlar');
    expect(html).not.toContain('href="/admin/products"');
  });

  it('mobil til almashtirgich tugmalari 44px va joriy tilni belgilaydi', () => {
    m.pathname = '/admin';
    const html = sidebar('admin');
    expect(html).toMatch(/aria-pressed="true"[^>]*min-h-11[^>]*>uz</);
  });
});

describe('admin BottomNav', () => {
  it('4 ta asosiy bo\'lim + Menyu, faol bo\'lim belgilanadi', () => {
    m.pathname = '/admin/payments';
    const html = render(<BottomNav mode="admin" onMenuClick={() => {}} />);
    for (const href of ['/admin', '/admin/users', '/admin/payments', '/admin/tests']) expect(html).toContain(`href="${href}"`);
    expect(html).toContain('Menyu');
    expect(html).not.toContain('href="/build"');
    expect(html.match(/<a aria-current="page"[^>]*href="([^"]+)"/g)).toHaveLength(1);
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/admin\/payments"/);
  });
});
