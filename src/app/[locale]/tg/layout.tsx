import type { Metadata } from 'next';
import { generateLocaleStaticParams } from '@/i18n/static-params';

// Faqat Telegram Mini App kirish nuqtasi — qidiruvda ko'rinmasin.
export const metadata: Metadata = {
  title: 'EduPrime',
  robots: { index: false, follow: false },
};

// Sahifaning o'zi 'use client' — prerender parametrlari layout'dan.
export const generateStaticParams = generateLocaleStaticParams;

export default function TelegramEntryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
