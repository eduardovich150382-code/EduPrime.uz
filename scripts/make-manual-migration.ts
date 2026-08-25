/**
 * Migratsiyani Neon SQL Editor'ga qo'lda qo'yish uchun tayyor fayl yasaydi.
 *
 * Fon: GitHub Actions runner'lari Neon bazasiga 5432-port orqali ulanolmaydi
 * (P1001) — sababi hali aniqlanmagan. Shu sababli `db-deploy.yml` prod'ga
 * avtomatik qo'lla olmaydi. Vercel va Neon'ning o'zining SQL Editor'i esa
 * ulanadi, shuning uchun hozircha migratsiya loyiha egasi tomonidan qo'lda,
 * SQL Editor'ga nusxa-qo'yish orqali qo'llanadi. Ulanish tiklangach
 * `db-deploy.yml` hech qanday o'zgarishsiz ishlay boshlaydi — bu skript
 * vaqtinchalik oraliq qadam, doimiy quvurni almashtirmaydi.
 *
 * Bu skript `prisma/migrations/<nom>/migration.sql` ni o'qib,
 * `prisma/migrations/<nom>/manual-apply.sql` ni yozadi. Natija fayl —
 * bitta tranzaksiya (`BEGIN;` ... `COMMIT;`): migratsiya SQL'ining o'zi va
 * shundan keyin `_prisma_migrations` jadvaliga qo'lda yozuv qo'shadigan
 * `INSERT`. Bu ikkinchisi kerak — Neon SQL Editor orqali qo'yilgan SQL
 * Prisma'ning o'z hisobida "qo'llangan" deb ko'rinmaydi, shuning uchun uni
 * o'zimiz belgilashimiz kerak, aks holda keyingi `prisma migrate deploy`
 * (yoki shu migratsiyani qayta qo'lda tayyorlash) uni yana qo'llashga
 * urinadi.
 *
 * Checksum'ni CRLF/LF farqidan himoya qilish uchun qator oxirlari avval LF
 * ga normallashtiriladi (Windows'da tahrirlangan fayllarda CRLF bo'lishi
 * mumkin) — Prisma checksum'ni shu normallashtirilgan matndan hisoblaydi
 * va `_prisma_migrations.checksum` ustunida aynan shuni kutadi.
 *
 * Ishlatish:
 *   npm run db:manual -- <migratsiya-papkasi-nomi>
 *   npm run db:manual -- <migratsiya-papkasi-nomi> --force   (mavjud faylni qayta yozadi)
 *
 * Natija fayl qayerga qo'yiladi: uni to'liq nusxalab, Neon Console →
 * SQL Editor'ga tashlab bajarish kerak. Keyin tasdiqlash uchun:
 *   SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at;
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

/**
 * Qator oxirlarini LF ga keltiradi — Windows'da CRLF bilan saqlangan
 * fayl ham Linux'da (CI, Neon) hisoblangan checksum bilan mos kelsin.
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Prisma `_prisma_migrations.checksum` uchun kutgan format —
 * migratsiya matnining SHA-256 hex digest'i.
 */
export function computeChecksum(normalizedContent: string): string {
  return crypto.createHash("sha256").update(normalizedContent, "utf8").digest("hex");
}

/**
 * Neon SQL Editor'ga tashlanadigan yakuniy SQL'ni yig'adi: bitta
 * tranzaksiya ichida migratsiyaning o'zi va `_prisma_migrations`ga
 * "qo'llangan" deb belgilaydigan yozuv.
 */
export function buildManualApplySql(
  migrationName: string,
  normalizedMigrationSql: string,
  checksum: string
): string {
  const insert =
    `INSERT INTO "_prisma_migrations" ` +
    `(id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) ` +
    `VALUES (gen_random_uuid()::text, '${checksum}', now(), '${migrationName}', NULL, NULL, now(), 1);`;

  return [
    "BEGIN;",
    "",
    normalizedMigrationSql.replace(/\n+$/, ""),
    "",
    insert,
    "",
    "COMMIT;",
    "",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`Xato: ${message}`);
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const positional = args.filter((arg) => arg !== "--force");

  if (positional.length !== 1) {
    fail(
      "migratsiya papkasi nomi ko'rsatilmadi.\n" +
        "Ishlatish: npm run db:manual -- <migratsiya-papkasi-nomi> [--force]"
    );
  }

  const migrationName = positional[0];
  const migrationDir = path.join(MIGRATIONS_DIR, migrationName);
  const sourcePath = path.join(migrationDir, "migration.sql");
  const outputPath = path.join(migrationDir, "manual-apply.sql");

  if (!fs.existsSync(migrationDir) || !fs.statSync(migrationDir).isDirectory()) {
    fail(`migratsiya papkasi topilmadi — ${migrationDir}`);
  }

  if (!fs.existsSync(sourcePath)) {
    fail(`migration.sql topilmadi — ${sourcePath}`);
  }

  if (fs.existsSync(outputPath) && !force) {
    fail(
      `${outputPath} allaqachon mavjud. Qayta yozish uchun --force qo'shing.`
    );
  }

  const rawSql = fs.readFileSync(sourcePath, "utf8");
  const normalizedSql = normalizeLineEndings(rawSql);
  const checksum = computeChecksum(normalizedSql);
  const output = buildManualApplySql(migrationName, normalizedSql, checksum);

  fs.writeFileSync(outputPath, output, "utf8");

  console.log(`Yozildi: ${outputPath}`);
  console.log(`Checksum: ${checksum}`);
  console.log("");
  console.log(
    "Keyingi qadam: shu faylning to'liq mazmunini Neon Console → SQL Editor'ga " +
      "nusxa-qo'ying va bajaring, so'ng tasdiqlang:"
  );
  console.log('  SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at;');
}

// Faqat to'g'ridan-to'g'ri `npm run db:manual` orqali chaqirilganda ishga
// tushadi — test fayli funksiyalarni shu yon ta'sirsiz import qila oladi.
if (require.main === module) {
  main();
}
