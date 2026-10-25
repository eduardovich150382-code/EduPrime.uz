const MIN_COMPRESSION_BYTES = 64 * 1024;
const MAX_COMPRESSION_PIXELS = 24_000_000;

/**
 * O'lchamni saqlaymiz: formulalardagi kichik indeks va ishoralar yo'qolmasin.
 * Brauzer WebP yozolmasa yoki yangi nusxa kattaroq bo'lsa asl rasm qoladi.
 * SVG va AVIF qayta kodlanmaydi — ularning ixchamligi va tiniqligi saqlanadi.
 */
export async function compactImageBlob(source: Blob, decoded?: ImageBitmap): Promise<Blob> {
  if (source.size < MIN_COMPRESSION_BYTES ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(source.type)) return source;

  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    bitmap = decoded ?? await createImageBitmap(source);
    if (bitmap.width * bitmap.height > MAX_COMPRESSION_PIXELS) return source;
    const target = document.createElement('canvas');
    canvas = target;
    target.width = bitmap.width;
    target.height = bitmap.height;
    const context = target.getContext('2d');
    if (!context) return source;
    context.drawImage(bitmap, 0, 0);
    const encoded = await new Promise<Blob | null>((resolve) =>
      target.toBlob(resolve, 'image/webp', 0.9),
    );
    return encoded?.type === 'image/webp' && encoded.size < source.size ? encoded : source;
  } catch {
    return source;
  } finally {
    if (!decoded) bitmap?.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

export async function compactImageFile(file: File): Promise<File> {
  const blob = await compactImageBlob(file);
  return blob === file ? file : new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {
    type: blob.type, lastModified: file.lastModified,
  });
}
