import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Ommaviy preview (ijtimoiy tarmoq havolasi): qoralama har kim uchun 404 —
 * kursga ulangan bo'lsa ham. Kurs istisnosi faqat tizimga kirgan yechish
 * oqimi uchun (lib/test-visibility.ts), preview'da ko'ruvchi noma'lum.
 */
const mocks = vi.hoisted(() => ({
  testFindUnique: vi.fn(),
  questionFindMany: vi.fn(),
  courseLessonCount: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    test: { findUnique: (...args: unknown[]) => mocks.testFindUnique(...args) },
    question: { findMany: (...args: unknown[]) => mocks.questionFindMany(...args) },
    courseLesson: { count: (...args: unknown[]) => mocks.courseLessonCount(...args) },
    lessonBlock: { count: () => Promise.resolve(0) },
  },
}));

import { GET } from '../route';

const TEST = {
  id: 'test1', titleUz: 'Kinematika', titleRu: null, titleEn: null, duration: 30, difficulty: 2,
  questionCount: 10, coverImage: null, isFree: true, accessType: 'free', price: 0,
  subject: { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: null },
  teacher: { user: { name: 'Ustoz' } },
};

async function callGet() {
  const res = await GET(new Request('http://localhost/api/tests/test1/preview') as unknown as NextRequest, {
    params: Promise.resolve({ id: 'test1' }),
  });
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.questionFindMany.mockResolvedValue([{ id: 'q1', text: '2+2=?', images: [], options: [], type: 'MULTIPLE_CHOICE' }]);
  mocks.courseLessonCount.mockResolvedValue(1);
});

describe('GET /api/tests/[id]/preview', () => {
  it('nashr etilgan test — 200, isPublished javobda yo\'q', async () => {
    mocks.testFindUnique.mockResolvedValue({ ...TEST, isPublished: true });
    const { status, data } = await callGet();
    expect(status).toBe(200);
    expect(data.test.titleUz).toBe('Kinematika');
    expect(data.test).not.toHaveProperty('isPublished');
  });

  it('qoralama — 404, kursga ulangan bo\'lsa ham; savollar so\'ralmaydi', async () => {
    mocks.testFindUnique.mockResolvedValue({ ...TEST, isPublished: false });
    const { status, data } = await callGet();
    expect(status).toBe(404);
    expect(data).not.toHaveProperty('test');
    expect(mocks.questionFindMany).not.toHaveBeenCalled();
  });
});
