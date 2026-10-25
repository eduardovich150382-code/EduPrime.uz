import type { AIImportedQuestion } from '@/types';

type Endpoint = 'questionImage' | 'optionImage' | 'solutionImage';
type Uploader = (file: File, endpoint: Endpoint) => Promise<string>;

/**
 * JSON'dagi rasmlar qoralamaga kirishidan oldin media omboriga o'tadi.
 * Qisman xatoda savollar qo'shilmaydi; yuklangan URL'lar keshda qoladi,
 * shuning uchun qayta urinish fayllarni yana yuklamaydi.
 */
export async function uploadInlineImages(
  questions: AIImportedQuestion[],
  upload: Uploader,
  cache = new Map<string, string>(),
): Promise<AIImportedQuestion[]> {
  async function resolve(source: string, endpoint: Endpoint): Promise<string> {
    if (!source.startsWith('data:')) return source;
    const cached = cache.get(source);
    if (cached) return cached;
    const comma = source.indexOf(',');
    const header = source.slice(0, comma);
    if (!/^data:image\/[a-z0-9.+-]+;base64$/i.test(header)) throw new Error('INVALID_INLINE_IMAGE');
    const type = header.slice(5, -7).toLowerCase();
    const binary = atob(source.slice(comma + 1));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const extension = type === 'image/svg+xml' ? 'svg' : type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
    const file = new File([bytes], `import-${cache.size + 1}.${extension}`, { type });
    const url = await upload(file, endpoint);
    if (!/^https?:\/\//.test(url)) throw new Error('IMAGE_UPLOAD_FAILED');
    cache.set(source, url);
    return url;
  }

  const result: AIImportedQuestion[] = [];
  for (const question of questions) {
    const images: string[] = [];
    for (const image of question.images ?? []) images.push(await resolve(image, 'questionImage'));
    const options = [];
    for (const option of question.options) {
      options.push({ ...option, image: option.image ? await resolve(option.image, 'optionImage') : option.image });
    }
    const explanationImages: string[] = [];
    for (const image of question.explanationImages ?? []) explanationImages.push(await resolve(image, 'solutionImage'));
    result.push({ ...question, images, options, explanationImages });
  }
  return result;
}
