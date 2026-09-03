'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

interface Props {
  fileUrl: string;
  title: string;
}

// `pdfjs-dist` og'ir kutubxona — u va uni ishlatuvchi haqiqiy ko'ruvchi
// (`PdfCanvasViewer`) faqat foydalanuvchi haqiqatan PDF darsini ochganda
// yuklansin deb `next/dynamic({ ssr: false })` orqali alohida chunk qilib
// ajratilgan; kurs sahifasining boshlang'ich JS bandliga qo'shilmaydi.
const PdfCanvasViewer = dynamic(() => import('./PdfCanvasViewer'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl border border-border bg-gray-50 flex items-center justify-center"
      style={{ height: '70vh', maxHeight: 640 }}
    >
      <Loader2 size={28} className="animate-spin text-primary-600" />
    </div>
  ),
});

/**
 * PDF'ni sahifa ichida ko'rsatadi — Android Chrome'da `<iframe>` orqali PDF
 * render qilinmaydi (fayl yuklab olishga uzatiladi yoki bo'sh kadr chiqadi),
 * shu sababli pdf.js bilan canvas'ga chiziladi (`PdfCanvasViewer`).
 */
export default function PdfViewer({ fileUrl, title }: Props) {
  return <PdfCanvasViewer fileUrl={fileUrl} title={title} />;
}
