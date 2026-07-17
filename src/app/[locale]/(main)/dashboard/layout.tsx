import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Dashboard — Shaxsiy kabinet",
  description: "Shaxsiy statistikangiz, oxirgi natijalar va tez havolalar.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
