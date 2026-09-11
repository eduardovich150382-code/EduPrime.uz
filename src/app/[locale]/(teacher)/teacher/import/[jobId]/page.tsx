'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';

/**
 * Import natijasi — hozircha faqat holat ko'rsatkichi.
 *
 * Savollarni tuzish (AI strukturalash) va ko'rib chiqish ekrani keyingi
 * bosqichlarda qo'shiladi; bu sahifa quvur tugagach foydalanuvchi tushadigan
 * joy bo'lib turadi, aks holda import "hech qayerga" olib borardi.
 */

interface JobStatus {
  status: string;
  pageCount: number;
  blockCount: number;
  pagesDone: number[];
}

export default function ImportJobPage() {
  const t = useTranslations('teacherImport');
  const params = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.jobId) return;
    fetch(`/api/teacher/import/${params.jobId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setJob(data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [params?.jobId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher/import" className="p-2 rounded-lg hover:bg-primary-50">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('jobTitle')}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="card p-4 sm:p-6 space-y-3">
          {job && (
            <>
              <p className="text-text-primary">{t('jobBlocks', { count: job.blockCount })}</p>
              <p className="text-text-secondary">
                {t('jobPages', { done: job.pagesDone.length, total: job.pageCount })}
              </p>
            </>
          )}
          <p className="text-text-secondary">{t('jobPending')}</p>
          <Link href="/teacher/import" className="btn-secondary inline-flex min-h-11 items-center">
            {t('backToImport')}
          </Link>
        </div>
      )}
    </div>
  );
}
