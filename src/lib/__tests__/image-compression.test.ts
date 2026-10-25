import { afterEach, describe, expect, it, vi } from 'vitest';
import { compactImageFile } from '../image-compression';
import { normalizeImageFile } from '../image-formats';

afterEach(() => vi.unstubAllGlobals());

function mockCanvas(output: Blob | null, width = 1536, height = 1024) {
  const close = vi.fn();
  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback) => callback(output));
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
  vi.stubGlobal('document', { createElement: () => canvas });
  return { close, drawImage, toBlob, canvas };
}

describe('ixcham rasm yuklash', () => {
  it('PNG dan kichik WebP qaytaradi va indekslar uchun piksel o\'lchamini saqlaydi', async () => {
    const mocks = mockCanvas(new Blob(['small'], { type: 'image/webp' }));
    const file = new File([new Uint8Array(100_000)], 'figure.png', { type: 'image/png' });
    const result = await compactImageFile(file);
    expect(result.name).toBe('figure.webp');
    expect(result.type).toBe('image/webp');
    expect(result.size).toBe(5);
    expect(mocks.drawImage).toHaveBeenCalledWith(expect.objectContaining({ width: 1536, height: 1024 }), 0, 0);
    expect(mocks.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.canvas.width).toBe(0);
  });

  it.each(['image/png', 'image/webp'])('brauzer WebP yozolmasa asl %s ni saqlaydi', async (type) => {
    mockCanvas(new Blob(['fallback'], { type: 'image/png' }));
    const file = new File([new Uint8Array(100_000)], 'original', { type });
    expect(await compactImageFile(file)).toBe(file);
  });

  it('kattaroq nusxa bilan asl faylni almashtirmaydi', async () => {
    mockCanvas(new Blob([new Uint8Array(110_000)], { type: 'image/webp' }));
    const file = new File([new Uint8Array(100_000)], 'figure.jpg', { type: 'image/jpeg' });
    expect(await compactImageFile(file)).toBe(file);
  });

  it.each(['image/avif', 'image/svg+xml', 'image/gif'])('%s ni qayta kodlamaydi', async (type) => {
    const bitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', bitmap);
    const file = new File([new Uint8Array(100_000)], 'original', { type });
    expect(await compactImageFile(file)).toBe(file);
    expect(bitmap).not.toHaveBeenCalled();
  });

  it('kichik rasmni qayta siqmaydi', async () => {
    const file = new File(['small'], 'figure.webp', { type: 'image/webp' });
    expect(await compactImageFile(file)).toBe(file);
  });

  it('dekoder xatosida asl faylga qaytadi', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));
    const file = new File([new Uint8Array(100_000)], 'figure.jpg', { type: 'image/jpeg' });
    expect(await compactImageFile(file)).toBe(file);
  });

  it.each([
    ['figure.WEBP', 'image/webp'], ['figure.avif', 'image/avif'], ['figure.svg', 'image/svg+xml'],
  ])('Windows MIME bermagan %s faylini aniqlaydi', (name, type) => {
    const original = new File(['bytes'], name);
    const normalized = normalizeImageFile(original);
    expect(normalized.type).toBe(type);
    expect(normalized.size).toBe(original.size);
  });
});
