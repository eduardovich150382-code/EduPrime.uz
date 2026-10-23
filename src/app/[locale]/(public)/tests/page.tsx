import { auth } from '@/lib/auth';
import { TestsPage } from '@/components/tests/TestsPageContent';
import { testsMetadata } from '@/components/tests/tests-metadata';

export const metadata = testsMetadata;

// Ro'yxat mehmonga ochiq; yechish (/tests/[id]/solve) va natijalar (main) da
// qoladi. Shaxsiy qismlar (natijalar, "Davom etish") faqat sessiya bo'lsa.
export default async function PublicTestsPage() {
  const session = await auth();
  return <TestsPage isGuest={!session?.user} />;
}
