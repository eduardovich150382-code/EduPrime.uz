import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';
import { ADMIN_MOBILE_ITEMS, ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, getActiveAdminHref } from '../admin-nav';

const ADMIN_PAGES = path.resolve(__dirname, '../../../app/[locale]/(admin)');

describe('admin menyu konfiguratsiyasi', () => {
  it('har bir havola mavjud page.tsx ga mos keladi', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      const file = path.join(ADMIN_PAGES, ...item.href.split('/').filter(Boolean), 'page.tsx');
      expect(existsSync(file), `${item.href} → ${file}`).toBe(true);
    }
  });

  it('havolalar va ikonkalar takrorlanmaydi', () => {
    const hrefs = ADMIN_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const icons = ADMIN_NAV_ITEMS.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('har bir guruh va band uchala tilda tarjimaga ega', () => {
    for (const messages of [uz, ru, en]) {
      const nav = messages.adminNav as { groups: Record<string, string>; items: Record<string, string> };
      for (const group of ADMIN_NAV_GROUPS) {
        expect(nav.groups[group.titleKey], group.titleKey).toBeTruthy();
        for (const item of group.items) expect(nav.items[item.labelKey], item.labelKey).toBeTruthy();
      }
    }
  });

  it('mobil BottomNav: Bosh sahifa, Foydalanuvchilar, To\'lovlar, Testlar', () => {
    expect(ADMIN_MOBILE_ITEMS.map((item) => item.href)).toEqual(['/admin', '/admin/users', '/admin/payments', '/admin/tests']);
  });
});

describe('getActiveAdminHref', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/', '/admin'],
    ['/admin/users', '/admin/users'],
    ['/admin/tests', '/admin/tests'],
    ['/admin/tests/abc/reyting', '/admin/tests'],
    ['/admin/payments', '/admin/payments'],
    ['/admin/ad-sources', '/admin/ad-sources'],
    ['/admin/unknown', null],
    ['/admin/testsx', null],
    ['/dashboard', null],
    ['/teacher/tests', null],
  ])('%s → %s', (pathname, expected) => {
    expect(getActiveAdminHref(pathname)).toBe(expected);
  });
});
