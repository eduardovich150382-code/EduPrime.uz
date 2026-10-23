'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import { Award, Target } from 'lucide-react';
import ResultRing from '@/components/test/ResultRing';
import { pointsToTier2, tierProgress, type AttestationTier, type TierThresholds } from '@/lib/attestation-tiers';
import { Confetti } from './Confetti';

// Attestatsiya mock'i natijasi: ball + toifa aylanalari va tabrik matni.
// Ma'lumot serverdan tayyor keladi (GET /api/results/[id] → `attestation`);
// mock emas bo'lsa natija sahifasi bu komponentlarni umuman chizmaydi.

export interface AttestationResultInfo {
  ball: number;
  tier: AttestationTier;
  thresholds: TierThresholds;
  questionCount: number;
}

const BALL_RING_MS = 1200; // globals.css `result-progress` davomiyligi

const animKey = (resultId: string) => `att-result-anim:${resultId}`;

/**
 * Animatsiya va konfetti faqat natija birinchi ochilganda. sessionStorage
 * yopiq (Safari private, bloklangan) bo'lsa — statik: takror-takror
 * konfetti otishdan ko'ra ko'rsatmagan ma'qul.
 */
function readFirstOpen(resultId: string): boolean {
  try {
    return window.sessionStorage.getItem(animKey(resultId)) === null;
  } catch {
    return false;
  }
}

export function AttestationRings({ resultId, info }: { resultId: string; info: AttestationResultInfo }) {
  const t = useTranslations('results.attestation');
  const tiers = useTranslations('attestation.tiers');
  const reduceMotion = useReducedMotion();
  const [firstOpen] = useState(() => readFirstOpen(resultId));
  const [confetti, setConfetti] = useState(false);
  const animate = firstOpen && !reduceMotion;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(animKey(resultId), '1');
    } catch {
      // Yozib bo'lmasa readFirstOpen ham false qaytargan — statik qoladi.
    }
  }, [resultId]);

  const { ball, tier, thresholds } = info;
  const tierName = tier === 'topBonus' ? tiers('top') : tiers(tier);
  const onTierRingEnd = useCallback(() => {
    if (tier !== 'none' && !reduceMotion) setConfetti(true);
  }, [tier, reduceMotion]);
  const hideConfetti = useCallback(() => setConfetti(false), []);

  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-6">
      <ResultRing
        progress={ball / 100}
        label={t('scoreAria', { score: ball })}
        className="mx-auto w-full max-w-44 sm:max-w-52"
        centerClassName="max-w-[80%] px-1"
        animate={animate}
      >
        <span className="block text-4xl font-bold tabular-nums tracking-tight text-text-primary sm:text-5xl">{ball}</span>
        <span className="mt-1 block text-xs text-text-secondary sm:text-sm">{t('ball', { score: ball })}</span>
      </ResultRing>
      <ResultRing
        progress={tierProgress(ball, thresholds)}
        label={t('tierAria', { tier: tiers(tier) })}
        className="mx-auto w-full max-w-44 sm:max-w-52"
        trackClassName="stroke-[#fef3c7]"
        // Toifa yo'q — bosib o'tilgan yo'l och sariqda, toifa olinganda to'liq sariq.
        strokeClassName={tier === 'none' ? 'stroke-[#fde68a]' : 'stroke-[#fbbf24]'}
        centerClassName="max-w-[80%] px-1"
        animate={animate}
        delayMs={BALL_RING_MS}
        onAnimationEnd={onTierRingEnd}
      >
        <span
          className={`block text-sm font-bold leading-tight wrap-break-word sm:text-lg ${
            tier === 'none' ? 'text-gray-600' : 'text-[#451a03]'
          }`}
        >
          {tierName}
        </span>
        {tier === 'topBonus' && (
          <span className="mt-1.5 inline-block rounded-full bg-[#2e1065] px-2 py-0.5 text-[11px] font-semibold text-[#fbbf24] sm:text-xs">
            {tiers('bonus')}
          </span>
        )}
      </ResultRing>
      {confetti && <Confetti strong={tier === 'topBonus'} onDone={hideConfetti} />}
    </div>
  );
}

const CONGRATS: Record<Exclude<AttestationTier, 'none'>, string> = {
  tier2: 'congratsTier2',
  tier1: 'congratsTier1',
  top: 'congratsTop',
  topBonus: 'congratsTopBonus',
};

/** Kartadagi umumiy motivatsion matn o'rniga — toifaga mos tabrik yoki dalda. */
export function AttestationMessage({ info }: { info: AttestationResultInfo }) {
  const t = useTranslations('results.attestation');
  const { ball, tier, thresholds, questionCount } = info;

  if (tier !== 'none') {
    return (
      <div
        className={`mt-6 flex items-start gap-3 rounded-xl p-4 ${
          tier === 'topBonus' ? 'bg-[#2e1065] text-white' : 'bg-[#fef3c7] text-[#451a03]'
        }`}
      >
        <Award size={20} className={`mt-0.5 shrink-0 ${tier === 'topBonus' ? 'text-[#fbbf24]' : ''}`} aria-hidden="true" />
        <p className="text-sm font-semibold sm:text-base">{t(CONGRATS[tier])}</p>
      </div>
    );
  }

  const need = pointsToTier2(ball, thresholds, questionCount);
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4 text-primary-800">
      <Target size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold sm:text-base">{t('below', { points: need.points, answers: need.answers })}</p>
        <p className="mt-1 text-sm">{t('belowHint')}</p>
      </div>
    </div>
  );
}
