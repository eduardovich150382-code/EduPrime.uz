'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface Props {
  fileUrl: string;
  title: string;
}

/**
 * PDF'ni sahifa ichida ko'rsatadi — Android'da `target="_blank"` ko'pincha
 * yuklab olish yoki boshqa ilovaga o'tish bilan tugab, foydalanuvchi kursga
 * qaytmay qoladi. Ko'ruvchi (iframe) ishlamasa `failed` holatiga o'tib eski
 * "havolada ochish" xatti-harakatiga qaytadi; "Yuklab olish" har doim mavjud.
 */
export default function PdfViewer({ fileUrl, title }: Props) {
  const t = useTranslations('courseLearn');
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm">
        <FileText size={16} /> {t('pdfOpenExternally')}
      </a>
    );
  }

  return (
    <div className="space-y-2">
      <div className="w-full rounded-xl border border-border overflow-hidden bg-gray-50" style={{ height: '70vh', maxHeight: 640 }}>
        <iframe src={fileUrl} title={title} className="w-full h-full" onError={() => setFailed(true)} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary-600 hover:underline min-h-[44px]">
          <ExternalLink size={16} /> {t('pdfOpenExternally')}
        </a>
        <a href={fileUrl} download className="inline-flex items-center gap-1.5 text-primary-600 hover:underline min-h-[44px]">
          <Download size={16} /> {t('pdfDownload')}
        </a>
      </div>
    </div>
  );
}
