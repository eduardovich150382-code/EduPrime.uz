import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tariflar — Premium va Ustoz tariflari",
  description: "EduPrime.uz tariflarini ko'ring. Bepul, Premium (29,000 so'm/oy) va Ustoz tariflari. DTM, maktab, SAT, GRE testlariga cheksiz kirish.",
  openGraph: {
    title: 'Tariflar — EduPrime.uz',
    description: "Premium (29,000 so'm/oy) va Ustoz tariflari. DTM, SAT, GRE testlariga cheksiz kirish.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
