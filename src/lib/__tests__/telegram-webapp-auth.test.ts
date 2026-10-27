import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebAppInitData, webAppDisplayName, INIT_DATA_MAX_AGE_SEC } from '../telegram-webapp-auth';

const TOKEN = '123456:TEST-bot-token';
const NOW = 1_800_000_000_000;
const NOW_SEC = NOW / 1000;
const USER = { id: 777, first_name: 'Ali', last_name: 'Valiyev', username: 'ali', language_code: 'uz' };

// Telegram qanday imzolasa, aynan shunday imzolaymiz (rasmiy algoritm).
function sign(fields: Record<string, string>, token = TOKEN): string {
  const dataCheckString = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

function baseFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    auth_date: String(NOW_SEC - 60),
    query_id: 'AAE-test',
    user: JSON.stringify(USER),
    signature: 'c2lnbmF0dXJl',
    ...overrides,
  };
}

describe('verifyWebAppInitData', () => {
  it("to'g'ri imzoni qabul qiladi va foydalanuvchini qaytaradi", () => {
    const result = verifyWebAppInitData(sign(baseFields({ start_param: 'tests' })), TOKEN, { now: NOW });
    expect(result?.user.id).toBe(777);
    expect(result?.user.username).toBe('ali');
    expect(result?.startParam).toBe('tests');
  });

  it('boshqa bot tokeni bilan imzolanganini rad etadi', () => {
    expect(verifyWebAppInitData(sign(baseFields(), '999:other'), TOKEN, { now: NOW })).toBeNull();
  });

  it("imzodan keyin o'zgartirilgan foydalanuvchini rad etadi", () => {
    const forged = sign(baseFields()).replace(encodeURIComponent('"id":777'), encodeURIComponent('"id":1'));
    expect(forged).not.toBe(sign(baseFields()));
    expect(verifyWebAppInitData(forged, TOKEN, { now: NOW })).toBeNull();
  });

  it("hash yo'q yoki noto'g'ri formatda bo'lsa rad etadi", () => {
    const params = new URLSearchParams(sign(baseFields()));
    params.delete('hash');
    expect(verifyWebAppInitData(params.toString(), TOKEN, { now: NOW })).toBeNull();
    params.set('hash', 'zz');
    expect(verifyWebAppInitData(params.toString(), TOKEN, { now: NOW })).toBeNull();
  });

  it('eskirgan initData rad etiladi', () => {
    const old = sign(baseFields({ auth_date: String(NOW_SEC - INIT_DATA_MAX_AGE_SEC - 1) }));
    expect(verifyWebAppInitData(old, TOKEN, { now: NOW })).toBeNull();
  });

  it('kelajakdagi auth_date rad etiladi', () => {
    const future = sign(baseFields({ auth_date: String(NOW_SEC + 3600) }));
    expect(verifyWebAppInitData(future, TOKEN, { now: NOW })).toBeNull();
  });

  it("user maydoni yo'q yoki buzuq bo'lsa rad etadi", () => {
    const { user: _user, ...withoutUser } = baseFields();
    void _user;
    expect(verifyWebAppInitData(sign(withoutUser), TOKEN, { now: NOW })).toBeNull();
    expect(verifyWebAppInitData(sign(baseFields({ user: '{bad json' })), TOKEN, { now: NOW })).toBeNull();
    expect(verifyWebAppInitData(sign(baseFields({ user: JSON.stringify({ id: 'x', first_name: 'A' }) })), TOKEN, { now: NOW })).toBeNull();
  });

  it('takrorlangan kalitni rad etadi', () => {
    const duplicated = `${sign(baseFields())}&user=${encodeURIComponent(JSON.stringify({ id: 1, first_name: 'X' }))}`;
    expect(verifyWebAppInitData(duplicated, TOKEN, { now: NOW })).toBeNull();
  });

  it("bo'sh token yoki bo'sh initData bilan ishlamaydi", () => {
    expect(verifyWebAppInitData(sign(baseFields()), '', { now: NOW })).toBeNull();
    expect(verifyWebAppInitData('', TOKEN, { now: NOW })).toBeNull();
  });
});

describe('webAppDisplayName', () => {
  it("to'liq ism, bo'lmasa username", () => {
    expect(webAppDisplayName(USER)).toBe('Ali Valiyev');
    expect(webAppDisplayName({ id: 1, first_name: '', username: 'u' })).toBe('u');
  });
});
