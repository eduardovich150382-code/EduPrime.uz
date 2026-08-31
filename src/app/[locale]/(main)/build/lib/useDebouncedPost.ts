'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * `body` o'zgarganda 300ms (standart) kutib, so'ng POST so'rov yuboradi.
 * Kutish davomida yana o'zgarsa — eski taymer bekor qilinadi (debounce);
 * so'rov allaqachon yo'lga chiqqan bo'lsa — eskisi `AbortController` bilan
 * bekor qilinadi (stale javob yangi holatni bosib ketmasin uchun).
 * `/build` ekranida `/api/items/count` va `/api/topics` shu bilan chaqiriladi.
 */
export function useDebouncedPost<T>(
  url: string,
  body: unknown,
  options?: { skip?: boolean; delayMs?: number }
): { data: T | null; loading: boolean } {
  const { skip = false, delayMs = 300 } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const bodyKey = JSON.stringify(body);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyKey,
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setLoading(false);
        });
    }, delayMs);

    return () => clearTimeout(timer);
    // bodyKey — bu effektning YAGONA mazmuniy bog'liqligi (spec o'zgarganda qayta ishga tushadi).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, bodyKey, skip, delayMs]);

  // Komponent unmount bo'lganda ham osilib qolgan so'rovni bekor qilamiz.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { data, loading };
}
