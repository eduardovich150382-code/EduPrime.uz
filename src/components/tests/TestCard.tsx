'use client';

import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, ListChecks, Lock, RotateCcw, Sparkles } from 'lucide-react';
import type { TestType } from '@prisma/client';
import { Link } from '@/i18n/routing';
import { TEST_GOALS, type TestGoal } from '@/lib/tests-filters';
import { GOAL_STYLES } from '@/lib/goal-styles';
import { primaryButton, secondaryButton } from './button-classes';
import { getCardLinks, getCardState, getLockBadge, isNewTest, type BriefResult } from '@/lib/test-card';

export interface TestItem {
  id: string;
  titleUz: string;
  titleRu?: string | null;
  titleEn?: string | null;
  isFree: boolean;
  accessType?: string;
  price?: number;
  duration: number;
  questionCount: number;
  createdAt?: string;
  category?: { type: TestType } | null;
  hasAccess?: boolean;
}

function isTestGoal(type: TestType | undefined): type is TestGoal {
  return !!type && (TEST_GOALS as readonly string[]).includes(type);
}

export function TestCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-6 w-28 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-5 w-full rounded bg-gray-200" />
        <div className="h-5 w-2/3 rounded bg-gray-200" />
      </div>
      <div className="flex gap-4">
        <div className="h-4 w-20 rounded bg-gray-100" />
        <div className="h-4 w-20 rounded bg-gray-100" />
      </div>
      <div className="h-4 w-32 rounded bg-gray-100" />
      <div className="mt-auto h-11 w-full rounded-xl bg-gray-200" />
    </div>
  );
}

export function TestCard({
  test,
  index,
  result,
}: {
  test: TestItem;
  index: number;
  result?: BriefResult;
}) {
  const t = useTranslations('tests');
  const locale = useLocale();
  const state = getCardState(test, result, test.hasAccess);
  const links = getCardLinks(test.id, state);
  const goal = test.category?.type;
  const solveHref = `/tests/${test.id}/solve`;

  // Qulflangan testda tugma baribir "Boshlash" — qanday kirish kerakligini
  // kichik belgi aytadi. Kirish huquqi bo'lsa state 'start' — belgi ham,
  // qulf ham yo'q.
  const badge = getLockBadge(test, state);
  const lockLabel =
    badge?.kind === 'price'
      ? t('card.lockPrice', { price: badge.price.toLocaleString() })
      : badge?.kind === 'premium'
      ? t('card.lockPremium')
      : badge?.kind === 'teacher'
      ? t('card.lockTeacher')
      : null;

  // `||` ataylab: bo'sh satr ("") ham tarjima yo'q degani.
  const title =
    (locale === 'ru' && test.titleRu) || (locale === 'en' && test.titleEn) || test.titleUz;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      {(isTestGoal(goal) || isNewTest(test.createdAt)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {isTestGoal(goal) && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={GOAL_STYLES[goal]}
            >
              {t(`goals.${goal}`)}
            </span>
          )}
          {isNewTest(test.createdAt) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              <Sparkles size={12} aria-hidden /> {t('card.new')}
            </span>
          )}
        </div>
      )}

      {/* Alohida test sahifasi yo'q — sarlavha to'g'ridan-to'g'ri yechishga
          olib boradi, xuddi eski kartaning o'zi kabi. */}
      <h3 className="text-lg font-bold leading-snug text-text-primary line-clamp-2 wrap-break-word">
        <Link href={solveHref} className="hover:text-primary-700">
          {title}
        </Link>
      </h3>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks size={16} aria-hidden /> {t('card.questions', { count: test.questionCount })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={16} aria-hidden /> {t('card.minutes', { count: test.duration })}
        </span>
      </div>

      {state.kind === 'solved' ? (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full" style={{ background: '#16a34a' }} />
          <p className="text-sm font-medium" style={{ color: '#166534' }}>
            {/* Eski natijalarda maxScore 0 bo'lishi mumkin — "0 / 0" o'rniga foiz. */}
            {state.maxScore > 0
              ? t('card.solvedResult', { score: state.score, max: state.maxScore })
              : t('card.solvedPercent', { percent: Math.round(state.percentage) })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('card.notStarted')}</p>
      )}

      <div className="mt-auto pt-1">
        {state.kind === 'solved' && links.secondary ? (
          <div className="grid grid-cols-2 gap-2">
            <Link href={links.secondary} className={secondaryButton}>
              {t('card.viewResult')}
            </Link>
            <Link href={links.primary} className={primaryButton}>
              <RotateCcw size={16} aria-hidden /> {t('card.retake')}
            </Link>
          </div>
        ) : (
          <Link href={links.primary} className={primaryButton}>
            {state.kind !== 'start' && <Lock size={16} aria-hidden />}
            {t('card.start')}
            {lockLabel && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                {lockLabel}
              </span>
            )}
          </Link>
        )}
      </div>
    </motion.article>
  );
}
