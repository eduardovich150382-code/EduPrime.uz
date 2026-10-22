'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { isTypingTarget, MAX_QUERY_LENGTH } from '@/lib/tests-filters';

const DEBOUNCE_MS = 250;

export function TestsSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (q: string) => void;
}) {
  const t = useTranslations('tests');
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const [isMac, setIsMac] = useState(false);

  // Taymer ichida eng so'nggi qiymatlar kerak, lekin ular deps'ga kirsa har
  // render debounce'ni qaytadan boshlab yuboradi.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // URL'dagi q tashqaridan o'zgarsa (orqaga tugmasi, "Filtrni tozalash")
  // maydon ham yangilansin. Yozilayotgan matn trim'dan keyin URL bilan bir
  // xil bo'lsa tegilmaydi — aks holda oxiridagi probel o'chib, kursor
  // sakraydi.
  useEffect(() => {
    setText((current) => (current.trim() === value ? current : value));
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== valueRef.current) onChangeRef.current(next);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // navigator faqat brauzerda bor — SSR bilan nomuvofiqlik bo'lmasligi
  // uchun mount'dan keyin aniqlanadi.
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target as HTMLElement | null);
      if (!isShortcut && !isSlash) return;
      // Ctrl+K brauzerning o'z qidiruviga, "/" esa Firefox'ning tezkor
      // qidiruviga ketmasin.
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={text}
        maxLength={MAX_QUERY_LENGTH}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-base text-text-primary shadow-sm placeholder:text-text-secondary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:pr-24"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-sans text-xs text-text-secondary sm:flex">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </div>
  );
}
