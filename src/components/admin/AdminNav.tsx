'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_GROUPS, getActiveAdminHref } from './admin-nav';

// Guruhlangan admin menyusi — desktop sidebar va mobil drawer ichida bir xil.
// `collapsed` faqat desktop'da: matn yashiriladi, lekin aria-label/title
// qoladi, aks holda ikonka tugmasi ekran o'quvchiga nomsiz bo'lib qoladi.
export default function AdminNav({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations('adminNav');
  const active = getActiveAdminHref(usePathname());

  const itemClass = (isActive: boolean) => cn(
    'flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
    isActive ? 'bg-primary-100 text-primary-700' : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600',
  );

  return (
    <nav aria-label={t('title')} className="flex-1 p-3 space-y-4 overflow-y-auto">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.titleKey} className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {t(`groups.${group.titleKey}`)}
            </p>
          )}
          {group.items.map((item) => {
            const label = t(`items.${item.labelKey}`);
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={itemClass(isActive)}
              >
                <item.icon size={20} className="flex-shrink-0" aria-hidden />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="border-t border-border pt-3">
        <Link
          href="/dashboard"
          aria-label={collapsed ? t('backToSite') : undefined}
          title={collapsed ? t('backToSite') : undefined}
          className={itemClass(false)}
        >
          <ArrowLeft size={20} className="flex-shrink-0" aria-hidden />
          {!collapsed && <span>{t('backToSite')}</span>}
        </Link>
      </div>
    </nav>
  );
}
