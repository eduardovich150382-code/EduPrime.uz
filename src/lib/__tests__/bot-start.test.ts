import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  botStart: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
  user: { updateMany: vi.fn() },
}));
const logger = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@/lib/db', () => ({ db }));
vi.mock('@/lib/logger', () => ({ logger }));

import { attachFirstSource, recordBotStart, startSource } from '../bot-start';

beforeEach(() => { vi.clearAllMocks(); });

describe('startSource', () => {
  it('parametrni manbaga aylantiradi', () => {
    expect(startSource('')).toBe('organic');
    expect(startSource('ad_fizika1')).toBe('ad_fizika1');
    expect(startSource('ref_ali-ab12cd')).toBe('ref');
    expect(startSource('ci_abc')).toBe('checkout');
    expect(startSource('buy_test_1')).toBe('checkout');
    expect(startSource('obuna')).toBe('checkout');
    expect(startSource('login')).toBe('login');
    expect(startSource('ad_BAD!')).toBe('other');
  });
});

describe('recordBotStart', () => {
  it('birinchi /start — isFirst', async () => {
    db.botStart.findFirst.mockResolvedValue(null);
    await recordBotStart(777, 'ad_fizika1');
    expect(db.botStart.create).toHaveBeenCalledWith({ data: { telegramId: BigInt(777), source: 'ad_fizika1', isFirst: true } });
  });
  it('takroriy /start ham yoziladi, isFirst=false', async () => {
    db.botStart.findFirst.mockResolvedValue({ id: 'b1' });
    await recordBotStart(777, '');
    expect(db.botStart.create).toHaveBeenCalledWith({ data: { telegramId: BigInt(777), source: 'organic', isFirst: false } });
  });
  it('baza xatosi tashqariga chiqmaydi', async () => {
    db.botStart.findFirst.mockRejectedValue(new Error('down'));
    await expect(recordBotStart(777, '')).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('attachFirstSource', () => {
  it('eng birinchi BotStart manbasi faqat bo‘sh firstSource ga yoziladi', async () => {
    db.botStart.findFirst.mockResolvedValue({ source: 'ad_fizika1' });
    await attachFirstSource('u1', '777');
    expect(db.botStart.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { telegramId: BigInt(777) }, orderBy: { createdAt: 'asc' } }));
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: 'u1', firstSource: null }, data: { firstSource: 'ad_fizika1' } });
  });
  it('BotStart yo‘q — web', async () => {
    db.botStart.findFirst.mockResolvedValue(null);
    await attachFirstSource('u1', '777');
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: 'u1', firstSource: null }, data: { firstSource: 'web' } });
  });
  it('telegramId yo‘q (Google) — so‘rovsiz web', async () => {
    await attachFirstSource('u2', null);
    expect(db.botStart.findFirst).not.toHaveBeenCalled();
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: 'u2', firstSource: null }, data: { firstSource: 'web' } });
  });
});
