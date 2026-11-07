'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { useState, useRef, useEffect } from 'react';

// Til almashtirish mantig'i bitta joyda: Header'dagi menyu ham, Sidebar'dagi
// mobil tugmalar ham shu hook'dan foydalanadi — yo'l saqlanib, faqat locale o'zgaradi.
export function useSwitchLocale() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const switchLocale = (newLocale: Locale) => {
    if (newLocale !== locale) router.replace(pathname, { locale: newLocale });
  };
  return { locale, switchLocale };
}

export default function LanguageSwitcher() {
  const { locale, switchLocale: replaceLocale } = useSwitchLocale();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    replaceLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors text-sm text-text-secondary"
      >
        <Globe size={16} />
        <span className="uppercase font-medium">{locale}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-border py-1 min-w-[140px] z-50">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-primary-50 transition-colors ${
                l === locale ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-text-primary'
              }`}
            >
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
