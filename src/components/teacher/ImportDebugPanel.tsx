'use client';

import { Download, FileJson } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PageResult } from '@/lib/import/run-import';
import type { SkipReason } from '@/lib/import/pipeline';
import type { BBox } from '@/lib/import/types';

/**
 * Import quvurining diagnostika ko'rinishi (`?debug=1`).
 *
 * NIMA UCHUN KERAK: quvurning sifati ("chizma to'g'ri topildimi?") ni
 * avtomatik test o'lchay olmaydi — buning uchun haqiqiy PDF va inson ko'zi
 * kerak. Bu panel har sahifada nima topilganini aynan chizib beradi va
 * rasm/JSON qilib saqlashga imkon beradi, shuning uchun xatoni "ishlamadi"
 * emas, "12-sahifadagi 3-blokda band topildi, lekin soha SMALL deb
 * tashlandi" darajasida aytish mumkin bo'ladi.
 *
 * Panel hech narsa yubormaydi va kvota sarflamaydi — u faqat
 * `processPage` natijasini ko'rsatadi.
 */

/** Diagnostikada har bir soha turining rangi. */
const COLORS = {
  column: '#2563eb', // ko'k
  block: '#16a34a', // yashil
  band: '#eab308', // sariq
  figure: '#dc2626', // qizil
  skipped: '#9ca3af', // kulrang
} as const;

/** Diagnostika rasmining maksimal eni — 300 DPI aksi ekranga sig'maydi. */
const MAX_DEBUG_WIDTH = 1400;

export interface DebugPage {
  result: PageResult;
  /** Ustiga to'rtburchaklar chizilgan, kichraytirilgan aks. */
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Chizish
// ---------------------------------------------------------------------------

function strokeBox(
  ctx: CanvasRenderingContext2D,
  box: BBox,
  scale: number,
  color: string,
  label?: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x * scale, box.y * scale, box.w * scale, box.h * scale);
  if (!label) return;

  ctx.fillStyle = color;
  ctx.font = '600 13px system-ui, sans-serif';
  // Yozuv to'rtburchakning tepasiga chiqadi; sahifa chetida bo'lsa ichiga.
  const y = box.y * scale - 4;
  ctx.fillText(label, box.x * scale + 2, y > 12 ? y : box.y * scale + 14);
}

/**
 * Sahifa aksi ustiga aniqlangan to'rtburchaklarni chizadi va kichraytirilgan
 * canvas qaytaradi.
 *
 * Kichraytirish shu yerda bajariladi: 40 sahifalik faylning 300 DPI
 * akslarini saqlab qolish telefon xotirasini tugatardi, diagnostika uchun esa
 * 1400 piksel yetarli.
 */
export function drawDiagnostics(source: HTMLCanvasElement, result: PageResult): HTMLCanvasElement {
  const shrink = Math.min(1, MAX_DEBUG_WIDTH / source.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * shrink);
  canvas.height = Math.round(source.height * shrink);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D kontekst olinmadi');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  // Nuqtadan diagnostika pikseliga: sahifa eni bo'yicha.
  const scale = canvas.width / result.pageWidth;

  for (const column of result.columns) strokeBox(ctx, column, scale, COLORS.column);

  for (const report of result.reports) {
    const label = report.questionNumber === null ? `#${report.blockIndex}` : `${report.questionNumber}`;
    strokeBox(ctx, report.bbox, scale, COLORS.block, label);

    for (const analysis of report.analyses) {
      strokeBox(ctx, analysis.band, scale, COLORS.band);
      for (const region of analysis.confirmed) strokeBox(ctx, region.bbox, scale, COLORS.figure);
      for (const skip of analysis.skipped) {
        strokeBox(ctx, skip.bbox, scale, COLORS.skipped, skip.reason);
      }
    }
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Hisobot
// ---------------------------------------------------------------------------

interface BlockSummary {
  blockIndex: number;
  questionNumber: number | null;
  bands: number;
  found: number;
  confirmed: number;
  skipped: number;
  reasons: Partial<Record<SkipReason, number>>;
}

export interface PageSummary {
  page: number;
  pageWidth: number;
  pageHeight: number;
  columns: number;
  blocks: number;
  crops: number;
  blockSummaries: BlockSummary[];
}

/** Sahifa natijasidan matn/JSON hisobot uchun qisqartma. */
export function summarizePage(result: PageResult): PageSummary {
  const blockSummaries = result.reports.map((report) => {
    const reasons: Partial<Record<SkipReason, number>> = {};
    let confirmed = 0;
    let skipped = 0;
    for (const analysis of report.analyses) {
      confirmed += analysis.confirmed.length;
      skipped += analysis.skipped.length;
      for (const s of analysis.skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;
    }
    return {
      blockIndex: report.blockIndex,
      questionNumber: report.questionNumber,
      bands: report.analyses.length,
      found: confirmed + skipped,
      confirmed,
      skipped,
      reasons,
    };
  });

  return {
    page: result.page,
    pageWidth: result.pageWidth,
    pageHeight: result.pageHeight,
    columns: result.columns.length,
    blocks: result.blocks.length,
    crops: result.crops.length,
    blockSummaries,
  };
}

/** Brauzerda faylni yuklab olishga beradi. */
function download(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

function downloadJson(summaries: PageSummary[]): void {
  const blob = new Blob([JSON.stringify(summaries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(url, 'import-diagnostika.json');
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function ImportDebugPanel({ pages }: { pages: DebugPage[] }) {
  const t = useTranslations('teacherImport');
  if (pages.length === 0) return null;

  const summaries = pages.map((p) => summarizePage(p.result));

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{t('debugTitle')}</h2>
          <button
            type="button"
            onClick={() => downloadJson(summaries)}
            className="btn-secondary min-h-11 inline-flex items-center gap-2"
          >
            <FileJson size={18} />
            {t('debugSaveJson')}
          </button>
        </div>
        <p className="text-sm text-text-secondary">{t('debugNote')}</p>
        <p className="text-sm text-text-secondary">{t('debugLegend')}</p>
      </div>

      {pages.map((item, i) => {
        const summary = summaries[i];
        return (
          <div key={item.result.page} className="card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="font-semibold text-text-primary">
                {t('debugPage', { page: item.result.page })}
              </h3>
              <button
                type="button"
                onClick={() => download(item.imageUrl, `sahifa-${item.result.page}.png`)}
                className="btn-secondary min-h-11 inline-flex items-center gap-2"
              >
                <Download size={18} />
                {t('debugSaveImage')}
              </button>
            </div>

            <div className="text-sm text-text-secondary space-y-1">
              <p>{t('debugColumns', { count: summary.columns })}</p>
              <p>{t('debugBlocks', { count: summary.blocks })}</p>
              {summary.blockSummaries.map((b) => (
                <p key={b.blockIndex} className="font-mono text-xs">
                  {t('debugBlockLine', {
                    index: b.blockIndex,
                    number: b.questionNumber ?? '—',
                    found: b.found,
                    confirmed: b.confirmed,
                    skipped: b.skipped,
                  })}
                  {b.skipped > 0 && (
                    <span className="text-text-secondary">
                      {' '}
                      (
                      {Object.entries(b.reasons)
                        .map(([reason, count]) => `${reason}: ${count}`)
                        .join(', ')}
                      )
                    </span>
                  )}
                </p>
              ))}
            </div>

            {/* Diagnostika aksi keng — o'z konteynerida aylanadi, sahifa emas. */}
            <div className="overflow-x-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={t('debugPage', { page: item.result.page })}
                className="max-w-full h-auto border border-border rounded"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
