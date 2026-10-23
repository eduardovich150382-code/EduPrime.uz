export type TestAccessChoice = 'free' | 'subscription' | 'paid';

// Eski qiymat bazada saqlanadi; bu moslash faqat ko'rinish va qo'lda saqlash uchun.
export function normalizeTestAccess(value: string): TestAccessChoice {
  return value === 'free' || value === 'paid' ? value : 'subscription';
}
