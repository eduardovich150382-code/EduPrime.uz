'use client';

import type { ReactNode } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface Props {
  index: number;
  icon: ReactNode;
  label: string;
  statusIcon?: ReactNode;
  locked?: boolean;
  lockedNote?: string;
  /** Ichki sahifaga o'tish (masalan test yechish) — berilsa qator <Link> bo'ladi. */
  href?: string;
  /** Tashqi fayl havolasi — berilsa qator yangi tabda ochiladigan <a> bo'ladi. */
  externalHref?: string;
  /** Ichida ochilib-yopiladigan tarkib bo'lsa (masalan yechim videosi). */
  expanded?: boolean;
  onToggle?: () => void;
  /** Qator ostida ko'rsatiladigan tarkib — statik qatorlarda (masalan darsning
   * asosiy kontenti) doim, `onToggle` bilan boshqariladiganlarda faqat `expanded`
   * bo'lganda chiqadi. */
  children?: ReactNode;
}

/**
 * "Dars bosqichlari" ro'yxatidagi bitta qator — raqam, ikonka, nomi va holat
 * belgisi bilan. Darsning o'z kontenti (video/matn/test/PDF) ham, qo'shimcha
 * bloklar (fayl, mashq, yechim videosi) ham shu bitta komponent orqali
 * ko'rsatiladi, shu sababli foydalanuvchi uchun ular bitta ketma-ketlik bo'lib
 * ko'rinadi.
 */
export default function LessonStepRow({
  index, icon, label, statusIcon, locked, lockedNote, href, externalHref, expanded, onToggle, children,
}: Props) {
  const rowClasses = `w-full flex items-center gap-3 px-3 py-3 min-h-[56px] text-left ${
    locked ? 'cursor-default' : 'hover:bg-gray-50 transition-colors'
  }`;
  const wrapperClass = `rounded-xl border border-border overflow-hidden ${locked ? 'bg-gray-50' : 'bg-surface'}`;

  const inner = (
    <>
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          locked ? 'bg-gray-200 text-gray-400' : 'bg-primary-100 text-primary-700'
        }`}
      >
        {locked ? <Lock size={13} /> : index}
      </span>
      <span className={`flex-shrink-0 ${locked ? 'text-gray-300' : 'text-primary-600'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium truncate ${locked ? 'text-gray-400' : 'text-text-primary'}`}>{label}</span>
        {locked && lockedNote && <span className="block text-xs text-gray-400 truncate">{lockedNote}</span>}
      </span>
      {!locked && statusIcon}
      {!locked && onToggle && (
        <ChevronDown size={16} className={`flex-shrink-0 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`} />
      )}
    </>
  );

  if (locked) {
    return (
      <div className={wrapperClass}>
        <div className={rowClasses}>{inner}</div>
      </div>
    );
  }

  if (href) {
    return (
      <div className={wrapperClass}>
        <Link href={href} className={rowClasses}>{inner}</Link>
      </div>
    );
  }

  if (externalHref) {
    return (
      <div className={wrapperClass}>
        <a href={externalHref} target="_blank" rel="noopener noreferrer" className={rowClasses}>{inner}</a>
      </div>
    );
  }

  if (onToggle) {
    return (
      <div className={wrapperClass}>
        <button type="button" onClick={onToggle} className={rowClasses}>{inner}</button>
        {expanded && children && <div className="px-3 pb-3 pt-0.5">{children}</div>}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className={rowClasses}>{inner}</div>
      {children && <div className="px-3 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}
