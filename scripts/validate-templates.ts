/**
 * Har bir paramgen shabloni (`src/lib/paramgen/templates.json`) uchun 50 ta
 * variant chiqarib, bazaga seed qilinishidan OLDIN qat'iy tekshiruvlardan
 * o'tkazadi. Tekshiruvlarning o'zi `validate-templates-lib.ts`da — bu fayl
 * faqat CLI qobig'i: faylni o'qiydi, natijani konsolga chiqaradi, xato
 * bo'lsa exit code 1 bilan chiqadi.
 *
 * Offline ishlaydi — bazaga ulanmaydi, faqat `templates.json`ni o'qiydi.
 *
 * Ishlatish:
 *   npm run validate:templates
 *   npx tsx scripts/validate-templates.ts [templates.json'ga muqobil yo'l]
 * (ikkinchi argument — faqat testlash uchun, `templates.json`ning o'rniga
 * boshqa faylni tekshirish imkonini beradi)
 */
import fs from "fs";
import path from "path";
import type { Template } from "../src/lib/paramgen/paramgen";
import { validateAllTemplates, VARIANTS_PER_TEMPLATE } from "./validate-templates-lib";

const DEFAULT_TEMPLATES_PATH = path.join(__dirname, "..", "src", "lib", "paramgen", "templates.json");

function main(): void {
  const templatesPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_TEMPLATES_PATH;
  const templates: Template[] = JSON.parse(fs.readFileSync(templatesPath, "utf8"));

  console.log(`${templates.length} ta shablon tekshirilmoqda (har biridan ${VARIANTS_PER_TEMPLATE} tadan variant)...\n`);

  const issues = validateAllTemplates(templates);

  if (issues.length === 0) {
    console.log(`✅ Hammasi toza — ${templates.length} ta shablon, xato topilmadi.`);
    return;
  }

  console.error(`❌ ${issues.length} ta xato topildi:\n`);
  for (const issue of issues) {
    const where = issue.variantIndex !== undefined ? ` (variant #${issue.variantIndex}, ${issue.variantId})` : "";
    console.error(`  [${issue.templateId}] ${issue.check}${where}\n      ${issue.message}`);
  }
  console.error(`\nJami: ${issues.length} ta xato, ${new Set(issues.map((i) => i.templateId)).size} ta shablonda.`);
  process.exitCode = 1;
}

// Faqat to'g'ridan-to'g'ri `npm run validate:templates` orqali chaqirilganda
// ishga tushadi — tekshiruv mantig'ining o'zi `validate-templates-lib.ts`da,
// uni test fayli yon ta'sirsiz import qila oladi.
if (require.main === module) {
  main();
}
