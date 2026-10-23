import { getTranslations } from 'next-intl/server';
import type { SectionKey } from '@/lib/question-sections';
import type { AttestationSettings } from '@/lib/attestation-page';
import type { TierThresholds } from '@/lib/attestation-tiers';

// Rasmiy spetsifikatsiyadagi savollar soni (S4 banneri matnida ham shu).
// Vaqt va toifa chegaralari SystemSetting'dan (admin paneli).
const SECTION_QUESTIONS: { key: SectionKey; count: number }[] = [
  { key: 'fizika', count: 35 },
  { key: 'kasb-standarti', count: 5 },
  { key: 'pedagogika', count: 10 },
];

const TOTAL_QUESTIONS = SECTION_QUESTIONS.reduce((sum, s) => sum + s.count, 0);

const TIER_ROWS: (keyof TierThresholds)[] = ['tier2', 'tier1', 'top', 'topBonus'];

export async function ExamStructure({ settings }: { settings: AttestationSettings }) {
  const t = await getTranslations('attestation.structure');
  const sectionNames = await getTranslations('questionSections');
  const tiers = await getTranslations('attestation.tiers');

  return (
    <section id="tuzilma" className="scroll-mt-24">
      <h2 className="text-xl font-bold text-text-primary">{t('title')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SECTION_QUESTIONS.map(({ key, count }) => (
          <div key={key} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold tabular-nums text-primary-700">{count}</p>
            <p className="mt-1 text-sm font-medium text-text-primary wrap-break-word">{sectionNames(key)}</p>
            <p className="text-xs text-text-secondary">{t('questions', { count })}</p>
          </div>
        ))}
        <dl className="min-w-0 space-y-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sm text-text-secondary">{t('total')}</dt>
            <dd className="text-sm font-semibold text-text-primary">{t('questions', { count: TOTAL_QUESTIONS })}</dd>
          </div>
          {settings.durationMin !== null && (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-sm text-text-secondary">{t('duration')}</dt>
              <dd className="text-sm font-semibold text-text-primary">
                {t('durationValue', { count: settings.durationMin })}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary">{tiers('title')}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIER_ROWS.map((tier) => (
            <div key={tier} className="min-w-0 rounded-xl bg-[#fef3c7] px-3 py-2.5 text-[#451a03]">
              <dt className="text-sm font-medium wrap-break-word">{tiers(tier)}</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">{tiers('threshold', { min: settings.tiers[tier] })}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
