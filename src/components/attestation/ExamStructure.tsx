import { getTranslations } from 'next-intl/server';
import type { SectionKey } from '@/lib/question-sections';
import type { AttestationSettings } from '@/lib/attestation-page';

// Rasmiy spetsifikatsiyadagi savollar soni (S4 banneri matnida ham shu).
// Vaqt va o'tish bali spetsifikatsiyada qat'iy emas — SystemSetting'dan.
const SECTION_QUESTIONS: { key: SectionKey; count: number }[] = [
  { key: 'fizika', count: 35 },
  { key: 'kasb-standarti', count: 5 },
  { key: 'pedagogika', count: 10 },
];

const TOTAL_QUESTIONS = SECTION_QUESTIONS.reduce((sum, s) => sum + s.count, 0);

export async function ExamStructure({ settings }: { settings: AttestationSettings }) {
  const t = await getTranslations('attestation.structure');
  const sectionNames = await getTranslations('questionSections');

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
          {settings.passScore !== null && (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-sm text-text-secondary">{t('passScore')}</dt>
              <dd className="text-sm font-semibold text-text-primary">
                {t('passScoreValue', { count: settings.passScore })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
