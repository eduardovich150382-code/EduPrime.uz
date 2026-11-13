'use client';

import type { ReactNode } from 'react';
import { parseTelegramHtml, telegramPlainText, type TelegramNode } from '@/lib/telegram-html';

// Telegram pufagiga o'xshash taxminiy ko'rinish. innerHTML yo'q: matn
// validator daraxtidan React elementlarga aylanadi, ruxsat etilmagan teg esa
// daraxtda oddiy matn bo'lib qolgan — escape qilingan holda ko'rinadi.

const SAFE_URL = /^(https?|tg):\/\//i;

function renderNodes(nodes: TelegramNode[], prefix = ''): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}${index}`;
    if (node.type === 'text') return node.text;
    const children = renderNodes(node.children, `${key}.`);
    switch (node.tag) {
      case 'b': case 'strong': return <strong key={key}>{children}</strong>;
      case 'i': case 'em': return <em key={key}>{children}</em>;
      case 'u': case 'ins': return <u key={key}>{children}</u>;
      case 's': case 'strike': case 'del': return <s key={key}>{children}</s>;
      case 'code': return <code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.92em]">{children}</code>;
      case 'pre': return <pre key={key} className="my-1 overflow-x-auto rounded bg-black/5 p-2 font-mono text-[0.92em]">{children}</pre>;
      case 'blockquote':
        // Yig'iladigan iqtibos Telegram'da 3 qatorgacha ko'rinadi — taxminiy ko'rinishda ham shunday.
        return node.expandable
          ? <blockquote key={key} className="my-1 line-clamp-3 border-l-2 border-sky-500 bg-sky-50 py-0.5 pl-2" title="Yig'iladigan iqtibos">{children}</blockquote>
          : <blockquote key={key} className="my-1 border-l-2 border-sky-500 bg-sky-50 py-0.5 pl-2">{children}</blockquote>;
      case 'tg-spoiler': case 'span': return <span key={key} className="rounded bg-gray-300 px-0.5">{children}</span>;
      case 'a':
        return node.href && SAFE_URL.test(node.href)
          ? <a key={key} href={node.href} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline">{children}</a>
          : <span key={key} className="text-sky-600 underline">{children}</span>;
    }
  });
}

type Props = {
  html: string;
  plain?: boolean;
  /** Rasm (caption'li post) — pufak ustida. */
  imageSrc?: string | null;
  /** Inline tugma — pufak ostida. */
  button?: string | null;
};

/** `html` — namunaviy qiymatlar bilan render qilingan matn. `plain` — alert kabi, formatlashsiz. */
export default function TelegramPreview({ html, plain = false, imageSrc = null, button = null }: Props) {
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-[#dfe7ec] p-3">
        <div className="max-w-full overflow-hidden rounded-2xl rounded-bl-sm bg-white text-sm leading-relaxed text-gray-900 shadow-sm">
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- admin proxy rasmi, next/image optimizatori kerak emas
            <img src={imageSrc} alt="Post rasmi" className="block max-h-80 w-full object-cover" />
          )}
          <div className="px-3 py-2 whitespace-pre-wrap wrap-anywhere">
            {html.trim() ? (plain ? telegramPlainText(html) : renderNodes(parseTelegramHtml(html).nodes)) : <span className="text-gray-400">Bo&apos;sh xabar</span>}
          </div>
        </div>
        {button && (
          <div className="mt-1 rounded-xl bg-white/70 px-3 py-2 text-center text-sm font-medium text-sky-700 wrap-break-word">{button}</div>
        )}
      </div>
      <p className="text-xs text-text-secondary">Taxminiy ko&apos;rinish. Aniq ko&apos;rish uchun «O&apos;zimga sinov» bosing.</p>
    </div>
  );
}
