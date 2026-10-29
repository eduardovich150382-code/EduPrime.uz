'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { writeAuthHint } from '@/lib/auth-hint';

// Ishora (lib/auth-hint.ts) sessiya aniq bo'lgan har safar yangilanadi —
// chiqqan yoki sessiyasi tugagan foydalanuvchida keyingi ochilishda mehmon
// ko'rinishi darhol chiqsin.
export default function AuthHintSync() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== 'loading') writeAuthHint(status === 'authenticated');
  }, [status]);
  return null;
}
