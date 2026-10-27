import type { Metadata } from 'next';

// Faqat Telegram Mini App kirish nuqtasi — qidiruvda ko'rinmasin.
export const metadata: Metadata = {
  title: 'EduPrime',
  robots: { index: false, follow: false },
};

export default function TelegramEntryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
