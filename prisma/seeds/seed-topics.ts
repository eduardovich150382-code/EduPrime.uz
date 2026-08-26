/**
 * `prisma/seeds/topics/*.json` larni o'qib, `prisma/seeds/topics.generated.sql`
 * ni yozadi. Bazaga TO'G'RIDAN-TO'G'RI ULANMAYDI — CLAUDE.md: ishlab
 * chiquvchining tarmog'i 5432-portni bloklaydi, lokal ulanish yo'q. Natija
 * fayl — bitta tranzaksiya ichida idempotent INSERT'lar to'plami; uni
 * loyiha egasi Neon Console → SQL Editor'ga qo'lda qo'yadi (xuddi
 * scripts/make-manual-migration.ts natijasi kabi).
 *
 * Ishlatish: npm run seed:topics
 */
import fs from "fs";
import path from "path";
import { generateTopicsSql, SubjectTopics, TopicNodeInput } from "./topic-tree";

const TOPICS_DIR = path.join(__dirname, "topics");
const OUTPUT_PATH = path.join(__dirname, "topics.generated.sql");

function fail(message: string): never {
  console.error(`Xato: ${message}`);
  process.exit(1);
}

/**
 * `dir` ichidagi har bir `*.json` faylni o'qiydi. Har fayl bitta fan —
 * bo'sh shablon fayllar ("tree": []) ham shu yerda o'qiladi, lekin
 * generateTopicsSql ularni SQL hosil qilishda o'tkazib yuboradi.
 */
export function loadSubjectFiles(dir: string): SubjectTopics[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((file) => {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, "utf8");
    let data: SubjectTopics;
    try {
      data = JSON.parse(raw) as SubjectTopics;
    } catch (e) {
      throw new Error(`${file}: JSON parse qilinmadi — ${(e as Error).message}`);
    }
    if (typeof data.subject !== "string" || !data.subject || !Array.isArray(data.tree)) {
      throw new Error(`${file}: "subject" (matn) va "tree" (massiv) maydonlari kerak`);
    }
    return data;
  });
}

function countNodes(nodes: TopicNodeInput[]): number {
  return nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0);
}

function main() {
  if (!fs.existsSync(TOPICS_DIR)) {
    fail(`papka topilmadi — ${TOPICS_DIR}`);
  }

  const subjectsData = loadSubjectFiles(TOPICS_DIR);
  const sql = generateTopicsSql(subjectsData);
  fs.writeFileSync(OUTPUT_PATH, sql, "utf8");

  const withTopics = subjectsData.filter((s) => s.tree.length > 0);
  const totalTopics = withTopics.reduce((sum, s) => sum + countNodes(s.tree), 0);

  console.log(`Yozildi: ${OUTPUT_PATH}`);
  console.log(`Jami ${totalTopics} ta mavzu, ${withTopics.length} ta fan bo'yicha tayyorlandi.`);
  console.log(`(${subjectsData.length - withTopics.length} ta fan hozircha bo'sh shablon.)`);
  console.log("");
  console.log(
    "Keyingi qadam: shu faylning to'liq mazmunini Neon Console → SQL Editor'ga " +
      "nusxa-qo'ying va bajaring, so'ng tasdiqlang — natija so'rovi qatorlar sonini ko'rsatadi."
  );
}

// Faqat to'g'ridan-to'g'ri `npm run seed:topics` orqali chaqirilganda ishga
// tushadi — test fayli funksiyalarni shu yon ta'sirsiz import qila oladi.
if (require.main === module) {
  main();
}
