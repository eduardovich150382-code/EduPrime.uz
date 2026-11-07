import {
  LayoutDashboard, Users, GraduationCap, Bell, ClipboardList, BookOpen,
  Wallet, Crown, Package, KeyRound, Megaphone, Settings, type LucideIcon,
} from 'lucide-react';

// Admin menyusi yagona manbada: Sidebar (desktop), mobil drawer va BottomNav
// shu ro'yxatdan quriladi. Yangi sahifa qo'shilsa — faqat shu yerga bir qator;
// `admin-nav.test.ts` har bir href haqiqiy page.tsx ga mos kelishini tekshiradi.

export interface AdminNavItem {
  href: string;
  /** `adminNav` namespace'idagi kalit. */
  labelKey: string;
  icon: LucideIcon;
  /** Mobil BottomNav'da to'g'ridan-to'g'ri ko'rinadigan asosiy bo'lim. */
  mobilePrimary?: boolean;
}

export interface AdminNavGroup {
  /** `adminNav.groups` ichidagi kalit. */
  titleKey: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    titleKey: 'general',
    items: [
      { href: '/admin', labelKey: 'home', icon: LayoutDashboard, mobilePrimary: true },
    ],
  },
  {
    titleKey: 'people',
    items: [
      { href: '/admin/users', labelKey: 'users', icon: Users, mobilePrimary: true },
      { href: '/admin/teachers', labelKey: 'teachers', icon: GraduationCap },
      { href: '/admin/notifications', labelKey: 'notifications', icon: Bell },
    ],
  },
  {
    titleKey: 'content',
    items: [
      { href: '/admin/tests', labelKey: 'tests', icon: ClipboardList, mobilePrimary: true },
      { href: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
    ],
  },
  {
    titleKey: 'finance',
    items: [
      { href: '/admin/payments', labelKey: 'payments', icon: Wallet, mobilePrimary: true },
      { href: '/admin/subscriptions', labelKey: 'subscriptions', icon: Crown },
      { href: '/admin/products', labelKey: 'products', icon: Package },
      { href: '/admin/permissions', labelKey: 'permissions', icon: KeyRound },
    ],
  },
  {
    titleKey: 'marketing',
    items: [
      { href: '/admin/ad-sources', labelKey: 'adSources', icon: Megaphone },
    ],
  },
  {
    titleKey: 'system',
    items: [
      { href: '/admin/settings', labelKey: 'settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

// BottomNav tartibi guruh tartibidan farq qiladi: kunlik ishda eng ko'p
// ochiladigan To'lovlar Testlardan oldin, bosh barmoqqa yaqinroq turadi.
const MOBILE_ORDER = ['/admin', '/admin/users', '/admin/payments', '/admin/tests'];
export const ADMIN_MOBILE_ITEMS: AdminNavItem[] = MOBILE_ORDER
  .map((href) => ADMIN_NAV_ITEMS.find((item) => item.href === href && item.mobilePrimary))
  .filter((item): item is AdminNavItem => Boolean(item));

/**
 * Locale prefiksisiz yo'l bo'yicha faol menyu bandini topadi.
 * "Eng uzun prefiks" qoidasi: `/admin/tests/abc/reyting` → `/admin/tests`.
 * `/admin` faqat aniq mos kelganda faol — aks holda har bir ichki sahifada
 * "Bosh sahifa" ham yonib turardi.
 */
export function getActiveAdminHref(pathname: string, items: AdminNavItem[] = ADMIN_NAV_ITEMS): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let best: string | null = null;
  for (const { href } of items) {
    const matches = href === '/admin' ? path === href : path === href || path.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}
