'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Maximize, Minimize, ExternalLink, AlertCircle } from 'lucide-react';

interface Props {
  url: string;
  title: string;
}

/**
 * EMBED dars bloki — tashqi interaktiv simulyatsiya (GeoGebra/Desmos)
 * iframe ichida. Domen ruxsati SAQLASH paytida (server, PUT
 * /api/teacher/courses/[id]/curriculum) allaqachon tekshirilgan — bu
 * komponent uni qayta tekshirmaydi, faqat ko'rsatadi.
 *
 * Xavfsizlik: `sandbox`da `allow-top-navigation` YO'Q — aks holda embed
 * qilingan sahifa butun o'quv sahifasini boshqa saytga olib ketishi mumkin
 * edi. `allow-popups` — ba'zi simulyatsiyalar yordam/havola uchun yangi
 * tab ochadi, shu SANDBOX ichida ruxsat berilgan bo'lsa xavfsiz (yangi tab
 * `noopener` bilan ochiladi, ota oynaga ta'sir qilolmaydi).
 */
export default function EmbedBlock({ url, title }: Props) {
  const t = useTranslations('courseLearn');
  const [failed, setFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen API ba'zi brauzerlarda (masalan iOS Safari) qo'llab-quvvatlanmasligi
      // mumkin — jimgina e'tiborsiz qoldiriladi, iframe oddiy hajmda ko'rinishda qoladi.
    }
  };

  if (failed) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
        <AlertCircle size={20} className="mx-auto text-amber-500" />
        <p className="text-sm text-amber-700">{t('embedFailed')}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
        >
          <ExternalLink size={14} /> {t('embedOpenExternal')}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border border-border bg-black ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'
      }`}
    >
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
        title={isFullscreen ? t('embedExitFullscreen') : t('embedFullscreen')}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
    </div>
  );
}
