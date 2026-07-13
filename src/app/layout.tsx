import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EduPrime.uz',
  description: "O'zbekistondagi eng zamonaviy test platformasi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
