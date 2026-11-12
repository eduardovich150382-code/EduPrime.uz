import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_TEXT_KEYS, CAMPAIGN_VARIABLES, DEFAULT_CAMPAIGN_TEXTS, campaignText, plainText, renderTemplate, renderUrl, unknownVariables,
} from '../texts';

describe('renderTemplate', () => {
  it('qiymatlar escape qilinadi, shablon HTML’i saqlanadi', () => {
    const out = renderTemplate('<b>Salom, {ism}!</b>', { ism: '<b>Ali</b> & co' });
    expect(out).toBe('<b>Salom, &lt;b&gt;Ali&lt;/b&gt; &amp; co!</b>');
    expect(out).not.toContain('<b>Ali');
  });
  it('null qiymatli o‘zgaruvchi turgan butun qator o‘chadi, bo‘sh qatorlar qisqaradi', () => {
    const out = renderTemplate(DEFAULT_CAMPAIGN_TEXTS.my_result, {
      ball: '3', orin: '7', foiz: null, keyingi_pogona: null, qolgan: null, havola: 'https://t.me/x', tugash_vaqti: '26-noyabr, 23:59',
    });
    expect(out).not.toContain('chegirma');
    expect(out).not.toContain('{');
    expect(out).not.toMatch(/\n{3,}/);
    expect(out).toContain('Ball: <b>3</b>');
  });
  it('qator o‘chgach ikki paragraf orasida bitta bo‘sh qator qoladi', () => {
    expect(renderTemplate('A\n\n{x}\n\nB', { x: null })).toBe('A\n\nB');
  });
  it('noma’lum {x} va berilmagan o‘zgaruvchi o‘zgarmaydi', () => {
    expect(renderTemplate('{nomalum} {ism}', { ism: 'Ali' })).toBe('{nomalum} Ali');
  });
});

describe('campaignText', () => {
  it('admin matni standartdan ustun', () => {
    expect(campaignText({ texts: { rules: 'Mening qoidalarim' } }, 'rules')).toBe('Mening qoidalarim');
  });
  it.each([{}, { rules: '' }, { rules: '   ' }, { rules: 5 }, null, [], 'x'])('bo‘sh yoki noto‘g‘ri (%j) → standart', (texts) => {
    expect(campaignText({ texts }, 'rules')).toBe(DEFAULT_CAMPAIGN_TEXTS.rules);
  });
  it('har kalitning standarti bor va unda noma’lum o‘zgaruvchi yo‘q', () => {
    for (const key of CAMPAIGN_TEXT_KEYS) {
      expect(DEFAULT_CAMPAIGN_TEXTS[key].length).toBeGreaterThan(0);
      expect(unknownVariables(DEFAULT_CAMPAIGN_TEXTS[key])).toEqual([]);
    }
  });
});

describe('unknownVariables', () => {
  it('ro‘yxatda yo‘q o‘zgaruvchilar, takrorsiz', () => {
    expect(unknownVariables('{ism} {name} {name} {havola} {balll}')).toEqual(['name', 'balll']);
    expect(CAMPAIGN_VARIABLES).toContain('top10');
  });
});

describe('renderUrl va plainText', () => {
  it('URL — escape’siz', () => {
    expect(renderUrl('{havola}', { havola: 'https://t.me/b?start=c_A&x=1' })).toBe('https://t.me/b?start=c_A&x=1');
  });
  it('alert uchun teglar olib tashlanadi va 200 belgidan oshmaydi', () => {
    expect(plainText('❗ <b>{kanal}</b> &amp; x')).toBe('❗ {kanal} & x');
    expect(Array.from(plainText('😀'.repeat(300))).length).toBe(200);
  });
});
