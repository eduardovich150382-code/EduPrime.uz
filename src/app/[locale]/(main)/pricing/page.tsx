'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PricingClient from './PricingClient';

// PricingClient `useSearchParams()` ishlatadi (`returnUrl` — qarang
// BuildClient.tsx#buildReturnUrl) — Next.js buni Suspense ichida talab
// qiladi, aks holda `next build` xato beradi (/build sahifasidagi bilan
// bir xil naqsh).
export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto text-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
        </div>
      }
    >
      <PricingClient />
    </Suspense>
  );
}
