import { testsMetadata } from '@/components/tests/tests-metadata';

// Ro'yxat (public) ga ko'chgan; bu layout endi faqat /tests/[id]/solve ni o'raydi.
export const metadata = testsMetadata;

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
