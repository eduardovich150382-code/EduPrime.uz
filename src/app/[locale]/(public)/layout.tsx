import AppShell from '@/components/layout/AppShell';
import { AUTH_HINT_SCRIPT } from '@/lib/auth-hint';

// Kirmagan foydalanuvchi ham ko'radigan sahifalar — (main) bilan bir xil
// qobiq, faqat redirect yo'q. Bu yerda `auth()` yo'q: sahifalar statik (ISR)
// va CDN'dan beriladi, role va shaxsiy qism klientda sessiyadan keladi.
// Test yechish, natija va to'lov (main) da qoladi.
//
// Inline skript o'ramaga `data-authed` qo'yadi (lib/auth-hint.ts) — sessiya
// kelguncha kirgan foydalanuvchiga mehmon CTA'si o'rniga skeleton ko'rinadi.
// Atribut server HTML'ida yo'q, shuning uchun suppressHydrationWarning.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-auth-scope="" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: AUTH_HINT_SCRIPT }} />
      <AppShell>{children}</AppShell>
    </div>
  );
}
