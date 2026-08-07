/**
 * Parametrik savol generatorini bazaga yozadi.
 * Ishga tushirish: npm run paramgen:seed
 *
 * Har savol mavjud Question modeliga (testId majburiy bo'lgani uchun)
 * "havza" Test orqali yoziladi: har fan uchun bitta doimiy, nashr etilgan
 * Test avtomatik topiladi yoki yaratiladi ("Parametrik savollar havzasi —
 * <Fan>"). Bu Test dtm-online.ts dagi savol tanlovi uchun ham (subjectId +
 * isPublished orqali) avtomatik ko'rinadi — alohida integratsiya shart emas.
 */
import fs from "fs";
import path from "path";
import { PrismaClient, TestType, PlanType, QuestionType } from "@prisma/client";
import { generateVariants, qaTemplate, Template } from "./paramgen";

const prisma = new PrismaClient();

const LANGS = ["uz"] as const;          // keyin ["uz","ru","en"] qo'shasiz
const PER_TEMPLATE = 200;

const templates: Template[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "templates.json"), "utf8")
);

const FALLBACK_CATEGORY_TITLE = "Parametrik";
const POOL_TEST_PREFIX = "Parametrik savollar havzasi";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Shablondagi subject slug'ini ("fizika") mavjud Subject qatoriga bog'laydi
 * (nomi bo'yicha, katta-kichik harfga sezgir emas). Topilmasa "Parametrik"
 * nomli bepul kategoriya ostida yangi Subject yaratadi.
 */
async function resolveSubject(subjectSlug: string) {
  const wanted = capitalize(subjectSlug);
  const existing = await prisma.subject.findFirst({
    where: { nameUz: { equals: wanted, mode: "insensitive" } },
  });
  if (existing) return existing;

  let category = await prisma.testCategory.findFirst({
    where: { nameUz: FALLBACK_CATEGORY_TITLE },
  });
  if (!category) {
    category = await prisma.testCategory.create({
      data: {
        nameUz: FALLBACK_CATEGORY_TITLE,
        nameRu: FALLBACK_CATEGORY_TITLE,
        nameEn: FALLBACK_CATEGORY_TITLE,
        type: TestType.SCHOOL,
        requiredPlan: PlanType.FREE,
      },
    });
  }

  return prisma.subject.create({
    data: { nameUz: wanted, nameRu: wanted, nameEn: wanted, categoryId: category.id },
  });
}

async function resolvePoolTest(subject: { id: string; nameUz: string; categoryId: string }) {
  const titleUz = `${POOL_TEST_PREFIX} — ${subject.nameUz}`;
  const existing = await prisma.test.findFirst({ where: { titleUz, subjectId: subject.id } });
  if (existing) return existing;

  return prisma.test.create({
    data: {
      titleUz,
      categoryId: subject.categoryId,
      subjectId: subject.id,
      duration: 0,
      questionCount: 0,
      format: QuestionType.MULTIPLE_CHOICE,
      isFree: true,
      accessType: "free",
      isPublished: true,
    },
  });
}

async function main() {
  let totalInserted = 0;
  const subjectCache = new Map<string, Awaited<ReturnType<typeof resolveSubject>>>();
  const poolTestCache = new Map<string, Awaited<ReturnType<typeof resolvePoolTest>>>();

  for (const t of templates) {
    const qa = qaTemplate(t, PER_TEMPLATE);
    if (qa.problems.some((p) => p.startsWith("Xunuk") || p.startsWith("Stem"))) {
      console.error(`❌ ${t.id} sifat tekshiruvidan o'tmadi:`, qa.problems);
      continue;
    }

    let subject = subjectCache.get(t.subject);
    if (!subject) {
      subject = await resolveSubject(t.subject);
      subjectCache.set(t.subject, subject);
    }
    let poolTest = poolTestCache.get(subject.id);
    if (!poolTest) {
      poolTest = await resolvePoolTest(subject);
      poolTestCache.set(subject.id, poolTest);
    }

    for (const lang of LANGS) {
      const variants = generateVariants(t, { count: PER_TEMPLATE, seed: 42, lang });

      for (const v of variants) {
        const correct = v.choices.find((c) => c.correct)!;
        await prisma.question.upsert({
          where: { variantSig: v.variantId },  // UNIQUE ustun — qayta ishga tushirsa dublikat bo'lmaydi
          update: {},                          // mavjud bo'lsa tegilmaydi
          create: {
            testId: poolTest.id,
            templateId: t.id,
            variantSig: v.variantId,
            subjectId: subject.id,
            subtopic: t.subtopic ?? null,
            grade: t.grade ?? [],
            exams: t.exams ?? [],
            difficulty: t.difficulty,
            lang,
            text: v.stem,
            images: [],
            options: v.choices.map((c) => ({ label: c.key, text: c.text, image: null })),
            correctAnswer: correct.key,
            type: QuestionType.MULTIPLE_CHOICE,
            explanation: v.solution,
            explanationImages: [],
            topic: t.topic,
            hints: v.hints,
            tags: t.tags ?? [],
            source: "parametric",
          },
        });
        totalInserted++;
      }
    }
    console.log(`✅ ${t.id}: ${qa.produced} variant tayyorlandi (havza: ${poolTest.titleUz})`);
  }

  // Har havza Test'ning questionCount'ini haqiqiy sonlarga moslashtiramiz
  for (const poolTest of poolTestCache.values()) {
    const count = await prisma.question.count({ where: { testId: poolTest.id } });
    await prisma.test.update({ where: { id: poolTest.id }, data: { questionCount: count } });
  }

  console.log(`\nJami ${totalInserted} ta savol bazaga yozildi (yoki allaqachon bor edi).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
