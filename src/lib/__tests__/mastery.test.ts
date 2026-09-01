import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSessionFromSpecMock, resolveTopicNodesMock } = vi.hoisted(() => ({
  createSessionFromSpecMock: vi.fn(),
  resolveTopicNodesMock: vi.fn(),
}));

vi.mock('../sessions', () => ({
  createSessionFromSpec: (...args: unknown[]) => createSessionFromSpecMock(...args),
}));

vi.mock('../topic-bridge', () => ({
  resolveTopicNodes: (...args: unknown[]) => resolveTopicNodesMock(...args),
}));

import { generatePracticeSession } from '../mastery';

function fakeSession(id: string, questionCount: number) {
  return { ok: true as const, session: { id, title: `Shaxsiy mashq: X`, questionCount }, relaxed: [] };
}

const NOT_FOUND = { ok: false as const, error: { status: 404 as const, error: "Berilgan filtrga mos savol topilmadi" } };

describe('generatePracticeSession', () => {
  beforeEach(() => {
    createSessionFromSpecMock.mockReset();
    resolveTopicNodesMock.mockReset();
  });

  it('birinchi urinishda excludeAnsweredCorrectlyDays: 30 bilan spec yuboradi', async () => {
    resolveTopicNodesMock.mockResolvedValue(
      new Map([['Kinematika', { id: 't1', path: 'mexanika/kinematika', nameUz: 'Kinematika' }]])
    );
    createSessionFromSpecMock.mockResolvedValueOnce(fakeSession('s1', 10));

    const result = await generatePracticeSession({ userId: 'u1', topic: 'Kinematika', subjectId: 'subj-1' });

    expect(result).toEqual({ id: 's1', title: 'Shaxsiy mashq: X', questionCount: 10 });
    expect(createSessionFromSpecMock).toHaveBeenCalledTimes(1);
    const callArg = createSessionFromSpecMock.mock.calls[0][0];
    expect(callArg.spec).toEqual({
      subjectIds: ['subj-1'],
      topicPaths: ['mexanika/kinematika'],
      excludeAnsweredCorrectlyDays: 30,
    });
    expect(callArg.countsAgainstQuota).toBe(false);
  });

  it("havza bo'sh qolsa (404), excludeAnsweredCorrectlyDays'siz qayta urinadi", async () => {
    resolveTopicNodesMock.mockResolvedValue(
      new Map([['Kinematika', { id: 't1', path: 'mexanika/kinematika', nameUz: 'Kinematika' }]])
    );
    createSessionFromSpecMock.mockResolvedValueOnce(NOT_FOUND).mockResolvedValueOnce(fakeSession('s2', 8));

    const result = await generatePracticeSession({ userId: 'u1', topic: 'Kinematika', subjectId: 'subj-1' });

    expect(result).toEqual({ id: 's2', title: 'Shaxsiy mashq: X', questionCount: 8 });
    expect(createSessionFromSpecMock).toHaveBeenCalledTimes(2);
    const secondCallArg = createSessionFromSpecMock.mock.calls[1][0];
    expect(secondCallArg.spec).toEqual({ subjectIds: ['subj-1'], topicPaths: ['mexanika/kinematika'] });
  });

  it("ikkinchi (cheklovsiz) urinish ham havza topolmasa null qaytaradi", async () => {
    resolveTopicNodesMock.mockResolvedValue(new Map());
    createSessionFromSpecMock.mockResolvedValue(NOT_FOUND);

    const result = await generatePracticeSession({ userId: 'u1', topic: "Noma'lum", subjectId: 'subj-1' });

    expect(result).toBeNull();
    expect(createSessionFromSpecMock).toHaveBeenCalledTimes(2);
  });

  it("mavzu tugunga bog'lanmasa, topicPaths'siz (faqat fan bo'yicha) spec yuboradi", async () => {
    resolveTopicNodesMock.mockResolvedValue(new Map());
    createSessionFromSpecMock.mockResolvedValueOnce(fakeSession('s3', 5));

    await generatePracticeSession({ userId: 'u1', topic: "Noma'lum", subjectId: 'subj-1' });

    const callArg = createSessionFromSpecMock.mock.calls[0][0];
    expect(callArg.spec).toEqual({ subjectIds: ['subj-1'], excludeAnsweredCorrectlyDays: 30 });
  });
});
