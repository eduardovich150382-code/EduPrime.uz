import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TelegramPreview from '../campaigns/TelegramPreview';

const html = (source: string, plain = false) => renderToStaticMarkup(<TelegramPreview html={source} plain={plain} />);

describe('TelegramPreview', () => {
  it('ruxsat etilgan teglar elementga aylanadi, spoiler kulrang', () => {
    const out = html('<b>Qalin</b> <tg-spoiler>sir</tg-spoiler> <a href="https://t.me/x">kanal</a>');
    expect(out).toContain('<strong>Qalin</strong>');
    expect(out).toContain('<span class="rounded bg-gray-300 px-0.5">sir</span>');
    expect(out).toContain('href="https://t.me/x"');
  });

  it('ruxsat etilmagan teg HTML bo‘lib emas, escape qilingan matn bo‘lib chiqadi', () => {
    const out = html('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('javascript: havola — link emas', () => {
    expect(html('<a href="javascript:alert(1)">x</a>')).not.toContain('href=');
  });

  it('plain (alert) — teglarsiz', () => {
    expect(html('<b>Obuna</b> bo‘ling', true)).toContain('Obuna bo‘ling');
  });
});
