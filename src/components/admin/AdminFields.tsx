'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export const fieldClass = 'w-full min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-text-primary';
export const buttonClass = 'min-h-11 rounded-lg border border-border px-4 py-2 disabled:opacity-50';
// Qaytarib bo'lmaydigan yoki foydalanuvchiga ta'sir qiladigan amal (o'chirish,
// bloklash, ruxsatni olish) — doim qizil va doim ConfirmDialog orqali.
export const dangerButtonClass = 'min-h-11 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50';
export const dangerOutlineClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50';
// Faqat ikonkali tugma: 44×44 bosish maydoni; aria-label + title majburiy.
export const iconButtonClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50';
// Qator amallari (Profil, Xabar, Reyting): ikonka + matn, 44px.
export const actionButtonClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1 text-sm"><span>{label}</span>{children}</label>;
}

export function ErrorMessage({ error }: { error: string }) {
  const t = useTranslations('adminProducts');
  return error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t.has(`errors.${error}`) ? t(`errors.${error}`) : t('errors.SERVER_ERROR')}</p> : null;
}

export async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.code === 'string' ? data.code : typeof data.error === 'string' ? data.error : 'SERVER_ERROR');
  return data as T;
}

export function errorCode(error: unknown): string { return error instanceof Error ? error.message : 'SERVER_ERROR'; }
