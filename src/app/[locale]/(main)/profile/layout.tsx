import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Profil — Shaxsiy ma'lumotlar",
  description: "Profilingizni boshqaring — ism, avatar, ulangan akkauntlar.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
