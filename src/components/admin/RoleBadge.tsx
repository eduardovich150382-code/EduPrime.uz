'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap, Shield, User } from 'lucide-react';

export default function RoleBadge({ role }: { role: string }) {
  const t = useTranslations('adminUsers');
  switch (role) {
    case 'ADMIN': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium inline-flex items-center gap-1"><Shield size={10} aria-hidden /> {t('roles.ADMIN')}</span>;
    case 'TEACHER': return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium inline-flex items-center gap-1"><GraduationCap size={10} aria-hidden /> {t('roles.TEACHER')}</span>;
    default: return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium inline-flex items-center gap-1"><User size={10} aria-hidden /> {t('roles.USER')}</span>;
  }
}
