import { describe, expect, it, vi } from 'vitest';
import type { AIImportedQuestion } from '@/types';
import { uploadInlineImages } from '../upload-inline-images';

const uri = (value: string) => `data:image/avif;base64,${btoa(value)}`;
const question = (over: Partial<AIImportedQuestion> = {}): AIImportedQuestion => ({
  text: 'Savol', options: [{ label: 'A', text: '1', image: null }, { label: 'B', text: '2', image: null }],
  correctAnswer: 'B', confidence: 1, ...over,
});

describe('JSON rasmlarini media omboriga o\'tkazish', () => {
  it('uchala maydon uchun haqiqiy fayl yuborib faqat URL qaytaradi', async () => {
    const upload = vi.fn(async (file: File, endpoint: string) => `https://utfs.io/${endpoint}/${file.name}`);
    const original = question({ images: [uri('q')], options: [{ label: 'A', text: '1', image: uri('o') }], explanationImages: [uri('s')] });
    const [result] = await uploadInlineImages([original], upload);
    expect(upload.mock.calls.map((call) => call[1])).toEqual(['questionImage', 'optionImage', 'solutionImage']);
    expect(upload.mock.calls[0][0].type).toBe('image/avif');
    expect(await upload.mock.calls[0][0].text()).toBe('q');
    expect(result.images![0]).toMatch(/^https:\/\//);
    expect(result.options[0].image).toMatch(/^https:\/\//);
    expect(result.explanationImages![0]).toMatch(/^https:\/\//);
    expect(original.images![0]).toBe(uri('q'));
  });

  it('havolalarni qayta yuklamaydi va takroriy rasmni bir marta yuboradi', async () => {
    const upload = vi.fn(async () => 'https://utfs.io/shared.avif');
    const [result] = await uploadInlineImages([question({ images: ['https://example.com/old.avif', uri('same')], explanationImages: [uri('same')] })], upload);
    expect(upload).toHaveBeenCalledOnce();
    expect(result.images![0]).toBe('https://example.com/old.avif');
    expect(result.images![1]).toBe(result.explanationImages![0]);
  });

  it('xatodan keyin qayta urinishda oldin yuklangan fayl takrorlanmaydi', async () => {
    const questions = [question({ images: [uri('one'), uri('two')] })];
    const cache = new Map<string, string>();
    const upload = vi.fn().mockResolvedValueOnce('https://utfs.io/one').mockRejectedValueOnce(new Error('offline'));
    await expect(uploadInlineImages(questions, upload, cache)).rejects.toThrow('offline');
    upload.mockResolvedValue('https://utfs.io/two');
    const [result] = await uploadInlineImages(questions, upload, cache);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(result.images).toEqual(['https://utfs.io/one', 'https://utfs.io/two']);
  });

  it('base64 zaxira javobini qabul qilmaydi', async () => {
    await expect(uploadInlineImages([question({ images: [uri('q')] })], async () => uri('q'))).rejects.toThrow('IMAGE_UPLOAD_FAILED');
  });

  it('savol matni, variantlar, yechim va teglar saqlanadi', async () => {
    const original = question({ explanation: '$F=kq^2/r^2$', tags: ['source-key:B'], images: [uri('q')] });
    const [result] = await uploadInlineImages([original], async () => 'https://utfs.io/q');
    expect({ ...result, images: original.images }).toEqual({ ...original, explanationImages: [] });
  });
});
