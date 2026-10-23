import { getTranslations } from 'next-intl/server';
import { LogIn, Target } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { primaryButton } from '@/components/tests/button-classes';
import type { Readiness } from '@/lib/attestation-page';

function Bar({ label, percent, hint }: { label: string; percent: number; hint: string }) {
  return (
    <li className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-text-primary">{label}</span>
        <span className="shrink-0 tabular-nums text-text-primary">{percent}%</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>
    </li>
  );
}

const card = 'min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';

export async function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  const t = await getTranslations('attestation');
  const sectionNames = await getTranslations('questionSections');
  const { weakSpot } = readiness;

  return (
    <aside className="min-w-0 space-y-4">
      <section className={card}>
        <h2 className="text-lg font-bold text-text-primary">{t('readiness.title')}</h2>
        <p className="mt-3 text-sm text-text-secondary">
          {t('readiness.solved', { solved: readiness.solved, total: readiness.total })}
        </p>
        {readiness.averagePercent !== null && (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-text-primary">{readiness.averagePercent}%</span>
            <span className="text-sm text-text-secondary">{t('readiness.average')}</span>
          </p>
        )}

        {readiness.sections && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-text-primary">{t('readiness.sections')}</h3>
            <ul className="mt-3 space-y-3">
              {readiness.sections.map((s) => (
                <Bar
                  key={s.key}
                  label={sectionNames(s.key)}
                  percent={s.percent}
                  hint={t('readiness.answers', { count: s.total })}
                />
              ))}
            </ul>
          </div>
        )}

        {readiness.topics && readiness.topics.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-text-primary">{t('readiness.topics')}</h3>
            <ul className="mt-3 space-y-3">
              {readiness.topics.map((topic) => (
                <Bar
                  key={topic.label}
                  label={topic.label}
                  percent={topic.percent}
                  hint={t('readiness.answers', { count: topic.total })}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {weakSpot && (
        <section className={card}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#92400e]" aria-hidden>
              <Target size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold text-text-primary wrap-break-word">
                {t('weak.title', {
                  name: weakSpot.topicLabel
                    ? `${sectionNames(weakSpot.section)} · ${weakSpot.topicLabel}`
                    : sectionNames(weakSpot.section),
                })}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{t('weak.body', { percent: weakSpot.percent })}</p>
            </div>
          </div>
          <Link href={weakSpot.href} className={`${primaryButton} mt-4`}>
            {t('weak.cta')}
          </Link>
        </section>
      )}
    </aside>
  );
}

export async function GuestPanel({ loginHref }: { loginHref: string }) {
  const t = await getTranslations('attestation.guest');
  return (
    <aside className={card}>
      <h2 className="text-lg font-bold text-text-primary">{t('title')}</h2>
      <p className="mt-2 text-sm text-text-secondary">{t('body')}</p>
      <Link href={loginHref} className={`${primaryButton} mt-4`}>
        <LogIn size={16} aria-hidden /> {t('cta')}
      </Link>
    </aside>
  );
}
