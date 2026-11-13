import { describe, expect, it } from 'vitest';
import { entitiesToHtml, type TelegramEntity } from '../telegram-entities';
import { validateTelegramHtml } from '../telegram-html';

const e = (type: string, offset: number, length: number, extra: Partial<TelegramEntity> = {}): TelegramEntity => ({ type, offset, length, ...extra });

/** Har natija Telegram validatoridan o'tishi shart — aks holda kanal postni rad etadi. */
function html(text: string, entities: TelegramEntity[]): string {
  const out = entitiesToHtml(text, entities);
  expect(validateTelegramHtml(out)).toEqual([]);
  return out;
}

describe('entitiesToHtml', () => {
  it('formatlarni teglarga aylantiradi', () => {
    const text = 'b i u s p c';
    expect(html(text, [e('bold', 0, 1), e('italic', 2, 1), e('underline', 4, 1), e('strikethrough', 6, 1), e('spoiler', 8, 1), e('code', 10, 1)]))
      .toBe('<b>b</b> <i>i</i> <u>u</u> <s>s</s> <tg-spoiler>p</tg-spoiler> <code>c</code>');
  });

  it('ichma-ich entity’lar to‘g‘ri yopiladi', () => {
    // "Qalin kursiv": butun matn qalin, "kursiv" ham kursiv.
    expect(html('Qalin kursiv', [e('bold', 0, 12), e('italic', 6, 6)])).toBe('<b>Qalin <i>kursiv</i></b>');
    // Bir joyda boshlanadi: uzunrog'i tashqarida.
    expect(html('abcd', [e('italic', 0, 2), e('bold', 0, 4)])).toBe('<b><i>ab</i>cd</b>');
  });

  it('kesishgan (ichma-ich bo‘lmagan) entity’lar yopilib qayta ochiladi', () => {
    expect(html('abcdef', [e('bold', 0, 4), e('italic', 2, 4)])).toBe('<b>ab<i>cd</i></b><i>ef</i>');
  });

  it('UTF-16: bold’dan oldin emoji (2 birlik)', () => {
    const text = '🎁 Aksiya';
    expect(html(text, [e('bold', 3, 6)])).toBe('🎁 <b>Aksiya</b>');
  });

  it('text_link: https — havola; javascript: — oddiy matn', () => {
    expect(html('kanal', [e('text_link', 0, 5, { url: 'https://t.me/x?a=1&b=2' })])).toBe('<a href="https://t.me/x?a=1&amp;b=2">kanal</a>');
    expect(html('bos', [e('text_link', 0, 3, { url: 'javascript:alert(1)' })])).toBe('bos');
  });

  it('text_mention → tg://user', () => {
    expect(html('Ali', [e('text_mention', 0, 3, { user: { id: 42 } })])).toBe('<a href="tg://user?id=42">Ali</a>');
  });

  it('custom_emoji — zaxira emoji oddiy matn bo‘lib qoladi', () => {
    expect(html('🔥 issiq', [e('custom_emoji', 0, 2, { custom_emoji_id: '123' }), e('bold', 3, 5)])).toBe('🔥 <b>issiq</b>');
  });

  it('expandable_blockquote va pre (til e’tiborsiz)', () => {
    expect(html('uzun iqtibos', [e('expandable_blockquote', 0, 12)])).toBe('<blockquote expandable>uzun iqtibos</blockquote>');
    expect(html('x = 1', [e('pre', 0, 5, { language: 'python' })])).toBe('<pre>x = 1</pre>');
    expect(html('iqtibos', [e('blockquote', 0, 7)])).toBe('<blockquote>iqtibos</blockquote>');
  });

  it('url, mention, hashtag — escape qilingan oddiy matn', () => {
    const text = '@kanal #aksiya https://t.me/a?x=1&y=2';
    expect(html(text, [e('mention', 0, 6), e('hashtag', 7, 7), e('url', 15, 22)])).toBe('@kanal #aksiya https://t.me/a?x=1&amp;y=2');
  });

  it('& < > escape qilinadi (entity ichida ham)', () => {
    expect(html('5 < 7 & 8 > 3', [e('bold', 0, 5)])).toBe('<b>5 &lt; 7</b> &amp; 8 &gt; 3');
  });

  it('entity’siz va bo‘sh matn', () => {
    expect(html('oddiy {havola}', [])).toBe('oddiy {havola}');
    expect(html('', [])).toBe('');
  });
});
