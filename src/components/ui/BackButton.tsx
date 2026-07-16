'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
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
