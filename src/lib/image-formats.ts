export const IMPORT_IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml',
];

const IMAGE_EXTENSIONS: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
};

/** Windows ayrim ixcham formatlarning MIME turini bo'sh yuboradi. */
export function normalizeImageFile(file: File): File {
  if (file.type && file.type !== 'application/octet-stream') return file;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = IMAGE_EXTENSIONS[extension];
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}
