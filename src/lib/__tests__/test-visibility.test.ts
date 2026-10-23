import { describe, expect, it } from 'vitest';
import { canViewTest, needsCourseLinkCheck } from '@/lib/test-visibility';

const DRAFT = { isPublished: false, ownerUserIds: ['teacher-user', 'gen-owner'] };
const PUBLISHED = { isPublished: true, ownerUserIds: ['teacher-user'] };

describe('canViewTest', () => {
  it('nashr etilgan test — hamma uchun, mehmon ham', () => {
    expect(canViewTest(PUBLISHED, {}, false)).toBe(true);
    expect(canViewTest(PUBLISHED, { userId: 'u1', role: 'USER' }, false)).toBe(true);
  });

  it('qoralama: mehmon va begona foydalanuvchiga yopiq', () => {
    expect(canViewTest(DRAFT, {}, false)).toBe(false);
    expect(canViewTest(DRAFT, { userId: 'u1', role: 'USER' }, false)).toBe(false);
    expect(canViewTest(DRAFT, { userId: 'u1', role: 'TEACHER' }, false)).toBe(false);
  });

  it('qoralama: ustoz-ega, Test.userId egasi va ADMIN ko\'radi', () => {
    expect(canViewTest(DRAFT, { userId: 'teacher-user', role: 'TEACHER' }, false)).toBe(true);
    expect(canViewTest(DRAFT, { userId: 'gen-owner', role: 'USER' }, false)).toBe(true);
    expect(canViewTest(DRAFT, { userId: 'admin1', role: 'ADMIN' }, false)).toBe(true);
  });

  it('qoralama nashr etilgan kursga ulangan — ochiq, mehmonga ham', () => {
    expect(canViewTest(DRAFT, { userId: 'u1', role: 'USER' }, true)).toBe(true);
    expect(canViewTest(DRAFT, {}, true)).toBe(true);
  });

  it("egasiz qoralamada null ega mehmonni 'ega' qilib qo'ymaydi", () => {
    const orphan = { isPublished: false, ownerUserIds: [null, undefined] };
    expect(canViewTest(orphan, {}, false)).toBe(false);
    expect(canViewTest(orphan, { userId: null }, false)).toBe(false);
  });
});

describe('needsCourseLinkCheck', () => {
  it("faqat qaror kurs bog'lanishiga bog'liq bo'lganda so'rov kerak", () => {
    expect(needsCourseLinkCheck(PUBLISHED, {})).toBe(false);
    expect(needsCourseLinkCheck(DRAFT, { userId: 'admin1', role: 'ADMIN' })).toBe(false);
    expect(needsCourseLinkCheck(DRAFT, { userId: 'teacher-user' })).toBe(false);
    expect(needsCourseLinkCheck(DRAFT, { userId: 'u1', role: 'USER' })).toBe(true);
    expect(needsCourseLinkCheck(DRAFT, {})).toBe(true);
  });
});
