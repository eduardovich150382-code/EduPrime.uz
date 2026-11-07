import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PING_INTERVAL_MS, startActivityPing } from '../activity-ping';

// Minimal Document o'rnini bosuvchi — vitest muhiti `node`.
function fakeDocument(initial: DocumentVisibilityState) {
  const target = new EventTarget();
  const doc = { visibilityState: initial, addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target) };
  const setVisibility = (state: DocumentVisibilityState) => { doc.visibilityState = state; target.dispatchEvent(new Event('visibilitychange')); };
  return { doc: doc as unknown as Document, setVisibility };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('startActivityPing', () => {
  it('ochilganda darhol bitta ping, keyin har 2 daqiqada', () => {
    const ping = vi.fn();
    const { doc } = fakeDocument('visible');
    const stop = startActivityPing(doc, ping);
    expect(ping).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PING_INTERVAL_MS * 3);
    expect(ping).toHaveBeenCalledTimes(4);
    stop();
    vi.advanceTimersByTime(PING_INTERVAL_MS * 3);
    expect(ping).toHaveBeenCalledTimes(4);
  });

  it('yashirin tabda to‘xtaydi, ko‘ringanda darhol ping va davom etadi', () => {
    const ping = vi.fn();
    const { doc, setVisibility } = fakeDocument('visible');
    startActivityPing(doc, ping);
    setVisibility('hidden');
    vi.advanceTimersByTime(PING_INTERVAL_MS * 5);
    expect(ping).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    expect(ping).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(PING_INTERVAL_MS);
    expect(ping).toHaveBeenCalledTimes(3);
  });

  it('yashirin holatda ochilgan tab ping yubormaydi', () => {
    const ping = vi.fn();
    const { doc } = fakeDocument('hidden');
    startActivityPing(doc, ping);
    vi.advanceTimersByTime(PING_INTERVAL_MS * 2);
    expect(ping).not.toHaveBeenCalled();
  });
});
