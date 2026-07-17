import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Reyting — O'zbekiston bo'ylab reyting jadvali",
  description: "O'zbekiston bo'ylab eng ko'p ball to'plagan foydalanuvchilar reytingi. O'z o'rningizni bilib oling!",
  openGraph: {
    title: "Reyting jadvali — EduPrime.uz",
    description: "O'zbekiston bo'ylab eng ko'p ball to'plagan foydalanuvchilar reytingi.",
  },
};

export default function RatingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
