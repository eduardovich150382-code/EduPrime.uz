// Telegram `parse_mode: HTML` uchun sof tahlilchi: admin yozgan matnni
// saqlashdan OLDIN tekshiradi va oldindan ko'rishni quradi. Telegram xato
// HTML'li xabarni butunlay rad etadi ("can't parse entities") — bot esa
// jimgina hech narsa yubormay qoladi, shuning uchun xato admin panelda,
// qator raqami bilan ko'rinishi kerak. Aksiyaga bog'lanmagan: kanal
// postlari (A4) ham shuni ishlatadi. Yangi kutubxona yo'q — ruxsat ro'yxati
// shu yerda, oldindan ko'rish ham aynan shu daraxtdan chiziladi.

/** Telegram Bot API qo'llaydigan teglar (core.telegram.org/bots/api#html-style). */
export const TELEGRAM_ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre', 'blockquote', 'tg-spoiler', 'span',
] as const;

export type TelegramTag = (typeof TELEGRAM_ALLOWED_TAGS)[number];
export type HtmlIssue = { line: number; message: string };
export type TelegramNode =
  | { type: 'text'; text: string }
  | { type: 'element'; tag: TelegramTag; href?: string; children: TelegramNode[] };

const ALLOWED = new Set<string>(TELEGRAM_ALLOWED_TAGS);
const TAG_RE = /<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:\s+[A-Za-z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*>/y;
const ATTR_RE = /([A-Za-z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const ENTITY_RE = /&(lt|gt|amp|quot|#\d{1,7}|#x[0-9A-Fa-f]{1,6});/y;
const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"' };
// `{havola}` — o'zgaruvchi; qiymati render'da escape qilinadi va URL bo'ladi.
const SAFE_HREF_RE = /^(?:(?:https?|tg):\/\/\S+|\{\w+\})$/i;

function decodeEntity(body: string): string {
  if (body in NAMED) return NAMED[body];
  const code = body.startsWith('#x') || body.startsWith('#X') ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

function decodeText(value: string): string {
  return value.replace(/&(lt|gt|amp|quot|#\d{1,7}|#x[0-9A-Fa-f]{1,6});/g, (_, body: string) => decodeEntity(body));
}

type Frame = { tag: TelegramTag; line: number; node: Extract<TelegramNode, { type: 'element' }> };

function parseAttrs(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const m of raw.matchAll(ATTR_RE)) attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

/**
 * Ochuvchi teg. Atribut xato bo'lsa ham element ochiladi (havolasiz yoki
 * oddiy konteyner) — aks holda uning yopuvchi tegi ikkinchi, chalg'ituvchi
 * "ochuvchi teg yo'q" xatosini berardi.
 */
function openElement(tag: TelegramTag, rawAttrs: string, line: number, errors: HtmlIssue[]): Frame['node'] {
  const attrs = parseAttrs(rawAttrs);
  const node: Frame['node'] = { type: 'element', tag, children: [] };
  if (tag === 'a') {
    const href = decodeText(attrs.get('href') ?? '').trim();
    if (!href) errors.push({ line, message: `<a> tegida href yo'q: <a href="https://...">matn</a> deb yozing` });
    else if (!SAFE_HREF_RE.test(href)) errors.push({ line, message: `Havola faqat https://, http:// yoki tg:// bilan boshlanadi: "${href}"` });
    else node.href = href;
    if ([...attrs.keys()].some((k) => k !== 'href')) errors.push({ line, message: `<a> tegida faqat href atributi bo'ladi` });
    return node;
  }
  if (tag === 'span') {
    if (attrs.get('class') !== 'tg-spoiler' || attrs.size > 1) errors.push({ line, message: `<span> faqat <span class="tg-spoiler"> shaklida bo'ladi` });
    return node;
  }
  if (attrs.size > 0) errors.push({ line, message: `<${tag}> tegida atribut bo'lmaydi` });
  return node;
}

/**
 * Matn → daraxt + xatolar. Daraxt "kechirimli": ruxsat etilmagan yoki xato
 * teg oddiy matn bo'lib qoladi — oldindan ko'rish uni escape qilingan holda
 * ko'rsatadi, hech qachon HTML sifatida emas.
 */
export function parseTelegramHtml(source: string): { nodes: TelegramNode[]; errors: HtmlIssue[] } {
  const errors: HtmlIssue[] = [];
  const root: TelegramNode[] = [];
  const stack: Frame[] = [];
  const children = () => (stack.length ? stack[stack.length - 1].node.children : root);
  const pushText = (text: string) => {
    const list = children();
    const last = list[list.length - 1];
    if (last?.type === 'text') last.text += text;
    else list.push({ type: 'text', text });
  };

  let line = 1;
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '<') {
      TAG_RE.lastIndex = i;
      const m = TAG_RE.exec(source);
      if (!m) {
        errors.push({ line, message: `Yalang'och "<" belgisi: matnda &lt; deb yozing` });
        pushText('<');
        i++;
        continue;
      }
      const [raw, slash, rawName, rawAttrs] = m;
      const name = rawName.toLowerCase();
      const tagLine = line;
      line += raw.split('\n').length - 1;
      i += raw.length;
      if (!ALLOWED.has(name)) {
        errors.push({ line: tagLine, message: `<${name}> tegi Telegram'da yo'q. Ruxsat: ${TELEGRAM_ALLOWED_TAGS.join(', ')}` });
        pushText(raw);
        continue;
      }
      const tag = name as TelegramTag;
      if (slash) {
        if (rawAttrs.trim()) errors.push({ line: tagLine, message: `</${tag}> yopuvchi tegida atribut bo'lmaydi` });
        const at = stack.map((f) => f.tag).lastIndexOf(tag);
        if (at === -1) {
          errors.push({ line: tagLine, message: `</${tag}> uchun ochuvchi <${tag}> yo'q` });
          pushText(raw);
          continue;
        }
        if (at !== stack.length - 1) {
          errors.push({ line: tagLine, message: `</${tag}> noto'g'ri tartibda: avval </${stack[stack.length - 1].tag}> yopilishi kerak` });
        }
        stack.length = at;
        continue;
      }
      const node = openElement(tag, rawAttrs, tagLine, errors);
      children().push(node);
      stack.push({ tag, line: tagLine, node });
      continue;
    }
    if (ch === '&') {
      ENTITY_RE.lastIndex = i;
      const m = ENTITY_RE.exec(source);
      if (m) {
        pushText(decodeEntity(m[1]));
        i += m[0].length;
      } else {
        errors.push({ line, message: `Yalang'och "&" belgisi: matnda &amp; deb yozing` });
        pushText('&');
        i++;
      }
      continue;
    }
    if (ch === '>') {
      errors.push({ line, message: `Yalang'och ">" belgisi: matnda &gt; deb yozing` });
      pushText('>');
      i++;
      continue;
    }
    if (ch === '\n') line++;
    pushText(ch);
    i++;
  }
  for (const frame of stack) errors.push({ line: frame.line, message: `<${frame.tag}> yopilmagan: oxirida </${frame.tag}> qo'ying` });
  errors.sort((a, b) => a.line - b.line);
  return { nodes: root, errors };
}

export function validateTelegramHtml(source: string): HtmlIssue[] {
  return parseTelegramHtml(source).errors;
}

function textOf(nodes: TelegramNode[]): string {
  return nodes.map((n) => (n.type === 'text' ? n.text : textOf(n.children))).join('');
}

/** Teglarsiz, entity'lari ochilgan matn — Telegram chegarani shu matn bo'yicha sanaydi. */
export function telegramPlainText(html: string): string {
  return textOf(parseTelegramHtml(html).nodes);
}

/**
 * Ko'rinadigan uzunlik. UTF-16 birligida (emoji = 2): Telegram
 * chegarasidan oshib ketmaslik uchun ehtiyotkor tomonga sanaladi.
 */
export function telegramVisibleLength(html: string): number {
  return telegramPlainText(html).length;
}
