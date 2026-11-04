import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADER_REFRESH_MIN_MS, startHeaderRefresh, type RefreshEnv } from '../header-refresh';

// Node muhitida haqiqiy `document` yo'q — faqat yangilash ishlatadigan qismi.
function fakeDocument(initial: DocumentVisibilityState = 'visible') {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: initial,
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
  };
  const setVisibility = (state: DocumentVisibilityState) => {
    doc.visibilityState = state;
    listeners.forEach((fn) => fn());
  };
  return { doc, setVisibility, listeners };
}

const envFor = (doc: ReturnType<typeof fakeDocument>['doc']): RefreshEnv => ({
  document: doc as unknown as RefreshEnv['document'],
  now: () => Date.now(),
});

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T10:00:00Z')); });
afterEach(() => vi.useRealTimers());

describe('startHeaderRefresh', () => {
  it('ochilganda bir marta; doimiy interval yo‘q — 1 soat davomida yangi so‘rov yo‘q', () => {
    const { doc } = fakeDocument();
    const refresh = vi.fn();
    startHeaderRefresh(refresh, envFor(doc));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(60 * 60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('tabga 5 daqiqadan tez qaytilsa so‘rov yo‘q, 5 daqiqadan keyin — bitta', () => {
    const { doc, setVisibility } = fakeDocument();
    const refresh = vi.fn();
    startHeaderRefresh(refresh, envFor(doc));
    expect(HEADER_REFRESH_MIN_MS).toBe(5 * 60_000);

    setVisibility('hidden');
    vi.advanceTimersByTime(HEADER_REFRESH_MIN_MS - 1000);
    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(2);

    // Hisob oxirgi so'rovdan boshlanadi.
    setVisibility('hidden');
    vi.advanceTimersByTime(60_000);
    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('yashirin tabda ochilsa — so‘rov birinchi ko‘ringanda', () => {
    const { doc, setVisibility } = fakeDocument('hidden');
    const refresh = vi.fn();
    startHeaderRefresh(refresh, envFor(doc));
    expect(refresh).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('cleanup tinglovchini olib tashlaydi', () => {
    const { doc, setVisibility, listeners } = fakeDocument();
    const refresh = vi.fn();
    const stop = startHeaderRefresh(refresh, envFor(doc));
    stop();
    expect(listeners.size).toBe(0);

    vi.advanceTimersByTime(HEADER_REFRESH_MIN_MS * 2);
    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
