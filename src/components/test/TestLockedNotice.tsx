'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { TestType } from '@prisma/client';

export interface TestAccessDenied {
  accessType: string;
  price?: number;
  testTitle?: string;
  categoryType?: TestType | null;
}

// Pullik test kirish huquqisiz ochilganda ko'rsatiladigan "Test yopiq" ekrani.
export default function TestLockedNotice({ testId, accessDenied }: { testId: string; accessDenied: TestAccessDenied }) {
  const exam = useTranslations('exam');
  // Jumla to'liq holda tarjima qilinadi — ruschada so'z tartibi boshqa,
  // bo'laklardan yig'ib bo'lmaydi.
  const title = accessDenied.testTitle ?? '';
  const price = (accessDenied.price || 0).toLocaleString();
  const lockedMessage =
    accessDenied.accessType === 'premium' ? exam('locked.needPremium', { title })
    : accessDenied.accessType === 'teacher' ? exam('locked.needTeacher', { title })
    : accessDenied.accessType === 'premium_teacher' ? exam('locked.needPremiumTeacher', { title })
    : accessDenied.accessType === 'subscription' ? exam('locked.needSubscription', { title })
    : accessDenied.accessType === 'paid' ? exam('locked.needPaid', { title, price })
    : exam('locked.needGeneric', { title });
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={36} className="text-primary-600" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">{exam('locked.title')}</h2>
      <p className="text-text-secondary mb-6">
        {lockedMessage}
      </p>
      {accessDenied.accessType === 'paid' ? (
        <a
          href={`https://t.me/EduPrimeuzbot?start=buy_test_${testId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          {exam('locked.buy', { price })}
        </a>
      ) : (
        // Link til prefiksini qo'yadi — oddiy <a href="/pricing"> ruscha
        // foydalanuvchini o'zbekcha tariflar sahifasiga otardi.
        <Link href={{ pathname: '/pricing', query: accessDenied.categoryType ? { goal: accessDenied.categoryType } : {} }} className="btn-primary inline-flex items-center gap-2">
          {exam('locked.pricing')}
        </Link>
      )}
    </div>
  );
}
