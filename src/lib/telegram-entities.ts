import { escapeHtml } from './html-escape';

// Telegram xabari (matn + entity'lar) → `parse_mode: HTML` matni. Admin postni
// Telegram'ning o'zida yozib botga yuboradi (A4 capture) — emoji, spoiler va
// formatlashni shu yerda yozish eng oson. Natija har doim validateTelegramHtml
// dan o'tadi: teglar faqat ruxsat ro'yxatidan, oddiy matn escape qilingan.
//
// Offset va uzunlik Telegram'da UTF-16 birliklarida — JS satr indekslari ham
// UTF-16, shuning uchun `slice` to'g'ridan-to'g'ri ishlaydi (emoji = 2 birlik).

export type TelegramEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: { id: number };
  language?: string;
  custom_emoji_id?: string;
};

type Span = { start: number; end: number; open: string; close: string; order: number };

const SIMPLE_TAGS: Record<string, string> = {
  bold: 'b', italic: 'i', underline: 'u', strikethrough: 's', spoiler: 'tg-spoiler', code: 'code', pre: 'pre', blockquote: 'blockquote',
};

const LINK_RE = /^(?:https?|tg):\/\/\S+$/i;

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/**
 * Entity → teglar juftligi. `null` — oddiy matn: url, mention, hashtag va
 * h.k. ni Telegram o'zi taniydi; custom_emoji'ning zaxira emojisi matnda
 * turibdi (bot kanalda premium emoji yubora olmaydi); xavfli sxemali havola.
 */
function tagsFor(e: TelegramEntity): { open: string; close: string } | null {
  const simple = SIMPLE_TAGS[e.type];
  if (simple) return { open: `<${simple}>`, close: `</${simple}>` };
  if (e.type === 'expandable_blockquote') return { open: '<blockquote expandable>', close: '</blockquote>' };
  if (e.type === 'text_link' && e.url && LINK_RE.test(e.url.trim())) return { open: `<a href="${escapeAttr(e.url.trim())}">`, close: '</a>' };
  if (e.type === 'text_mention' && e.user && Number.isSafeInteger(e.user.id)) return { open: `<a href="tg://user?id=${e.user.id}">`, close: '</a>' };
  return null;
}

/**
 * Chegaralar bo'yicha yuriladi: har nuqtada shu yerda tugaydiganlar yopiladi,
 * boshlanadiganlar ochiladi. Kesishgan (ichma-ich bo'lmagan) entity'lar
 * yopilish nuqtasida yopilib, qayta ochiladi — teglar doim to'g'ri tartibda.
 */
export function entitiesToHtml(text: string, entities: TelegramEntity[] = []): string {
  const spans: Span[] = [];
  entities.forEach((e, order) => {
    const start = Math.max(0, e.offset);
    const end = Math.min(text.length, e.offset + e.length);
    const tags = end > start ? tagsFor(e) : null;
    if (tags) spans.push({ start, end, ...tags, order });
  });

  const boundaries = [...new Set([0, text.length, ...spans.flatMap((s) => [s.start, s.end])])].sort((a, b) => a - b);
  const stack: Span[] = [];
  let out = '';
  let prev = 0;
  for (const pos of boundaries) {
    out += escapeHtml(text.slice(prev, pos));
    prev = pos;

    const firstEnding = stack.findIndex((s) => s.end === pos);
    if (firstEnding !== -1) {
      const closed = stack.splice(firstEnding);
      for (let i = closed.length - 1; i >= 0; i--) out += closed[i].close;
      for (const s of closed) {
        if (s.end === pos) continue;
        out += s.open;
        stack.push(s);
      }
    }

    // Uzunrog'i tashqarida: u keyinroq yopiladi.
    const starting = spans.filter((s) => s.start === pos).sort((a, b) => b.end - a.end || a.order - b.order);
    for (const s of starting) {
      out += s.open;
      stack.push(s);
    }
  }
  return out;
}
