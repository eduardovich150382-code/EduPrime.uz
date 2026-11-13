import { describe, expect, it } from 'vitest';
import { parseTelegramHtml, telegramPlainText, telegramVisibleLength, validateTelegramHtml } from '../telegram-html';
import { renderTemplate } from '../campaign/texts';

const messages = (html: string) => validateTelegramHtml(html).map((e) => e.message);

describe('validateTelegramHtml', () => {
  it('ruxsat etilgan teglar o‘tadi', () => {
    const html = [
      '<b>q</b> <strong>q</strong> <i>k</i> <em>k</em> <u>t</u> <ins>t</ins>',
      '<s>u</s> <strike>u</strike> <del>u</del> <code>x = 1</code> <pre>kod</pre>',
      '<blockquote>iqtibos</blockquote> <tg-spoiler>sir</tg-spoiler> <span class="tg-spoiler">sir</span>',
      '<a href="https://t.me/EduPrimeuz">kanal</a> <a href="tg://user?id=1">u</a> <a href="{havola}">havola</a>',
      '<b><i>ichma-ich</i></b> &lt;5 &gt; 3 &amp; &quot; &#128512;',
    ].join('\n');
    expect(validateTelegramHtml(html)).toEqual([]);
  });

  it('<div>, <script> va noma’lum teglar rad etiladi', () => {
    expect(messages('<div>x</div>')[0]).toContain('<div> tegi Telegram');
    expect(messages('<script>alert(1)</script>')[0]).toContain('<script>');
  });

  it('yopilmagan <b>', () => {
    expect(validateTelegramHtml('salom\n<b>qalin')).toEqual([{ line: 2, message: expect.stringContaining('<b> yopilmagan') }]);
  });

  it('noto‘g‘ri tartib <b><i></b></i>', () => {
    const errors = messages('<b><i>x</b></i>');
    expect(errors.some((m) => m.includes("noto'g'ri tartibda"))).toBe(true);
  });

  it('yalang‘och < > & rad etiladi va &lt; kabi yozish so‘raladi', () => {
    expect(messages('5 < 7')[0]).toContain('&lt;');
    expect(messages('7 > 5')[0]).toContain('&gt;');
    expect(messages('Tom & Jerry')[0]).toContain('&amp;');
    expect(messages('&nbsp;')[0]).toContain('&amp;');
  });

  it('a href faqat http(s):// yoki tg://; javascript: rad', () => {
    expect(messages('<a href="javascript:alert(1)">x</a>')[0]).toContain('https://');
    expect(messages('<a href="t.me/x">x</a>')).toHaveLength(1);
    expect(messages('<a>x</a>')[0]).toContain('href');
    expect(messages('<b class="x">x</b>')[0]).toContain('atribut');
    expect(messages('<span>x</span>')[0]).toContain('tg-spoiler');
  });

  it('xato qatori to‘g‘ri hisoblanadi', () => {
    const errors = validateTelegramHtml('1-qator\n2-qator\n3 & 4\n<b>to‘rt\n</i>');
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });

  it('{ism} qiymati validatsiyaga ta’sir qilmaydi — shablon tekshiriladi, qiymat escape bo‘ladi', () => {
    const template = '<b>Salom, {ism}!</b>';
    expect(validateTelegramHtml(template)).toEqual([]);
    const rendered = renderTemplate(template, { ism: '<script>&' });
    expect(validateTelegramHtml(rendered)).toEqual([]);
    expect(telegramPlainText(rendered)).toBe('Salom, <script>&!');
  });
});

describe('belgi hisoblagichi', () => {
  it('teglar sanalmaydi, entity bitta belgi', () => {
    expect(telegramVisibleLength('<b>abc</b> &lt;d&gt;')).toBe('abc <d>'.length);
  });
  it('o‘zgaruvchilar render qilingandan keyin sanaladi', () => {
    const rendered = renderTemplate('<b>{ism}</b>: {ball} ball', { ism: 'Dilnoza', ball: '7' });
    expect(telegramVisibleLength(rendered)).toBe('Dilnoza: 7 ball'.length);
  });
  it('emoji UTF-16 da 2 birlik — ehtiyotkor hisob', () => {
    expect(telegramVisibleLength('🎁')).toBe(2);
  });
});

describe('parseTelegramHtml daraxti', () => {
  it('ruxsat etilmagan teg matn bo‘lib qoladi (oldindan ko‘rishda escape)', () => {
    const { nodes } = parseTelegramHtml('<b>x</b><div>y</div>');
    expect(nodes).toEqual([
      { type: 'element', tag: 'b', children: [{ type: 'text', text: 'x' }] },
      { type: 'text', text: '<div>y</div>' },
    ]);
  });
  it('href entity ochiladi', () => {
    const { nodes } = parseTelegramHtml('<a href="https://x.uz/?a=1&amp;b=2">x</a>');
    expect(nodes[0]).toMatchObject({ tag: 'a', href: 'https://x.uz/?a=1&b=2' });
  });
});

describe('validateTelegramHtml — A4 qo‘shimchalari', () => {
  it('<blockquote expandable> qabul qilinadi, qiymatli atribut rad etiladi', () => {
    expect(validateTelegramHtml('<blockquote expandable>uzun</blockquote>')).toEqual([]);
    const node = parseTelegramHtml('<blockquote expandable>x</blockquote>').nodes[0];
    expect(node).toMatchObject({ type: 'element', tag: 'blockquote', expandable: true });
    expect(messages('<blockquote expandable="1">x</blockquote>')[0]).toContain('expandable');
    expect(messages('<blockquote class="x">x</blockquote>')[0]).toContain("atribut bo'lmaydi");
  });

  it('href’da faqat havola turidagi o‘zgaruvchilar', () => {
    expect(validateTelegramHtml('<a href="{havola}">a</a> <a href="{qatnashish_havolasi}">b</a> <a href="{kurs_havola}">c</a>')).toEqual([]);
    expect(messages('<a href="{ism}">x</a>')[0]).toContain('{ism} havola emas');
  });
});
