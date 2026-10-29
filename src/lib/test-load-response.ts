import type { TestType } from '@prisma/client';
import type { TestAccessDenied } from '@/components/test/TestLockedNotice';

// Yechish sahifasi testni bitta so'rov bilan oladi (GET /api/tests/[id]).
// Avval oldidan alohida check-access ham chaqirilardi — ikkalasi bir xil
// checkTestAccess qarorini ikki marta hisoblardi. Endi qaror shu javobdan:
// 403 — "Test yopiq" (obuna/sotib olish taklifi), 401 — qayta kirish.

export type TestLoadOutcome =
  | { kind: 'ok' }
  | { kind: 'locked'; accessDenied: TestAccessDenied }
  | { kind: 'login' }
  | { kind: 'missing' };

// Klient sahifasi — Prisma runtime enum'i bundle'ga tushmasin; `satisfies` sxema bilan moslikni tekshiradi.
const TEST_TYPES: readonly string[] = ['DTM', 'SCHOOL', 'ATTESTATION', 'SAT', 'GRE', 'CERTIFICATE', 'PRESIDENT_SCHOOL'] satisfies readonly TestType[];

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
}

export function classifyTestLoad(status: number, body: unknown): TestLoadOutcome {
  if (status === 401) return { kind: 'login' };
  if (status === 403) {
    const accessType = field(body, 'accessType');
    const price = field(body, 'price');
    const testTitle = field(body, 'testTitle');
    const categoryType = field(body, 'categoryType');
    return {
      kind: 'locked',
      accessDenied: {
        accessType: typeof accessType === 'string' ? accessType : '',
        price: typeof price === 'number' ? price : undefined,
        testTitle: typeof testTitle === 'string' ? testTitle : undefined,
        categoryType: typeof categoryType === 'string' && TEST_TYPES.includes(categoryType) ? categoryType as TestType : null,
      },
    };
  }
  return status >= 200 && status < 300 && field(body, 'test') ? { kind: 'ok' } : { kind: 'missing' };
}
