'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BuildClient from './BuildClient';

export default function BuildPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto text-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
        </div>
      }
    >
      <BuildClient />
    </Suspense>
  );
}
