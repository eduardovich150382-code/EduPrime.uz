import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tariflar — obunalar",
  description: "EduPrime.uz obunalari: maqsadingiz va faningizga mos obunani tanlang — attestatsiya, DTM, Milliy sertifikat va boshqa testlarga cheksiz kirish.",
  openGraph: {
    title: 'Tariflar — EduPrime.uz',
    description: "Maqsadingiz va faningizga mos obuna — testlarga cheksiz kirish.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
