'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Megaphone, Loader2, AlertCircle } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import type { AdReportWindow, AdSourceRow } from '@/lib/ad-source-report';

interface Report {
  adTest: { id: string; title: string } | null;
  windows: Record<AdReportWindow, AdSourceRow[]>;
}

const WINDOWS: AdReportWindow[] = [7, 30];
const COLUMNS = ['firstStarts', 'signedIn', 'adTestStarted', 'adTestFinished', 'paid'] as const;

export default function AdminAdSourcesPage() {
  const t = useTranslations('adminAdSources');
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState<AdReportWindow>(7);

  useEffect(() => {
    fetch('/api/admin/ad-sources')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Report) => setReport(data))
      .catch(() => setFailed(true));
  }, []);

  const rows = report?.windows[days] ?? [];

  return (
    <div className="space-y-4">
      <BackButton className="mb-2" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Megaphone size={24} className="text-primary-600" aria-hidden /> {t('title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t('description')}</p>
        <p className="mt-1 text-xs text-text-secondary">
          {report?.adTest ? t('adTest', { title: report.adTest.title }) : report ? t('adTestMissing') : null}
        </p>
      </div>

      <div className="flex gap-2" role="tablist">
        {WINDOWS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={days === value} onClick={() => setDays(value)}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${days === value ? 'bg-primary-600 text-white' : 'border border-gray-200 text-text-secondary hover:bg-gray-50'}`}>
            {t('window', { days: value })}
          </button>
        ))}
      </div>

      {failed ? (
        <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} aria-hidden /> {t('error')}</p>
      ) : !report ? (
        <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
      ) : rows.length === 0 ? (
        <p className="card p-4 text-sm text-text-secondary">{t('empty')}</p>
      ) : (
        // Telefonda jadval o'z konteynerida suriladi, sahifa gorizontal aylanmaydi.
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-text-secondary">
                <th className="px-3 py-2 font-medium">{t('columns.source')}</th>
                {COLUMNS.map((column) => <th key={column} className="px-3 py-2 text-right font-medium">{t(`columns.${column}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary">{row.source}</td>
                  {COLUMNS.map((column) => <td key={column} className="px-3 py-2 text-right tabular-nums">{row[column]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-secondary">{t('footnote')}</p>
    </div>
  );
}
