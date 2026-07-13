'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TelegramCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const telegramId = searchParams.get('telegramId');
    const username = searchParams.get('username');
    const firstName = searchParams.get('firstName');
    const token = searchParams.get('token');

    if (!telegramId || !token) {
      setStatus('error');
      setError('Invalid authentication link');
      return;
    }

    // Sign in with Telegram credentials
    signIn('telegram', {
      telegramId,
      telegramUsername: username || '',
      firstName: firstName || '',
      authToken: token,
      callbackUrl: '/dashboard',
      redirect: true,
    }).catch(() => {
      setStatus('error');
      setError('Authentication failed');
    });
  }, [searchParams]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="card-elevated p-8 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-primary-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Kuting...
            </h2>
            <p className="text-sm text-text-secondary">
              Telegram orqali kirilmoqda
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Muvaffaqiyatli!
            </h2>
            <p className="text-sm text-text-secondary">
              Yo&apos;naltirilmoqda...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Xatolik
            </h2>
            <p className="text-sm text-text-secondary">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
