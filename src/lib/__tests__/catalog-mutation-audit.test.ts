import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Public sahifalar (/attestation, /tests, /pricing) va katalog keshi 1 soat
// yashaydi — mutatsiyadan keyin teg tozalanmasa admin/ustoz o'zgarishi
// shuncha vaqt ko'rinmaydi. Yangi route qo'shilganda shu test eslatadi.
// Xatti-harakat (qaysi teg, rad etilganda tegilmasligi) — catalog-revalidation.test.ts.
const api = path.resolve(__dirname, '../../app/api');

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

// Katalogga kiradigan modellar: test (ro'yxat, sonlar), savol (pricing'dagi
// savol soni), mahsulot/variant (narx), fan/kategoriya (taksonomiya).
const CATALOG_WRITE = /\.(test|question|product|productOffer|subject|testCategory)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/;
const rel = (file: string) => path.relative(api, file).replace(/\\/g, '/');

describe('katalog mutatsiyalari keshni tozalaydi', () => {
  const files = routeFiles(api).filter((file) => CATALOG_WRITE.test(readFileSync(file, 'utf-8')));

  it('ro‘yxat bo‘sh emas (regex ishlayapti)', () => {
    expect(files.map(rel)).toEqual(expect.arrayContaining(['admin/tests/route.ts', 'admin/seed/route.ts', 'admin/products/[id]/route.ts']));
  });

  it.each(files.map((file) => [rel(file), file]))('%s — cache-tags yordamchisi chaqiriladi', (_name, file) => {
    const source = readFileSync(file, 'utf-8');
    expect(source).toMatch(/from '@\/lib\/cache-tags'/);
    expect(source).toMatch(/\brevalidate(TestCatalog|Pricing|Taxonomy)\(\)/);
  });

  it('public sozlamalar: admin/settings revalidateSettings chaqiradi', () => {
    expect(readFileSync(path.join(api, 'admin/settings/route.ts'), 'utf-8')).toMatch(/revalidateSettings\(\)/);
  });
});
