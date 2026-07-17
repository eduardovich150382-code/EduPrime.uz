import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Testlar — DTM, Maktab, Attestatsiya, SAT, GRE',
  description: "Barcha turdagi testlarni tanlang va yechishni boshlang. DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlari.",
  openGraph: {
    title: 'Testlar — EduPrime.uz',
    description: "Barcha turdagi testlarni tanlang va yechishni boshlang.",
  },
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
