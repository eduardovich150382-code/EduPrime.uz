import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import uz from '@/messages/uz.json';

const m = vi.hoisted(() => ({ search: new URLSearchParams() }));
vi.mock('next/navigation', async (original) => ({
  ...await original<typeof import('next/navigation')>(), useSearchParams: () => m.search,
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/components/providers/SessionProvider', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
import LoginForm, { googleCallbackUrl } from '../LoginForm';

const render = () => renderToStaticMarkup(<NextIntlClientProvider locale="uz" messages={uz} timeZone="Asia/Tashkent">
  <LoginForm />
</NextIntlClientProvider>);

beforeEach(() => { m.search = new URLSearchParams(); });

describe('/login formasi', () => {
  it('karta, Telegram havolasi va Google tugmasi', () => {
    const html = render();
    expect(html).toContain('href="https://t.me/EduPrimeuzbot?start=login"');
    expect(html).toContain('Google orqali kirish');
    expect(html).not.toContain('bg-red-50');
  });
  it('?error= xabari chiqadi', () => {
    m.search = new URLSearchParams('error=AccessDenied');
    expect(render()).toContain('Kirish rad etildi');
  });
  it('Google callbackUrl bosilgan paytdagi URL dan, tashqi manzil rad etiladi', () => {
    expect(googleCallbackUrl('?callbackUrl=%2Fattestation')).toBe('/attestation');
    expect(googleCallbackUrl('?callbackUrl=%2Fru%2Fpricing%3Fgoal%3DATTESTATION')).toBe('/ru/pricing?goal=ATTESTATION');
    expect(googleCallbackUrl('?callbackUrl=https%3A%2F%2Fevil.example')).toBe('/dashboard');
    expect(googleCallbackUrl('')).toBe('/dashboard');
  });
});
