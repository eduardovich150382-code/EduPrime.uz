'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
  /** Berilsa, brauzer tarixi o'rniga to'g'ridan-to'g'ri shu manzilga qaytadi — masalan tariflar sahifasidagi `returnUrl` (qarang PricingPage). */
  href?: string;
}

export default function BackButton({ className = '', href }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href);
      return;
    }
    if (window.history.length <= 1) {
      router.push('/dashboard');
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors ${className}`}
    >
      <ArrowLeft size={16} />
      <span>Ortga qaytish</span>
    </button>
  );
}
