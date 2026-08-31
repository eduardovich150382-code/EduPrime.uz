import { beforeEach, describe, expect, it, vi } from 'vitest';

const { topicNodeFindManyMock } = vi.hoisted(() => ({
  topicNodeFindManyMock: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    topicNode: { findMany: (...args: unknown[]) => topicNodeFindManyMock(...args) },
  },
}));

import { resolveTopicNodes } from '../topic-bridge';

interface FakeNode {
  id: string;
  path: string;
  nameUz: string;
  slug: string;
  aliases: string[];
}

function wireNodes(nodes: FakeNode[]) {
  topicNodeFindManyMock.mockImplementation(() => Promise.resolve(nodes));
}

describe('resolveTopicNodes', () => {
  beforeEach(() => {
    topicNodeFindManyMock.mockReset();
  });

  it("nameUz bilan aniq (registr/bo'shliqdan mustaqil) moslikni topadi", async () => {
    wireNodes([
      { id: '1', path: 'mexanika/kinematika', nameUz: 'Kinematika', slug: 'kinematika', aliases: [] },
    ]);

    const map = await resolveTopicNodes('subj-1', ['  kinematika  ']);
    expect(map.get('  kinematika  ')).toEqual({ id: '1', path: 'mexanika/kinematika', nameUz: 'Kinematika' });
  });

  it('slug bilan moslikni topadi (nameUz mos kelmasa)', async () => {
    wireNodes([
      { id: '2', path: 'mexanika/dinamika', nameUz: "Nyuton qonunlari", slug: 'dinamika', aliases: [] },
    ]);

    const map = await resolveTopicNodes('subj-1', ['Dinamika']);
    expect(map.get('Dinamika')?.id).toBe('2');
  });

  it('aliases massivi ichidan moslikni topadi', async () => {
    wireNodes([
      {
        id: '3',
        path: 'ozbekiston-tarixi',
        nameUz: "O'zbekiston tarixi",
        slug: 'ozbekiston-tarixi',
        aliases: ['Vatan tarixi', 'Milliy tarix'],
      },
    ]);

    const map = await resolveTopicNodes('subj-1', ['milliy tarix']);
    expect(map.get('milliy tarix')?.id).toBe('3');
  });

  it("o'zbekcha apostrof variantlarini bir xil deb hisoblaydi", async () => {
    wireNodes([
      { id: '4', path: 'ozbekiston-tarixi', nameUz: "O'zbekiston tarixi", slug: 'ozbekiston-tarixi', aliases: [] },
    ]);

    // ', ', ‘, ʻ — hammasi bitta tugunga tushishi kerak.
    const variants = ["O'zbekiston tarixi", 'O’zbekiston tarixi', 'O‘zbekiston tarixi', 'Oʻzbekiston tarixi'];
    const map = await resolveTopicNodes('subj-1', variants);
    for (const v of variants) {
      expect(map.get(v)?.id).toBe('4');
    }
  });

  it('topilmagan mavzuni natija xaritasiga kiritmaydi (taxmin qilmaydi)', async () => {
    wireNodes([
      { id: '5', path: 'mexanika/kinematika', nameUz: 'Kinematika', slug: 'kinematika', aliases: [] },
    ]);

    const map = await resolveTopicNodes('subj-1', ['Elektr toki']);
    expect(map.has('Elektr toki')).toBe(false);
    expect(map.size).toBe(0);
  });

  it("fan uchun TopicNode bo'lmasa DB'ga so'rov bir marta boradi va bo'sh xarita qaytadi", async () => {
    wireNodes([]);
    const map = await resolveTopicNodes('subj-empty', ['Kinematika', 'Dinamika']);
    expect(map.size).toBe(0);
    expect(topicNodeFindManyMock).toHaveBeenCalledTimes(1);
  });

  it('bir nechta xom mavzu uchun ham bitta so‘rov bilan ishlaydi', async () => {
    wireNodes([
      { id: '1', path: 'mexanika/kinematika', nameUz: 'Kinematika', slug: 'kinematika', aliases: [] },
      { id: '2', path: 'mexanika/dinamika', nameUz: 'Dinamika', slug: 'dinamika', aliases: [] },
    ]);

    const map = await resolveTopicNodes('subj-1', ['Kinematika', 'Dinamika', "Noma'lum"]);
    expect(topicNodeFindManyMock).toHaveBeenCalledTimes(1);
    expect(map.size).toBe(2);
  });
});
