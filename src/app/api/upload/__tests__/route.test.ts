import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, uploadMock } = vi.hoisted(() => ({ authMock: vi.fn(), uploadMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('uploadthing/server', () => ({ UTApi: class { uploadFiles = uploadMock; } }));

import { POST } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { role: 'TEACHER' } });
  uploadMock.mockResolvedValue({ data: { url: 'https://utfs.io/f/image' }, error: null });
});

describe('savol, variant va yechim ixcham rasmlari', () => {
  it.each(['questionImage', 'optionImage', 'solutionImage'].flatMap((endpoint) =>
    ['webp', 'avif', 'svg'].map((extension) => [endpoint, extension]),
  ))('%s: MIME berilmagan %s ni yuklaydi', async (endpoint, extension) => {
    const form = new FormData();
    form.set('file', new File(['bytes'], `figure.${extension}`));
    const request = new NextRequest(`http://localhost/api/upload?endpoint=${endpoint}`, {
      method: 'POST', body: form,
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(uploadMock.mock.calls[0][0].type).toBe(extension === 'svg' ? 'image/svg+xml' : `image/${extension}`);
  });

  it('ruxsatsiz foydalanuvchi rasm yuklay olmaydi', async () => {
    authMock.mockResolvedValue({ user: { role: 'STUDENT' } });
    const response = await POST(new NextRequest('http://localhost/api/upload', { method: 'POST' }));
    expect(response.status).toBe(403);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
