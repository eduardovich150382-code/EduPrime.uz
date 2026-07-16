'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = '' }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors ${className}`}
    >
      <ArrowLeft size={16} />
      <span>Ortga qaytish</span>
    </button>
  );
}
