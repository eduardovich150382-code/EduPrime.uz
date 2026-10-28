import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTIFICATION_POLL_MS, startNotificationPolling, type PollEnv } from '../notification-poll';

// Node muhitida haqiqiy `document` yo'q — faqat polling ishlatadigan qismi.
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

function envFor(doc: ReturnType<typeof fakeDocument>['doc']): PollEnv {
  return {
    document: doc as unknown as PollEnv['document'],
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('startNotificationPolling', () => {
  it('oraliq 5 daqiqa: darhol bir marta, 30 soniyada yangi so‘rov yo‘q', () => {
    const { doc } = fakeDocument();
    const fetchCount = vi.fn();
    startNotificationPolling(fetchCount, envFor(doc));
    expect(NOTIFICATION_POLL_MS).toBe(5 * 60_000);
    expect(fetchCount).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(fetchCount).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(NOTIFICATION_POLL_MS - 30_000);
    expect(fetchCount).toHaveBeenCalledTimes(2);
  });

  it('yashirin tabda so‘rov yubormaydi, qaytganda bir marta yangilaydi', () => {
    const { doc, setVisibility } = fakeDocument();
    const fetchCount = vi.fn();
    startNotificationPolling(fetchCount, envFor(doc));
    setVisibility('hidden');
    expect(fetchCount).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(NOTIFICATION_POLL_MS * 3);
    expect(fetchCount).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    expect(fetchCount).toHaveBeenCalledTimes(2);
  });

  it('yashirin tabda ochilsa boshlang‘ich so‘rov ham yo‘q', () => {
    const { doc } = fakeDocument('hidden');
    const fetchCount = vi.fn();
    startNotificationPolling(fetchCount, envFor(doc));
    expect(fetchCount).not.toHaveBeenCalled();
  });

  it('cleanup interval va tinglovchini olib tashlaydi', () => {
    const { doc, setVisibility, listeners } = fakeDocument();
    const fetchCount = vi.fn();
    const stop = startNotificationPolling(fetchCount, envFor(doc));
    stop();
    expect(listeners.size).toBe(0);

    vi.advanceTimersByTime(NOTIFICATION_POLL_MS * 2);
    setVisibility('visible');
    expect(fetchCount).toHaveBeenCalledTimes(1);
  });
});
