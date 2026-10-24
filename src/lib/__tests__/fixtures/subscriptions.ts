import type { SubscriptionDetails } from '../../subscription-details';

export const subscriptionNow = new Date('2026-10-24T19:30:00Z'); // Toshkentda 25-oktabr 00:30
export const attestationName = { nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation' };
export const physicsName = { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics' };
export function subscriptionFixture(overrides: Partial<SubscriptionDetails> = {}): SubscriptionDetails {
  return { id: 's1', userId: 'u1', plan: 'CATEGORY', productId: 'att', product: attestationName,
    duration: 'CUSTOM', categoryId: 'cat-att', goal: 'ATTESTATION', subjectRule: 'ONE', subjectIds: ['physics'],
    subjects: [physicsName], startDate: new Date('2026-10-01T00:00:00+05:00'),
    endDate: new Date('2026-10-26T00:10:00+05:00'), isActive: true, ...overrides };
}
